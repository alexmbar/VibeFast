import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ocurrenciasEnRango, siguienteDia } from '@/lib/recurrencias/fechas'
import { categoriaLabelsDe } from '@/lib/recurrencias/schema'
import { enviarMensajeWhatsApp } from '@/lib/whatsapp/kapso'
import { registrarIntegracion, alertarAdminsPorErroresCron } from '@/lib/admin/db'
import { verificarPresupuesto } from '@/lib/presupuestos/verificar'
import { formatMonto } from '@/lib/gastos/schema'
import { hoyEnZona } from '@/lib/config/fechas'
import { ZONA_HORARIA_DEFAULT } from '@/lib/config/schema'

// Genera, por adelantado, las filas de gastos/ingresos que corresponden a
// cada regla de recurrencia activa hasta el dia de hoy (con catch-up si el
// cron no corrio algun dia). Cada fila nace monto_confirmado=false -- el
// monto de la regla es un default, no lo capturo el usuario.
export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Cota superior amplia para el prefiltro SQL -- el filtrado preciso por
  // usuario ocurre mas abajo con el "hoy" resuelto en la zona horaria de
  // cada quien.
  const hoyPrefiltro = hoyEnZona(ZONA_HORARIA_DEFAULT)

  const { data: reglas, error } = await supabase
    .from('recurrencias')
    .select('*')
    .eq('activo', true)
    .lte('fecha_inicio', hoyPrefiltro)
    .or(`fecha_fin.is.null,fecha_fin.gte.${hoyPrefiltro}`)

  if (error) {
    console.error('[cron/recurrencias] error al listar reglas:', error)
    return NextResponse.json({ message: 'Error al listar recurrencias' }, { status: 500 })
  }

  // "Hoy" depende de la zona horaria de cada usuario -- se resuelve una
  // vez por usuario dentro del loop, nunca globalmente (ver regla 2 de
  // "Reglas de esquema" en CLAUDE.md: nunca new Date() a secas).
  const userIds = [...new Set((reglas || []).map(r => r.user_id))]
  const { data: perfilesZona } = userIds.length
    ? await supabase.from('profiles').select('id, zona_horaria').in('id', userIds)
    : { data: [] }
  const zonaPorUsuario = new Map((perfilesZona || []).map(p => [p.id, p.zona_horaria]))

  let filasGeneradas = 0
  const errores = []
  const generadasPorUsuario = new Map()

  for (const regla of reglas || []) {
    try {
      const hoy = hoyEnZona(zonaPorUsuario.get(regla.user_id) || ZONA_HORARIA_DEFAULT)
      const desde = regla.ultima_generacion ? siguienteDia(regla.ultima_generacion) : regla.fecha_inicio
      const fechas = ocurrenciasEnRango(regla, desde, hoy)
      const tabla = regla.tipo === 'gasto' ? 'gastos' : 'ingresos'

      // gastos.banco es un texto denormalizado desde banco_id que siguen
      // leyendo el export y otros reportes -- se resuelve una vez por
      // regla, igual que hace la API de gastos en cada insert/update.
      let bancoNombre = null
      if (regla.tipo === 'gasto' && regla.banco_id) {
        const { data: banco } = await supabase
          .from('bancos')
          .select('nombre')
          .eq('id', regla.banco_id)
          .maybeSingle()
        bancoNombre = banco?.nombre || null
      }

      for (const fecha of fechas) {
        // Idempotencia defensiva: si por lo que sea ya existe una fila de
        // esta regla en esta fecha (doble corrida del cron, etc.), no se
        // duplica.
        const { data: existente } = await supabase
          .from(tabla)
          .select('id')
          .eq('recurrencia_id', regla.id)
          .eq('fecha', fecha)
          .maybeSingle()

        if (existente) continue

        const filaBase = {
          user_id: regla.user_id,
          monto: regla.monto_default,
          fecha,
          categoria: regla.categoria,
          notas: regla.notas,
          recurrencia_id: regla.id,
          monto_confirmado: false,
        }

        const fila = regla.tipo === 'gasto'
          ? {
              ...filaBase,
              tipo_pago: regla.tipo_pago,
              banco_id: regla.banco_id,
              banco: bancoNombre,
              tienda: regla.tienda,
            }
          : filaBase

        const { error: insertError } = await supabase.from(tabla).insert(fila)

        if (insertError) {
          errores.push(`regla ${regla.id} (${fecha}): ${insertError.message}`)
          await registrarIntegracion(supabase, {
            tipo: 'cron_recurrencias',
            nivel: 'error',
            userId: regla.user_id,
            detalle: { reglaId: regla.id, fecha, mensaje: insertError.message },
          })
          continue
        }

        if (regla.tipo === 'gasto') {
          await verificarPresupuesto(supabase, regla.user_id, regla.categoria)
        }

        filasGeneradas++
        const pendientes = generadasPorUsuario.get(regla.user_id) || []
        pendientes.push({ tipo: regla.tipo, monto: regla.monto_default, categoria: regla.categoria })
        generadasPorUsuario.set(regla.user_id, pendientes)
      }

      await supabase.from('recurrencias').update({ ultima_generacion: hoy }).eq('id', regla.id)
    } catch (err) {
      errores.push(`regla ${regla.id}: ${err.message}`)
      await registrarIntegracion(supabase, {
        tipo: 'cron_recurrencias',
        nivel: 'error',
        userId: regla.user_id,
        detalle: { reglaId: regla.id, mensaje: err.message },
      })
    }
  }

  await notificarUsuarios(supabase, generadasPorUsuario)

  await alertarAdminsPorErroresCron(supabase, 'generar-recurrencias', errores)

  return NextResponse.json({
    reglas_procesadas: reglas?.length || 0,
    filas_generadas: filasGeneradas,
    errores,
  })
}

// Notificacion best-effort por WhatsApp -- nunca tumba el job si falla el
// envio (mismo patron que web/app/api/webhooks/whatsapp/route.js).
async function notificarUsuarios(supabase, generadasPorUsuario) {
  if (generadasPorUsuario.size === 0) return

  const userIds = [...generadasPorUsuario.keys()]
  const { data: perfiles } = await supabase
    .from('profiles')
    .select('id, phone, moneda')
    .in('id', userIds)

  for (const perfil of perfiles || []) {
    if (!perfil.phone) continue
    const pendientes = generadasPorUsuario.get(perfil.id) || []
    if (pendientes.length === 0) continue

    try {
      const detalle = pendientes
        .map(p => `${formatMonto(p.monto, perfil.moneda)} (${categoriaLabelsDe(p.tipo)[p.categoria]})`)
        .join(', ')
      const plural = pendientes.length === 1 ? 'movimiento recurrente' : 'movimientos recurrentes'
      await enviarMensajeWhatsApp(
        perfil.phone,
        `Se registraron ${pendientes.length} ${plural} pendientes de confirmar tu monto: ${detalle}.`
      )
    } catch (err) {
      console.error('[cron/recurrencias] error mandando notificacion WhatsApp:', err)
      await registrarIntegracion(supabase, {
        tipo: 'cron_recurrencias_notificacion',
        nivel: 'error',
        userId: perfil.id,
        detalle: { mensaje: err.message },
      })
    }
  }
}

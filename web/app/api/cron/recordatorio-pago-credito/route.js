import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolverDiaMes } from '@/lib/recurrencias/fechas'
import { enviarPlantillaWhatsApp } from '@/lib/whatsapp/kapso'
import { registrarIntegracion, alertarAdminsPorErroresCron } from '@/lib/admin/db'

const DIAS_ANTES = 3
const TEMPLATE_NAME = 'recordatorio_pago_credito'

// "Hoy" en America/Mexico_City -- mismo criterio que
// web/app/api/cron/generar-recurrencias/route.js (ver regla 2 de
// "Reglas de esquema" en CLAUDE.md: nunca new Date() a secas).
function hoyMexico() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const valores = Object.fromEntries(partes.map(p => [p.type, p.value]))
  return `${valores.year}-${valores.month}-${valores.day}`
}

function formatFecha(anio, mes, dia) {
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

function diasEntre(desde, hasta) {
  const [a1, m1, d1] = desde.split('-').map(Number)
  const [a2, m2, d2] = hasta.split('-').map(Number)
  const ms = Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)
  return Math.round(ms / (24 * 60 * 60 * 1000))
}

// Proxima fecha en que cae `diaLimitePago` a partir de `hoy` (inclusive):
// el limite de este mes si todavia no pasa, o el del mes siguiente.
function proximaFechaLimite(hoy, diaLimitePago) {
  const [anio, mes] = hoy.split('-').map(Number)
  const limiteEsteMes = formatFecha(anio, mes, resolverDiaMes(anio, mes, diaLimitePago))
  if (limiteEsteMes >= hoy) return limiteEsteMes

  const siguienteMes = mes === 12 ? 1 : mes + 1
  const anioSiguiente = mes === 12 ? anio + 1 : anio
  return formatFecha(anioSiguiente, siguienteMes, resolverDiaMes(anioSiguiente, siguienteMes, diaLimitePago))
}

const formatoFechaLegible = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})

function formatFechaLegible(fechaISO) {
  const [anio, mes, dia] = fechaISO.split('-').map(Number)
  return formatoFechaLegible.format(new Date(Date.UTC(anio, mes - 1, dia)))
}

// Manda el recordatorio de pago de tarjeta de credito N dias antes de
// dia_limite_pago, va DIAS_ANTES antes vez que el corte pase. Corre
// diario; el template ya esta aprobado por Meta (ver CLAUDE.md, seccion
// "Recordatorio de pago por WhatsApp").
export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const hoy = hoyMexico()

  const { data: bancos, error } = await supabase
    .from('bancos')
    .select('id, nombre, alias, user_id, dia_limite_pago, ultimo_recordatorio_pago')
    .eq('tipo', 'credito')
    .eq('activo', true)
    .not('dia_limite_pago', 'is', null)

  if (error) {
    console.error('[cron/recordatorio-pago-credito] error al listar bancos:', error)
    return NextResponse.json({ message: 'Error al listar bancos' }, { status: 500 })
  }

  let recordatoriosEnviados = 0
  const errores = []

  for (const banco of bancos || []) {
    try {
      const fechaLimite = proximaFechaLimite(hoy, banco.dia_limite_pago)
      const diasRestantes = diasEntre(hoy, fechaLimite)

      if (diasRestantes !== DIAS_ANTES) continue
      if (banco.ultimo_recordatorio_pago === fechaLimite) continue

      const { data: perfil } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', banco.user_id)
        .maybeSingle()

      if (!perfil?.phone) continue

      await enviarPlantillaWhatsApp(perfil.phone, TEMPLATE_NAME, {
        nombre_banco: banco.alias || banco.nombre,
        fecha_limite: formatFechaLegible(fechaLimite),
        dias_restantes: String(diasRestantes),
      })

      await supabase
        .from('bancos')
        .update({ ultimo_recordatorio_pago: fechaLimite })
        .eq('id', banco.id)

      recordatoriosEnviados++
    } catch (err) {
      errores.push(`banco ${banco.id}: ${err.message}`)
      await registrarIntegracion(supabase, {
        tipo: 'cron_recordatorio_pago_credito',
        nivel: 'error',
        userId: banco.user_id,
        detalle: { bancoId: banco.id, mensaje: err.message },
      })
    }
  }

  await alertarAdminsPorErroresCron(supabase, 'recordatorio-pago-credito', errores)

  return NextResponse.json({
    bancos_evaluados: bancos?.length || 0,
    recordatorios_enviados: recordatoriosEnviados,
    errores,
  })
}

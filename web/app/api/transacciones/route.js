import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIA_LABELS as CATEGORIA_LABELS_GASTO } from '@/lib/gastos/schema'
import { CATEGORIA_LABELS as CATEGORIA_LABELS_INGRESO } from '@/lib/ingresos/schema'

const TIPOS_VALIDOS = new Set(['gasto', 'ingreso', 'retiro'])

// Vista combinada de gastos + ingresos + retiros para /transacciones.
// Las tres tablas siguen separadas -- presupuestos, recurrencias,
// cartera_saldo, reportes y la captura por WhatsApp no cambian, esto
// solo las junta para mostrarlas en una sola lista. Mismo patron que ya
// usa /api/cartera (que combina retiros + gastos en efectivo): se
// combina y ordena en JS con un limite por fuente, no es un total exacto
// -- para eso siguen existiendo las funciones SQL de /reportes.
const LIMIT_POR_FUENTE = 300

export async function GET(request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')
  const tipoParam = searchParams.get('tipo')
  const tipo = TIPOS_VALIDOS.has(tipoParam) ? tipoParam : null

  function aplicarRango(query) {
    if (desde) query = query.gte('fecha', desde)
    if (hasta) query = query.lte('fecha', hasta)
    return query
  }

  const [gastosResult, ingresosResult, retirosResult] = await Promise.all([
    !tipo || tipo === 'gasto'
      ? aplicarRango(
          supabase
            .from('gastos')
            .select('id, fecha, monto, tienda, categoria, banco, monto_confirmado, banco_confirmado')
            .eq('user_id', user.id)
        )
          .order('fecha', { ascending: false })
          .limit(LIMIT_POR_FUENTE)
      : Promise.resolve({ data: [] }),
    !tipo || tipo === 'ingreso'
      ? aplicarRango(
          supabase
            .from('ingresos')
            .select('id, fecha, monto, categoria, monto_confirmado, banco:bancos(nombre)')
            .eq('user_id', user.id)
        )
          .order('fecha', { ascending: false })
          .limit(LIMIT_POR_FUENTE)
      : Promise.resolve({ data: [] }),
    !tipo || tipo === 'retiro'
      ? aplicarRango(
          supabase
            .from('retiros')
            .select('id, fecha, monto, es_carga_inicial, banco:bancos(nombre)')
            .eq('user_id', user.id)
        )
          .order('fecha', { ascending: false })
          .limit(LIMIT_POR_FUENTE)
      : Promise.resolve({ data: [] }),
  ])

  if (gastosResult.error || ingresosResult.error || retirosResult.error) {
    return NextResponse.json({ message: 'Error al listar transacciones' }, { status: 500 })
  }

  const transacciones = [
    ...(gastosResult.data || []).map((g) => ({
      id: g.id,
      tipo: 'gasto',
      fecha: g.fecha,
      monto: -g.monto,
      descripcion: g.tienda || CATEGORIA_LABELS_GASTO[g.categoria],
      categoriaLabel: CATEGORIA_LABELS_GASTO[g.categoria],
      cuenta: g.banco || 'Efectivo',
      pendiente: g.monto_confirmado === false || g.banco_confirmado === false,
      editHref: `/gastos/${g.id}/edit`,
    })),
    ...(ingresosResult.data || []).map((i) => ({
      id: i.id,
      tipo: 'ingreso',
      fecha: i.fecha,
      monto: i.monto,
      descripcion: CATEGORIA_LABELS_INGRESO[i.categoria],
      categoriaLabel: CATEGORIA_LABELS_INGRESO[i.categoria],
      cuenta: i.banco?.nombre || null,
      pendiente: i.monto_confirmado === false,
      editHref: `/ingresos/${i.id}/edit`,
    })),
    ...(retirosResult.data || []).map((r) => ({
      id: r.id,
      tipo: 'retiro',
      fecha: r.fecha,
      monto: r.monto,
      descripcion: r.es_carga_inicial ? 'Carga inicial' : 'Retiro de efectivo',
      categoriaLabel: 'Transferencia',
      cuenta: r.banco?.nombre || null,
      pendiente: false,
      editHref: `/retiros/${r.id}/edit`,
    })),
  ].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0))

  return NextResponse.json(transacciones)
}
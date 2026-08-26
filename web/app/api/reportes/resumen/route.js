import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Resumen de /reportes: totales, series por mes/dia y top categorias.
// Calculado en la BD via RPC (migracion 036) por el mismo motivo que
// balance-neto: sumar listas paginadas en el cliente da un total
// incorrecto en cuanto el historial pasa esa pagina (antes esta pagina
// pedia listarGastos/listarIngresos con limit=1000 y sumaba en JS).
export async function GET(request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const desde = searchParams.get('desde') || null
  const hasta = searchParams.get('hasta') || null

  const [resumen, porMes, porDia, porCategoria, hormiga] = await Promise.all([
    supabase.rpc('gastos_ingresos_resumen', { p_desde: desde, p_hasta: hasta }),
    supabase.rpc('gastos_ingresos_por_mes', { p_desde: desde, p_hasta: hasta }),
    supabase.rpc('gastos_ingresos_por_dia', { p_desde: desde, p_hasta: hasta }),
    supabase.rpc('gastos_por_categoria', { p_desde: desde, p_hasta: hasta }),
    supabase.rpc('gastos_hormiga', { p_desde: desde, p_hasta: hasta }),
  ])

  const error = resumen.error || porMes.error || porDia.error || porCategoria.error || hormiga.error
  if (error) {
    return NextResponse.json({ message: 'Error al calcular el resumen de reportes' }, { status: 500 })
  }

  return NextResponse.json({
    resumen: resumen.data?.[0] || { total_gastos: 0, total_ingresos: 0, num_gastos: 0, num_ingresos: 0, dias_unicos: 0 },
    porMes: (porMes.data || []).slice().reverse(),
    porDia: (porDia.data || []).slice().reverse(),
    porCategoria: porCategoria.data || [],
    gastosHormiga: hormiga.data || [],
  })
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIA_LABELS } from '@/lib/gastos/schema'

// Cantidad de movimientos recientes por fuente (retiros / gastos en
// efectivo) que se combinan para la tabla de Cartera. El saldo en si
// siempre es exacto (viene de la funcion RPC cartera_saldo, que suma
// en la BD), este limite solo acota la lista de movimientos mostrados.
const LIMIT_MOVIMIENTOS = 100

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { message: 'No autenticado' },
      { status: 401 }
    )
  }

  const { data: saldo, error: saldoError } = await supabase.rpc('cartera_saldo')

  if (saldoError) {
    return NextResponse.json(
      { message: 'Error al calcular saldo de Cartera' },
      { status: 500 }
    )
  }

  const [retirosResult, gastosResult] = await Promise.all([
    supabase
      .from('retiros')
      .select('id, fecha, monto, es_carga_inicial, banco:bancos(nombre)')
      .eq('user_id', user.id)
      .order('fecha', { ascending: false })
      .limit(LIMIT_MOVIMIENTOS),
    supabase
      .from('gastos')
      .select('id, fecha, monto, tienda, categoria')
      .eq('user_id', user.id)
      .eq('tipo_pago', 'efectivo')
      .order('fecha', { ascending: false })
      .limit(LIMIT_MOVIMIENTOS),
  ])

  if (retirosResult.error || gastosResult.error) {
    return NextResponse.json(
      { message: 'Error al listar movimientos de Cartera' },
      { status: 500 }
    )
  }

  const movimientos = [
    ...retirosResult.data.map(r => ({
      id: `retiro-${r.id}`,
      tipo: 'retiro',
      fecha: r.fecha,
      monto: r.monto,
      descripcion: r.es_carga_inicial ? 'Carga inicial' : `Retiro — ${r.banco?.nombre || 'Banco'}`,
      esCargaInicial: r.es_carga_inicial,
    })),
    ...gastosResult.data.map(g => ({
      id: `gasto-${g.id}`,
      tipo: 'gasto',
      fecha: g.fecha,
      monto: -g.monto,
      descripcion: `Gasto — ${g.tienda || CATEGORIA_LABELS[g.categoria] || 'Otros'}`,
    })),
  ].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0))

  return NextResponse.json({ saldo: saldo ?? 0, movimientos })
}

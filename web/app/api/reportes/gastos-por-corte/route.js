import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Totales de gasto por ciclo de corte de una tarjeta de credito.
// Calculado en la BD via RPC (funcion gastos_por_corte, migracion 035)
// por el mismo motivo que balance-neto: sumar listas paginadas en el
// cliente da un total incorrecto en cuanto el historial pasa esa pagina.
export async function GET(request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const bancoId = searchParams.get('banco_id')
  const ciclos = Number(searchParams.get('ciclos')) || 12

  if (!bancoId) {
    return NextResponse.json({ message: 'Falta banco_id' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('gastos_por_corte', {
    p_banco_id: bancoId,
    p_ciclos: ciclos,
  })

  if (error) {
    return NextResponse.json({ message: 'Error al calcular gastos por corte' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

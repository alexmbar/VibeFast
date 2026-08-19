import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Balance neto (ingresos - gastos) en un rango de fechas. Calculado en
// la BD via RPC (funcion balance_neto, migracion 020) por el mismo
// motivo que cartera_saldo: sumar listas paginadas en el cliente da un
// total incorrecto en cuanto el historial pasa esa pagina.
export async function GET(request) {
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

  const { searchParams } = new URL(request.url)
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')

  const { data, error } = await supabase.rpc('balance_neto', {
    p_desde: desde || null,
    p_hasta: hasta || null,
  })

  if (error) {
    return NextResponse.json(
      { message: 'Error al calcular balance neto' },
      { status: 500 }
    )
  }

  return NextResponse.json({ balance: data ?? 0 })
}

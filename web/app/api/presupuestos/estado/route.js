import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Gasto acumulado del periodo vigente por presupuesto activo. Calculado
// en la BD via RPC (presupuestos_estado, migración 038) -- nunca sumando
// gastos en JS, mismo motivo que balance_neto/gastos_por_corte/reportes.
// Un solo endpoint alimenta tanto la tabla de /presupuestos como
// AlertasPresupuestos.
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 })
  }

  const { data, error } = await supabase.rpc('presupuestos_estado', { p_user_id: user.id })

  if (error) {
    return NextResponse.json({ message: 'Error al calcular el estado de presupuestos' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

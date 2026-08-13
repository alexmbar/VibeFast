import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateGasto } from '@/lib/gastos/schema'

export async function GET(request, { params }) {
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

  const { id } = await params
  const { data, error } = await supabase
    .from('gastos')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { message: 'Gasto no encontrado' },
      { status: 404 }
    )
  }

  return NextResponse.json(data)
}

export async function PATCH(request, { params }) {
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

  const { id } = await params

  // Verificar que el gasto pertenece al usuario
  const { data: existing, error: fetchError } = await supabase
    .from('gastos')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json(
      { message: 'Gasto no encontrado' },
      { status: 404 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { message: 'Body inválido' },
      { status: 400 }
    )
  }

  // Validar datos si están presentes
  const dataToUpdate = {
    ...body,
  }

  if (body.monto || body.fecha || body.categoria || body.tipo_pago || body.banco !== undefined) {
    const validation = validateGasto({
      monto: body.monto || existing.monto,
      fecha: body.fecha || existing.fecha,
      categoria: body.categoria || existing.categoria,
      tipo_pago: body.tipo_pago || existing.tipo_pago,
      banco: body.banco !== undefined ? body.banco : existing.banco,
    })
    if (!validation.valid) {
      return NextResponse.json(
        { message: 'Datos inválidos', errors: validation.errors },
        { status: 400 }
      )
    }
  }

  // Actualizar gasto
  const { data, error } = await supabase
    .from('gastos')
    .update(dataToUpdate)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { message: 'Error al actualizar gasto' },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}

export async function DELETE(request, { params }) {
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

  const { id } = await params

  // Verificar que el gasto pertenece al usuario
  const { data: existing, error: fetchError } = await supabase
    .from('gastos')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json(
      { message: 'Gasto no encontrado' },
      { status: 404 }
    )
  }

  // Eliminar gasto
  const { error } = await supabase
    .from('gastos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[gastos] error al eliminar:', error)
    return NextResponse.json(
      { message: error.message || 'Error al eliminar gasto' },
      { status: 500 }
    )
  }

  return NextResponse.json(null, { status: 204 })
}

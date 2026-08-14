import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateRetiro } from '@/lib/retiros/schema'

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
    .from('retiros')
    .select('*, banco:bancos(id, nombre, tipo)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { message: 'Retiro no encontrado' },
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

  const { data: existing, error: fetchError } = await supabase
    .from('retiros')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json(
      { message: 'Retiro no encontrado' },
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

  const validation = validateRetiro({
    monto: body.monto || existing.monto,
    fecha: body.fecha || existing.fecha,
    banco_id: body.banco_id !== undefined ? body.banco_id : existing.banco_id,
  })
  if (!validation.valid) {
    return NextResponse.json(
      { message: 'Datos inválidos', errors: validation.errors },
      { status: 400 }
    )
  }

  const dataToUpdate = {}
  if (body.monto !== undefined) dataToUpdate.monto = body.monto
  if (body.fecha !== undefined) dataToUpdate.fecha = body.fecha
  if (body.notas !== undefined) dataToUpdate.notas = body.notas || null

  if (body.banco_id !== undefined) {
    const { data: banco, error: bancoError } = await supabase
      .from('bancos')
      .select('id, tipo')
      .eq('id', body.banco_id)
      .eq('user_id', user.id)
      .single()

    if (bancoError || !banco) {
      return NextResponse.json(
        { message: 'Datos inválidos', errors: { banco_id: 'Banco inválido' } },
        { status: 400 }
      )
    }
    if (banco.tipo !== 'debito') {
      return NextResponse.json(
        { message: 'Datos inválidos', errors: { banco_id: 'El banco de un retiro debe ser de tipo débito' } },
        { status: 400 }
      )
    }
    dataToUpdate.banco_id = banco.id
  }

  const { data, error } = await supabase
    .from('retiros')
    .update(dataToUpdate)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*, banco:bancos(id, nombre, tipo)')
    .single()

  if (error) {
    return NextResponse.json(
      { message: 'Error al actualizar retiro' },
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

  const { data: existing, error: fetchError } = await supabase
    .from('retiros')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json(
      { message: 'Retiro no encontrado' },
      { status: 404 }
    )
  }

  const { error } = await supabase
    .from('retiros')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[retiros] error al eliminar:', error)
    return NextResponse.json(
      { message: error.message || 'Error al eliminar retiro' },
      { status: 500 }
    )
  }

  return NextResponse.json(null, { status: 204 })
}

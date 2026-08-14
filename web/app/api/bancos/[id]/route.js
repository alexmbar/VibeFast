import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateBanco } from '@/lib/bancos/schema'

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
    .from('bancos')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { message: 'Banco no encontrado' },
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
    .from('bancos')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json(
      { message: 'Banco no encontrado' },
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

  const validation = validateBanco({
    nombre: body.nombre !== undefined ? body.nombre : existing.nombre,
    tipo: body.tipo !== undefined ? body.tipo : existing.tipo,
  })
  if (!validation.valid) {
    return NextResponse.json(
      { message: 'Datos inválidos', errors: validation.errors },
      { status: 400 }
    )
  }

  // El tipo no se puede cambiar si el banco ya tiene gastos o retiros
  // asociados: cambiarlo retroactivamente invalidaría movimientos ya
  // capturados (ej. un retiro exige banco tipo=debito).
  if (body.tipo !== undefined && body.tipo !== existing.tipo) {
    const [{ count: gastosCount }, { count: retirosCount }] = await Promise.all([
      supabase.from('gastos').select('id', { count: 'exact', head: true }).eq('banco_id', id),
      supabase.from('retiros').select('id', { count: 'exact', head: true }).eq('banco_id', id),
    ])

    if ((gastosCount || 0) > 0 || (retirosCount || 0) > 0) {
      return NextResponse.json(
        { message: 'No se puede cambiar el tipo: este banco ya tiene gastos o retiros asociados' },
        { status: 409 }
      )
    }
  }

  const dataToUpdate = {}
  if (body.nombre !== undefined) dataToUpdate.nombre = body.nombre.trim()
  if (body.tipo !== undefined) dataToUpdate.tipo = body.tipo

  const { data, error } = await supabase
    .from('bancos')
    .update(dataToUpdate)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { message: 'Ya tienes un banco con ese nombre y tipo' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { message: 'Error al actualizar banco' },
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
    .from('bancos')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json(
      { message: 'Banco no encontrado' },
      { status: 404 }
    )
  }

  // Soft delete: el banco puede estar referenciado por gastos/retiros
  // historicos via FK, asi que no se borra fisicamente. Deja de aparecer
  // en los selects de captura nueva (activo=false).
  const { error } = await supabase
    .from('bancos')
    .update({ activo: false })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json(
      { message: error.message || 'Error al eliminar banco' },
      { status: 500 }
    )
  }

  return NextResponse.json(null, { status: 204 })
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateIngreso } from '@/lib/ingresos/schema'

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
    .from('ingresos')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { message: 'Ingreso no encontrado' },
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
    .from('ingresos')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json(
      { message: 'Ingreso no encontrado' },
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

  if (body.monto || body.fecha || body.categoria) {
    const validation = validateIngreso({
      monto: body.monto || existing.monto,
      fecha: body.fecha || existing.fecha,
      categoria: body.categoria || existing.categoria,
    })
    if (!validation.valid) {
      return NextResponse.json(
        { message: 'Datos inválidos', errors: validation.errors },
        { status: 400 }
      )
    }
  }

  // Cualquier PATCH implica que el usuario revisó la fila -- así se
  // "confirma" una fila generada por una recurrencia sin necesitar un
  // endpoint aparte (ver web/lib/recurrencias).
  const dataToUpdate = { ...body, monto_confirmado: true }

  // Resolver banco_id contra el catálogo del usuario, igual que gastos
  // (web/app/api/gastos/[id]/route.js).
  if (body.banco_id !== undefined) {
    if (body.banco_id) {
      const { data: banco, error: bancoError } = await supabase
        .from('bancos')
        .select('id')
        .eq('id', body.banco_id)
        .eq('user_id', user.id)
        .single()

      if (bancoError || !banco) {
        return NextResponse.json(
          { message: 'Datos inválidos', errors: { banco_id: 'Banco inválido' } },
          { status: 400 }
        )
      }
      dataToUpdate.banco_id = banco.id
    } else {
      dataToUpdate.banco_id = null
    }
  }

  const { data, error } = await supabase
    .from('ingresos')
    .update(dataToUpdate)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { message: 'Error al actualizar ingreso' },
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
    .from('ingresos')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json(
      { message: 'Ingreso no encontrado' },
      { status: 404 }
    )
  }

  const { error } = await supabase
    .from('ingresos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[ingresos] error al eliminar:', error)
    return NextResponse.json(
      { message: error.message || 'Error al eliminar ingreso' },
      { status: 500 }
    )
  }

  return NextResponse.json(null, { status: 204 })
}

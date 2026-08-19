import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateRecurrencia } from '@/lib/recurrencias/schema'

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
    .from('recurrencias')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { message: 'Recurrencia no encontrada' },
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
    .from('recurrencias')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json(
      { message: 'Recurrencia no encontrada' },
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

  const merged = {
    tipo: body.tipo ?? existing.tipo,
    frecuencia: body.frecuencia ?? existing.frecuencia,
    dia_semana: body.frecuencia ? body.dia_semana : existing.dia_semana,
    dias_mes: body.frecuencia ? body.dias_mes : existing.dias_mes,
    monto_default: body.monto_default ?? existing.monto_default,
    categoria: body.categoria ?? existing.categoria,
    tipo_pago: body.tipo_pago ?? existing.tipo_pago,
    banco_id: body.banco_id !== undefined ? body.banco_id : existing.banco_id,
    fecha_inicio: body.fecha_inicio ?? existing.fecha_inicio,
    fecha_fin: body.fecha_fin !== undefined ? body.fecha_fin : existing.fecha_fin,
  }

  const validation = validateRecurrencia(merged)
  if (!validation.valid) {
    return NextResponse.json(
      { message: 'Datos inválidos', errors: validation.errors },
      { status: 400 }
    )
  }

  const esGasto = merged.tipo === 'gasto'
  const dataToUpdate = { ...body }

  if (esGasto && merged.banco_id) {
    const { data: banco, error: bancoError } = await supabase
      .from('bancos')
      .select('id')
      .eq('id', merged.banco_id)
      .eq('user_id', user.id)
      .single()

    if (bancoError || !banco) {
      return NextResponse.json(
        { message: 'Datos inválidos', errors: { banco_id: 'Banco inválido' } },
        { status: 400 }
      )
    }
    dataToUpdate.banco_id = banco.id
  }

  // Un cambio de tipo ingreso<->gasto invalida los campos exclusivos del
  // otro tipo -- se limpian aquí para no dejar basura de la modalidad
  // anterior (el CHECK de la migración los rechazaría de todos modos).
  if (!esGasto) {
    dataToUpdate.tipo_pago = null
    dataToUpdate.banco_id = null
    dataToUpdate.tienda = null
  }
  if (body.frecuencia === 'semanal') {
    dataToUpdate.dias_mes = null
  } else if (body.frecuencia) {
    dataToUpdate.dia_semana = null
  }

  const { data, error } = await supabase
    .from('recurrencias')
    .update(dataToUpdate)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { message: 'Error al actualizar recurrencia' },
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
    .from('recurrencias')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json(
      { message: 'Recurrencia no encontrada' },
      { status: 404 }
    )
  }

  const { error } = await supabase
    .from('recurrencias')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[recurrencias] error al eliminar:', error)
    return NextResponse.json(
      { message: error.message || 'Error al eliminar recurrencia' },
      { status: 500 }
    )
  }

  return NextResponse.json(null, { status: 204 })
}

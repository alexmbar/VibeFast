import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validatePresupuesto } from '@/lib/presupuestos/schema'

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
    .from('presupuestos')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { message: 'Presupuesto no encontrado' },
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
    .from('presupuestos')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json(
      { message: 'Presupuesto no encontrado' },
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

  if (body.categoria !== undefined || body.monto_limite !== undefined) {
    const validation = validatePresupuesto({
      categoria: body.categoria !== undefined ? body.categoria : existing.categoria,
      monto_limite: body.monto_limite !== undefined ? body.monto_limite : existing.monto_limite,
    })
    if (!validation.valid) {
      return NextResponse.json(
        { message: 'Datos inválidos', errors: validation.errors },
        { status: 400 }
      )
    }
  }

  const dataToUpdate = {}
  if (body.categoria !== undefined) dataToUpdate.categoria = body.categoria
  if (body.monto_limite !== undefined) dataToUpdate.monto_limite = body.monto_limite
  if (body.activo !== undefined) dataToUpdate.activo = body.activo

  // Resolver banco_id contra el catálogo del usuario, mismo criterio que
  // el POST.
  if (body.banco_id !== undefined) {
    if (body.banco_id) {
      const { data: banco, error: bancoError } = await supabase
        .from('bancos')
        .select('id, tipo, dia_corte')
        .eq('id', body.banco_id)
        .eq('user_id', user.id)
        .single()

      if (bancoError || !banco) {
        return NextResponse.json(
          { message: 'Datos inválidos', errors: { banco_id: 'Banco inválido' } },
          { status: 400 }
        )
      }
      if (banco.tipo !== 'credito' || !banco.dia_corte) {
        return NextResponse.json(
          {
            message: 'Datos inválidos',
            errors: { banco_id: 'El presupuesto por ciclo de corte requiere una tarjeta de crédito con día de corte configurado' },
          },
          { status: 400 }
        )
      }
      dataToUpdate.banco_id = banco.id
    } else {
      dataToUpdate.banco_id = null
    }
  }

  // Cambiar el límite o la tarjeta invalida la alerta ya enviada: si el
  // usuario subió el límite porque estaba por llegar a 100%, dejar la
  // marca vieja suprimiría un aviso legítimo con el nuevo límite.
  if (dataToUpdate.monto_limite !== undefined || dataToUpdate.banco_id !== undefined) {
    dataToUpdate.ultimo_alerta_pct = null
    dataToUpdate.ultimo_alerta_periodo_inicio = null
  }

  const { data, error } = await supabase
    .from('presupuestos')
    .update(dataToUpdate)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { message: 'Ya tienes un presupuesto activo para esta categoría' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { message: 'Error al actualizar presupuesto' },
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
    .from('presupuestos')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json(
      { message: 'Presupuesto no encontrado' },
      { status: 404 }
    )
  }

  // Soft delete, igual que bancos.activo: libera la categoría (índice
  // único parcial WHERE activo=true) para poder crear un presupuesto
  // nuevo después.
  const { error } = await supabase
    .from('presupuestos')
    .update({ activo: false })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json(
      { message: error.message || 'Error al eliminar presupuesto' },
      { status: 500 }
    )
  }

  return NextResponse.json(null, { status: 204 })
}

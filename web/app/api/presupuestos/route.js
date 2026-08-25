import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validatePresupuesto } from '@/lib/presupuestos/schema'

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
  const activo = searchParams.get('activo')

  let query = supabase
    .from('presupuestos')
    .select('*')
    .eq('user_id', user.id)
    .order('categoria', { ascending: true })

  if (activo !== null) {
    query = query.eq('activo', activo === 'true')
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json(
      { message: 'Error al listar presupuestos' },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}

export async function POST(request) {
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

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { message: 'Body inválido' },
      { status: 400 }
    )
  }

  const validation = validatePresupuesto(body)
  if (!validation.valid) {
    return NextResponse.json(
      { message: 'Datos inválidos', errors: validation.errors },
      { status: 400 }
    )
  }

  // Resolver banco_id contra el catálogo del usuario: el ciclo de corte
  // que usará presupuestos_estado exige una tarjeta de crédito con
  // dia_corte configurado. El trigger en BD es el respaldo duro; esto
  // solo da un mensaje legible antes de llegar ahí.
  let bancoId = null
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
    bancoId = banco.id
  }

  const { data, error } = await supabase
    .from('presupuestos')
    .insert({
      user_id: user.id,
      categoria: body.categoria,
      monto_limite: body.monto_limite,
      banco_id: bancoId,
    })
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
      { message: 'Error al crear presupuesto' },
      { status: 500 }
    )
  }

  return NextResponse.json(data, { status: 201 })
}

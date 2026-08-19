import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateRecurrencia, TIPOS } from '@/lib/recurrencias/schema'

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
  const tipo = searchParams.get('tipo')
  const activo = searchParams.get('activo')

  let query = supabase
    .from('recurrencias')
    .select('*')
    .eq('user_id', user.id)
    .order('activo', { ascending: false })
    .order('created_at', { ascending: false })

  if (tipo && TIPOS.includes(tipo)) {
    query = query.eq('tipo', tipo)
  }
  if (activo !== null) {
    query = query.eq('activo', activo === 'true')
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json(
      { message: 'Error al listar recurrencias' },
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

  const validation = validateRecurrencia(body)
  if (!validation.valid) {
    return NextResponse.json(
      { message: 'Datos inválidos', errors: validation.errors },
      { status: 400 }
    )
  }

  const esGasto = body.tipo === 'gasto'

  // Resolver banco_id contra el catálogo del usuario, igual que gastos
  // (solo aplica si tipo='gasto'; efectivo nunca lleva banco).
  let bancoId = null
  if (esGasto && body.banco_id) {
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
    bancoId = banco.id
  }

  const { data, error } = await supabase
    .from('recurrencias')
    .insert({
      user_id: user.id,
      tipo: body.tipo,
      frecuencia: body.frecuencia,
      dia_semana: body.frecuencia === 'semanal' ? body.dia_semana : null,
      dias_mes: body.frecuencia === 'semanal' ? null : body.dias_mes,
      monto_default: body.monto_default,
      categoria: body.categoria,
      tipo_pago: esGasto ? body.tipo_pago : null,
      banco_id: bancoId,
      tienda: esGasto ? (body.tienda || null) : null,
      notas: body.notas || null,
      activo: body.activo ?? true,
      fecha_inicio: body.fecha_inicio,
      fecha_fin: body.fecha_fin || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { message: 'Error al crear recurrencia' },
      { status: 500 }
    )
  }

  return NextResponse.json(data, { status: 201 })
}

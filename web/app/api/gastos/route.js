import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateGasto, CATEGORIAS, TIPOS_PAGO } from '@/lib/gastos/schema'
import { verificarPresupuesto } from '@/lib/presupuestos/verificar'

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

  // Parsear query params
  const { searchParams } = new URL(request.url)
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')
  const categoria = searchParams.get('categoria')
  const tipo_pago = searchParams.get('tipo_pago')
  const pendiente = searchParams.get('pendiente')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  // Construir query
  let query = supabase
    .from('gastos')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('fecha', { ascending: false })
    .range(offset, offset + limit - 1)

  // Aplicar filtros
  if (desde) {
    query = query.gte('fecha', desde)
  }
  if (hasta) {
    query = query.lte('fecha', hasta)
  }
  if (categoria && CATEGORIAS.includes(categoria)) {
    query = query.eq('categoria', categoria)
  }
  if (tipo_pago && TIPOS_PAGO.includes(tipo_pago)) {
    query = query.eq('tipo_pago', tipo_pago)
  }
  if (pendiente === 'true') {
    query = query.eq('monto_confirmado', false)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json(
      { message: 'Error al listar gastos' },
      { status: 500 }
    )
  }

  const response = NextResponse.json(data)
  response.headers.set('X-Total-Count', count || 0)
  return response
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

  // Validar datos
  const validation = validateGasto(body)
  if (!validation.valid) {
    return NextResponse.json(
      { message: 'Datos inválidos', errors: validation.errors },
      { status: 400 }
    )
  }

  // Resolver banco_id contra el catálogo del usuario y derivar el nombre
  // (columna banco denormalizada, la siguen leyendo listarGastos.js y
  // reportes existentes).
  let bancoId = null
  let bancoNombre = null
  if (body.banco_id) {
    const { data: banco, error: bancoError } = await supabase
      .from('bancos')
      .select('id, nombre')
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
    bancoNombre = banco.nombre
  }

  // Insertar gasto
  const { data, error } = await supabase
    .from('gastos')
    .insert({
      user_id: user.id,
      monto: body.monto,
      fecha: body.fecha,
      categoria: body.categoria,
      tipo_pago: body.tipo_pago,
      tienda: body.tienda || null,
      banco_id: bancoId,
      banco: bancoNombre,
      notas: body.notas || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { message: 'Error al crear gasto' },
      { status: 500 }
    )
  }

  await verificarPresupuesto(supabase, user.id, data.categoria)

  return NextResponse.json(data, { status: 201 })
}

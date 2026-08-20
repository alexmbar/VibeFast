import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateIngreso, CATEGORIAS } from '@/lib/ingresos/schema'

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
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')
  const categoria = searchParams.get('categoria')
  const pendiente = searchParams.get('pendiente')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('ingresos')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('fecha', { ascending: false })
    .range(offset, offset + limit - 1)

  if (desde) {
    query = query.gte('fecha', desde)
  }
  if (hasta) {
    query = query.lte('fecha', hasta)
  }
  if (categoria && CATEGORIAS.includes(categoria)) {
    query = query.eq('categoria', categoria)
  }
  if (pendiente === 'true') {
    query = query.eq('monto_confirmado', false)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json(
      { message: 'Error al listar ingresos' },
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

  const validation = validateIngreso(body)
  if (!validation.valid) {
    return NextResponse.json(
      { message: 'Datos inválidos', errors: validation.errors },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('ingresos')
    .insert({
      user_id: user.id,
      monto: body.monto,
      fecha: body.fecha,
      categoria: body.categoria,
      notas: body.notas || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { message: 'Error al crear ingreso' },
      { status: 500 }
    )
  }

  return NextResponse.json(data, { status: 201 })
}

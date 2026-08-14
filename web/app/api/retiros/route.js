import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateRetiro } from '@/lib/retiros/schema'

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
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('retiros')
    .select('*, banco:bancos(id, nombre, tipo)', { count: 'exact' })
    .eq('user_id', user.id)
    .order('fecha', { ascending: false })
    .range(offset, offset + limit - 1)

  if (desde) {
    query = query.gte('fecha', desde)
  }
  if (hasta) {
    query = query.lte('fecha', hasta)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json(
      { message: 'Error al listar retiros' },
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

  const validation = validateRetiro(body)
  if (!validation.valid) {
    return NextResponse.json(
      { message: 'Datos inválidos', errors: validation.errors },
      { status: 400 }
    )
  }

  // El banco debe existir, pertenecer al usuario, y ser de tipo débito.
  // El trigger de BD es el respaldo duro; esta validación es la que da
  // un mensaje de error legible en el formulario.
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

  const { data, error } = await supabase
    .from('retiros')
    .insert({
      user_id: user.id,
      monto: body.monto,
      fecha: body.fecha,
      banco_id: banco.id,
      notas: body.notas || null,
    })
    .select('*, banco:bancos(id, nombre, tipo)')
    .single()

  if (error) {
    return NextResponse.json(
      { message: 'Error al crear retiro' },
      { status: 500 }
    )
  }

  return NextResponse.json(data, { status: 201 })
}

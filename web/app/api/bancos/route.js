import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateBanco, TIPOS_BANCO } from '@/lib/bancos/schema'

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
    .from('bancos')
    .select('*')
    .eq('user_id', user.id)
    .order('nombre', { ascending: true })

  if (tipo && TIPOS_BANCO.includes(tipo)) {
    query = query.eq('tipo', tipo)
  }
  if (activo !== null) {
    query = query.eq('activo', activo === 'true')
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json(
      { message: 'Error al listar bancos' },
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

  const validation = validateBanco(body)
  if (!validation.valid) {
    return NextResponse.json(
      { message: 'Datos inválidos', errors: validation.errors },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('bancos')
    .insert({
      user_id: user.id,
      nombre: body.nombre.trim(),
      tipo: body.tipo,
    })
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
      { message: 'Error al crear banco' },
      { status: 500 }
    )
  }

  return NextResponse.json(data, { status: 201 })
}

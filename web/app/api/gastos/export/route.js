import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIAS, TIPOS_PAGO, centavosToPesos } from '@/lib/gastos/schema'

// Export completo (no paginado) de los gastos del usuario. Tope generoso
// para no jalar un historial sin fin en un solo request; consistente con
// el cap que usan las tools de solo lectura del agente de gastos.
const EXPORT_LIMIT = 10000

const COLUMNAS = ['fecha', 'monto', 'categoria', 'tipo_pago', 'tienda', 'banco', 'notas']

function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsv(gastos) {
  const header = COLUMNAS.join(',')
  const rows = gastos.map((g) =>
    COLUMNAS.map((col) =>
      csvEscape(col === 'monto' ? centavosToPesos(g.monto) : g[col])
    ).join(',')
  )
  return [header, ...rows].join('\n')
}

export async function GET(request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') === 'json' ? 'json' : 'csv'
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')
  const categoria = searchParams.get('categoria')
  const tipo_pago = searchParams.get('tipo_pago')

  let query = supabase
    .from('gastos')
    .select(COLUMNAS.join(','))
    .eq('user_id', user.id)
    .order('fecha', { ascending: false })
    .limit(EXPORT_LIMIT)

  if (desde) query = query.gte('fecha', desde)
  if (hasta) query = query.lte('fecha', hasta)
  if (categoria && CATEGORIAS.includes(categoria)) query = query.eq('categoria', categoria)
  if (tipo_pago && TIPOS_PAGO.includes(tipo_pago)) query = query.eq('tipo_pago', tipo_pago)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ message: 'Error al exportar gastos' }, { status: 500 })
  }

  const fecha = new Date().toISOString().slice(0, 10)

  if (format === 'json') {
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="gastos-${fecha}.json"`,
      },
    })
  }

  return new NextResponse(toCsv(data), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="gastos-${fecha}.csv"`,
    },
  })
}

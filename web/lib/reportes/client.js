// Cliente para reportes que no encajan en listarGastos/listarIngresos.

export async function obtenerReportesResumen(filters = {}) {
  const params = new URLSearchParams()
  if (filters.desde) params.append('desde', filters.desde)
  if (filters.hasta) params.append('hasta', filters.hasta)

  const query = params.toString()
  const url = query ? `/api/reportes/resumen?${query}` : '/api/reportes/resumen'

  const res = await fetch(url)

  if (!res.ok) {
    throw new Error('Error al calcular el resumen de reportes')
  }

  return res.json()
}

export async function obtenerGastosPorCorte(bancoId, ciclos = 12) {
  const params = new URLSearchParams({ banco_id: bancoId, ciclos: String(ciclos) })

  const res = await fetch(`/api/reportes/gastos-por-corte?${params}`)

  if (!res.ok) {
    throw new Error('Error al calcular gastos por corte')
  }

  return res.json()
}

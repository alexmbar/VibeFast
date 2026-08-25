// Cliente para reportes que no encajan en listarGastos/listarIngresos.

export async function obtenerGastosPorCorte(bancoId, ciclos = 12) {
  const params = new URLSearchParams({ banco_id: bancoId, ciclos: String(ciclos) })

  const res = await fetch(`/api/reportes/gastos-por-corte?${params}`)

  if (!res.ok) {
    throw new Error('Error al calcular gastos por corte')
  }

  return res.json()
}

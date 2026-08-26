// Cliente para la vista combinada de gastos + ingresos + retiros

export async function listarTransacciones(filters = {}) {
  const params = new URLSearchParams()

  if (filters.desde) params.append('desde', filters.desde)
  if (filters.hasta) params.append('hasta', filters.hasta)
  if (filters.tipo) params.append('tipo', filters.tipo)

  const query = params.toString()
  const url = query ? `/api/transacciones?${query}` : '/api/transacciones'

  const res = await fetch(url)

  if (!res.ok) {
    throw new Error('Error al listar transacciones')
  }

  return res.json()
}
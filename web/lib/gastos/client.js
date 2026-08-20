// Cliente para interactuar con API de gastos

export async function crearGasto(data) {
  const res = await fetch('/api/gastos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Error al crear gasto')
  }

  return res.json()
}

export async function listarGastos(filters = {}) {
  const params = new URLSearchParams()

  if (filters.desde) params.append('desde', filters.desde)
  if (filters.hasta) params.append('hasta', filters.hasta)
  if (filters.categoria) params.append('categoria', filters.categoria)
  if (filters.tipo_pago) params.append('tipo_pago', filters.tipo_pago)
  if (filters.pendiente) params.append('pendiente', filters.pendiente)
  if (filters.limit) params.append('limit', filters.limit)
  if (filters.offset) params.append('offset', filters.offset)

  const query = params.toString()
  const url = query ? `/api/gastos?${query}` : '/api/gastos'

  const res = await fetch(url)

  if (!res.ok) {
    throw new Error('Error al listar gastos')
  }

  return {
    gastos: await res.json(),
    total: parseInt(res.headers.get('X-Total-Count') || '0'),
  }
}

export async function obtenerGasto(id) {
  const res = await fetch(`/api/gastos/${id}`)

  if (!res.ok) {
    if (res.status === 404) throw new Error('Gasto no encontrado')
    throw new Error('Error al obtener gasto')
  }

  return res.json()
}

export async function actualizarGasto(id, data) {
  const res = await fetch(`/api/gastos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Error al actualizar gasto')
  }

  return res.json()
}

export async function eliminarGasto(id) {
  const res = await fetch(`/api/gastos/${id}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || 'Error al eliminar gasto')
  }
}

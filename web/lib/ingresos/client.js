// Cliente para interactuar con API de ingresos

export async function crearIngreso(data) {
  const res = await fetch('/api/ingresos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Error al crear ingreso')
  }

  return res.json()
}

export async function listarIngresos(filters = {}) {
  const params = new URLSearchParams()

  if (filters.desde) params.append('desde', filters.desde)
  if (filters.hasta) params.append('hasta', filters.hasta)
  if (filters.categoria) params.append('categoria', filters.categoria)
  if (filters.pendiente) params.append('pendiente', filters.pendiente)
  if (filters.limit) params.append('limit', filters.limit)
  if (filters.offset) params.append('offset', filters.offset)

  const query = params.toString()
  const url = query ? `/api/ingresos?${query}` : '/api/ingresos'

  const res = await fetch(url)

  if (!res.ok) {
    throw new Error('Error al listar ingresos')
  }

  return {
    ingresos: await res.json(),
    total: parseInt(res.headers.get('X-Total-Count') || '0'),
  }
}

export async function obtenerIngreso(id) {
  const res = await fetch(`/api/ingresos/${id}`)

  if (!res.ok) {
    if (res.status === 404) throw new Error('Ingreso no encontrado')
    throw new Error('Error al obtener ingreso')
  }

  return res.json()
}

export async function actualizarIngreso(id, data) {
  const res = await fetch(`/api/ingresos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Error al actualizar ingreso')
  }

  return res.json()
}

export async function eliminarIngreso(id) {
  const res = await fetch(`/api/ingresos/${id}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || 'Error al eliminar ingreso')
  }
}

export async function obtenerBalanceNeto(filters = {}) {
  const params = new URLSearchParams()
  if (filters.desde) params.append('desde', filters.desde)
  if (filters.hasta) params.append('hasta', filters.hasta)

  const query = params.toString()
  const url = query ? `/api/balance-neto?${query}` : '/api/balance-neto'

  const res = await fetch(url)

  if (!res.ok) {
    throw new Error('Error al calcular balance neto')
  }

  return res.json()
}

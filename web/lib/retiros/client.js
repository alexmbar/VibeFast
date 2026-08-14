// Cliente para interactuar con API de retiros

export async function crearRetiro(data) {
  const res = await fetch('/api/retiros', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Error al crear retiro')
  }

  return res.json()
}

export async function listarRetiros(filters = {}) {
  const params = new URLSearchParams()

  if (filters.desde) params.append('desde', filters.desde)
  if (filters.hasta) params.append('hasta', filters.hasta)
  if (filters.limit) params.append('limit', filters.limit)
  if (filters.offset) params.append('offset', filters.offset)

  const query = params.toString()
  const url = query ? `/api/retiros?${query}` : '/api/retiros'

  const res = await fetch(url)

  if (!res.ok) {
    throw new Error('Error al listar retiros')
  }

  return {
    retiros: await res.json(),
    total: parseInt(res.headers.get('X-Total-Count') || '0'),
  }
}

export async function obtenerRetiro(id) {
  const res = await fetch(`/api/retiros/${id}`)

  if (!res.ok) {
    if (res.status === 404) throw new Error('Retiro no encontrado')
    throw new Error('Error al obtener retiro')
  }

  return res.json()
}

export async function actualizarRetiro(id, data) {
  const res = await fetch(`/api/retiros/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Error al actualizar retiro')
  }

  return res.json()
}

export async function eliminarRetiro(id) {
  const res = await fetch(`/api/retiros/${id}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || 'Error al eliminar retiro')
  }
}

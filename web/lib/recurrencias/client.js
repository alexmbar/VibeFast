// Cliente para interactuar con API de recurrencias

export async function crearRecurrencia(data) {
  const res = await fetch('/api/recurrencias', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Error al crear recurrencia')
  }

  return res.json()
}

export async function listarRecurrencias(filters = {}) {
  const params = new URLSearchParams()

  if (filters.tipo) params.append('tipo', filters.tipo)
  if (filters.activo !== undefined) params.append('activo', filters.activo)

  const query = params.toString()
  const url = query ? `/api/recurrencias?${query}` : '/api/recurrencias'

  const res = await fetch(url)

  if (!res.ok) {
    throw new Error('Error al listar recurrencias')
  }

  return res.json()
}

export async function obtenerRecurrencia(id) {
  const res = await fetch(`/api/recurrencias/${id}`)

  if (!res.ok) {
    if (res.status === 404) throw new Error('Recurrencia no encontrada')
    throw new Error('Error al obtener recurrencia')
  }

  return res.json()
}

export async function actualizarRecurrencia(id, data) {
  const res = await fetch(`/api/recurrencias/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Error al actualizar recurrencia')
  }

  return res.json()
}

export async function eliminarRecurrencia(id) {
  const res = await fetch(`/api/recurrencias/${id}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || 'Error al eliminar recurrencia')
  }
}

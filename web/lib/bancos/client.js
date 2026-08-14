// Cliente para interactuar con API de bancos

export async function crearBanco(data) {
  const res = await fetch('/api/bancos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Error al crear banco')
  }

  return res.json()
}

export async function listarBancos(filters = {}) {
  const params = new URLSearchParams()

  if (filters.tipo) params.append('tipo', filters.tipo)
  if (filters.activo !== undefined) params.append('activo', filters.activo)

  const query = params.toString()
  const url = query ? `/api/bancos?${query}` : '/api/bancos'

  const res = await fetch(url)

  if (!res.ok) {
    throw new Error('Error al listar bancos')
  }

  return res.json()
}

export async function obtenerBanco(id) {
  const res = await fetch(`/api/bancos/${id}`)

  if (!res.ok) {
    if (res.status === 404) throw new Error('Banco no encontrado')
    throw new Error('Error al obtener banco')
  }

  return res.json()
}

export async function actualizarBanco(id, data) {
  const res = await fetch(`/api/bancos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Error al actualizar banco')
  }

  return res.json()
}

export async function eliminarBanco(id) {
  const res = await fetch(`/api/bancos/${id}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || 'Error al eliminar banco')
  }
}

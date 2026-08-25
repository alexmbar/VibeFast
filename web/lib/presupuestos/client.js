// Cliente para interactuar con API de presupuestos

export async function crearPresupuesto(data) {
  const res = await fetch('/api/presupuestos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Error al crear presupuesto')
  }

  return res.json()
}

export async function listarPresupuestos(filters = {}) {
  const params = new URLSearchParams()

  if (filters.activo !== undefined) params.append('activo', filters.activo)

  const query = params.toString()
  const url = query ? `/api/presupuestos?${query}` : '/api/presupuestos'

  const res = await fetch(url)

  if (!res.ok) {
    throw new Error('Error al listar presupuestos')
  }

  return res.json()
}

export async function obtenerPresupuesto(id) {
  const res = await fetch(`/api/presupuestos/${id}`)

  if (!res.ok) {
    if (res.status === 404) throw new Error('Presupuesto no encontrado')
    throw new Error('Error al obtener presupuesto')
  }

  return res.json()
}

export async function actualizarPresupuesto(id, data) {
  const res = await fetch(`/api/presupuestos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Error al actualizar presupuesto')
  }

  return res.json()
}

export async function eliminarPresupuesto(id) {
  const res = await fetch(`/api/presupuestos/${id}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || 'Error al eliminar presupuesto')
  }
}

// Gasto acumulado del periodo vigente por presupuesto activo -- ver
// presupuestos_estado (migracion 038).
export async function obtenerEstadoPresupuestos() {
  const res = await fetch('/api/presupuestos/estado')

  if (!res.ok) {
    throw new Error('Error al calcular el estado de presupuestos')
  }

  return res.json()
}

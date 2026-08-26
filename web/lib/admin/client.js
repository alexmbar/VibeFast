// Cliente para interactuar con la API de /admin (panel del dueño)

export async function listarUsuarios({ orderBy, orderDir, limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams()
  if (orderBy) params.append('orderBy', orderBy)
  if (orderDir) params.append('orderDir', orderDir)
  params.append('limit', limit)
  params.append('offset', offset)

  const res = await fetch(`/api/admin/usuarios?${params.toString()}`)
  if (!res.ok) throw new Error('Error al listar usuarios')

  return {
    usuarios: await res.json(),
    total: parseInt(res.headers.get('X-Total-Count') || '0'),
  }
}

export async function obtenerUsuario(id) {
  const res = await fetch(`/api/admin/usuarios/${id}`)
  if (!res.ok) {
    if (res.status === 404) throw new Error('Usuario no encontrado')
    throw new Error('Error al obtener usuario')
  }
  return res.json()
}

export async function actualizarEstadoCuenta(id, estadoCuenta) {
  const res = await fetch(`/api/admin/usuarios/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado_cuenta: estadoCuenta }),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || 'Error al actualizar usuario')
  }
  return res.json()
}

export async function obtenerMetricasNegocio() {
  const res = await fetch('/api/admin/metricas')
  if (!res.ok) throw new Error('Error al obtener métricas')
  return res.json()
}

export async function listarIntegraciones({ tipo, nivel, resuelto, orderBy, orderDir, limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams()
  if (tipo) params.append('tipo', tipo)
  if (nivel) params.append('nivel', nivel)
  if (resuelto != null) params.append('resuelto', resuelto)
  if (orderBy) params.append('orderBy', orderBy)
  if (orderDir) params.append('orderDir', orderDir)
  params.append('limit', limit)
  params.append('offset', offset)

  const res = await fetch(`/api/admin/integraciones?${params.toString()}`)
  if (!res.ok) throw new Error('Error al listar integraciones')

  return {
    eventos: await res.json(),
    total: parseInt(res.headers.get('X-Total-Count') || '0'),
  }
}

export async function obtenerCostosOpenai({ desde, hasta } = {}) {
  const params = new URLSearchParams()
  if (desde) params.append('desde', desde)
  if (hasta) params.append('hasta', hasta)

  const query = params.toString()
  const res = await fetch(query ? `/api/admin/costos?${query}` : '/api/admin/costos')
  if (!res.ok) throw new Error('Error al obtener costos')
  return res.json()
}

// Cliente para interactuar con API de Cartera

export async function obtenerCartera() {
  const res = await fetch('/api/cartera')

  if (!res.ok) {
    throw new Error('Error al obtener Cartera')
  }

  return res.json()
}

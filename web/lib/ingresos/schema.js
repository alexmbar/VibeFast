// Enums y validaciones para ingresos

export const CATEGORIAS = [
  'nomina',
  'bono',
  'reembolso',
  'venta',
  'regalo',
  'inversion',
  'otro',
]

// Labels con acento para UI
export const CATEGORIA_LABELS = {
  nomina: 'Nómina',
  bono: 'Bono',
  reembolso: 'Reembolso',
  venta: 'Venta',
  regalo: 'Regalo',
  inversion: 'Inversión',
  otro: 'Otro',
}

// Validaciones básicas
export function validateIngreso(data) {
  const errors = {}

  if (!data.monto || data.monto <= 0) {
    errors.monto = 'Monto debe ser mayor a 0'
  }

  if (!data.fecha) {
    errors.fecha = 'Fecha es requerida'
  } else {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const selectedDate = new Date(data.fecha)
    if (selectedDate > today) {
      errors.fecha = 'Fecha no puede ser en el futuro'
    }
  }

  if (!data.categoria || !CATEGORIAS.includes(data.categoria)) {
    errors.categoria = 'Categoría inválida'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

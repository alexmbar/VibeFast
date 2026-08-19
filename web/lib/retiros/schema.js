// Validaciones para retiros

import { MONTO_MAXIMO_CENTAVOS } from '@/lib/gastos/schema'

export function validateRetiro(data) {
  const errors = {}

  if (!data.monto || data.monto <= 0) {
    errors.monto = 'Monto debe ser mayor a 0'
  } else if (data.monto > MONTO_MAXIMO_CENTAVOS) {
    errors.monto = 'Monto demasiado grande'
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

  if (!data.banco_id) {
    errors.banco_id = 'Banco es requerido'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

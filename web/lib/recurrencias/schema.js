// Enums y validaciones para recurrencias (motor compartido ingresos/gastos)

import {
  CATEGORIAS as CATEGORIAS_INGRESO,
  CATEGORIA_LABELS as CATEGORIA_LABELS_INGRESO,
} from '@/lib/ingresos/schema'
import {
  CATEGORIAS as CATEGORIAS_GASTO,
  CATEGORIA_LABELS as CATEGORIA_LABELS_GASTO,
  TIPOS_PAGO,
  TIPO_PAGO_LABELS,
  MONTO_MAXIMO_CENTAVOS,
} from '@/lib/gastos/schema'

export { TIPOS_PAGO, TIPO_PAGO_LABELS }

export const TIPOS = ['ingreso', 'gasto']

export const TIPO_LABELS = {
  ingreso: 'Ingreso',
  gasto: 'Gasto',
}

export const FRECUENCIAS = ['semanal', 'quincenal', 'mensual']

export const FRECUENCIA_LABELS = {
  semanal: 'Semanal',
  quincenal: 'Quincenal',
  mensual: 'Mensual',
}

export const DIA_SEMANA_LABELS = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
]

// Categorías/labels válidas según el tipo de la regla (ingreso: 7 valores,
// gasto: 20 valores) -- una regla de recurrencia nunca mezcla ambos catálogos.
export function categoriasDe(tipo) {
  return tipo === 'ingreso' ? CATEGORIAS_INGRESO : CATEGORIAS_GASTO
}

export function categoriaLabelsDe(tipo) {
  return tipo === 'ingreso' ? CATEGORIA_LABELS_INGRESO : CATEGORIA_LABELS_GASTO
}

export function validateRecurrencia(data) {
  const errors = {}

  if (!data.tipo || !TIPOS.includes(data.tipo)) {
    errors.tipo = 'Tipo inválido'
  }

  if (!data.frecuencia || !FRECUENCIAS.includes(data.frecuencia)) {
    errors.frecuencia = 'Frecuencia inválida'
  } else if (data.frecuencia === 'semanal') {
    if (data.dia_semana === undefined || data.dia_semana === null || data.dia_semana < 0 || data.dia_semana > 6) {
      errors.dia_semana = 'Día de la semana inválido'
    }
  } else {
    const cantidadEsperada = data.frecuencia === 'mensual' ? 1 : 2
    const diasMes = Array.isArray(data.dias_mes) ? data.dias_mes : []
    if (diasMes.length !== cantidadEsperada || diasMes.some(d => !Number.isInteger(d) || d < 1 || d > 31)) {
      errors.dias_mes = data.frecuencia === 'mensual'
        ? 'Selecciona el día del mes'
        : 'Selecciona los dos días del mes'
    }
  }

  if (!data.monto_default || data.monto_default <= 0) {
    errors.monto_default = 'Monto debe ser mayor a 0'
  } else if (data.monto_default > MONTO_MAXIMO_CENTAVOS) {
    errors.monto_default = 'Monto demasiado grande'
  }

  if (data.tipo && TIPOS.includes(data.tipo)) {
    if (!data.categoria || !categoriasDe(data.tipo).includes(data.categoria)) {
      errors.categoria = 'Categoría inválida'
    }
  }

  if (data.tipo === 'gasto') {
    if (!data.tipo_pago || !TIPOS_PAGO.includes(data.tipo_pago)) {
      errors.tipo_pago = 'Tipo de pago inválido'
    }
    if (data.tipo_pago === 'efectivo' && data.banco_id) {
      errors.banco_id = 'Efectivo no debe tener banco asociado'
    }
  }

  if (!data.fecha_inicio) {
    errors.fecha_inicio = 'Fecha de inicio es requerida'
  }

  if (data.fecha_inicio && data.fecha_fin && data.fecha_fin < data.fecha_inicio) {
    errors.fecha_fin = 'Fecha fin no puede ser anterior a fecha inicio'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

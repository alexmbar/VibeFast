// Validaciones para presupuestos (limite de gasto por categoria).
// Las categorias son las mismas de gastos (CATEGORIAS/CATEGORIA_LABELS
// en @/lib/gastos/schema) -- no se redefinen aqui.

import { CATEGORIAS, MONTO_MAXIMO_CENTAVOS } from '@/lib/gastos/schema'

export const PCT_ACERCANDOSE = 80
export const PCT_EXCEDIDO = 100

export function validatePresupuesto(data) {
  const errors = {}

  if (!data.categoria || !CATEGORIAS.includes(data.categoria)) {
    errors.categoria = 'Categoría inválida'
  }

  if (!data.monto_limite || data.monto_limite <= 0) {
    errors.monto_limite = 'Límite debe ser mayor a 0'
  } else if (data.monto_limite > MONTO_MAXIMO_CENTAVOS) {
    errors.monto_limite = 'Límite demasiado grande'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

// % gastado del periodo vigente. Se reusa igual en la tabla, las
// alertas y verificarPresupuesto para no repetir la formula.
export function calcularPct(totalGastado, montoLimite) {
  if (!montoLimite) return 0
  return Math.floor((totalGastado * 100) / montoLimite)
}

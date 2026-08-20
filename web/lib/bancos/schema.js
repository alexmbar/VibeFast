// Enums y validaciones para bancos (catalogo por usuario)

export const TIPOS_BANCO = ['debito', 'credito']

export const TIPO_BANCO_LABELS = {
  debito: 'Débito',
  credito: 'Crédito',
}

// Solo tienen sentido en bancos tipo='credito' -- ver 022_bancos_datos_credito.sql.
// alias no va aqui: aplica a cualquier tipo (ver 024_onboarding_wizard.sql).
export const CAMPOS_CREDITO = ['dia_corte', 'dia_limite_pago', 'limite_credito', 'tasa_interes']

function campoVacio(valor) {
  return valor === undefined || valor === null || valor === ''
}

export function validateBanco(data) {
  const errors = {}

  if (!data.nombre || !data.nombre.trim()) {
    errors.nombre = 'Nombre es requerido'
  }

  if (!data.tipo || !TIPOS_BANCO.includes(data.tipo)) {
    errors.tipo = 'Tipo inválido'
  }

  if (!campoVacio(data.dia_corte)) {
    const dia = Number(data.dia_corte)
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
      errors.dia_corte = 'Día de corte debe ser entre 1 y 31'
    }
  }

  if (!campoVacio(data.dia_limite_pago)) {
    const dia = Number(data.dia_limite_pago)
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
      errors.dia_limite_pago = 'Día límite de pago debe ser entre 1 y 31'
    }
  }

  if (!campoVacio(data.limite_credito)) {
    const monto = Number(data.limite_credito)
    if (!Number.isFinite(monto) || monto <= 0) {
      errors.limite_credito = 'Límite de crédito debe ser mayor a 0'
    }
  }

  if (!campoVacio(data.tasa_interes)) {
    const tasa = Number(data.tasa_interes)
    if (!Number.isFinite(tasa) || tasa < 0) {
      errors.tasa_interes = 'Tasa de interés inválida'
    }
  }

  // Los campos de credito no aplican a un banco tipo=debito -- misma logica
  // que la regla de efectivo/banco_id en gastos (ver CLAUDE.md).
  if (data.tipo !== 'credito') {
    for (const campo of CAMPOS_CREDITO) {
      if (!campoVacio(data[campo])) {
        errors[campo] = 'Solo aplica para bancos tipo crédito'
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

// Enums y validaciones para bancos (catalogo por usuario)

export const TIPOS_BANCO = ['debito', 'credito']

export const TIPO_BANCO_LABELS = {
  debito: 'Débito',
  credito: 'Crédito',
}

export function validateBanco(data) {
  const errors = {}

  if (!data.nombre || !data.nombre.trim()) {
    errors.nombre = 'Nombre es requerido'
  }

  if (!data.tipo || !TIPOS_BANCO.includes(data.tipo)) {
    errors.tipo = 'Tipo inválido'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

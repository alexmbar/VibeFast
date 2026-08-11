// Enums y validaciones para gastos

export const CATEGORIAS = [
  'supermercado',
  'restaurantes',
  'cafeteria',
  'transporte',
  'gasolina',
  'salud',
  'farmacia',
  'hogar',
  'servicios',
  'renta',
  'educacion',
  'entretenimiento',
  'ropa',
  'tecnologia',
  'viajes',
  'mascotas',
  'regalos',
  'impuestos',
  'comisiones',
  'otros',
]

export const TIPOS_PAGO = [
  'efectivo',
  'debito',
  'credito',
  'transferencia',
  'domiciliado',
  'vales',
  'otro',
]

// Labels con acento para UI
export const CATEGORIA_LABELS = {
  supermercado: 'Supermercado',
  restaurantes: 'Restaurantes',
  cafeteria: 'Cafetería',
  transporte: 'Transporte',
  gasolina: 'Gasolina',
  salud: 'Salud',
  farmacia: 'Farmacia',
  hogar: 'Hogar',
  servicios: 'Servicios',
  renta: 'Renta',
  educacion: 'Educación',
  entretenimiento: 'Entretenimiento',
  ropa: 'Ropa',
  tecnologia: 'Tecnología',
  viajes: 'Viajes',
  mascotas: 'Mascotas',
  regalos: 'Regalos',
  impuestos: 'Impuestos',
  comisiones: 'Comisiones',
  otros: 'Otros',
}

export const TIPO_PAGO_LABELS = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  credito: 'Crédito',
  transferencia: 'Transferencia',
  domiciliado: 'Domiciliado',
  vales: 'Vales',
  otro: 'Otro',
}

// Validaciones básicas
export function validateGasto(data) {
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

  if (!data.tipo_pago || !TIPOS_PAGO.includes(data.tipo_pago)) {
    errors.tipo_pago = 'Tipo de pago inválido'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

// Convertir pesos a centavos
export function pesosTocentavos(pesos) {
  return Math.round(parseFloat(pesos) * 100)
}

// Convertir centavos a pesos
export function centavosToPesos(centavos) {
  return (centavos / 100).toFixed(2)
}

// Formatear monto para display (es-MX)
export function formatMonto(centavos) {
  const pesos = centavos / 100
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(pesos)
}

// Formatear fecha para input type="date"
export function formatDate(date) {
  if (typeof date === 'string') return date
  const d = new Date(date)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

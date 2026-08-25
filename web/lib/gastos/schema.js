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

// monto es INTEGER en la base de datos (centavos): tope real de
// Postgres int4, no un límite de negocio.
export const MONTO_MAXIMO_CENTAVOS = 2147483647

// Validaciones básicas
export function validateGasto(data) {
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

  if (!data.categoria || !CATEGORIAS.includes(data.categoria)) {
    errors.categoria = 'Categoría inválida'
  }

  if (!data.tipo_pago || !TIPOS_PAGO.includes(data.tipo_pago)) {
    errors.tipo_pago = 'Tipo de pago inválido'
  }

  if (data.tipo_pago === 'efectivo' && data.banco_id) {
    errors.banco_id = 'Efectivo no debe tener banco asociado'
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

// Formatear monto para display (es-MX). `moneda` es la preferencia del
// usuario (MXN/USD, ver lib/config/schema.js); el locale se queda fijo en
// es-MX -- solo cambia el codigo/simbolo de moneda, no el idioma de la UI.
export function formatMonto(centavos, moneda = 'MXN') {
  const pesos = centavos / 100
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: moneda,
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

// Extraer hora de timestamp created_at
export function extractHora(createdAt) {
  if (!createdAt) return horaActual()
  const d = new Date(createdAt)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

// Obtener hora actual en formato HH:MM
export function horaActual() {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

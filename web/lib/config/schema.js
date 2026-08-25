// Enums de configuracion por usuario (zona horaria, moneda, formato de
// fecha). Mismo patron que CATEGORIAS/CATEGORIA_LABELS en lib/gastos/schema.js.

export const ZONAS_HORARIAS = [
  'America/Mexico_City',
  'America/Tijuana',
  'America/Hermosillo',
  'America/Cancun',
]

export const MONEDAS = ['MXN', 'USD']

export const FORMATOS_FECHA = ['DD/MM/AAAA', 'MM/DD/AAAA', 'AAAA-MM-DD']

export const ZONA_HORARIA_LABELS = {
  'America/Mexico_City': 'Ciudad de México',
  'America/Tijuana': 'Tijuana',
  'America/Hermosillo': 'Hermosillo',
  'America/Cancun': 'Cancún',
}

export const MONEDA_LABELS = {
  MXN: 'Peso mexicano (MXN)',
  USD: 'Dólar estadounidense (USD)',
}

export const FORMATO_FECHA_LABELS = {
  'DD/MM/AAAA': 'DD/MM/AAAA',
  'MM/DD/AAAA': 'MM/DD/AAAA',
  'AAAA-MM-DD': 'AAAA-MM-DD',
}

export const ZONA_HORARIA_DEFAULT = 'America/Mexico_City'
export const MONEDA_DEFAULT = 'MXN'
export const FORMATO_FECHA_DEFAULT = 'DD/MM/AAAA'

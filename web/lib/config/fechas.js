import { FORMATO_FECHA_DEFAULT, ZONA_HORARIA_DEFAULT } from './schema'

// "Hoy" (YYYY-MM-DD) en una zona horaria dada. Nunca new Date() a secas: la
// funcion de Vercel corre en UTC y este proyecto ya tuvo bugs de fechas
// corridas por este motivo (ver regla 2 de "Reglas de esquema" en
// CLAUDE.md). Reemplaza las copias duplicadas que existian de esta misma
// logica hardcodeada a America/Mexico_City.
export function hoyEnZona(timezone = ZONA_HORARIA_DEFAULT) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const valores = Object.fromEntries(partes.map(p => [p.type, p.value]))
  return `${valores.year}-${valores.month}-${valores.day}`
}

// Formatea una fecha YYYY-MM-DD (o Date) para mostrarla en tablas, segun el
// formato_fecha del usuario. Pura manipulacion de string sobre un valor
// date-only ya resuelto -- nunca pasa por Intl+timeZone, porque
// reinterpretar un date-only string con un huso horario es exactamente el
// tipo de bug de "un dia corrido" que este proyecto ya tuvo. No confundir
// con formatDate() de lib/gastos/schema.js, que sigue existiendo para el
// value de <input type="date"> (siempre YYYY-MM-DD, requisito del elemento
// HTML, no cambia con esta preferencia).
export function formatFechaDisplay(fecha, formato = FORMATO_FECHA_DEFAULT) {
  const iso = typeof fecha === 'string' ? fecha : formatDateISO(fecha)
  const [anio, mes, dia] = iso.split('-')
  if (formato === 'MM/DD/AAAA') return `${mes}/${dia}/${anio}`
  if (formato === 'AAAA-MM-DD') return iso
  return `${dia}/${mes}/${anio}` // DD/MM/AAAA, default
}

function formatDateISO(date) {
  const d = new Date(date)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

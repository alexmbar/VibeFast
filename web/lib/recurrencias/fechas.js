// Calculo de ocurrencias de una regla de recurrencia dentro de un rango de
// fechas. Todo aqui opera sobre fechas civiles (YYYY-MM-DD) usando Date.UTC
// solo como calculadora de calendario -- nunca hora local ni timestamptz,
// para no repetir el bug de "el dia se corre" que ya tuvo este proyecto
// (ver regla 2 de "Reglas de esquema" en CLAUDE.md).

function parseFecha(fecha) {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return { anio, mes, dia }
}

function formatFecha(anio, mes, dia) {
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

function diasEnMes(anio, mes) {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate()
}

// Clampa un dia objetivo (1-31) al ultimo dia real del mes si el mes es mas
// corto (ej. dia 31 en febrero -> 28 o 29).
export function resolverDiaMes(anio, mes, diaObjetivo) {
  return Math.min(diaObjetivo, diasEnMes(anio, mes))
}

function diaSemanaDe(anio, mes, dia) {
  return new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()
}

function cae(regla, anio, mes, dia) {
  if (regla.frecuencia === 'semanal') {
    return diaSemanaDe(anio, mes, dia) === regla.dia_semana
  }

  // mensual (1 elemento) y quincenal (2 elementos) comparten la misma
  // logica: cae si el dia coincide con alguno de los dias_mes resueltos.
  const diasResueltos = regla.dias_mes.map(d => resolverDiaMes(anio, mes, d))
  return diasResueltos.includes(dia)
}

// Dia calendario siguiente a `fecha` (YYYY-MM-DD), usado por el cron para
// no reprocesar la fecha que ya quedo registrada en ultima_generacion.
export function siguienteDia(fecha) {
  const { anio, mes, dia } = parseFecha(fecha)
  const siguiente = new Date(Date.UTC(anio, mes - 1, dia))
  siguiente.setUTCDate(siguiente.getUTCDate() + 1)
  return formatFecha(siguiente.getUTCFullYear(), siguiente.getUTCMonth() + 1, siguiente.getUTCDate())
}

// Devuelve el arreglo de fechas (YYYY-MM-DD) en que `regla` cae dentro de
// [desde, hasta], ambos inclusive.
export function ocurrenciasEnRango(regla, desde, hasta) {
  if (!desde || !hasta || desde > hasta) return []

  const inicio = parseFecha(desde)
  const fin = parseFecha(hasta)
  const cursor = new Date(Date.UTC(inicio.anio, inicio.mes - 1, inicio.dia))
  const limite = new Date(Date.UTC(fin.anio, fin.mes - 1, fin.dia))

  const ocurrencias = []
  while (cursor.getTime() <= limite.getTime()) {
    const anio = cursor.getUTCFullYear()
    const mes = cursor.getUTCMonth() + 1
    const dia = cursor.getUTCDate()

    if (cae(regla, anio, mes, dia)) {
      ocurrencias.push(formatFecha(anio, mes, dia))
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return ocurrencias
}

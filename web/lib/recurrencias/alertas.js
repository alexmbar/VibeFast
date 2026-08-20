// Alertas de recurrencias dentro de la app: ocurrencias ya generadas que
// siguen pendientes de confirmar (monto_confirmado = false) y ocurrencias
// de reglas activas por venir en los proximos dias.

import { listarGastos } from '@/lib/gastos/client'
import { listarIngresos } from '@/lib/ingresos/client'
import { listarRecurrencias } from '@/lib/recurrencias/client'
import { ocurrenciasEnRango } from '@/lib/recurrencias/fechas'
import { categoriaLabelsDe } from '@/lib/recurrencias/schema'

// El cron solo genera hasta hoy, nunca por adelantado (ver
// generar-recurrencias/route.js), asi que la ventana de "proxima a
// generarse" empieza manana: si empezara hoy se traslaparia con el aviso
// de "pendiente de confirmar" en cuanto el cron corriera.
export const VENTANA_PROXIMA_DIAS = 3

function toISODate(d) {
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

function addDias(d, dias) {
  const copia = new Date(d)
  copia.setDate(copia.getDate() + dias)
  return copia
}

function diffDias(desdeISO, hastaISO) {
  const [ay, am, ad] = desdeISO.split('-').map(Number)
  const [by, bm, bd] = hastaISO.split('-').map(Number)
  const desde = Date.UTC(ay, am - 1, ad)
  const hasta = Date.UTC(by, bm - 1, bd)
  return Math.round((hasta - desde) / 86400000)
}

export async function obtenerAlertasRecurrencias() {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const hoyISO = toISODate(hoy)
  const mananaISO = toISODate(addDias(hoy, 1))
  const finVentanaISO = toISODate(addDias(hoy, VENTANA_PROXIMA_DIAS))

  const [gastosPendientes, ingresosPendientes, reglasActivas] = await Promise.all([
    listarGastos({ pendiente: true, limit: 100 }),
    listarIngresos({ pendiente: true, limit: 100 }),
    listarRecurrencias({ activo: true }),
  ])

  const proximas = []
  reglasActivas.forEach((regla) => {
    const desde = regla.fecha_inicio > mananaISO ? regla.fecha_inicio : mananaISO
    const hasta = regla.fecha_fin && regla.fecha_fin < finVentanaISO ? regla.fecha_fin : finVentanaISO
    if (desde > hasta) return

    ocurrenciasEnRango(regla, desde, hasta).forEach((fecha) => {
      proximas.push({
        reglaId: regla.id,
        tipo: regla.tipo,
        categoriaLabel: categoriaLabelsDe(regla.tipo)[regla.categoria],
        monto: regla.monto_default,
        fecha,
        diasFaltantes: diffDias(hoyISO, fecha),
      })
    })
  })
  proximas.sort((a, b) => a.fecha.localeCompare(b.fecha))

  const pendientes = [
    ...gastosPendientes.gastos.map(g => ({ ...g, tipo: 'gasto' })),
    ...ingresosPendientes.ingresos.map(i => ({ ...i, tipo: 'ingreso' })),
  ].sort((a, b) => a.fecha.localeCompare(b.fecha))

  return {
    pendientes,
    proximas,
    total: pendientes.length + proximas.length,
  }
}

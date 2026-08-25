// Alertas de presupuestos dentro de la app: presupuestos activos cuyo
// gasto del periodo vigente ya llego a 80% (acercandose) o a 100%
// (excedido). A diferencia de recurrencias, el total ya viene calculado
// en la BD (ver presupuestos_estado, migracion 038) -- aqui solo se
// calcula el % y se agrupa, nunca se suma gasto.

import { obtenerEstadoPresupuestos } from './client'
import { PCT_ACERCANDOSE, PCT_EXCEDIDO, calcularPct } from './schema'
import { CATEGORIA_LABELS } from '@/lib/gastos/schema'

export async function obtenerAlertasPresupuestos() {
  const estados = await obtenerEstadoPresupuestos()

  const conPct = estados.map(e => ({
    ...e,
    categoriaLabel: CATEGORIA_LABELS[e.categoria] || e.categoria,
    pct: calcularPct(e.total_gastado, e.monto_limite),
  }))

  const excedidos = conPct.filter(e => e.pct >= PCT_EXCEDIDO)
  const acercandose = conPct.filter(e => e.pct >= PCT_ACERCANDOSE && e.pct < PCT_EXCEDIDO)

  return {
    excedidos,
    acercandose,
    total: excedidos.length + acercandose.length,
  }
}

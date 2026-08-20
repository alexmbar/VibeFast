// ============================================================
// Tools de gastos · registro dedicado
// ------------------------------------------------------------
// Registro separado del genérico en lib/tools/index.js: aquí solo
// viven tools de solo lectura. La mayoría consulta `gastos`, más
// proximosRecurrentes que proyecta reglas de recurrencia (ingresos y
// gastos) para preguntas sobre dinero futuro. A propósito no incluye
// ninguna tool de escritura (crear/editar/eliminar gasto) — el agente
// de /agente por ahora solo puede leer y responder, nunca modificar
// datos.
// ============================================================

import { totalesPorCategoria } from "./gastos/totalesPorCategoria.js"
import { totalesPorPeriodo } from "./gastos/totalesPorPeriodo.js"
import { topTiendas } from "./gastos/topTiendas.js"
import { listarGastos } from "./gastos/listarGastos.js"
import { proximosRecurrentes } from "./recurrencias/proximosRecurrentes.js"

const registry = new Map()

function registerGastosTool(tool) {
  registry.set(tool.name, tool)
}

;[totalesPorCategoria, totalesPorPeriodo, topTiendas, listarGastos, proximosRecurrentes].forEach(
  registerGastosTool
)

export function getGastosTools() {
  return [...registry.values()].map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }))
}

export async function executeGastosTool(name, args) {
  const tool = registry.get(name)
  if (!tool) throw new Error(`Tool ${name} no registrada`)
  return tool.execute(args)
}

import { fetchGastos, getAuthedSupabase } from "./helpers.js"
import { CATEGORIA_LABELS, formatMonto } from "@/lib/gastos/schema.js"

// Tool de solo lectura: suma gastos del usuario agrupados por categoría.
export const totalesPorCategoria = {
  name: "totales_por_categoria",
  description:
    "Suma los gastos del usuario agrupados por categoría en un rango de fechas. Úsala para preguntas tipo '¿cuánto gasté en X?' o '¿en qué categoría gasto más?'.",
  parameters: {
    type: "object",
    properties: {
      desde: {
        type: "string",
        description: "Fecha inicial YYYY-MM-DD (inclusive). Omite para no acotar.",
      },
      hasta: {
        type: "string",
        description: "Fecha final YYYY-MM-DD (inclusive). Omite para no acotar.",
      },
    },
    required: [],
    additionalProperties: false,
  },
  async execute({ desde, hasta } = {}) {
    const { profile } = await getAuthedSupabase()
    const gastos = await fetchGastos({ desde, hasta })

    const porCategoria = new Map()
    for (const g of gastos) {
      const prev = porCategoria.get(g.categoria) || { totalCentavos: 0, count: 0 }
      prev.totalCentavos += g.monto
      prev.count += 1
      porCategoria.set(g.categoria, prev)
    }

    const categorias = [...porCategoria.entries()]
      .map(([categoria, { totalCentavos, count }]) => ({
        categoria,
        label: CATEGORIA_LABELS[categoria] || categoria,
        total: formatMonto(totalCentavos, profile?.moneda),
        totalCentavos,
        count,
      }))
      .sort((a, b) => b.totalCentavos - a.totalCentavos)

    return { ok: true, desde: desde || null, hasta: hasta || null, categorias }
  },
}

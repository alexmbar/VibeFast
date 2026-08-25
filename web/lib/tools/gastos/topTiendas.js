import { fetchGastos, getAuthedSupabase } from "./helpers.js"
import { formatMonto } from "@/lib/gastos/schema.js"

// Tool de solo lectura: suma gastos del usuario agrupados por tienda.
export const topTiendas = {
  name: "top_tiendas",
  description:
    "Suma los gastos del usuario agrupados por tienda en un rango de fechas y devuelve las de mayor gasto. Úsala para '¿en qué tienda gasto más?' o '¿cuánto llevo en Oxxo?'.",
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
      limite: {
        type: "integer",
        description: "Cuántas tiendas devolver, de mayor a menor gasto. Default 10.",
      },
    },
    required: [],
    additionalProperties: false,
  },
  async execute({ desde, hasta, limite = 10 } = {}) {
    const { profile } = await getAuthedSupabase()
    const gastos = await fetchGastos({ desde, hasta })

    const porTienda = new Map()
    for (const g of gastos) {
      const tienda = g.tienda || "(sin tienda)"
      const prev = porTienda.get(tienda) || { totalCentavos: 0, count: 0 }
      prev.totalCentavos += g.monto
      prev.count += 1
      porTienda.set(tienda, prev)
    }

    const tiendas = [...porTienda.entries()]
      .map(([tienda, { totalCentavos, count }]) => ({
        tienda,
        total: formatMonto(totalCentavos, profile?.moneda),
        totalCentavos,
        count,
      }))
      .sort((a, b) => b.totalCentavos - a.totalCentavos)
      .slice(0, limite)

    return { ok: true, tiendas }
  },
}

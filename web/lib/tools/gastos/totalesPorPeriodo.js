import { fetchGastos, getAuthedSupabase } from "./helpers.js"
import { formatMonto } from "@/lib/gastos/schema.js"

// Tool de solo lectura: suma gastos del usuario agrupados por mes (YYYY-MM).
export const totalesPorPeriodo = {
  name: "totales_por_periodo",
  description:
    "Suma los gastos del usuario agrupados por mes en un rango de fechas. Úsala para comparar meses o ver la tendencia de gasto en el tiempo.",
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

    const porMes = new Map()
    for (const g of gastos) {
      const mes = g.fecha.substring(0, 7) // YYYY-MM, gasto.fecha ya es date sin hora
      const prev = porMes.get(mes) || { totalCentavos: 0, count: 0 }
      prev.totalCentavos += g.monto
      prev.count += 1
      porMes.set(mes, prev)
    }

    const meses = [...porMes.entries()]
      .map(([mes, { totalCentavos, count }]) => ({
        mes,
        total: formatMonto(totalCentavos, profile?.moneda),
        totalCentavos,
        count,
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes))

    return { ok: true, meses }
  },
}

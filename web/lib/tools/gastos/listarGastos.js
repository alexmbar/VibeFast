import { fetchGastos, getAuthedSupabase } from "./helpers.js"
import { CATEGORIAS, TIPOS_PAGO, CATEGORIA_LABELS, formatMonto } from "@/lib/gastos/schema.js"

// Tool de solo lectura: lista gastos individuales (detalle, no agregado).
export const listarGastos = {
  name: "listar_gastos",
  description:
    "Lista gastos individuales del usuario con filtros opcionales. Úsala cuando la pregunta pida detalle (fechas, tiendas, montos exactos) y no solo un total. Devuelve como máximo 30 gastos, los más recientes primero.",
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
      categoria: {
        type: "string",
        enum: CATEGORIAS,
        description: "Filtra por categoría exacta.",
      },
      tipo_pago: {
        type: "string",
        enum: TIPOS_PAGO,
        description: "Filtra por tipo de pago exacto.",
      },
    },
    required: [],
    additionalProperties: false,
  },
  async execute({ desde, hasta, categoria, tipo_pago } = {}) {
    const { profile } = await getAuthedSupabase()
    const gastos = await fetchGastos({ desde, hasta, categoria, tipo_pago, limit: 30 })

    return {
      ok: true,
      gastos: gastos.map((g) => ({
        fecha: g.fecha,
        monto: formatMonto(g.monto, profile?.moneda),
        categoria: CATEGORIA_LABELS[g.categoria] || g.categoria,
        tipo_pago: g.tipo_pago,
        tienda: g.tienda,
        banco: g.banco,
      })),
    }
  },
}

import { getAuthedSupabase } from "../gastos/helpers.js"
import { ocurrenciasEnRango } from "@/lib/recurrencias/fechas.js"
import { categoriaLabelsDe } from "@/lib/recurrencias/schema.js"
import { formatMonto } from "@/lib/gastos/schema.js"

const TIMEZONE = "America/Mexico_City"
const DIAS_VENTANA_DEFAULT = 30

function getFechaHoy() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date())
}

function addDias(fechaISO, dias) {
  const [anio, mes, dia] = fechaISO.split("-").map(Number)
  const d = new Date(Date.UTC(anio, mes - 1, dia))
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

// Tool de solo lectura: proyecta las ocurrencias de reglas de recurrencia
// activas (ingresos y gastos) dentro de un rango de fechas. El cron
// (generar-recurrencias/route.js) solo genera filas reales en gastos/
// ingresos hasta hoy, nunca por adelantado, así que preguntas sobre dinero
// futuro ("¿cuánto voy a recibir mañana?") solo se pueden responder
// calculando sobre las reglas, no consultando filas ya existentes.
export const proximosRecurrentes = {
  name: "proximos_recurrentes",
  description:
    "Proyecta las próximas ocurrencias de las reglas de recurrencia activas del usuario (ingresos y gastos que se repiten, como nómina o renta) dentro de un rango de fechas. Úsala para preguntas sobre dinero que el usuario espera recibir o pagar próximamente (\"¿cuánto voy a recibir mañana?\", \"¿qué gastos recurrentes tengo esta semana?\"). Los montos son el monto_default de cada regla: una proyección, no un monto confirmado -- el monto real puede variar (nómina, renta) o el usuario puede no confirmarlo o cancelar la regla antes de esa fecha. Siempre acláraselo al usuario en tu respuesta.",
  parameters: {
    type: "object",
    properties: {
      desde: {
        type: "string",
        description: `Fecha inicial YYYY-MM-DD (inclusive). Si se omite, usa hoy (${TIMEZONE}).`,
      },
      hasta: {
        type: "string",
        description: `Fecha final YYYY-MM-DD (inclusive). Si se omite, usa ${DIAS_VENTANA_DEFAULT} días después de "desde".`,
      },
      tipo: {
        type: "string",
        enum: ["ingreso", "gasto"],
        description: "Filtra solo ingresos recurrentes o solo gastos recurrentes. Omite para ambos.",
      },
    },
    required: [],
    additionalProperties: false,
  },
  async execute({ desde, hasta, tipo } = {}) {
    const { supabase, user } = await getAuthedSupabase()

    const rangoDesde = desde || getFechaHoy()
    const rangoHasta = hasta || addDias(rangoDesde, DIAS_VENTANA_DEFAULT)

    let query = supabase
      .from("recurrencias")
      .select(
        "id, tipo, frecuencia, dia_semana, dias_mes, monto_default, categoria, tienda, fecha_inicio, fecha_fin"
      )
      .eq("user_id", user.id)
      .eq("activo", true)
      .lte("fecha_inicio", rangoHasta)

    if (tipo) query = query.eq("tipo", tipo)

    const { data: reglas, error } = await query
    if (error) throw new Error(error.message)

    const ocurrencias = []
    for (const regla of reglas || []) {
      if (regla.fecha_fin && regla.fecha_fin < rangoDesde) continue

      const desdeRegla = regla.fecha_inicio > rangoDesde ? regla.fecha_inicio : rangoDesde
      const hastaRegla = regla.fecha_fin && regla.fecha_fin < rangoHasta ? regla.fecha_fin : rangoHasta

      const labels = categoriaLabelsDe(regla.tipo)
      for (const fecha of ocurrenciasEnRango(regla, desdeRegla, hastaRegla)) {
        ocurrencias.push({
          fecha,
          tipo: regla.tipo,
          categoria: labels[regla.categoria] || regla.categoria,
          monto: formatMonto(regla.monto_default),
          montoCentavos: regla.monto_default,
          tienda: regla.tipo === "gasto" ? regla.tienda : null,
        })
      }
    }
    ocurrencias.sort((a, b) => a.fecha.localeCompare(b.fecha))

    const totalesPorTipo = { ingreso: 0, gasto: 0 }
    for (const o of ocurrencias) totalesPorTipo[o.tipo] += o.montoCentavos

    return {
      ok: true,
      desde: rangoDesde,
      hasta: rangoHasta,
      proyeccion: true,
      nota: "Estos montos son proyecciones basadas en reglas de recurrencia activas (monto_default), no montos confirmados por el usuario.",
      totalIngresosProyectados: formatMonto(totalesPorTipo.ingreso),
      totalGastosProyectados: formatMonto(totalesPorTipo.gasto),
      ocurrencias,
    }
  },
}

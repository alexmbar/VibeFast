// ============================================================
// Agente de gastos · instancia concreta
// ------------------------------------------------------------
// Corre el wrapper genérico (./graph.js) con las tools de solo
// lectura de gastos (lib/tools/gastosRegistry.js) y un system prompt
// que deja explícito que el agente no puede crear ni modificar datos.
//
// El Route Handler (app/api/agente/chat/route.js) importa
// runGastosAgent() y streamea sus eventos como SSE.
// ============================================================

import { getGastosTools, executeGastosTool } from "@/lib/tools/gastosRegistry.js"
import { runAgent } from "./graph.js"

// TODO CLAUDE.md: cuando exista zona horaria configurable por usuario,
// leerla de ahí en vez de asumir America/Mexico_City.
const TIMEZONE = "America/Mexico_City"

// YYYY-MM-DD en la zona horaria de la app, para que el agente pueda ubicar
// "hoy" al interpretar fechas relativas ("este mes", "la semana pasada").
function getFechaHoy() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date())
}

function buildSystemPrompt() {
  const hoy = getFechaHoy()
  return `Eres el agente de gastos de Controla Gasto. Hoy es ${hoy} (zona horaria ${TIMEZONE}) — usa esta fecha como referencia para calcular los parámetros desde/hasta cuando el usuario pregunte con fechas relativas ("hoy", "esta semana", "este mes", "el mes pasado", etc.). Nunca asumas otra fecha.

Solo puedes leer los gastos del usuario autenticado a través de las herramientas disponibles; no puedes crear, editar ni eliminar gastos, y no existe ninguna herramienta para hacerlo.

Antes de usar una herramienta, explica brevemente qué vas a consultar y por qué. Los montos que devuelven las herramientas ya vienen formateados en pesos (MXN); no hagas conversiones de centavos tú mismo. Si el usuario no da un rango de fechas, puedes consultar todo su historial disponible. Responde siempre en español, de forma clara y concisa.`
}

// messages: [{ role, content }] · conversationId?: string
// Devuelve el async generator de eventos del agente.
export function runGastosAgent({ messages, conversationId }) {
  return runAgent({
    messages,
    conversationId,
    systemPrompt: buildSystemPrompt(),
    tools: getGastosTools(),
    executeTool: executeGastosTool,
  })
}

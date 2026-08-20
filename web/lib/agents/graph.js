// ============================================================
// Agentes · wrapper genérico sobre LangGraph.js
// ------------------------------------------------------------
// Implementa el patrón "recover → decide → act" como un StateGraph
// de 3 nodos:
//
//   recover : carga contexto (mensajes previos) y arma el estado
//   decide  : llama al modelo (config.ai.agentModel) con las tools
//             en formato OpenAI; elige llamar tool(s) o responder
//   act     : ejecuta las tool(s) pedidas, reporta cada llamada y
//             vuelve a `decide`. Si no hubo tools, el grafo termina.
//
// runAgent() es un async generator: emite eventos a medida que el
// agente razona y actúa, listos para streamear como SSE:
//   { type: "reasoning", text }
//   { type: "tool_call", name, args, result }
//   { type: "token",     text }
//   { type: "done" }
//
// Es genérico a propósito: recibe las tools (formato OpenAI), el
// ejecutor y el system prompt. La instancia concreta (registry +
// prompt) vive en examples/recoverDecideAct.js.
// ============================================================

import { StateGraph, Annotation, START, END } from "@langchain/langgraph"
import { openai } from "@/lib/openai/client"
import config from "@/config"

// Canales del estado del grafo. `messages` acumula; los demás son
// utilidades de runtime (no se serializan: corremos en memoria).
const AgentState = Annotation.Root({
  messages: Annotation({
    reducer: (prev, next) => prev.concat(next),
    default: () => [],
  }),
  // Tool calls pendientes que `decide` dejó para que `act` ejecute.
  pendingToolCalls: Annotation({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  steps: Annotation({
    reducer: (_prev, next) => next,
    default: () => 0,
  }),
})

// Llama al modelo en streaming y ensambla el resultado: emite los
// tokens de contenido y reconstruye los tool_calls fragmentados.
async function callModel({ model, messages, tools, emit, onUsage }) {
  const stream = await openai.chat.completions.create({
    model,
    messages,
    tools: tools.length ? tools : undefined,
    tool_choice: tools.length ? "auto" : undefined,
    stream: true,
    // Sin esto el stream nunca trae `usage` -- necesario para el costo
    // operativo que ve /admin/costos (ver uso_openai).
    stream_options: { include_usage: true },
  })

  let content = ""
  const toolCalls = [] // indexado por `index` del delta

  for await (const chunk of stream) {
    // El chunk final con include_usage no trae choices, solo `usage`.
    if (chunk.usage) onUsage?.(chunk.usage)

    const delta = chunk.choices[0]?.delta
    if (!delta) continue

    if (delta.content) {
      content += delta.content
      emit({ type: "token", text: delta.content })
    }

    for (const tc of delta.tool_calls ?? []) {
      const slot = (toolCalls[tc.index] ??= {
        id: "",
        name: "",
        arguments: "",
      })
      if (tc.id) slot.id = tc.id
      if (tc.function?.name) slot.name += tc.function.name
      if (tc.function?.arguments) slot.arguments += tc.function.arguments
    }
  }

  return { content, toolCalls: toolCalls.filter(Boolean) }
}

export async function* runAgent({
  messages,
  conversationId,
  systemPrompt,
  tools = [],
  executeTool,
  onToolCall,
  onUsage,
  model = config.ai.agentModel,
  maxSteps = 6,
}) {
  // Cola que conecta los nodos del grafo (productores) con este
  // generador (consumidor). Los nodos empujan eventos; aquí se
  // ceden (yield) en orden hasta que el grafo termina.
  const queue = []
  let wake = null
  let finished = false
  const emit = (event) => {
    queue.push(event)
    if (wake) {
      wake()
      wake = null
    }
  }

  // --- Nodo recover: arma el estado inicial de mensajes ---
  async function recover() {
    const base = []
    if (systemPrompt) base.push({ role: "system", content: systemPrompt })
    base.push(...messages)
    return { messages: base, steps: 0 }
  }

  // --- Nodo decide: el modelo elige tool(s) o responde ---
  async function decide(state) {
    const { content, toolCalls } = await callModel({
      model,
      messages: state.messages,
      tools,
      emit,
      onUsage: (usage) => onUsage?.({ model, usage }),
    })

    // Mensaje del assistant tal cual lo necesita la siguiente vuelta.
    const assistantMessage = {
      role: "assistant",
      content: content || null,
    }
    if (toolCalls.length) {
      assistantMessage.tool_calls = toolCalls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: { name: tc.name, arguments: tc.arguments },
      }))
      // El texto que acompaña a un tool call es el razonamiento.
      emit({ type: "reasoning", text: content || "(sin texto)" })
    }

    return {
      messages: [assistantMessage],
      pendingToolCalls: toolCalls,
      steps: state.steps + 1,
    }
  }

  // --- Nodo act: ejecuta las tools y reporta cada llamada ---
  async function act(state) {
    const reasoning = state.messages[state.messages.length - 1]?.content || ""
    const toolMessages = []

    for (const call of state.pendingToolCalls) {
      let args = {}
      try {
        args = call.arguments ? JSON.parse(call.arguments) : {}
      } catch {
        args = {}
      }

      let result
      try {
        result = await executeTool(call.name, args)
      } catch (err) {
        result = { error: err?.message ?? "Error ejecutando la tool" }
      }

      emit({ type: "tool_call", name: call.name, args, result })

      // Persistencia / auditoría best-effort (Session A). No rompe
      // el agente si el logger no está disponible todavía.
      if (onToolCall) {
        try {
          await onToolCall({
            toolName: call.name,
            args,
            result,
            reasoning,
            conversationId,
          })
        } catch {
          // logger ausente o falló: ignorar.
        }
      }

      toolMessages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      })
    }

    return { messages: toolMessages, pendingToolCalls: [] }
  }

  // Arista condicional: si `decide` pidió tools (y no excedimos el
  // tope de pasos) vamos a `act`; si no, terminamos. Devolvemos el
  // destino directamente (sin pathMap) para evitar ambigüedades.
  function routeAfterDecide(state) {
    if (state.pendingToolCalls.length && state.steps < maxSteps) return "act"
    return END
  }

  const graph = new StateGraph(AgentState)
    .addNode("recover", recover)
    .addNode("decide", decide)
    .addNode("act", act)
    .addEdge(START, "recover")
    .addEdge("recover", "decide")
    .addConditionalEdges("decide", routeAfterDecide, ["act", END])
    .addEdge("act", "decide")
    .compile()

  // Dispara el grafo en segundo plano; emite "done" al terminar.
  const running = graph
    .invoke({}, { recursionLimit: maxSteps * 2 + 5 })
    .then(() => emit({ type: "done" }))
    .catch((err) => emit({ type: "error", message: err?.message ?? "fallo del agente" }))
    .finally(() => {
      finished = true
      if (wake) {
        wake()
        wake = null
      }
    })

  // Cede eventos en orden hasta agotar la cola y terminar el grafo.
  while (true) {
    if (queue.length) {
      yield queue.shift()
      continue
    }
    if (finished) break
    await new Promise((resolve) => {
      wake = resolve
    })
  }

  await running
}

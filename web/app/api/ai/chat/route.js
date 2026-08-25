// ============================================================
// POST /api/ai/chat
// ------------------------------------------------------------
// Body:  { messages: [{ role, content }], conversationId?: string }
// Resp:  stream de texto plano (text/plain; charset=utf-8).
//        400 si `messages` no es un array no vacío.
//
// Tool use (Sem 4): antes de streamear la respuesta final, resuelve
// en un loop no-streaming las tool calls que pida el modelo contra el
// registry genérico (lib/tools/index.js — crear_item, buscar_items,
// enviar_email). Cada llamada se registra en tool_calls vía
// logToolCall (best-effort). La respuesta que sí se streamea al
// cliente es la última, ya sin tools pendientes.
//
// Persistencia (best-effort, Fase 4 / Session A): si hay usuario
// autenticado, guarda el último mensaje del usuario + la respuesta
// del assistant en ai_conversations / ai_messages. Va envuelta en
// try/catch y corre con after() — si las tablas o el usuario no
// existen todavía, el stream se responde igual.
// ============================================================

import { NextResponse, after } from "next/server"
import { createClient, getUser } from "@/lib/supabase/server"
import { streamChat } from "@/lib/openai/chat"
import { openai } from "@/lib/openai/client"
import { getOpenAITools, executeTool } from "@/lib/tools/index.js"
import { logToolCall } from "@/lib/audit.js"
import config from "@/config"

const SYSTEM_PROMPT = `Eres el asistente de ${config.app.name}. Puedes usar las herramientas disponibles cuando el usuario lo pida explícitamente. Si te piden algo que ninguna herramienta puede hacer, dilo con claridad en vez de inventar una acción.`

// Loop no-streaming: mientras el modelo pida tool_calls, las ejecuta y
// registra (logToolCall), y vuelve a preguntar. Se detiene cuando el
// modelo responde con texto en vez de tool_calls, o al llegar a
// maxSteps. Devuelve los mensajes acumulados, listos para el stream final.
async function resolveToolCalls(messages, { conversationId, maxSteps = 4 } = {}) {
  let current = messages

  for (let step = 0; step < maxSteps; step++) {
    const completion = await openai.chat.completions.create({
      model: config.ai.chatModel,
      messages: current,
      tools: getOpenAITools(),
      tool_choice: "auto",
      max_tokens: config.ai.maxTokens,
      temperature: config.ai.temperature,
    })

    const message = completion.choices[0]?.message
    if (!message?.tool_calls?.length) break

    current = [...current, message]

    for (const call of message.tool_calls) {
      let args = {}
      try {
        args = call.function.arguments ? JSON.parse(call.function.arguments) : {}
      } catch {
        args = {}
      }

      let result
      try {
        result = await executeTool(call.function.name, args)
      } catch (err) {
        result = { error: err?.message ?? "Error ejecutando la tool" }
      }

      await logToolCall({
        toolName: call.function.name,
        args,
        result,
        reasoning: message.content || null,
        conversationId,
      })

      current = [
        ...current,
        { role: "tool", tool_call_id: call.id, content: JSON.stringify(result) },
      ]
    }
  }

  return current
}

export async function POST(request) {
  try {
    const { messages, conversationId } = await request.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages debe ser un array no vacío." },
        { status: 400 }
      )
    }

    const withSystem = [{ role: "system", content: SYSTEM_PROMPT }, ...messages]
    const resolved = await resolveToolCalls(withSystem, { conversationId })

    // Acumula la respuesta para persistirla cuando el stream termine.
    // Si OpenAI falla al abrir el stream (key ausente, 401, red), el
    // await rechaza y cae al catch de abajo → error JSON controlado.
    let assistantText = ""
    const stream = await streamChat(resolved, {
      onToken: (token) => {
        assistantText += token
      },
    })

    // Corre después de enviar la respuesta. No bloquea el stream y
    // nunca lo rompe: cualquier fallo de persistencia se ignora.
    after(async () => {
      try {
        const user = await getUser()
        if (!user) return

        const supabase = await createClient()

        let convId = conversationId
        if (!convId) {
          const { data, error } = await supabase
            .from("ai_conversations")
            .insert({ user_id: user.id })
            .select("id")
            .single()
          if (error || !data) return
          convId = data.id
        }

        const lastUserMessage = messages[messages.length - 1]
        await supabase.from("ai_messages").insert([
          {
            conversation_id: convId,
            role: lastUserMessage.role,
            content: lastUserMessage.content,
          },
          { conversation_id: convId, role: "assistant", content: assistantText },
        ])
      } catch (err) {
        console.error("[ai/chat] persistencia omitida:", err?.message)
      }
    })

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  } catch (err) {
    return NextResponse.json(
      { error: "Error procesando la solicitud." },
      { status: 500 }
    )
  }
}

// ============================================================
// POST /api/agente/chat
// ------------------------------------------------------------
// Body:  { messages: [{ role, content }], conversationId?: string }
// Resp:  stream SSE (text/event-stream). Cada evento es una línea
//        `data: {json}\n\n` con json de la forma:
//          { type: "reasoning", text }
//          { type: "tool_call", name, args, result }
//          { type: "token",     text }
//          { type: "done" }
//          { type: "error",     message }   (si algo falla a media corrida)
//        401 si no hay sesión. 400 si `messages` no es un array no vacío.
//
// Corre el agente de gastos (solo lectura, ver lib/agents/gastosAgent.js).
// ============================================================

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { runGastosAgent } from "@/lib/agents/gastosAgent.js"

export async function POST(request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  const { messages, conversationId } = body

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "messages debe ser un array no vacío." },
      { status: 400 }
    )
  }

  const encoder = new TextEncoder()
  const events = runGastosAgent({ messages, conversationId })

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      try {
        for await (const event of events) {
          send(event)
        }
      } catch (err) {
        send({ type: "error", message: err?.message ?? "fallo del agente" })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}

"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle, Loader2 } from "lucide-react"
import Message from "./Message"
import ChatInput from "./ChatInput"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Chat con streaming. POST /api/ai/chat → stream de texto plano;
// leemos el body con un reader y vamos concatenando al último mensaje
// del assistant en tiempo real.
export default function Chat() {
  const [messages, setMessages] = useState([])
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  async function handleSubmit(text) {
    setError(null)

    const userMessage = { role: "user", content: text }
    // Historial que mandamos al backend (sin el placeholder del assistant).
    const history = [...messages, userMessage]
    // Pintamos el mensaje del usuario + un placeholder vacío del assistant.
    setMessages([...history, { role: "assistant", content: "" }])
    setStreaming(true)

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      })

      if (!res.ok || !res.body) {
        throw new Error(`El servidor respondió ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          next[next.length - 1] = { ...last, content: last.content + chunk }
          return next
        })
      }
    } catch (err) {
      // Quitamos el placeholder del assistant y mostramos el error.
      setMessages((prev) => prev.slice(0, -1))
      setError(
        err?.message
          ? `No pudimos completar la respuesta: ${err.message}`
          : "Algo salió mal al contactar al asistente. Intenta de nuevo."
      )
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-xl border bg-card">
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            Empieza la conversación escribiendo un mensaje abajo.
          </div>
        ) : (
          messages.map((m, i) => (
            <Message key={i} role={m.role} content={m.content} />
          ))
        )}

        {streaming &&
          messages[messages.length - 1]?.role === "assistant" &&
          messages[messages.length - 1]?.content === "" && (
            <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Pensando…
            </div>
          )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="border-t p-4">
        <ChatInput onSubmit={handleSubmit} disabled={streaming} />
      </div>
    </div>
  )
}

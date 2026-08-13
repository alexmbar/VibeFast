"use client"

import { useState } from "react"
import { SendHorizontal, Loader2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

// Entrada del chat. Enter envía, Shift+Enter inserta salto de línea.
// Se deshabilita mientras el assistant está respondiendo (disabled).
export default function ChatInput({ onSubmit, disabled }) {
  const [text, setText] = useState("")

  function send() {
    const value = text.trim()
    if (!value || disabled) return
    onSubmit(value)
    setText("")
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex items-end gap-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
        placeholder="Escribe tu mensaje…"
        className="max-h-40 min-h-12 flex-1 resize-none"
      />
      <Button
        type="button"
        onClick={send}
        disabled={disabled || !text.trim()}
        size="icon"
        aria-label="Enviar"
      >
        {disabled ? <Loader2 className="animate-spin" /> : <SendHorizontal />}
      </Button>
    </div>
  )
}

"use client"

import { Wrench } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Formatea args/result que pueden venir como objeto o string.
function format(value) {
  if (value == null) return ""
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

// Card de una herramienta ejecutada por el agente: nombre + args + result.
export default function ToolCallCard({ name, args, result }) {
  const argsText = format(args)
  const resultText = format(result)

  return (
    <Card>
      <CardContent className="text-sm">
        <div className="mb-2 flex items-center gap-2">
          <Wrench className="size-4 text-muted-foreground" />
          <Badge variant="secondary" className="font-mono">{name}</Badge>
        </div>

        {argsText && (
          <div className="mb-2">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Argumentos</p>
            <pre className="overflow-x-auto rounded-lg bg-muted p-2 text-xs">{argsText}</pre>
          </div>
        )}

        {resultText && (
          <details open className="rounded-lg bg-muted">
            <summary className="cursor-pointer select-none px-2 py-1 text-xs font-medium text-muted-foreground">
              Resultado
            </summary>
            <pre className="overflow-x-auto rounded-lg p-2 text-xs">{resultText}</pre>
          </details>
        )}
      </CardContent>
    </Card>
  )
}

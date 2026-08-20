"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Formato E.164 simplificado: + seguido de 10 a 15 dígitos.
const PHONE_RE = /^\+\d{10,15}$/

// Paso obligatorio antes de usar el resto de la app: sin teléfono
// registrado, la captura por WhatsApp no puede identificar al usuario
// (web/app/api/webhooks/whatsapp/route.js busca por profiles.phone).
// Bloquear aquí evita que alguien le escriba al bot antes de estar
// registrado y se quede sin respuesta.
export default function PhoneGate({ userId }) {
  const router = useRouter()
  const supabase = createClient()
  const [phone, setPhone] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = phone.trim()

    if (!PHONE_RE.test(trimmed)) {
      setError("Formato inválido. Usa + código de país + número, ej. +5200000000000.")
      return
    }

    setSaving(true)
    setError(null)

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ phone: trimmed })
      .eq("id", userId)

    if (updateError) {
      setError(
        updateError.code === "23505"
          ? "Ese número ya está registrado en otra cuenta."
          : updateError.message
      )
      setSaving(false)
      return
    }

    router.refresh()
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <MessageCircle className="size-4.5" />
            </span>
            Registra tu WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Capturamos tus gastos por WhatsApp (texto, foto de ticket o PDF).
            Para que podamos identificarte, registra primero el número desde
            el que vas a escribir.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Teléfono WhatsApp</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+5200000000000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">Formato: +52 código de país + número</p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={saving} className="w-full">
              {saving && <Loader2 className="animate-spin" />}
              Guardar y continuar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Repeat, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import RecurrenciaForm from "@/components/recurrencias/RecurrenciaForm"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// Paso 4 (último) del wizard: movimientos recurrentes (nómina, renta,
// suscripciones). Opcional -- se puede seguir gestionando después desde
// /recurrencias. Al terminar, marca el onboarding como completado.
export default function PasoRecurrencias({ userId }) {
  const router = useRouter()
  const supabase = createClient()
  const [agregados, setAgregados] = useState(0)
  const [mostrarForm, setMostrarForm] = useState(true)
  const [finalizando, setFinalizando] = useState(false)

  function handleSuccess() {
    setAgregados((n) => n + 1)
    setMostrarForm(false)
  }

  async function finalizar() {
    setFinalizando(true)
    await supabase.from("profiles").update({ onboarding_step: "completado" }).eq("id", userId)
    router.refresh()
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Repeat className="size-4.5" />
              </span>
              Movimientos recurrentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Nómina, renta, suscripciones -- lo que se repita cada semana o
              cada mes. Es opcional: puedes agregarlos después desde
              /recurrencias.
            </p>
            {agregados > 0 && (
              <p className="text-sm font-medium text-primary">
                {agregados} {agregados === 1 ? "recurrencia agregada" : "recurrencias agregadas"}
              </p>
            )}
          </CardContent>
        </Card>

        {mostrarForm ? (
          <RecurrenciaForm
            onSuccess={handleSuccess}
            onCancel={agregados > 0 ? () => setMostrarForm(false) : undefined}
          />
        ) : (
          <Button type="button" variant="outline" onClick={() => setMostrarForm(true)} className="w-full">
            Agregar otra recurrencia
          </Button>
        )}

        <Button onClick={finalizar} disabled={finalizando} className="w-full">
          {finalizando && <Loader2 className="animate-spin" />}
          {agregados > 0 ? "Finalizar" : "Finalizar sin agregar"}
        </Button>
      </div>
    </div>
  )
}

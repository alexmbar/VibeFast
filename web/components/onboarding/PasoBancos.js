"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Landmark, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import BancoForm from "@/components/bancos/BancoForm"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// Paso 3 del wizard: agregar cuentas bancarias (débito y/o crédito).
// Opcional -- se puede seguir gestionando después desde /bancos, así que
// no exige un mínimo para continuar.
export default function PasoBancos({ userId }) {
  const router = useRouter()
  const supabase = createClient()
  const [agregados, setAgregados] = useState(0)
  const [mostrarForm, setMostrarForm] = useState(true)
  const [avanzando, setAvanzando] = useState(false)

  function handleSuccess() {
    setAgregados((n) => n + 1)
    setMostrarForm(false)
  }

  async function avanzar() {
    setAvanzando(true)
    await supabase.from("profiles").update({ onboarding_step: "recurrencias" }).eq("id", userId)
    router.refresh()
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Landmark className="size-4.5" />
              </span>
              Tus cuentas bancarias
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Registra tus cuentas de débito y tarjetas de crédito. Es
              opcional: puedes agregarlas después desde /bancos.
            </p>
            {agregados > 0 && (
              <p className="text-sm font-medium text-primary">
                {agregados} {agregados === 1 ? "banco agregado" : "bancos agregados"}
              </p>
            )}
          </CardContent>
        </Card>

        {mostrarForm ? (
          <BancoForm
            onSuccess={handleSuccess}
            onCancel={agregados > 0 ? () => setMostrarForm(false) : undefined}
          />
        ) : (
          <Button type="button" variant="outline" onClick={() => setMostrarForm(true)} className="w-full">
            Agregar otro banco
          </Button>
        )}

        <Button onClick={avanzar} disabled={avanzando} className="w-full">
          {avanzando && <Loader2 className="animate-spin" />}
          {agregados > 0 ? "Continuar" : "Continuar sin agregar"}
        </Button>
      </div>
    </div>
  )
}

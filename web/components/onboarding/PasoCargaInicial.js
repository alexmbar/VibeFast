"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Wallet, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatMonto } from "@/lib/gastos/schema"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const INTERVALO_POLLING_MS = 3000

// Paso 2 del wizard: carga inicial del efectivo que el usuario tiene
// contado, capturada por WhatsApp (no por formulario) para que ese primer
// mensaje sirva también de validación de que el número realmente
// funciona. El backend crea/corrige la fila en `retiros`
// (es_carga_inicial=true, ver web/lib/retiros/whatsapp.js) cuando llega
// el mensaje; este componente hace polling hasta detectarla.
export default function PasoCargaInicial({ userId }) {
  const router = useRouter()
  const supabase = createClient()
  const [cargaInicial, setCargaInicial] = useState(null)
  const [avanzando, setAvanzando] = useState(false)

  useEffect(() => {
    let cancelado = false

    async function buscar() {
      const { data } = await supabase
        .from("retiros")
        .select("id, monto")
        .eq("user_id", userId)
        .eq("es_carga_inicial", true)
        .maybeSingle()

      if (!cancelado) setCargaInicial(data)
    }

    buscar()
    const intervalo = setInterval(buscar, INTERVALO_POLLING_MS)
    return () => {
      cancelado = true
      clearInterval(intervalo)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function avanzar() {
    setAvanzando(true)
    await supabase.from("profiles").update({ onboarding_step: "bancos" }).eq("id", userId)
    router.refresh()
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Wallet className="size-4.5" />
            </span>
            Carga inicial de efectivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Desde el WhatsApp que acabas de registrar, escríbenos cuánto
            efectivo tienes contado en este momento (solo el número, ej.
            &quot;3000&quot;). Con eso arrancamos tu saldo de Cartera y de
            paso confirmamos que tu número funciona.
          </p>

          {cargaInicial ? (
            <div className="rounded-lg bg-primary/10 p-4 text-center">
              <p className="text-xs text-muted-foreground">Recibimos por WhatsApp</p>
              <p className="text-2xl font-bold tabular-nums">{formatMonto(cargaInicial.monto)}</p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Esperando tu mensaje...
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button onClick={avanzar} disabled={!cargaInicial || avanzando} className="w-full">
              {avanzando && <Loader2 className="animate-spin" />}
              Confirmar y continuar
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={avanzar}
              disabled={avanzando}
              className="w-full"
            >
              Omitir por ahora
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

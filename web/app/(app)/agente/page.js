import AgentRun from "@/components/ai/AgentRun"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Agente de gastos" }

export default async function AgentePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("profiles")
    .select("mostrar_pensamiento_agente")
    .eq("id", user.id)
    .single()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agente de gastos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pregúntale sobre tus gastos: totales por categoría, comparativas por
          mes, tiendas donde más gastas, y proyecciones de tus ingresos y
          gastos recurrentes (nómina, renta). Por ahora solo puede leer — no
          crea ni edita gastos.
        </p>
      </div>

      <AgentRun
        endpoint="/api/agente/chat"
        emptyText="Pregúntale algo como '¿cuánto gasté en restaurantes este mes?', '¿en qué tienda gasto más?' o '¿cuánto voy a recibir de nómina esta semana?'."
        mostrarPensamiento={profile?.mostrar_pensamiento_agente ?? false}
      />
    </div>
  )
}

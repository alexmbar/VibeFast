import AgentRun from "@/components/ai/AgentRun"

export const metadata = { title: "Agente de gastos" }

export default function AgentePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agente de gastos</h1>
        <p className="mt-1 text-sm text-base-content/70">
          Pregúntale sobre tus gastos: totales por categoría, comparativas por
          mes, tiendas donde más gastas. Por ahora solo puede leer — no crea
          ni edita gastos.
        </p>
      </div>

      <AgentRun
        endpoint="/api/agente/chat"
        emptyText="Pregúntale algo como '¿cuánto gasté en restaurantes este mes?' o '¿en qué tienda gasto más?'."
      />
    </div>
  )
}

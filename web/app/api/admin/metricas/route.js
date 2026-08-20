import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/auth"
import { createAdminClient, obtenerMetricasNegocio } from "@/lib/admin/db"

export async function GET() {
  const { error, status } = await requireAdmin()
  if (error) return NextResponse.json({ message: error }, { status })

  const supabase = createAdminClient()

  try {
    const metricas = await obtenerMetricasNegocio(supabase)
    return NextResponse.json(metricas)
  } catch {
    return NextResponse.json({ message: "Error al obtener métricas" }, { status: 500 })
  }
}

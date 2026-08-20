import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/auth"
import { createAdminClient, obtenerCostosOpenai } from "@/lib/admin/db"

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function haceDiasISO(dias) {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - dias)
  return fecha.toISOString().slice(0, 10)
}

export async function GET(request) {
  const { error, status } = await requireAdmin()
  if (error) return NextResponse.json({ message: error }, { status })

  const { searchParams } = new URL(request.url)
  const desde = searchParams.get("desde") || haceDiasISO(30)
  const hasta = searchParams.get("hasta") || hoyISO()

  const supabase = createAdminClient()

  try {
    const costos = await obtenerCostosOpenai(supabase, { desde, hasta })
    return NextResponse.json(costos)
  } catch {
    return NextResponse.json({ message: "Error al obtener costos" }, { status: 500 })
  }
}

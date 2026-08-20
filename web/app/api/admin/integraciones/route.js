import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/auth"
import { createAdminClient, listarIntegraciones } from "@/lib/admin/db"

const TIPOS_VALIDOS = new Set(["webhook_whatsapp", "cron_recurrencias", "openai_vision", "costo_anomalo"])
const NIVELES_VALIDOS = new Set(["info", "warning", "error"])

export async function GET(request) {
  const { error, status } = await requireAdmin()
  if (error) return NextResponse.json({ message: error }, { status })

  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get("tipo")
  const nivel = searchParams.get("nivel")
  const resueltoParam = searchParams.get("resuelto")
  const orderBy = searchParams.get("orderBy") || "created_at"
  const orderDir = searchParams.get("orderDir") === "asc" ? "asc" : "desc"
  const limit = parseInt(searchParams.get("limit") || "50")
  const offset = parseInt(searchParams.get("offset") || "0")

  const supabase = createAdminClient()

  try {
    const { eventos, total } = await listarIntegraciones(supabase, {
      tipo: TIPOS_VALIDOS.has(tipo) ? tipo : undefined,
      nivel: NIVELES_VALIDOS.has(nivel) ? nivel : undefined,
      resuelto: resueltoParam === "true" ? true : resueltoParam === "false" ? false : undefined,
      orderBy,
      orderDir,
      limit,
      offset,
    })
    const response = NextResponse.json(eventos)
    response.headers.set("X-Total-Count", total)
    return response
  } catch {
    return NextResponse.json({ message: "Error al listar integraciones" }, { status: 500 })
  }
}

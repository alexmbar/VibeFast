import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/auth"
import { createAdminClient, listarUsuarios } from "@/lib/admin/db"

export async function GET(request) {
  const { user, error, status } = await requireAdmin()
  if (error) return NextResponse.json({ message: error }, { status })

  const { searchParams } = new URL(request.url)
  const orderBy = searchParams.get("orderBy") || "created_at"
  const orderDir = searchParams.get("orderDir") === "asc" ? "asc" : "desc"
  const limit = parseInt(searchParams.get("limit") || "50")
  const offset = parseInt(searchParams.get("offset") || "0")

  const supabase = createAdminClient()

  try {
    const { usuarios, total } = await listarUsuarios(supabase, { orderBy, orderDir, limit, offset })
    const response = NextResponse.json(usuarios)
    response.headers.set("X-Total-Count", total)
    return response
  } catch {
    return NextResponse.json({ message: "Error al listar usuarios" }, { status: 500 })
  }
}

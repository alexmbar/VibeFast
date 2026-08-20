import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/auth"
import { createAdminClient, obtenerUsuario, actualizarEstadoCuenta } from "@/lib/admin/db"

const ESTADOS_CUENTA_VALIDOS = new Set(["activa", "suspendida"])

export async function GET(request, { params }) {
  const { error, status } = await requireAdmin()
  if (error) return NextResponse.json({ message: error }, { status })

  const { id } = await params
  const supabase = createAdminClient()

  try {
    const usuario = await obtenerUsuario(supabase, id)
    return NextResponse.json(usuario)
  } catch {
    return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 })
  }
}

// Unico campo editable desde aqui es estado_cuenta (suspender/reactivar).
// Cambiar role no vive en este endpoint -- promover a otro admin es una
// accion mas sensible que merece su propio flujo, no colarse en el mismo
// PATCH que usa el botón de suspender.
export async function PATCH(request, { params }) {
  const { user, error, status } = await requireAdmin()
  if (error) return NextResponse.json({ message: error }, { status })

  const { id } = await params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: "Body inválido" }, { status: 400 })
  }

  if (!ESTADOS_CUENTA_VALIDOS.has(body.estado_cuenta)) {
    return NextResponse.json(
      { message: "Datos inválidos", errors: { estado_cuenta: "Debe ser 'activa' o 'suspendida'" } },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  try {
    const actualizado = await actualizarEstadoCuenta(supabase, {
      adminId: user.id,
      userId: id,
      estadoCuenta: body.estado_cuenta,
    })
    return NextResponse.json(actualizado)
  } catch {
    return NextResponse.json({ message: "Error al actualizar usuario" }, { status: 500 })
  }
}

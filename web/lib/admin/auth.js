import { getUser, createClient } from "@/lib/supabase/server"

// Verifica que la sesion actual sea de un admin, usando el cliente
// normal (anon key + RLS) -- profiles_select_own ya deja que cualquiera
// lea su propia fila, asi que esto no necesita service_role. La
// consulta cross-usuario real (listar todos los perfiles, etc.) va
// aparte con createAdminClient(), nunca aqui.
//
// El middleware (web/lib/supabase/middleware.js) ya bloquea /admin y
// /api/admin antes de llegar al route handler; esto es la segunda capa
// -- mismo criterio de "varias capas" que ya usa el proyecto para
// retiros (ver CLAUDE.md).
export async function requireAdmin() {
  const user = await getUser()
  if (!user) return { error: "No autenticado", status: 401 }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") return { error: "No autorizado", status: 403 }

  return { user }
}

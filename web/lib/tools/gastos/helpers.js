// ============================================================
// Tools de gastos · helper compartido
// ------------------------------------------------------------
// Todas las tools de este folder son de solo lectura: consultan
// `gastos` acotado a `user_id` con el cliente de sesión (nunca la
// service role key), así que heredan RLS además del filtro explícito.
// ============================================================

import { createClient } from "@/lib/supabase/server"

// Ademas de `user`, resuelve el `profile` (zona_horaria, moneda) de la
// misma sesion: las tools que formatean montos o calculan "hoy" lo
// necesitan para respetar la configuracion del usuario en vez de asumir
// MXN/America/Mexico_City.
export async function getAuthedSupabase() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado")
  const { data: profile } = await supabase
    .from("profiles")
    .select("zona_horaria, moneda")
    .eq("id", user.id)
    .single()
  return { supabase, user, profile }
}

// Trae gastos del usuario filtrados por rango de fecha / categoria /
// tipo_pago. `limit` topea la consulta para que una sola tool call no
// jale un historial completo sin fin.
export async function fetchGastos({
  desde,
  hasta,
  categoria,
  tipo_pago,
  limit = 5000,
} = {}) {
  const { supabase, user } = await getAuthedSupabase()

  let query = supabase
    .from("gastos")
    .select("monto, fecha, categoria, tipo_pago, tienda, banco")
    .eq("user_id", user.id)
    .order("fecha", { ascending: false })
    .limit(limit)

  if (desde) query = query.gte("fecha", desde)
  if (hasta) query = query.lte("fecha", hasta)
  if (categoria) query = query.eq("categoria", categoria)
  if (tipo_pago) query = query.eq("tipo_pago", tipo_pago)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

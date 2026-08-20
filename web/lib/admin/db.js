import { createClient } from "@supabase/supabase-js"

// Cliente con service_role: ignora RLS. Solo se usa desde route
// handlers de /api/admin, nunca desde el cliente ni desde codigo que
// corra fuera del servidor. Mismo patron que ya usa el cron de
// recurrencias (web/app/api/cron/generar-recurrencias/route.js).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// entidadId siempre como texto: admin_audit_log no tiene una sola FK
// porque la entidad afectada varia (hoy "profiles", mas adelante
// puede ser otra tabla).
export async function registrarAuditoria(supabase, { adminId, accion, entidad, entidadId, detalle }) {
  const { error } = await supabase.from("admin_audit_log").insert({
    admin_id: adminId,
    accion,
    entidad,
    entidad_id: entidadId != null ? String(entidadId) : null,
    detalle: detalle ?? null,
  })
  if (error) throw error
}

const COLUMNAS_ORDENABLES_USUARIOS = new Set([
  "email",
  "full_name",
  "plan",
  "role",
  "estado_cuenta",
  "onboarding_step",
  "created_at",
])

// Tabla ordenable como el resto de la app (CLAUDE.md): orderBy/orderDir
// vienen de la UI y se validan contra la lista blanca de columnas antes
// de pasarlos a .order(), nunca directo del query string.
export async function listarUsuarios(supabase, { orderBy = "created_at", orderDir = "desc", limit = 50, offset = 0 } = {}) {
  const columna = COLUMNAS_ORDENABLES_USUARIOS.has(orderBy) ? orderBy : "created_at"

  const { data, error, count } = await supabase
    .from("profiles")
    .select("id, email, full_name, plan, role, estado_cuenta, onboarding_step, created_at", { count: "exact" })
    .order(columna, { ascending: orderDir === "asc" })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return { usuarios: data, total: count ?? 0 }
}

// Nunca incluye montos, categorias, tiendas ni bancos -- ver "Frontera
// de datos financieros" en el plan de /admin. Solo conteos y metadata
// de actividad.
export async function obtenerUsuario(supabase, userId) {
  const { data: perfil, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, plan, role, estado_cuenta, onboarding_step, phone, whatsapp_confirmado_at, created_at")
    .eq("id", userId)
    .single()
  if (error) throw error

  const [gastosCount, ingresosCount, costoRows, auditLog] = await Promise.all([
    supabase.from("gastos").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("ingresos").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("uso_openai").select("costo_estimado_centavos").eq("user_id", userId),
    supabase
      .from("admin_audit_log")
      .select("id, admin_id, accion, detalle, created_at")
      .eq("entidad", "profiles")
      .eq("entidad_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  const costoOpenaiCentavos = (costoRows.data || []).reduce(
    (sum, fila) => sum + fila.costo_estimado_centavos,
    0
  )

  return {
    perfil,
    actividad: {
      gastosCount: gastosCount.count ?? 0,
      ingresosCount: ingresosCount.count ?? 0,
      costoOpenaiCentavos,
    },
    auditLog: auditLog.data || [],
  }
}

export async function actualizarEstadoCuenta(supabase, { adminId, userId, estadoCuenta }) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ estado_cuenta: estadoCuenta })
    .eq("id", userId)
    .select("id, estado_cuenta")
    .single()
  if (error) throw error

  await registrarAuditoria(supabase, {
    adminId,
    accion: estadoCuenta === "suspendida" ? "suspendio_usuario" : "reactivo_usuario",
    entidad: "profiles",
    entidadId: userId,
  })

  return data
}

export async function obtenerMetricasNegocio(supabase) {
  const { data, error } = await supabase.rpc("admin_metricas_negocio").single()
  if (error) throw error
  return data
}

const COLUMNAS_ORDENABLES_INTEGRACIONES = new Set(["created_at", "tipo", "nivel", "resuelto"])

export async function listarIntegraciones(supabase, { tipo, nivel, resuelto, orderBy = "created_at", orderDir = "desc", limit = 50, offset = 0 } = {}) {
  const columna = COLUMNAS_ORDENABLES_INTEGRACIONES.has(orderBy) ? orderBy : "created_at"

  let query = supabase
    .from("integraciones_log")
    .select("id, user_id, tipo, nivel, detalle, resuelto, created_at", { count: "exact" })

  if (tipo) query = query.eq("tipo", tipo)
  if (nivel) query = query.eq("nivel", nivel)
  if (resuelto != null) query = query.eq("resuelto", resuelto)

  const { data, error, count } = await query
    .order(columna, { ascending: orderDir === "asc" })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return { eventos: data, total: count ?? 0 }
}

// Best-effort: nunca lanza. Se llama desde el cron y el webhook de
// WhatsApp, ninguno de los dos debe caerse porque falló un log.
export async function registrarIntegracion(supabase, { tipo, nivel = "error", detalle, userId } = {}) {
  const { error } = await supabase.from("integraciones_log").insert({
    tipo,
    nivel,
    detalle: detalle ?? null,
    user_id: userId ?? null,
  })
  if (error) console.error("[admin] error al registrar integraciones_log:", error.message)
}

// Igual de best-effort que registrarIntegracion. costoEstimadoCentavos
// se calcula con web/lib/admin/costos.js antes de llamar esto.
export async function registrarUsoOpenai(supabase, { userId, contexto, modelo, tokensEntrada = 0, tokensSalida = 0, costoEstimadoCentavos = 0 }) {
  const { error } = await supabase.from("uso_openai").insert({
    user_id: userId,
    contexto,
    modelo,
    tokens_entrada: tokensEntrada,
    tokens_salida: tokensSalida,
    costo_estimado_centavos: costoEstimadoCentavos,
  })
  if (error) console.error("[admin] error al registrar uso_openai:", error.message)
}

export async function obtenerCostosOpenai(supabase, { desde, hasta }) {
  const [porDia, porUsuario] = await Promise.all([
    supabase.rpc("admin_costos_openai_diario", { p_desde: desde, p_hasta: hasta }),
    supabase.rpc("admin_costos_openai_por_usuario", { p_desde: desde, p_hasta: hasta }),
  ])

  if (porDia.error) throw porDia.error
  if (porUsuario.error) throw porUsuario.error

  return { porDia: porDia.data || [], porUsuario: porUsuario.data || [] }
}

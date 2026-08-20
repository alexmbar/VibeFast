// ============================================================
// Supabase · refresh de sesión en el middleware
// ------------------------------------------------------------
// Se llama desde web/middleware.js en cada request. Hace dos cosas:
//   1. Refresca el token de sesión (cookies) si está por expirar.
//   2. Protege rutas: si la ruta requiere auth y no hay usuario,
//      redirige a /login.
//
// Patrón oficial de Supabase SSR. No reordenes: getUser() debe
// correr entre crear la response y devolverla, o las cookies
// quedan desincronizadas.
// ============================================================

import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import config from "@/config"

// Rutas que requieren sesión. Todo lo que cuelga de /(app) en realidad,
// pero el middleware no ve grupos de rutas, así que listamos prefijos.
const PROTECTED_PREFIXES = ["/dashboard", "/account", "/chat"]

export async function updateSession(request) {
  let response = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Antes de Sem 2 el alumno aún no configuró Supabase. Sin claves,
  // dejamos pasar todo para que la landing (Sem 1) funcione igual.
  if (!url || !anonKey) return response

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: no metas lógica entre createServerClient y getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = config.auth.loginUrl
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  // /admin es zona del dueño del SaaS, no de un usuario cualquiera.
  // Sin sesión, a login. Con sesión pero sin role admin, a /gastos
  // (nunca "no autorizado": eso confirmaría que la ruta existe).
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = config.auth.loginUrl
      url.searchParams.set("next", pathname)
      return NextResponse.redirect(url)
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      const url = request.nextUrl.clone()
      url.pathname = config.auth.afterLoginUrl
      return NextResponse.redirect(url)
    }
  }

  // Si ya hay sesión y va a /login, mándalo al dashboard.
  if (user && pathname === config.auth.loginUrl) {
    const url = request.nextUrl.clone()
    url.pathname = config.auth.afterLoginUrl
    return NextResponse.redirect(url)
  }

  return response
}

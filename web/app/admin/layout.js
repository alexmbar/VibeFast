import Link from "next/link"
import { redirect } from "next/navigation"
import config from "@/config"
import { getUser, createClient } from "@/lib/supabase/server"
import UserMenu from "@/components/auth/UserMenu"
import Logo from "@/components/Logo"

// Layout de /admin. El middleware ya valida profiles.role = 'admin'
// antes de dejar pasar el request, pero revalidamos aquí (mismo criterio
// que (app)/layout.js: "por si acaso"). Sin AppNav ni onboarding wizard
// -- esta zona es del dueño del SaaS, no de un usuario normal.
export default async function AdminLayout({ children }) {
  const user = await getUser()
  if (!user) redirect(config.auth.loginUrl)

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") redirect(config.auth.afterLoginUrl)

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-card shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2 font-bold">
            <Logo className="size-7" />
            Admin
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/gastos" className="text-sm text-base-content/70 hover:underline">
              Volver a la app
            </Link>
            <UserMenu user={user} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  )
}

import Link from "next/link"
import { redirect } from "next/navigation"
import config from "@/config"
import { getUser } from "@/lib/supabase/server"
import UserMenu from "@/components/auth/UserMenu"
import AppNav from "@/components/layout/AppNav"
import { AppThemeProvider } from "@/components/layout/AppTheme"
import Logo from "@/components/Logo"

// Layout de la zona privada. El middleware ya bloquea sin sesión,
// pero revalidamos aquí para tener el `user` y proteger por si acaso.
export default async function AppLayout({ children }) {
  const user = await getUser()
  if (!user) redirect(config.auth.loginUrl)

  return (
    <AppThemeProvider>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <header className="sticky top-0 z-40 border-b bg-card">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/gastos" className="flex items-center gap-2 font-bold">
              <Logo className="size-7" />
              {config.brand.logoText}
            </Link>
            <UserMenu user={user} />
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-4 py-6">
          <aside className="hidden w-52 shrink-0 md:block">
            <AppNav />
          </aside>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </AppThemeProvider>
  )
}

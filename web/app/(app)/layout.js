import Link from "next/link"
import { redirect } from "next/navigation"
import config from "@/config"
import { getUser, createClient } from "@/lib/supabase/server"
import UserMenu from "@/components/auth/UserMenu"
import AppNav from "@/components/layout/AppNav"
import { AppThemeProvider } from "@/components/layout/AppTheme"
import Logo from "@/components/Logo"
import OnboardingWizard from "@/components/onboarding/OnboardingWizard"

// Layout de la zona privada. El middleware ya bloquea sin sesión,
// pero revalidamos aquí para tener el `user` y proteger por si acaso.
//
// Además, sin profiles.phone la captura por WhatsApp no puede
// identificar al usuario (el webhook busca por ese campo) y falla en
// silencio. Por eso, mientras el wizard de onboarding no esté completo,
// se muestra OnboardingWizard en vez de children: nadie llega a intentar
// WhatsApp sin haberse registrado primero.
export default async function AppLayout({ children }) {
  const user = await getUser()
  if (!user) redirect(config.auth.loginUrl)

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("phone, onboarding_step")
    .eq("id", user.id)
    .single()

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

        {profile?.onboarding_step === "completado" ? (
          <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-4 py-6">
            <aside className="hidden w-52 shrink-0 md:block">
              <AppNav />
            </aside>

            <main className="min-w-0 flex-1">{children}</main>
          </div>
        ) : (
          <OnboardingWizard userId={user.id} onboardingStep={profile?.onboarding_step || "telefono"} />
        )}
      </div>
    </AppThemeProvider>
  )
}

import Link from "next/link"
import { redirect } from "next/navigation"
import config from "@/config"
import { getUser, createClient } from "@/lib/supabase/server"
import UserMenu from "@/components/auth/UserMenu"
import AppNav from "@/components/layout/AppNav"
import ThemeToggle from "@/components/layout/ThemeToggle"
import Logo from "@/components/Logo"
import OnboardingWizard from "@/components/onboarding/OnboardingWizard"
import CuentaSuspendida from "@/components/layout/CuentaSuspendida"

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
    .select("phone, onboarding_step, estado_cuenta")
    .eq("id", user.id)
    .single()

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 h-14 border-b bg-card shadow-sm">
        <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-4">
          <Link href="/gastos" className="flex items-center gap-2 font-bold">
            <Logo className="size-7" />
            {config.brand.logoText}
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {/* En md+ el usuario vive al pie del sidebar (estilo Vercel); en
                mobile no hay sidebar, así que se queda aquí como único acceso. */}
            <div className="md:hidden">
              <UserMenu user={user} />
            </div>
          </div>
        </div>
      </header>

      {profile?.estado_cuenta === "suspendida" ? (
        <CuentaSuspendida />
      ) : profile?.onboarding_step === "completado" ? (
        <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-4 py-6">
          <aside className="hidden w-52 shrink-0 flex-col justify-between md:sticky md:top-[calc(3.5rem_+_1.5rem)] md:flex md:h-[calc(100vh_-_6.5rem)]">
            <div className="min-h-0 overflow-y-auto">
              <AppNav />
            </div>
            <div className="border-t pt-3">
              <UserMenu user={user} className="w-full justify-start" />
            </div>
          </aside>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      ) : (
        <OnboardingWizard userId={user.id} onboardingStep={profile?.onboarding_step || "telefono"} />
      )}
    </div>
  )
}

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
import { UserConfigProvider } from "@/lib/config/UserConfigContext"
import { ToastProvider, Toaster } from "@/components/ui/toast"

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
    .select("phone, onboarding_step, estado_cuenta, zona_horaria, moneda, formato_fecha")
    .eq("id", user.id)
    .single()

  return (
    <UserConfigProvider
      initialConfig={{
        zonaHoraria: profile?.zona_horaria,
        moneda: profile?.moneda,
        formatoFecha: profile?.formato_fecha,
      }}
    >
      <ToastProvider>
        <div className="flex min-h-screen flex-col bg-background text-foreground">
          <header className="sticky top-0 z-40 h-14 border-b bg-card shadow-sm">
            <div className="flex h-full items-center justify-between px-4">
              <Link href="/transacciones" className="flex items-center gap-2 font-bold">
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
            <div className="flex flex-1">
              {/* Pegado al borde izquierdo real de la ventana (fuera de cualquier
                  contenedor centrado), estilo Vercel -- no dentro de un max-w. */}
              <aside className="hidden w-52 shrink-0 flex-col border-r bg-card md:sticky md:top-14 md:flex md:h-[calc(100vh_-_3.5rem)]">
                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  <AppNav />
                </div>
                <div className="border-t p-3">
                  <UserMenu user={user} className="w-full justify-start" />
                </div>
              </aside>

              <div className="min-w-0 flex-1">
                <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
              </div>
            </div>
          ) : (
            <OnboardingWizard userId={user.id} onboardingStep={profile?.onboarding_step || "telefono"} />
          )}
        </div>
        <Toaster />
      </ToastProvider>
    </UserConfigProvider>
  )
}

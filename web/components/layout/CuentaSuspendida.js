import config from "@/config"
import { signOut } from "@/lib/auth/actions"

// Se muestra en vez de children cuando profiles.estado_cuenta = 'suspendida'.
// No hay acceso al portal (no es modo lectura): solo el aviso de renovar.
// La captura por WhatsApp sigue funcionando aunque el portal esté bloqueado
// -- ver web/app/api/webhooks/whatsapp/route.js.
export default function CuentaSuspendida() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-base-200 bg-base-100 p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold tracking-tight">Tu suscripción venció</h1>
        <p className="mt-2 text-sm text-base-content/70">
          Renueva tu suscripción para volver a entrar al portal. Tus gastos
          capturados por WhatsApp se siguen guardando con normalidad
          mientras tanto.
        </p>
        <p className="mt-4 text-sm text-base-content/70">
          Escríbenos a{" "}
          <a href={`mailto:${config.email.supportEmail}`} className="link">
            {config.email.supportEmail}
          </a>{" "}
          para renovar.
        </p>

        <form action={signOut} className="mt-6">
          <button type="submit" className="btn btn-ghost btn-sm">
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  )
}

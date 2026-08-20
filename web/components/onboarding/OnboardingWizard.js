"use client"

import PasoTelefono from "@/components/onboarding/PasoTelefono"
import PasoCargaInicial from "@/components/onboarding/PasoCargaInicial"
import PasoBancos from "@/components/onboarding/PasoBancos"
import PasoRecurrencias from "@/components/onboarding/PasoRecurrencias"

// Wizard de onboarding: telefono -> carga inicial de efectivo (por
// WhatsApp) -> bancos -> recurrencias. El paso activo viene de
// profiles.onboarding_step (server component en web/app/(app)/layout.js);
// cada Paso avanza el propio campo y hace router.refresh(), lo que vuelve
// a renderizar este componente con el paso siguiente.
export default function OnboardingWizard({ userId, onboardingStep }) {
  switch (onboardingStep) {
    case "carga_inicial":
      return <PasoCargaInicial userId={userId} />
    case "bancos":
      return <PasoBancos userId={userId} />
    case "recurrencias":
      return <PasoRecurrencias userId={userId} />
    case "telefono":
    default:
      return <PasoTelefono userId={userId} />
  }
}

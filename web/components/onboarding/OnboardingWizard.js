"use client"

import PasoTelefono from "@/components/onboarding/PasoTelefono"

// Wizard de onboarding: hoy es un solo paso (teléfono), el único que
// de verdad bloquea el uso de la app -- ver PasoTelefono.js. Carga
// inicial, bancos y recurrencias se movieron a OnboardingBanner
// (dashboard), descartable y sin bloquear.
export default function OnboardingWizard({ userId }) {
  return <PasoTelefono userId={userId} />
}

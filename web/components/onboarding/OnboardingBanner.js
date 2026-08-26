'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Info, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { obtenerEstadoOnboarding } from '@/lib/onboarding/estado'

// Banner descartable en el dashboard, reemplaza los pasos de wizard
// "carga_inicial"/"bancos"/"recurrencias" (ver
// 042_onboarding_simplificado.sql y OnboardingWizard.js): ninguno de
// los 3 bloquea el uso de la app, así que en vez de una pantalla
// completa por paso, es una sola línea con enlaces directos. Se
// esconde solo si el usuario ya cerró el banner
// (profiles.onboarding_banner_dismissed) o si ya completó los 3.
export default function OnboardingBanner() {
  const [userId, setUserId] = useState(null)
  const [dismissed, setDismissed] = useState(true)
  const [estado, setEstado] = useState(null)

  useEffect(() => {
    let vigente = true

    async function cargar() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: profile }, estadoOnboarding] = await Promise.all([
        supabase.from('profiles').select('onboarding_banner_dismissed').eq('id', user.id).single(),
        obtenerEstadoOnboarding(),
      ])

      if (!vigente) return
      setUserId(user.id)
      setDismissed(profile?.onboarding_banner_dismissed ?? false)
      setEstado(estadoOnboarding)
    }

    cargar().catch((error) => console.error('Error loading onboarding banner:', error))
    return () => {
      vigente = false
    }
  }, [])

  async function handleDismiss() {
    setDismissed(true)
    if (!userId) return
    const supabase = createClient()
    await supabase.from('profiles').update({ onboarding_banner_dismissed: true }).eq('id', userId)
  }

  if (!estado || dismissed) return null

  const pendientes = [
    !estado.cargaInicial && { label: 'Cargar efectivo inicial', href: '/cartera' },
    !estado.bancos && { label: 'Agregar bancos', href: '/bancos' },
    !estado.recurrencias && { label: 'Configurar recurrencias', href: '/recurrencias' },
  ].filter(Boolean)

  if (pendientes.length === 0) return null

  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 px-3.5 py-2.5">
      <Info className="size-4 shrink-0 text-primary" />
      <p className="flex-1 text-sm">
        <span className="font-medium">Termina de configurar tu cuenta</span>
        {' — '}
        {pendientes.length === 1 ? 'te falta 1 paso' : `te faltan ${pendientes.length} pasos`}
      </p>
      <div className="flex items-center gap-4">
        {pendientes.map((p) => (
          <Link key={p.href} href={p.href} className="text-xs font-medium whitespace-nowrap text-primary hover:underline">
            {p.label}
          </Link>
        ))}
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Cerrar"
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

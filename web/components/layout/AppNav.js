"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, ArrowLeftRight, Landmark, BarChart3, Bot, Repeat, PiggyBank } from "lucide-react"
import { cn } from "@/lib/utils"
import { obtenerAlertasRecurrencias } from "@/lib/recurrencias/alertas"
import { obtenerAlertasPresupuestos } from "@/lib/presupuestos/alertas"

// Los componentes de ícono (funciones) no son serializables entre el
// server component padre (app)/layout.js y este client component, así
// que NAV vive aquí en vez de recibirse por props.
const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transacciones", label: "Transacciones", icon: ArrowLeftRight },
  { href: "/recurrencias", label: "Recurrencias", icon: Repeat },
  { href: "/presupuestos", label: "Presupuestos", icon: PiggyBank },
  { href: "/cartera", label: "Cartera", icon: Landmark },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/agente", label: "Agente", icon: Bot },
]

// href -> función que carga el conteo de alertas para el badge de ese
// item. Cada entrada de NAV que necesite badge se agrega aquí.
const ALERTAS_POR_HREF = {
  "/recurrencias": obtenerAlertasRecurrencias,
  "/presupuestos": obtenerAlertasPresupuestos,
}

// Nav lateral de (app). Cliente aparte del layout (server component) para
// poder resaltar la ruta activa con usePathname sin convertir el layout
// -- y con él, el guard de auth -- en cliente.
export default function AppNav() {
  const pathname = usePathname()
  const [alertasPorHref, setAlertasPorHref] = useState({})

  useEffect(() => {
    let vigente = true
    Object.entries(ALERTAS_POR_HREF).forEach(([href, obtenerAlertas]) => {
      obtenerAlertas()
        .then((data) => {
          if (vigente) setAlertasPorHref((prev) => ({ ...prev, [href]: data.total }))
        })
        .catch((error) => console.error(`Error loading alertas ${href}:`, error))
    })
    return () => {
      vigente = false
    }
  }, [])

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname?.startsWith(`${href}/`)
        const alertasCount = alertasPorHref[href] || 0
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-md border-l-2 border-transparent px-2.5 py-1.5 text-sm transition-colors",
              active
                ? "border-primary font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {label}
            {alertasCount > 0 && (
              <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-white">
                {alertasCount}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
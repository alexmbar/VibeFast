"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Wallet, Landmark, BarChart3, Bot } from "lucide-react"
import { cn } from "@/lib/utils"

// Los componentes de ícono (funciones) no son serializables entre el
// server component padre (app)/layout.js y este client component, así
// que NAV vive aquí en vez de recibirse por props.
const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/gastos", label: "Gastos", icon: Wallet },
  { href: "/cartera", label: "Cartera", icon: Landmark },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/agente", label: "Agente", icon: Bot },
]

// Nav lateral de (app). Cliente aparte del layout (server component) para
// poder resaltar la ruta activa con usePathname sin convertir el layout
// -- y con él, el guard de auth -- en cliente.
export default function AppNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1 rounded-xl bg-card p-2 ring-1 ring-foreground/10">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname?.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Activity, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/admin", label: "Panel", icon: LayoutDashboard },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/integraciones", label: "Integraciones", icon: Activity },
  { href: "/admin/costos", label: "Costos", icon: DollarSign },
]

// Nav horizontal de /admin -- a diferencia de AppNav (sidebar de (app)),
// esta zona no tiene sidebar, así que vive como fila bajo el header.
export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 overflow-x-auto">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === href : pathname?.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-1.5 rounded-md border-b-2 border-transparent px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors",
              active
                ? "border-primary font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
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

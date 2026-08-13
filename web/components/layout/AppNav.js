"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

// Nav lateral de (app). Cliente aparte del layout (server component) para
// poder resaltar la ruta activa con usePathname sin convertir el layout
// -- y con él, el guard de auth -- en cliente.
export default function AppNav({ items }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1 rounded-xl bg-card p-2 ring-1 ring-foreground/10">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname?.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
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

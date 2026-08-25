"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"

// Toggle claro/oscuro compartido por (app), /admin y /docs, respaldado por
// next-themes (persiste en localStorage y evita el flash de tema incorrecto).
export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = resolvedTheme === "dark"

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="btn btn-ghost btn-sm btn-square"
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title="Cambiar tema"
    >
      {/* Evita mismatch de hidratación: hasta montar, muestra un ícono estable */}
      {mounted && isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}

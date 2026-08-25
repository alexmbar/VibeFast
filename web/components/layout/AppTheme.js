"use client"

import { useTheme } from "next-themes"

// Wrapper delgado sobre next-themes: expone { theme, isDark } con los
// nombres de theme de DaisyUI (vibefast/vibefast-dark) que ya esperan los
// componentes de gráficas (VChart necesita saber el modo activo para
// pintar sus propios colores, no puede leer variables CSS).
export function useAppTheme() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  return { theme: isDark ? "vibefast-dark" : "vibefast", isDark }
}

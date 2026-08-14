"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { Sun, Moon } from "lucide-react"

const LIGHT = "vibefast"
const DARK = "vibefast-dark"
const STORAGE_KEY = "app-theme"

const AppThemeContext = createContext(null)

// Tema de la sección autenticada: oscuro por default, con scope propio
// (data-theme en el div raíz de (app), no en <html>) para no arrastrar el
// cambio a la landing/docs, que siguen su propio toggle e independiente
// localStorage key ("theme").
export function AppThemeProvider({ children }) {
  const [theme, setTheme] = useState(DARK)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === LIGHT || saved === DARK) setTheme(saved)
    } catch {}
  }, [])

  function toggle() {
    const next = theme === DARK ? LIGHT : DARK
    setTheme(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {}
  }

  return (
    <AppThemeContext.Provider value={{ theme, isDark: theme === DARK, toggle }}>
      <div data-theme={theme} className="contents" suppressHydrationWarning>
        {/* Evita flash: fija data-theme antes del primer paint leyendo la
            key propia de (app), sin tocar <html> (eso es de docs/landing). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('${STORAGE_KEY}');var el=document.currentScript.parentElement;if(t==='${LIGHT}'||t==='${DARK}'){el.setAttribute('data-theme',t)}}catch(e){}`,
          }}
        />
        {children}
      </div>
    </AppThemeContext.Provider>
  )
}

export function useAppTheme() {
  const ctx = useContext(AppThemeContext)
  if (!ctx) throw new Error("useAppTheme debe usarse dentro de AppThemeProvider")
  return ctx
}

export function AppThemeToggle() {
  const { isDark, toggle } = useAppTheme()

  return (
    <button
      onClick={toggle}
      className="btn btn-ghost btn-sm btn-square"
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title="Cambiar tema"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}

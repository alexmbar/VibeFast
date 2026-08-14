"use client"

import { createContext, useContext } from "react"

const DARK = "vibefast-dark"

const AppThemeContext = createContext({ theme: DARK, isDark: true })

// Tema de la sección autenticada: fijo en oscuro, con scope propio
// (data-theme en el div raíz de (app), no en <html>) para no arrastrar el
// cambio a la landing/docs, que tienen su propio toggle e independiente
// localStorage key ("theme").
export function AppThemeProvider({ children }) {
  return (
    <AppThemeContext.Provider value={{ theme: DARK, isDark: true }}>
      <div data-theme={DARK} className="contents">
        {children}
      </div>
    </AppThemeContext.Provider>
  )
}

export function useAppTheme() {
  return useContext(AppThemeContext)
}

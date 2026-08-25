'use client'

import { createContext, useContext, useCallback, useMemo } from 'react'
import { formatMonto as formatMontoBase } from '@/lib/gastos/schema'
import { formatFechaDisplay } from '@/lib/config/fechas'
import { ZONA_HORARIA_DEFAULT, MONEDA_DEFAULT, FORMATO_FECHA_DEFAULT } from '@/lib/config/schema'

const UserConfigContext = createContext(null)

// Provee la configuracion de usuario (zona horaria, moneda, formato de
// fecha) a todo el arbol privado de la app, poblada desde el `profile` que
// ya lee web/app/(app)/layout.js. `formatMonto`/`formatFecha` son wrappers
// que ya inyectan la preferencia del usuario, asi que los call sites que
// hoy llaman formatMonto(x)/formatDate(x) no cambian de firma -- solo
// cambian el import por el hook useUserConfig().
export function UserConfigProvider({ initialConfig, children }) {
  const zonaHoraria = initialConfig?.zonaHoraria || ZONA_HORARIA_DEFAULT
  const moneda = initialConfig?.moneda || MONEDA_DEFAULT
  const formatoFecha = initialConfig?.formatoFecha || FORMATO_FECHA_DEFAULT

  const formatMonto = useCallback((centavos) => formatMontoBase(centavos, moneda), [moneda])
  const formatFecha = useCallback((fecha) => formatFechaDisplay(fecha, formatoFecha), [formatoFecha])

  const value = useMemo(
    () => ({ zonaHoraria, moneda, formatoFecha, formatMonto, formatFecha }),
    [zonaHoraria, moneda, formatoFecha, formatMonto, formatFecha]
  )

  return <UserConfigContext.Provider value={value}>{children}</UserConfigContext.Provider>
}

export function useUserConfig() {
  const ctx = useContext(UserConfigContext)
  if (!ctx) throw new Error('useUserConfig debe usarse dentro de UserConfigProvider')
  return ctx
}

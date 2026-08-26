'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Clock } from 'lucide-react'
import { obtenerAlertasRecurrencias } from '@/lib/recurrencias/alertas'
import { useUserConfig } from '@/lib/config/UserConfigContext'
import { Card, CardContent } from '@/components/ui/card'

const MAX_ITEMS = 5

export default function AlertasRecurrencias() {
  const { formatMonto } = useUserConfig()
  const [alertas, setAlertas] = useState(null)

  useEffect(() => {
    let vigente = true
    obtenerAlertasRecurrencias()
      .then((data) => {
        if (vigente) setAlertas(data)
      })
      .catch((error) => console.error('Error loading alertas recurrencias:', error))
    return () => {
      vigente = false
    }
  }, [])

  if (!alertas || alertas.total === 0) return null

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardContent className="space-y-4">
        {alertas.pendientes.length > 0 && (
          <div className="flex gap-3">
            <AlertCircle className="size-5 shrink-0 text-amber-500" />
            <div className="space-y-1.5 text-sm">
              <p className="font-medium">
                {alertas.pendientes.length === 1
                  ? '1 movimiento recurrente pendiente de confirmar'
                  : `${alertas.pendientes.length} movimientos recurrentes pendientes de confirmar`}
              </p>
              <ul className="space-y-0.5 text-muted-foreground">
                {alertas.pendientes.slice(0, MAX_ITEMS).map((p) => (
                  <li key={`${p.tipo}-${p.id}`}>
                    <Link href={`/transacciones?tipo=${p.tipo === 'gasto' ? 'gasto' : 'ingreso'}`} className="hover:text-foreground hover:underline">
                      {formatMonto(p.monto)} · {p.tipo === 'gasto' ? 'gasto' : 'ingreso'} · {p.fecha}
                    </Link>
                  </li>
                ))}
              </ul>
              {alertas.pendientes.length > MAX_ITEMS && (
                <p className="text-xs text-muted-foreground">y {alertas.pendientes.length - MAX_ITEMS} más</p>
              )}
            </div>
          </div>
        )}

        {alertas.proximas.length > 0 && (
          <div className="flex gap-3">
            <Clock className="size-5 shrink-0 text-primary" />
            <div className="space-y-1.5 text-sm">
              <p className="font-medium">Próximas a generarse</p>
              <ul className="space-y-0.5 text-muted-foreground">
                {alertas.proximas.slice(0, MAX_ITEMS).map((p, i) => (
                  <li key={`${p.reglaId}-${p.fecha}-${i}`}>
                    {p.categoriaLabel} · {formatMonto(p.monto)} · {p.tipo === 'gasto' ? 'se cobra' : 'se recibe'} en {p.diasFaltantes} {p.diasFaltantes === 1 ? 'día' : 'días'}
                  </li>
                ))}
              </ul>
              {alertas.proximas.length > MAX_ITEMS && (
                <p className="text-xs text-muted-foreground">y {alertas.proximas.length - MAX_ITEMS} más</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

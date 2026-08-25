'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, AlertCircle } from 'lucide-react'
import { obtenerAlertasPresupuestos } from '@/lib/presupuestos/alertas'
import { useUserConfig } from '@/lib/config/UserConfigContext'
import { Card, CardContent } from '@/components/ui/card'

const MAX_ITEMS = 5

export default function AlertasPresupuestos() {
  const { formatMonto } = useUserConfig()
  const [alertas, setAlertas] = useState(null)

  useEffect(() => {
    let vigente = true
    obtenerAlertasPresupuestos()
      .then((data) => {
        if (vigente) setAlertas(data)
      })
      .catch((error) => console.error('Error loading alertas presupuestos:', error))
    return () => {
      vigente = false
    }
  }, [])

  if (!alertas || alertas.total === 0) return null

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardContent className="space-y-4">
        {alertas.excedidos.length > 0 && (
          <div className="flex gap-3">
            <AlertTriangle className="size-5 shrink-0 text-destructive" />
            <div className="space-y-1.5 text-sm">
              <p className="font-medium">
                {alertas.excedidos.length === 1
                  ? '1 presupuesto excedido este periodo'
                  : `${alertas.excedidos.length} presupuestos excedidos este periodo`}
              </p>
              <ul className="space-y-0.5 text-muted-foreground">
                {alertas.excedidos.slice(0, MAX_ITEMS).map((p) => (
                  <li key={p.presupuesto_id}>
                    <Link href="/presupuestos" className="hover:text-foreground hover:underline">
                      {p.categoriaLabel} · {formatMonto(p.total_gastado)} de {formatMonto(p.monto_limite)} ({p.pct}%)
                    </Link>
                  </li>
                ))}
              </ul>
              {alertas.excedidos.length > MAX_ITEMS && (
                <p className="text-xs text-muted-foreground">y {alertas.excedidos.length - MAX_ITEMS} más</p>
              )}
            </div>
          </div>
        )}

        {alertas.acercandose.length > 0 && (
          <div className="flex gap-3">
            <AlertCircle className="size-5 shrink-0 text-amber-500" />
            <div className="space-y-1.5 text-sm">
              <p className="font-medium">
                {alertas.acercandose.length === 1
                  ? '1 presupuesto acercándose a su límite'
                  : `${alertas.acercandose.length} presupuestos acercándose a su límite`}
              </p>
              <ul className="space-y-0.5 text-muted-foreground">
                {alertas.acercandose.slice(0, MAX_ITEMS).map((p) => (
                  <li key={p.presupuesto_id}>
                    <Link href="/presupuestos" className="hover:text-foreground hover:underline">
                      {p.categoriaLabel} · {formatMonto(p.total_gastado)} de {formatMonto(p.monto_limite)} ({p.pct}%)
                    </Link>
                  </li>
                ))}
              </ul>
              {alertas.acercandose.length > MAX_ITEMS && (
                <p className="text-xs text-muted-foreground">y {alertas.acercandose.length - MAX_ITEMS} más</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

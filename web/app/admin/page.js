'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Users, UserPlus, Activity, Wallet, TrendingUp } from 'lucide-react'
import { obtenerMetricasNegocio } from '@/lib/admin/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'

const numero = (n) => (n ?? 0).toLocaleString('es-MX')

const TARJETAS = [
  {
    key: 'usuarios_totales',
    label: 'Usuarios totales',
    icon: Users,
    iconClass: 'bg-primary/15 text-primary',
  },
  {
    key: 'altas_semana',
    label: 'Altas de la semana',
    icon: UserPlus,
    iconClass: 'bg-emerald-400/15 text-emerald-500',
  },
  {
    key: 'usuarios_activos_30d',
    label: 'Activos (30 días)',
    icon: Activity,
    iconClass: 'bg-sky-400/15 text-sky-500',
  },
  {
    key: 'gastos_capturados_mes',
    label: 'Gastos del mes',
    icon: Wallet,
    iconClass: 'bg-amber-400/15 text-amber-500',
  },
  {
    key: 'ingresos_capturados_mes',
    label: 'Ingresos del mes',
    icon: TrendingUp,
    iconClass: 'bg-emerald-400/15 text-emerald-500',
  },
]

export default function AdminPage() {
  const toast = useToast()
  const [metricas, setMetricas] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    obtenerMetricasNegocio()
      .then(setMetricas)
      .catch((error) => toast.error(error.message))
      .finally(() => setIsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel del dueño</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Métricas de negocio a nivel plataforma. Nunca muestra montos, categorías,
          tiendas ni bancos de un usuario individual.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TARJETAS.map(({ key, label, icon: Icon, iconClass }) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-sm font-semibold uppercase text-muted-foreground">
                <span className={`flex size-9 items-center justify-center rounded-lg ${iconClass}`}>
                  <Icon className="size-4.5" />
                </span>
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold font-mono tabular-nums">
                {numero(metricas?.[key])}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/admin/usuarios">
          <Card className="transition-colors hover:bg-muted/50">
            <CardContent>
              <p className="font-medium">Usuarios</p>
              <p className="text-sm text-muted-foreground">
                Listado, detalle y suspensión de cuentas
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/integraciones">
          <Card className="transition-colors hover:bg-muted/50">
            <CardContent>
              <p className="font-medium">Integraciones</p>
              <p className="text-sm text-muted-foreground">
                Salud de webhooks, crons y OpenAI Vision
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/costos">
          <Card className="transition-colors hover:bg-muted/50">
            <CardContent>
              <p className="font-medium">Costos</p>
              <p className="text-sm text-muted-foreground">
                Gasto de OpenAI por día y por usuario
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}

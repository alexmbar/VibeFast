'use client'

import Link from 'next/link'
import { Landmark, Plus, Loader2 } from 'lucide-react'
import { useUserConfig } from '@/lib/config/UserConfigContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function CarteraResumen({ saldo, isLoading }) {
  const { formatMonto } = useUserConfig()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Saldo en efectivo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="font-mono text-3xl font-bold tabular-nums">
            {isLoading ? (
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            ) : (
              formatMonto(saldo)
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" render={<Link href="/bancos" />}>
              <Landmark />
              Gestionar bancos
            </Button>
            <Button render={<Link href="/retiros/create" />}>
              <Plus />
              Nuevo retiro
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

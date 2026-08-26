'use client'

import { useEffect, useState } from 'react'
import { obtenerCartera } from '@/lib/cartera/client'
import CarteraResumen from '@/components/cartera/CarteraResumen'
import CarteraMovimientosTable from '@/components/cartera/CarteraMovimientosTable'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function CarteraPage() {
  const [saldo, setSaldo] = useState(0)
  const [movimientos, setMovimientos] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const data = await obtenerCartera()
        setSaldo(data.saldo)
        setMovimientos(data.movimientos)
      } catch (error) {
        console.error('Error loading cartera:', error)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  const tieneCargaInicial = movimientos.some((m) => m.esCargaInicial)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Cartera</h1>

      {!isLoading && !tieneCargaInicial && (
        <Alert>
          <AlertDescription>
            Aún no registras tu efectivo inicial. Escríbenos por WhatsApp cuánto
            tienes contado ahora mismo (solo el número, ej. &quot;3000&quot;) y
            arrancamos tu saldo de Cartera desde ahí.
          </AlertDescription>
        </Alert>
      )}

      <CarteraResumen saldo={saldo} isLoading={isLoading} />

      <Card>
        <CardContent>
          <CarteraMovimientosTable movimientos={movimientos} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  )
}

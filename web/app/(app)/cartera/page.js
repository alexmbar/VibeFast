'use client'

import { useEffect, useState } from 'react'
import { obtenerCartera } from '@/lib/cartera/client'
import CarteraResumen from '@/components/cartera/CarteraResumen'
import CarteraMovimientosTable from '@/components/cartera/CarteraMovimientosTable'
import { Card, CardContent } from '@/components/ui/card'

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Cartera</h1>

      <CarteraResumen saldo={saldo} isLoading={isLoading} />

      <Card>
        <CardContent>
          <CarteraMovimientosTable movimientos={movimientos} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  )
}

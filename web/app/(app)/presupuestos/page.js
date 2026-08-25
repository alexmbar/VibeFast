'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { listarPresupuestos, obtenerEstadoPresupuestos } from '@/lib/presupuestos/client'
import { listarBancos } from '@/lib/bancos/client'
import PresupuestoTable from '@/components/presupuestos/PresupuestoTable'
import AlertasPresupuestos from '@/components/presupuestos/AlertasPresupuestos'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function PresupuestosPage() {
  const [presupuestos, setPresupuestos] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  async function loadPresupuestos() {
    setIsLoading(true)
    try {
      const [lista, estados, bancos] = await Promise.all([
        listarPresupuestos({ activo: true }),
        obtenerEstadoPresupuestos(),
        listarBancos({ tipo: 'credito' }),
      ])
      const bancosPorId = Object.fromEntries(bancos.map(b => [b.id, b]))
      const estadosPorId = Object.fromEntries(estados.map(e => [e.presupuesto_id, e]))
      const combinados = lista.map(p => ({
        ...p,
        total_gastado: estadosPorId[p.id]?.total_gastado ?? 0,
        banco: p.banco_id ? bancosPorId[p.banco_id] : null,
      }))
      setPresupuestos(combinados)
    } catch (error) {
      console.error('Error loading presupuestos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPresupuestos()
  }, [])

  function handleChange(actualizado, deletedId) {
    if (deletedId) {
      setPresupuestos(prev => prev.filter(p => p.id !== deletedId))
      return
    }
    loadPresupuestos()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Presupuestos</h1>
        <Button render={<Link href="/presupuestos/create" />}>
          <Plus />
          Nuevo presupuesto
        </Button>
      </div>

      <AlertasPresupuestos />

      <Card>
        <CardContent>
          <PresupuestoTable presupuestos={presupuestos} onChange={handleChange} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  )
}

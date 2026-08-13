'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Wallet, Loader2 } from 'lucide-react'
import { listarGastos } from '@/lib/gastos/client'
import { formatMonto } from '@/lib/gastos/schema'
import CategoriaChart from '@/components/reportes/CategoriaChart'
import TendenciaChart from '@/components/reportes/TendenciaChart'
import GastoTable from '@/components/gastos/GastoTable'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

function toISODate(d) {
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

const HOY = new Date()
HOY.setHours(0, 0, 0, 0)
const INICIO_MES = new Date(HOY.getFullYear(), HOY.getMonth(), 1)
const INICIO_SEMANA = new Date(HOY)
INICIO_SEMANA.setDate(HOY.getDate() - 6)

const MES_LABEL = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(HOY)

export default function DashboardPage() {
  const [gastosMes, setGastosMes] = useState([])
  const [gastosSemana, setGastosSemana] = useState([])
  const [recientes, setRecientes] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  async function loadDatos() {
    setIsLoading(true)
    try {
      const [mes, semana, ultimos] = await Promise.all([
        listarGastos({ desde: toISODate(INICIO_MES), hasta: toISODate(HOY), limit: 1000 }),
        listarGastos({ desde: toISODate(INICIO_SEMANA), hasta: toISODate(HOY), limit: 1000 }),
        listarGastos({ limit: 8 }),
      ])
      setGastosMes(mes.gastos)
      setGastosSemana(semana.gastos)
      setRecientes(ultimos.gastos)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDatos()
  }, [])

  function handleDelete(id) {
    setRecientes(prev => prev.filter(g => g.id !== id))
  }

  const totalMes = gastosMes.reduce((sum, g) => sum + g.monto, 0)

  const gastoCategoria = {}
  gastosMes.forEach(g => {
    gastoCategoria[g.categoria] = (gastoCategoria[g.categoria] || 0) + g.monto
  })
  const dataCategoria = Object.entries(gastoCategoria)
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const gastoDia = {}
  gastosSemana.forEach(g => {
    gastoDia[g.fecha] = (gastoDia[g.fecha] || 0) + g.monto
  })
  const dataSemana = Object.entries(gastoDia)
    .map(([fecha, total]) => ({ fecha, total }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <Button render={<Link href="/gastos/create" />}>
          <Plus />
          Registrar gasto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase text-muted-foreground">
            <Wallet className="size-4" />
            Gasto Total Mensual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold font-mono capitalize">{formatMonto(totalMes)}</p>
          <p className="text-xs text-muted-foreground mt-1 capitalize">{MES_LABEL} · {gastosMes.length} registros</p>
        </CardContent>
      </Card>

      {gastosMes.length === 0 && gastosSemana.length === 0 && recientes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">No hay gastos para mostrar</p>
          <p className="text-sm text-muted-foreground/70 mt-2">Registra tu primer gasto para ver el dashboard</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoriaChart data={dataCategoria} />
            <TendenciaChart data={dataSemana} />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold tracking-tight">Gastos recientes</h2>
              <Link href="/gastos" className="text-sm text-primary hover:underline">
                Ver todos
              </Link>
            </div>
            <Card>
              <CardContent>
                <GastoTable gastos={recientes} onDelete={handleDelete} isLoading={false} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

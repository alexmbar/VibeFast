'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Wallet, TrendingUp, Scale, Loader2 } from 'lucide-react'
import { listarGastos } from '@/lib/gastos/client'
import { listarIngresos, obtenerBalanceNeto } from '@/lib/ingresos/client'
import { formatMonto } from '@/lib/gastos/schema'
import CategoriaChart from '@/components/reportes/CategoriaChart'
import TendenciaChart from '@/components/reportes/TendenciaChart'
import GastoTable from '@/components/gastos/GastoTable'
import IngresoTable from '@/components/ingresos/IngresoTable'
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
  const [ingresosMes, setIngresosMes] = useState([])
  const [ingresosSemana, setIngresosSemana] = useState([])
  const [ingresosRecientes, setIngresosRecientes] = useState([])
  const [balanceNeto, setBalanceNeto] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  async function loadDatos() {
    setIsLoading(true)
    try {
      const [mes, semana, ultimos, ingresosMesRes, ingresosSemanaRes, ingresosUltimos, balance] = await Promise.all([
        listarGastos({ desde: toISODate(INICIO_MES), hasta: toISODate(HOY), limit: 1000 }),
        listarGastos({ desde: toISODate(INICIO_SEMANA), hasta: toISODate(HOY), limit: 1000 }),
        listarGastos({ limit: 8 }),
        listarIngresos({ desde: toISODate(INICIO_MES), hasta: toISODate(HOY), limit: 1000 }),
        listarIngresos({ desde: toISODate(INICIO_SEMANA), hasta: toISODate(HOY), limit: 1000 }),
        listarIngresos({ limit: 8 }),
        obtenerBalanceNeto({ desde: toISODate(INICIO_MES), hasta: toISODate(HOY) }),
      ])
      setGastosMes(mes.gastos)
      setGastosSemana(semana.gastos)
      setRecientes(ultimos.gastos)
      setIngresosMes(ingresosMesRes.ingresos)
      setIngresosSemana(ingresosSemanaRes.ingresos)
      setIngresosRecientes(ingresosUltimos.ingresos)
      setBalanceNeto(balance.balance)
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

  function handleUpdate(actualizado) {
    setRecientes(prev => prev.map(g => (g.id === actualizado.id ? actualizado : g)))
  }

  function handleDeleteIngreso(id) {
    setIngresosRecientes(prev => prev.filter(i => i.id !== id))
  }

  function handleUpdateIngreso(actualizado) {
    setIngresosRecientes(prev => prev.map(i => (i.id === actualizado.id ? actualizado : i)))
  }

  const totalMes = gastosMes.reduce((sum, g) => sum + g.monto, 0)
  const totalIngresoMes = ingresosMes.reduce((sum, i) => sum + i.monto, 0)

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

  const ingresoDia = {}
  ingresosSemana.forEach(i => {
    ingresoDia[i.fecha] = (ingresoDia[i.fecha] || 0) + i.monto
  })
  const dataSemanaIngreso = Object.entries(ingresoDia)
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-sm font-semibold uppercase text-muted-foreground">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Wallet className="size-4.5" />
              </span>
              Gasto Total Mensual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold font-mono capitalize">{formatMonto(totalMes)}</p>
            <p className="text-xs text-muted-foreground mt-1 capitalize">{MES_LABEL} · {gastosMes.length} registros</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-sm font-semibold uppercase text-muted-foreground">
              <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-500">
                <TrendingUp className="size-4.5" />
              </span>
              Ingreso Total Mensual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold font-mono capitalize">{formatMonto(totalIngresoMes)}</p>
            <p className="text-xs text-muted-foreground mt-1 capitalize">{MES_LABEL} · {ingresosMes.length} registros</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-sm font-semibold uppercase text-muted-foreground">
              <span className={`flex size-9 items-center justify-center rounded-lg ${balanceNeto >= 0 ? 'bg-emerald-400/15 text-emerald-500' : 'bg-destructive/15 text-destructive'}`}>
                <Scale className="size-4.5" />
              </span>
              Balance Neto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-4xl font-bold font-mono ${balanceNeto < 0 ? 'text-destructive' : ''}`}>
              {formatMonto(balanceNeto)}
            </p>
            <p className="text-xs text-muted-foreground mt-1 capitalize">{MES_LABEL} · ingresos − gastos</p>
          </CardContent>
        </Card>
      </div>

      {gastosMes.length === 0 && gastosSemana.length === 0 && recientes.length === 0
      && ingresosMes.length === 0 && ingresosSemana.length === 0 && ingresosRecientes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">No hay gastos ni ingresos para mostrar</p>
          <p className="text-sm text-muted-foreground/70 mt-2">Registra tu primer movimiento para ver el dashboard</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoriaChart data={dataCategoria} />
            <TendenciaChart
              data={dataSemana}
              dataSecundaria={dataSemanaIngreso}
              labelPrincipal="Gasto"
              labelIngreso="Ingreso"
            />
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
                <GastoTable gastos={recientes} onDelete={handleDelete} onUpdate={handleUpdate} isLoading={false} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold tracking-tight">Ingresos recientes</h2>
              <Link href="/ingresos" className="text-sm text-primary hover:underline">
                Ver todos
              </Link>
            </div>
            <Card>
              <CardContent>
                <IngresoTable
                  ingresos={ingresosRecientes}
                  onDelete={handleDeleteIngreso}
                  onUpdate={handleUpdateIngreso}
                  isLoading={false}
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

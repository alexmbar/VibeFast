'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { listarGastos } from '@/lib/gastos/client'
import { formatMonto } from '@/lib/gastos/schema'
import GastoMensualChart from '@/components/reportes/GastoMensualChart'
import CategoriaChart from '@/components/reportes/CategoriaChart'
import TendenciaChart from '@/components/reportes/TendenciaChart'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function ReportesPage() {
  const [gastos, setGastos] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filtros, setFiltros] = useState({
    desde: '',
    hasta: '',
  })

  async function loadGastos() {
    setIsLoading(true)
    try {
      const filters = {}
      if (filtros.desde) filters.desde = filtros.desde
      if (filtros.hasta) filters.hasta = filtros.hasta
      const { gastos: data } = await listarGastos({ ...filters, limit: 1000 })
      setGastos(data)
    } catch (error) {
      console.error('Error loading gastos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadGastos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros])

  // Calcular datos para gráficos
  function procesarDatos() {
    // Gasto mensual
    const gastoMensual = {}
    gastos.forEach(g => {
      const mes = g.fecha.substring(0, 7) // YYYY-MM
      gastoMensual[mes] = (gastoMensual[mes] || 0) + g.monto
    })
    const dataMensual = Object.entries(gastoMensual)
      .map(([mes, total]) => ({ mes, total }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12) // Últimos 12 meses

    // Top 5 categorías
    const gastoCategoria = {}
    gastos.forEach(g => {
      gastoCategoria[g.categoria] = (gastoCategoria[g.categoria] || 0) + g.monto
    })
    const dataCategoria = Object.entries(gastoCategoria)
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    // Tendencia diaria
    const gastoFecha = {}
    gastos.forEach(g => {
      gastoFecha[g.fecha] = (gastoFecha[g.fecha] || 0) + g.monto
    })
    const dataTendencia = Object.entries(gastoFecha)
      .map(([fecha, total]) => ({ fecha, total }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(-30) // Últimos 30 días

    return {
      dataMensual,
      dataCategoria,
      dataTendencia,
    }
  }

  const { dataMensual, dataCategoria, dataTendencia } = procesarDatos()

  // Totales
  const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0)
  const promedioDiario = gastos.length > 0 ? totalGastos / gastos.length : 0
  const gastoDiasUnicos = new Set(gastos.map(g => g.fecha)).size

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (gastos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">No hay gastos para mostrar</p>
        <p className="text-sm text-muted-foreground/70 mt-2">Crea gastos en la sección "Mis gastos" para ver reportes</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>

      {/* Filtros */}
      <Card>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="desde" className="text-sm">Desde</Label>
              <Input
                id="desde"
                type="date"
                value={filtros.desde}
                onChange={(e) => setFiltros(prev => ({ ...prev, desde: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hasta" className="text-sm">Hasta</Label>
              <Input
                id="hasta"
                type="date"
                value={filtros.hasta}
                onChange={(e) => setFiltros(prev => ({ ...prev, hasta: e.target.value }))}
              />
            </div>
          </div>

          {(filtros.desde || filtros.hasta) && (
            <div className="mt-4">
              <Button variant="ghost" size="sm" onClick={() => setFiltros({ desde: '', hasta: '' })}>
                Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">Gasto Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono">{formatMonto(totalGastos)}</p>
            <p className="text-xs text-muted-foreground mt-1">{gastos.length} registros</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">Gasto Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono">{formatMonto(promedioDiario)}</p>
            <p className="text-xs text-muted-foreground mt-1">por transacción</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">Días con Gasto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{gastoDiasUnicos}</p>
            <p className="text-xs text-muted-foreground mt-1">días activos</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GastoMensualChart data={dataMensual} />
        <CategoriaChart data={dataCategoria} />
      </div>

      <div className="w-full">
        <TendenciaChart data={dataTendencia} />
      </div>
    </div>
  )
}

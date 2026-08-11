'use client'

import { useEffect, useState } from 'react'
import { listarGastos } from '@/lib/gastos/client'
import { centavosToPesos, formatMonto, CATEGORIA_LABELS } from '@/lib/gastos/schema'
import GastoMensualChart from '@/components/reportes/GastoMensualChart'
import CategoriaChart from '@/components/reportes/CategoriaChart'
import TendenciaChart from '@/components/reportes/TendenciaChart'

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
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (gastos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-gray-500">No hay gastos para mostrar</p>
        <p className="text-sm text-gray-400 mt-2">Crea gastos en la sección "Mis gastos" para ver reportes</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-3xl font-bold">Reportes</h1>

      {/* Filtros */}
      <div className="card bg-base-100 shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm">Desde</span>
            </label>
            <input
              type="date"
              value={filtros.desde}
              onChange={(e) => setFiltros(prev => ({ ...prev, desde: e.target.value }))}
              className="input input-bordered input-sm"
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm">Hasta</span>
            </label>
            <input
              type="date"
              value={filtros.hasta}
              onChange={(e) => setFiltros(prev => ({ ...prev, hasta: e.target.value }))}
              className="input input-bordered input-sm"
            />
          </div>
        </div>

        {(filtros.desde || filtros.hasta) && (
          <div className="mt-4">
            <button
              onClick={() => setFiltros({ desde: '', hasta: '' })}
              className="btn btn-sm btn-ghost"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-base-100 shadow-md p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase">Gasto Total</h3>
          <p className="text-3xl font-bold mt-2 font-mono">{formatMonto(totalGastos)}</p>
          <p className="text-xs text-gray-400 mt-1">{gastos.length} registros</p>
        </div>

        <div className="card bg-base-100 shadow-md p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase">Gasto Promedio</h3>
          <p className="text-3xl font-bold mt-2 font-mono">{formatMonto(promedioDiario)}</p>
          <p className="text-xs text-gray-400 mt-1">por transacción</p>
        </div>

        <div className="card bg-base-100 shadow-md p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase">Días con Gasto</h3>
          <p className="text-3xl font-bold mt-2">{gastoDiasUnicos}</p>
          <p className="text-xs text-gray-400 mt-1">días activos</p>
        </div>
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

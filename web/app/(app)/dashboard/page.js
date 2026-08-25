'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Wallet, TrendingUp, Scale, Loader2 } from 'lucide-react'
import { listarGastos } from '@/lib/gastos/client'
import { listarIngresos, obtenerBalanceNeto } from '@/lib/ingresos/client'
import { listarRecurrencias } from '@/lib/recurrencias/client'
import { ocurrenciasEnRango } from '@/lib/recurrencias/fechas'
import { formatMonto } from '@/lib/gastos/schema'
import CategoriaChart from '@/components/reportes/CategoriaChart'
import TendenciaChart from '@/components/reportes/TendenciaChart'
import GastoTable from '@/components/gastos/GastoTable'
import IngresoTable from '@/components/ingresos/IngresoTable'
import AlertasRecurrencias from '@/components/recurrencias/AlertasRecurrencias'
import AlertasPresupuestos from '@/components/presupuestos/AlertasPresupuestos'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

function toISODate(d) {
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

function addDias(d, dias) {
  const copia = new Date(d)
  copia.setDate(copia.getDate() + dias)
  return copia
}

// Todas las fechas entre inicio y fin (inclusive), en ISO. La gráfica de
// tendencia necesita un punto por día -- incluidos los días sin gasto ni
// ingreso -- porque su eje X es categórico (una posición por fecha única).
// Sin relleno, un ingreso aislado (ej. nómina quincenal) puede terminar
// como la única fecha de su serie, sin otra con quién conectar la línea.
function diasEnRango(inicio, fin) {
  const dias = []
  let cursor = new Date(inicio)
  while (cursor <= fin) {
    dias.push(toISODate(cursor))
    cursor = addDias(cursor, 1)
  }
  return dias
}

const HOY = new Date()
HOY.setHours(0, 0, 0, 0)
const INICIO_MES = new Date(HOY.getFullYear(), HOY.getMonth(), 1)

const MES_LABEL = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(HOY)

// Ventana de la gráfica "Tendencia Diaria": controlada por el usuario desde
// un selector en el propio dashboard (no persistida en perfil). El mismo
// número de días se usa hacia atrás (datos reales) y hacia adelante
// (proyección de recurrencias activas).
const OPCIONES_RANGO_TENDENCIA = [
  { dias: 7, label: '7 días' },
  { dias: 30, label: '30 días' },
]

export default function DashboardPage() {
  const [gastosMes, setGastosMes] = useState([])
  const [gastosSemana, setGastosSemana] = useState([])
  const [recientes, setRecientes] = useState([])
  const [ingresosMes, setIngresosMes] = useState([])
  const [ingresosSemana, setIngresosSemana] = useState([])
  const [ingresosRecientes, setIngresosRecientes] = useState([])
  const [balanceNeto, setBalanceNeto] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [rangoTendencia, setRangoTendencia] = useState(7)
  const [reglasActivas, setReglasActivas] = useState([])

  async function loadDatos(rango) {
    setIsLoading(true)
    try {
      const inicioRango = addDias(HOY, -(rango - 1))
      const [mes, semana, ultimos, ingresosMesRes, ingresosSemanaRes, ingresosUltimos, balance, reglas] = await Promise.all([
        listarGastos({ desde: toISODate(INICIO_MES), hasta: toISODate(HOY), limit: 1000 }),
        listarGastos({ desde: toISODate(inicioRango), hasta: toISODate(HOY), limit: 1000 }),
        listarGastos({ limit: 8 }),
        listarIngresos({ desde: toISODate(INICIO_MES), hasta: toISODate(HOY), limit: 1000 }),
        listarIngresos({ desde: toISODate(inicioRango), hasta: toISODate(HOY), limit: 1000 }),
        listarIngresos({ limit: 8 }),
        obtenerBalanceNeto({ desde: toISODate(INICIO_MES), hasta: toISODate(HOY) }),
        listarRecurrencias({ activo: true }),
      ])
      setGastosMes(mes.gastos)
      setGastosSemana(semana.gastos)
      setRecientes(ultimos.gastos)
      setIngresosMes(ingresosMesRes.ingresos)
      setIngresosSemana(ingresosSemanaRes.ingresos)
      setIngresosRecientes(ingresosUltimos.ingresos)
      setBalanceNeto(balance.balance)
      setReglasActivas(reglas || [])
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDatos(rangoTendencia)
  }, [rangoTendencia])

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

  const diasRangoTendencia = diasEnRango(addDias(HOY, -(rangoTendencia - 1)), HOY)

  const gastoDia = {}
  gastosSemana.forEach(g => {
    gastoDia[g.fecha] = (gastoDia[g.fecha] || 0) + g.monto
  })
  const dataSemana = diasRangoTendencia.map(fecha => ({ fecha, total: gastoDia[fecha] || 0 }))

  const ingresoDia = {}
  ingresosSemana.forEach(i => {
    ingresoDia[i.fecha] = (ingresoDia[i.fecha] || 0) + i.monto
  })
  const dataSemanaIngreso = diasRangoTendencia.map(fecha => ({ fecha, total: ingresoDia[fecha] || 0 }))

  // Proyección de días futuros a partir de recurrencias activas (nómina,
  // renta, suscripciones): el cron solo genera filas reales hasta hoy
  // (ver web/app/api/cron/generar-recurrencias/route.js), así que para
  // "adelantar" la tendencia hay que calcular las ocurrencias esperadas
  // aquí, con la misma lógica de fechas que usa el cron.
  const proyeccion = useMemo(() => {
    const manana = toISODate(addDias(HOY, 1))
    const finFuturo = toISODate(addDias(HOY, rangoTendencia))
    const gastoPorDia = {}
    const ingresoPorDia = {}

    reglasActivas.forEach((regla) => {
      const desde = regla.fecha_inicio > manana ? regla.fecha_inicio : manana
      const hasta = regla.fecha_fin && regla.fecha_fin < finFuturo ? regla.fecha_fin : finFuturo
      if (desde > hasta) return

      const bucket = regla.tipo === 'gasto' ? gastoPorDia : ingresoPorDia
      ocurrenciasEnRango(regla, desde, hasta).forEach((fecha) => {
        bucket[fecha] = (bucket[fecha] || 0) + regla.monto_default
      })
    })

    const aArreglo = (obj) =>
      Object.entries(obj)
        .map(([fecha, total]) => ({ fecha, total }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha))

    return { gasto: aArreglo(gastoPorDia), ingreso: aArreglo(ingresoPorDia) }
  }, [reglasActivas, rangoTendencia])

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

      <AlertasRecurrencias />
      <AlertasPresupuestos />

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
              dataFutura={proyeccion.gasto}
              dataFuturaSecundaria={proyeccion.ingreso}
              labelPrincipal="Gasto"
              labelIngreso="Ingreso"
              rango={rangoTendencia}
              opcionesRango={OPCIONES_RANGO_TENDENCIA}
              onRangoChange={setRangoTendencia}
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

'use client'

import { useEffect, useState } from 'react'
import { Loader2, Wallet, Calculator, CalendarDays, TrendingUp, Scale } from 'lucide-react'
import { listarBancos } from '@/lib/bancos/client'
import { obtenerReportesResumen, obtenerGastosPorCorte } from '@/lib/reportes/client'
import { formatMonto } from '@/lib/gastos/schema'
import GastoMensualChart from '@/components/reportes/GastoMensualChart'
import CategoriaChart from '@/components/reportes/CategoriaChart'
import TendenciaChart from '@/components/reportes/TendenciaChart'
import GastosPorCorteTable from '@/components/reportes/GastosPorCorteTable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const RESUMEN_VACIO = { total_gastos: 0, total_ingresos: 0, num_gastos: 0, num_ingresos: 0, dias_unicos: 0 }

export default function ReportesPage() {
  const [resumen, setResumen] = useState(RESUMEN_VACIO)
  const [porMes, setPorMes] = useState([])
  const [porDia, setPorDia] = useState([])
  const [porCategoria, setPorCategoria] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filtros, setFiltros] = useState({
    desde: '',
    hasta: '',
  })

  // Ver por: '' = mes calendario (todas las cuentas), o el id de una
  // tarjeta de credito para ver por su ciclo de corte en vez de mes.
  const [bancosCredito, setBancosCredito] = useState([])
  const [vistaBancoId, setVistaBancoId] = useState('')
  const [ciclosCorte, setCiclosCorte] = useState([])
  const [isLoadingCorte, setIsLoadingCorte] = useState(false)

  useEffect(() => {
    listarBancos({ tipo: 'credito', activo: true })
      .then(data => setBancosCredito(data.filter(b => b.dia_corte)))
      .catch(error => console.error('Error loading bancos:', error))
  }, [])

  useEffect(() => {
    if (!vistaBancoId) {
      setCiclosCorte([])
      return
    }
    setIsLoadingCorte(true)
    obtenerGastosPorCorte(vistaBancoId, 12)
      .then(setCiclosCorte)
      .catch(error => console.error('Error loading gastos por corte:', error))
      .finally(() => setIsLoadingCorte(false))
  }, [vistaBancoId])

  async function loadDatos() {
    setIsLoading(true)
    try {
      const filters = {}
      if (filtros.desde) filters.desde = filtros.desde
      if (filtros.hasta) filters.hasta = filtros.hasta
      const data = await obtenerReportesResumen(filters)
      setResumen(data.resumen)
      setPorMes(data.porMes)
      setPorDia(data.porDia)
      setPorCategoria(data.porCategoria)
    } catch (error) {
      console.error('Error loading reportes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDatos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros])

  // Cada serie dual (gasto vs. ingreso) sale de la misma fila por
  // mes/dia que regresa la API (gastos_ingresos_por_mes/dia, migracion
  // 036) -- se separa aqui en dos arreglos porque GastoMensualChart y
  // TendenciaChart esperan data/dataSecundaria como series independientes.
  const dataMensual = porMes.map(({ mes, total_gastos }) => ({ mes, total: total_gastos }))
  const dataMensualIngreso = porMes.map(({ mes, total_ingresos }) => ({ mes, total: total_ingresos }))
  const dataTendencia = porDia.map(({ fecha, total_gastos }) => ({ fecha, total: total_gastos }))
  const dataTendenciaIngreso = porDia.map(({ fecha, total_ingresos }) => ({ fecha, total: total_ingresos }))
  const dataCategoria = porCategoria

  const totalGastos = resumen.total_gastos
  const totalIngresos = resumen.total_ingresos
  const balanceNeto = totalIngresos - totalGastos
  const promedioDiario = resumen.num_gastos > 0 ? totalGastos / resumen.num_gastos : 0
  const gastoDiasUnicos = resumen.dias_unicos

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (totalGastos === 0 && totalIngresos === 0 && bancosCredito.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">No hay gastos ni ingresos para mostrar</p>
        <p className="text-sm text-muted-foreground/70 mt-2">Registra movimientos para ver reportes</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>

      {/* Ver por: mes calendario (todas las cuentas) o ciclo de corte de una tarjeta */}
      {bancosCredito.length > 0 && (
        <Card>
          <CardContent>
            <div className="space-y-1.5 max-w-sm">
              <Label htmlFor="vista-banco" className="text-sm">Ver por</Label>
              <Select
                value={vistaBancoId}
                onValueChange={setVistaBancoId}
                items={{
                  '': 'Mes calendario (todas las cuentas)',
                  ...Object.fromEntries(
                    bancosCredito.map(b => [String(b.id), b.alias ? `${b.nombre} (${b.alias})` : b.nombre])
                  ),
                }}
              >
                <SelectTrigger id="vista-banco" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Mes calendario (todas las cuentas)</SelectItem>
                  {[...bancosCredito]
                    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
                    .map(banco => (
                      <SelectItem key={banco.id} value={String(banco.id)}>
                        {banco.alias ? `${banco.nombre} (${banco.alias})` : banco.nombre}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {vistaBancoId && (
        <Card>
          <CardHeader>
            <CardTitle>Gasto por ciclo de corte</CardTitle>
          </CardHeader>
          <CardContent>
            <GastosPorCorteTable ciclos={ciclosCorte} isLoading={isLoadingCorte} />
          </CardContent>
        </Card>
      )}

      {!vistaBancoId && (
      <>
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
            <CardTitle className="flex items-center gap-3 text-sm font-semibold uppercase text-muted-foreground">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Wallet className="size-4.5" />
              </span>
              Gasto Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono">{formatMonto(totalGastos)}</p>
            <p className="text-xs text-muted-foreground mt-1">{resumen.num_gastos} registros</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-sm font-semibold uppercase text-muted-foreground">
              <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-500">
                <TrendingUp className="size-4.5" />
              </span>
              Ingreso Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono">{formatMonto(totalIngresos)}</p>
            <p className="text-xs text-muted-foreground mt-1">{resumen.num_ingresos} registros</p>
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
            <p className={`text-3xl font-bold font-mono ${balanceNeto < 0 ? 'text-destructive' : ''}`}>
              {formatMonto(balanceNeto)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">ingresos − gastos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-sm font-semibold uppercase text-muted-foreground">
              <span className="flex size-9 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-400">
                <Calculator className="size-4.5" />
              </span>
              Gasto Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono">{formatMonto(promedioDiario)}</p>
            <p className="text-xs text-muted-foreground mt-1">por transacción</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-sm font-semibold uppercase text-muted-foreground">
              <span className="flex size-9 items-center justify-center rounded-lg bg-orange-400/15 text-orange-400">
                <CalendarDays className="size-4.5" />
              </span>
              Días con Gasto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{gastoDiasUnicos}</p>
            <p className="text-xs text-muted-foreground mt-1">días activos</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GastoMensualChart data={dataMensual} dataSecundaria={dataMensualIngreso} />
        <CategoriaChart data={dataCategoria} />
      </div>

      <div className="w-full">
        <TendenciaChart data={dataTendencia} dataSecundaria={dataTendenciaIngreso} />
      </div>
      </>
      )}
    </div>
  )
}

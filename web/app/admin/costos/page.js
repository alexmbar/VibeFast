'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { obtenerCostosOpenai } from '@/lib/admin/client'
import { formatMonto } from '@/lib/gastos/schema'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function haceDiasISO(dias) {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - dias)
  return fecha.toISOString().slice(0, 10)
}

function formatFecha(fecha) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-MX')
}

export default function AdminCostosPage() {
  const toast = useToast()
  const [desde, setDesde] = useState(haceDiasISO(30))
  const [hasta, setHasta] = useState(hoyISO())
  const [porDia, setPorDia] = useState([])
  const [porUsuario, setPorUsuario] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  async function cargar() {
    setIsLoading(true)
    try {
      const data = await obtenerCostosOpenai({ desde, hasta })
      setPorDia(data.porDia)
      setPorUsuario(data.porUsuario)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta])

  const totalCentavos = porDia.reduce((sum, fila) => sum + fila.costo_centavos, 0)
  const totalLlamadas = porDia.reduce((sum, fila) => sum + fila.llamadas, 0)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Costos de OpenAI</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="desde">Desde</Label>
          <Input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hasta">Hasta</Label>
          <Input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-40" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">
                Total del periodo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold font-mono tabular-nums">
                {formatMonto(totalCentavos, 'USD')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{totalLlamadas} llamadas a OpenAI</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Por día</CardTitle>
              </CardHeader>
              <CardContent>
                {porDia.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin llamadas en este periodo</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Llamadas</TableHead>
                        <TableHead className="text-right">Costo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {porDia.map((fila) => (
                        <TableRow key={fila.fecha}>
                          <TableCell className="text-sm">{formatFecha(fila.fecha)}</TableCell>
                          <TableCell className="text-right text-sm font-mono tabular-nums">{fila.llamadas}</TableCell>
                          <TableCell className="text-right text-sm font-mono tabular-nums">
                            {formatMonto(fila.costo_centavos, 'USD')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Por usuario</CardTitle>
              </CardHeader>
              <CardContent>
                {porUsuario.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin llamadas en este periodo</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-right">Llamadas</TableHead>
                        <TableHead className="text-right">Costo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {porUsuario.map((fila) => (
                        <TableRow key={fila.user_id}>
                          <TableCell className="text-sm">{fila.email}</TableCell>
                          <TableCell className="text-right text-sm font-mono tabular-nums">{fila.llamadas}</TableCell>
                          <TableCell className="text-right text-sm font-mono tabular-nums">
                            {formatMonto(fila.costo_centavos, 'USD')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

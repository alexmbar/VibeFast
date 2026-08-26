'use client'

import { useEffect, useState } from 'react'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { listarIntegraciones } from '@/lib/admin/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { selectItems } from '@/lib/utils'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

const LIMIT = 20

const TIPO_LABELS = {
  webhook_whatsapp: 'Webhook WhatsApp',
  cron_recurrencias: 'Cron recurrencias',
  openai_vision: 'OpenAI Vision',
  costo_anomalo: 'Costo anómalo',
}

const NIVEL_LABELS = {
  info: 'Info',
  warning: 'Advertencia',
  error: 'Error',
}

const NIVEL_BADGE_VARIANT = {
  info: 'outline',
  warning: 'secondary',
  error: 'destructive',
}

const RESUELTO_LABELS = {
  pendiente: 'Pendiente',
  resuelto: 'Resuelto',
}

const COLUMNAS = [
  { key: 'created_at', label: 'Fecha' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'nivel', label: 'Nivel' },
  { key: 'resuelto', label: 'Estado' },
]

function formatFechaHora(fecha) {
  if (!fecha) return '-'
  return new Date(fecha).toLocaleString('es-MX')
}

export default function AdminIntegracionesPage() {
  const toast = useToast()
  const [eventos, setEventos] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [tipo, setTipo] = useState('todos')
  const [nivel, setNivel] = useState('todos')
  const [resuelto, setResuelto] = useState('todos')
  const [isLoading, setIsLoading] = useState(true)

  async function cargar() {
    setIsLoading(true)
    try {
      const { eventos: data, total: totalCount } = await listarIntegraciones({
        tipo: tipo === 'todos' ? undefined : tipo,
        nivel: nivel === 'todos' ? undefined : nivel,
        resuelto: resuelto === 'todos' ? undefined : resuelto === 'resuelto',
        orderBy: sortBy,
        orderDir: sortDir,
        limit: LIMIT,
        offset,
      })
      setEventos(data)
      setTotal(totalCount)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortDir, tipo, nivel, resuelto, offset])

  function handleSort(columna) {
    if (columna === sortBy) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(columna)
      setSortDir('asc')
    }
    setOffset(0)
  }

  function handleFiltro(setter) {
    return (valor) => {
      setter(valor)
      setOffset(0)
    }
  }

  const desde = total === 0 ? 0 : offset + 1
  const hasta = Math.min(offset + LIMIT, total)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Integraciones</h1>

      <div className="flex flex-wrap gap-3">
        <Select value={tipo} onValueChange={handleFiltro(setTipo)} items={{ todos: 'Todos', ...selectItems(Object.keys(TIPO_LABELS), TIPO_LABELS) }}>
          <SelectTrigger>
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            {Object.entries(TIPO_LABELS).map(([valor, label]) => (
              <SelectItem key={valor} value={valor}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={nivel} onValueChange={handleFiltro(setNivel)} items={{ todos: 'Todos', ...selectItems(Object.keys(NIVEL_LABELS), NIVEL_LABELS) }}>
          <SelectTrigger>
            <SelectValue placeholder="Nivel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los niveles</SelectItem>
            {Object.entries(NIVEL_LABELS).map(([valor, label]) => (
              <SelectItem key={valor} value={valor}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={resuelto} onValueChange={handleFiltro(setResuelto)} items={{ todos: 'Todos', ...RESUELTO_LABELS }}>
          <SelectTrigger>
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {Object.entries(RESUELTO_LABELS).map(([valor, label]) => (
              <SelectItem key={valor} value={valor}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : eventos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">Sin eventos para estos filtros</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    {COLUMNAS.map(({ key, label }) => (
                      <TableHead key={key}>
                        <button
                          type="button"
                          onClick={() => handleSort(key)}
                          className="inline-flex items-center gap-1 hover:text-primary"
                        >
                          {label}
                          <span className="text-xs">
                            {sortBy === key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                          </span>
                        </button>
                      </TableHead>
                    ))}
                    <TableHead>Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventos.map((evento) => (
                    <TableRow key={evento.id}>
                      <TableCell className="text-sm">{formatFechaHora(evento.created_at)}</TableCell>
                      <TableCell className="text-sm">{TIPO_LABELS[evento.tipo] || evento.tipo}</TableCell>
                      <TableCell className="text-sm">
                        <Badge variant={NIVEL_BADGE_VARIANT[evento.nivel] || 'outline'}>
                          {NIVEL_LABELS[evento.nivel] || evento.nivel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {evento.resuelto ? (
                          <Badge variant="outline">Resuelto</Badge>
                        ) : (
                          <Badge variant="secondary">Pendiente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-md truncate text-xs text-muted-foreground" title={evento.detalle ? JSON.stringify(evento.detalle) : ''}>
                        {evento.detalle ? JSON.stringify(evento.detalle) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {desde}-{hasta} de {total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOffset((prev) => Math.max(0, prev - LIMIT))}
                    disabled={offset === 0}
                  >
                    <ChevronLeft />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOffset((prev) => prev + LIMIT)}
                    disabled={offset + LIMIT >= total}
                  >
                    Siguiente
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Pencil, Trash2, Loader2 } from 'lucide-react'
import { actualizarRecurrencia, eliminarRecurrencia } from '@/lib/recurrencias/client'
import {
  TIPO_LABELS,
  FRECUENCIA_LABELS,
  DIA_SEMANA_LABELS,
  categoriaLabelsDe,
} from '@/lib/recurrencias/schema'
import { useUserConfig } from '@/lib/config/UserConfigContext'
import { useSortableTable } from '@/lib/hooks/useSortableTable'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

const COLUMNAS = [
  { key: 'tipo', label: 'Tipo' },
  { key: 'frecuencia', label: 'Frecuencia' },
  { key: 'categoria', label: 'Categoría' },
  { key: 'monto_default', label: 'Monto', className: 'text-right' },
  { key: 'activo', label: 'Activa' },
]

function compararRecurrencias(a, b, columna) {
  switch (columna) {
    case 'monto_default':
      return a.monto_default - b.monto_default
    case 'tipo':
      return TIPO_LABELS[a.tipo].localeCompare(TIPO_LABELS[b.tipo])
    case 'frecuencia':
      return FRECUENCIA_LABELS[a.frecuencia].localeCompare(FRECUENCIA_LABELS[b.frecuencia])
    case 'categoria':
      return categoriaLabelsDe(a.tipo)[a.categoria].localeCompare(categoriaLabelsDe(b.tipo)[b.categoria])
    case 'activo':
      return Number(a.activo) - Number(b.activo)
    default:
      return 0
  }
}

// Describe cuándo cae la regla, ej. "Viernes", "Día 5", "Días 1 y 15".
function detalleFrecuencia(regla) {
  if (regla.frecuencia === 'semanal') {
    return DIA_SEMANA_LABELS[regla.dia_semana]
  }
  if (regla.frecuencia === 'mensual') {
    return `Día ${regla.dias_mes[0]}`
  }
  return `Días ${regla.dias_mes.join(' y ')}`
}

export default function RecurrenciaTable({ recurrencias, onChange, isLoading }) {
  const { formatMonto } = useUserConfig()
  const [deleting, setDeleting] = useState(null)
  const [toggling, setToggling] = useState(null)
  const { sorted, sortBy, sortDir, handleSort } = useSortableTable(recurrencias, compararRecurrencias, {
    defaultSortBy: 'activo',
    defaultSortDir: 'desc',
  })

  async function handleToggle(regla) {
    setToggling(regla.id)
    try {
      const actualizada = await actualizarRecurrencia(regla.id, { activo: !regla.activo })
      onChange?.(actualizada)
    } catch (error) {
      alert(error.message)
    } finally {
      setToggling(null)
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta recurrencia? Los movimientos ya generados no se borran, solo dejan de generarse nuevos.')) return

    setDeleting(id)
    try {
      await eliminarRecurrencia(id)
      onChange?.(null, id)
    } catch (error) {
      alert(error.message)
    } finally {
      setDeleting(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!recurrencias || recurrencias.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">No hay recurrencias registradas</p>
        <p className="text-sm text-muted-foreground/70 mt-2">Crea una nueva para empezar</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {COLUMNAS.map(({ key, label, className }) => (
            <TableHead key={key} className={className}>
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
          <TableHead className="text-center">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map(regla => (
          <TableRow key={regla.id}>
            <TableCell className="text-sm">{TIPO_LABELS[regla.tipo]}</TableCell>
            <TableCell className="text-sm">
              <div>{FRECUENCIA_LABELS[regla.frecuencia]}</div>
              <div className="text-xs text-muted-foreground">{detalleFrecuencia(regla)}</div>
            </TableCell>
            <TableCell className="text-sm">{categoriaLabelsDe(regla.tipo)[regla.categoria]}</TableCell>
            <TableCell className="text-right font-mono font-semibold tabular-nums">
              {formatMonto(regla.monto_default)}
            </TableCell>
            <TableCell>
              {toggling === regla.id ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <Switch checked={regla.activo} onCheckedChange={() => handleToggle(regla)} />
              )}
            </TableCell>
            <TableCell>
              <div className="flex gap-1 justify-center">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  render={<Link href={`/recurrencias/${regla.id}/edit`} title="Editar recurrencia" />}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(regla.id)}
                  disabled={deleting === regla.id}
                  title="Eliminar recurrencia"
                  aria-busy={deleting === regla.id}
                  className="text-destructive hover:text-destructive"
                >
                  {deleting === regla.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

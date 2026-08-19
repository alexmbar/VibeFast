'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Pencil, Trash2, Loader2 } from 'lucide-react'
import { eliminarIngreso } from '@/lib/ingresos/client'
import { CATEGORIA_LABELS } from '@/lib/ingresos/schema'
import { formatMonto, formatDate } from '@/lib/gastos/schema'
import { useSortableTable } from '@/lib/hooks/useSortableTable'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

const COLUMNAS = [
  { key: 'fecha', label: 'Fecha' },
  { key: 'categoria', label: 'Categoría' },
  { key: 'monto', label: 'Monto', className: 'text-right' },
]

function compararIngresos(a, b, columna) {
  switch (columna) {
    case 'monto':
      return a.monto - b.monto
    case 'fecha':
      return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0
    case 'categoria':
      return CATEGORIA_LABELS[a.categoria].localeCompare(CATEGORIA_LABELS[b.categoria])
    default:
      return 0
  }
}

export default function IngresoTable({ ingresos, onDelete, isLoading }) {
  const [deleting, setDeleting] = useState(null)
  const { sorted, sortBy, sortDir, handleSort } = useSortableTable(ingresos, compararIngresos)

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este ingreso?')) return

    setDeleting(id)
    try {
      await eliminarIngreso(id)
      onDelete?.(id)
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

  if (!ingresos || ingresos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">No hay ingresos registrados</p>
        <p className="text-sm text-muted-foreground/70 mt-2">Crea uno nuevo para empezar</p>
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
        {sorted.map(ingreso => (
          <TableRow key={ingreso.id}>
            <TableCell className="font-mono text-sm">{formatDate(ingreso.fecha)}</TableCell>
            <TableCell className="text-sm">{CATEGORIA_LABELS[ingreso.categoria]}</TableCell>
            <TableCell className="text-right font-mono font-semibold tabular-nums">
              {formatMonto(ingreso.monto)}
            </TableCell>
            <TableCell>
              <div className="flex gap-1 justify-center">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  render={<Link href={`/ingresos/${ingreso.id}/edit`} title="Editar ingreso" />}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(ingreso.id)}
                  disabled={deleting === ingreso.id}
                  title="Eliminar ingreso"
                  aria-busy={deleting === ingreso.id}
                  className="text-destructive hover:text-destructive"
                >
                  {deleting === ingreso.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Pencil, Trash2, Loader2 } from 'lucide-react'
import { eliminarRetiro } from '@/lib/retiros/client'
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
  { key: 'banco', label: 'Banco' },
  { key: 'monto', label: 'Monto', className: 'text-right' },
]

function compararRetiros(a, b, columna) {
  switch (columna) {
    case 'monto':
      return a.monto - b.monto
    case 'fecha':
      return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0
    case 'banco':
      return (a.banco?.nombre || '').localeCompare(b.banco?.nombre || '')
    default:
      return 0
  }
}

export default function RetiroTable({ retiros, onDelete, isLoading }) {
  const [deleting, setDeleting] = useState(null)
  const { sorted, sortBy, sortDir, handleSort } = useSortableTable(retiros, compararRetiros)

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este retiro?')) return

    setDeleting(id)
    try {
      await eliminarRetiro(id)
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

  if (!retiros || retiros.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">No hay retiros registrados</p>
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
        {sorted.map(retiro => (
          <TableRow key={retiro.id}>
            <TableCell className="font-mono text-sm">{formatDate(retiro.fecha)}</TableCell>
            <TableCell className="text-sm">{retiro.banco?.nombre || '-'}</TableCell>
            <TableCell className="text-right font-mono font-semibold tabular-nums">
              {formatMonto(retiro.monto)}
            </TableCell>
            <TableCell>
              <div className="flex gap-1 justify-center">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  render={<Link href={`/retiros/${retiro.id}/edit`} title="Editar retiro" />}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(retiro.id)}
                  disabled={deleting === retiro.id}
                  title="Eliminar retiro"
                  aria-busy={deleting === retiro.id}
                  className="text-destructive hover:text-destructive"
                >
                  {deleting === retiro.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

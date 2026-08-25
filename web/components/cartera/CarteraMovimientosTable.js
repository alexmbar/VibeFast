'use client'

import { Loader2 } from 'lucide-react'
import { useUserConfig } from '@/lib/config/UserConfigContext'
import { useSortableTable } from '@/lib/hooks/useSortableTable'
import { cn } from '@/lib/utils'
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
  { key: 'descripcion', label: 'Movimiento' },
  { key: 'monto', label: 'Monto', className: 'text-right' },
]

function compararMovimientos(a, b, columna) {
  switch (columna) {
    case 'monto':
      return a.monto - b.monto
    case 'fecha':
      return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0
    default:
      return (a[columna] || '').localeCompare(b[columna] || '')
  }
}

export default function CarteraMovimientosTable({ movimientos, isLoading }) {
  const { formatMonto, formatFecha } = useUserConfig()
  const { sorted, sortBy, sortDir, handleSort } = useSortableTable(movimientos, compararMovimientos)

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!movimientos || movimientos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">No hay movimientos de Cartera</p>
        <p className="text-sm text-muted-foreground/70 mt-2">
          Los retiros y los gastos en efectivo aparecerán aquí
        </p>
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
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map(mov => (
          <TableRow key={mov.id}>
            <TableCell className="font-mono text-sm">{formatFecha(mov.fecha)}</TableCell>
            <TableCell className="text-sm">{mov.descripcion}</TableCell>
            <TableCell
              className={cn(
                'text-right font-mono font-semibold tabular-nums',
                mov.monto >= 0 ? 'text-primary' : 'text-destructive'
              )}
            >
              {mov.monto >= 0 ? '+' : '-'} {formatMonto(Math.abs(mov.monto))}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

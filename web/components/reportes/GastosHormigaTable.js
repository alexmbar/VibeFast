'use client'

import { useMemo, useState } from 'react'
import { useUserConfig } from '@/lib/config/UserConfigContext'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

const COLUMNAS = [
  { key: 'tienda', label: 'Tienda' },
  { key: 'num_compras', label: 'Compras', className: 'text-right' },
  { key: 'promedio', label: 'Promedio', className: 'text-right' },
  { key: 'total', label: 'Total', className: 'text-right' },
]

function compararHormiga(a, b, columna) {
  if (columna === 'tienda') return a.tienda.localeCompare(b.tienda, 'es')
  return a[columna] - b[columna]
}

export default function GastosHormigaTable({ gastos }) {
  const { formatMonto } = useUserConfig()
  const [sortBy, setSortBy] = useState('total')
  const [sortDir, setSortDir] = useState('desc')

  const gastosOrdenados = useMemo(() => {
    if (!gastos) return gastos
    const ordenados = [...gastos].sort((a, b) => compararHormiga(a, b, sortBy))
    if (sortDir === 'desc') ordenados.reverse()
    return ordenados
  }, [gastos, sortBy, sortDir])

  function handleSort(columna) {
    if (columna === sortBy) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(columna)
      setSortDir('asc')
    }
  }

  if (!gastos || gastos.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">
          Sin compras repetidas (3 o más veces en el mismo comercio) en este periodo
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
        {gastosOrdenados.map((fila) => (
          <TableRow key={fila.tienda}>
            <TableCell className="text-sm">{fila.tienda}</TableCell>
            <TableCell className="text-right tabular-nums">{fila.num_compras}</TableCell>
            <TableCell className="text-right font-mono tabular-nums">{formatMonto(fila.promedio)}</TableCell>
            <TableCell className="text-right font-mono font-semibold tabular-nums">
              {formatMonto(fila.total)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
'use client'

import { useMemo, useState } from 'react'
import { formatMonto } from '@/lib/gastos/schema'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

const COLUMNAS = [
  { key: 'periodo_inicio', label: 'Periodo' },
  { key: 'total', label: 'Gasto total', className: 'text-right' },
  { key: 'num_movimientos', label: 'Movimientos', className: 'text-right' },
]

// periodo_fin es exclusivo ("[periodo_inicio, periodo_fin)", ver CLAUDE.md
// seccion "Reportes por periodo de corte"): el ultimo dia cubierto por el
// ciclo es periodo_fin menos un dia, no periodo_fin.
function ultimoDiaCubierto(periodoFin) {
  const [anio, mes, dia] = periodoFin.split('-').map(Number)
  const d = new Date(Date.UTC(anio, mes - 1, dia))
  d.setUTCDate(d.getUTCDate() - 1)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function compararCiclos(a, b, columna) {
  if (columna === 'total' || columna === 'num_movimientos') return a[columna] - b[columna]
  return a.periodo_inicio < b.periodo_inicio ? -1 : a.periodo_inicio > b.periodo_inicio ? 1 : 0
}

export default function GastosPorCorteTable({ ciclos, isLoading }) {
  const [sortBy, setSortBy] = useState('periodo_inicio')
  const [sortDir, setSortDir] = useState('desc')

  const hoy = new Date().toISOString().slice(0, 10)

  const ciclosOrdenados = useMemo(() => {
    if (!ciclos) return ciclos
    const ordenados = [...ciclos].sort((a, b) => compararCiclos(a, b, sortBy))
    if (sortDir === 'desc') ordenados.reverse()
    return ordenados
  }, [ciclos, sortBy, sortDir])

  function handleSort(columna) {
    if (columna === sortBy) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(columna)
      setSortDir('asc')
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Cargando ciclos de corte...</p>
  }

  if (!ciclos || ciclos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">Sin ciclos de corte para esta tarjeta</p>
        <p className="text-sm text-muted-foreground/70 mt-2">
          Verifica que la tarjeta tenga un día de corte configurado en /bancos
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
        {ciclosOrdenados.map(ciclo => (
          <TableRow key={ciclo.periodo_fin}>
            <TableCell className="font-mono text-sm">
              <div className="flex items-center gap-2">
                {ciclo.periodo_inicio} – {ultimoDiaCubierto(ciclo.periodo_fin)}
                {ciclo.periodo_fin > hoy && (
                  <Badge variant="outline" className="text-muted-foreground">En curso</Badge>
                )}
              </div>
            </TableCell>
            <TableCell className="text-right font-mono font-semibold tabular-nums">
              {formatMonto(ciclo.total)}
            </TableCell>
            <TableCell className="text-right tabular-nums">{ciclo.num_movimientos}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

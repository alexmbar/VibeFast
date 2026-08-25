'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Pencil, Trash2, Loader2 } from 'lucide-react'
import { eliminarPresupuesto } from '@/lib/presupuestos/client'
import { calcularPct } from '@/lib/presupuestos/schema'
import { CATEGORIA_LABELS } from '@/lib/gastos/schema'
import { useUserConfig } from '@/lib/config/UserConfigContext'
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
  { key: 'categoria', label: 'Categoría' },
  { key: 'periodo', label: 'Periodo' },
  { key: 'monto_limite', label: 'Límite', className: 'text-right' },
  { key: 'total_gastado', label: 'Gastado', className: 'text-right' },
  { key: 'pct', label: '%', className: 'text-right' },
]

function compararPresupuestos(a, b, columna) {
  switch (columna) {
    case 'categoria':
      return CATEGORIA_LABELS[a.categoria].localeCompare(CATEGORIA_LABELS[b.categoria], 'es')
    case 'periodo':
      return (a.banco?.nombre || '').localeCompare(b.banco?.nombre || '', 'es')
    case 'monto_limite':
      return a.monto_limite - b.monto_limite
    case 'total_gastado':
      return (a.total_gastado || 0) - (b.total_gastado || 0)
    case 'pct':
      return calcularPct(a.total_gastado, a.monto_limite) - calcularPct(b.total_gastado, b.monto_limite)
    default:
      return 0
  }
}

function colorPct(pct) {
  if (pct >= 100) return 'text-destructive'
  if (pct >= 80) return 'text-amber-500'
  return 'text-emerald-500'
}

export default function PresupuestoTable({ presupuestos, onChange, isLoading }) {
  const { formatMonto } = useUserConfig()
  const [deleting, setDeleting] = useState(null)
  const { sorted, sortBy, sortDir, handleSort } = useSortableTable(presupuestos, compararPresupuestos, {
    defaultSortBy: 'categoria',
    defaultSortDir: 'asc',
  })

  async function handleDelete(id) {
    if (!confirm('¿Pausar este presupuesto? Puedes crear uno nuevo para la misma categoría después.')) return

    setDeleting(id)
    try {
      await eliminarPresupuesto(id)
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

  if (!presupuestos || presupuestos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">No hay presupuestos registrados</p>
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
        {sorted.map(p => {
          const pct = calcularPct(p.total_gastado, p.monto_limite)
          return (
            <TableRow key={p.id}>
              <TableCell className="text-sm">{CATEGORIA_LABELS[p.categoria]}</TableCell>
              <TableCell className="text-sm">
                {p.banco ? `Ciclo de ${p.banco.alias || p.banco.nombre}` : 'Mes calendario'}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">{formatMonto(p.monto_limite)}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">{formatMonto(p.total_gastado || 0)}</TableCell>
              <TableCell className={`text-right font-mono font-semibold tabular-nums ${colorPct(pct)}`}>
                {pct}%
              </TableCell>
              <TableCell>
                <div className="flex gap-1 justify-center">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    render={<Link href={`/presupuestos/${p.id}/edit`} title="Editar presupuesto" />}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(p.id)}
                    disabled={deleting === p.id}
                    title="Pausar presupuesto"
                    aria-busy={deleting === p.id}
                    className="text-destructive hover:text-destructive"
                  >
                    {deleting === p.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

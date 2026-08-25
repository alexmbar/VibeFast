'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Pencil, Trash2, Loader2, Check } from 'lucide-react'
import { eliminarGasto, actualizarGasto } from '@/lib/gastos/client'
import { CATEGORIA_LABELS, TIPO_PAGO_LABELS, extractHora } from '@/lib/gastos/schema'
import { useUserConfig } from '@/lib/config/UserConfigContext'
import { Button } from '@/components/ui/button'
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
  { key: 'fecha', label: 'Fecha' },
  { key: 'tienda', label: 'Tienda' },
  { key: 'categoria', label: 'Categoría' },
  { key: 'tipo_pago', label: 'Tipo de pago' },
  { key: 'monto', label: 'Monto', className: 'text-right' },
]

function compararGastos(a, b, columna) {
  switch (columna) {
    case 'monto':
      return a.monto - b.monto
    case 'fecha':
      return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0
    case 'categoria':
      return CATEGORIA_LABELS[a.categoria].localeCompare(CATEGORIA_LABELS[b.categoria])
    case 'tipo_pago':
      return TIPO_PAGO_LABELS[a.tipo_pago].localeCompare(TIPO_PAGO_LABELS[b.tipo_pago])
    default:
      return (a[columna] || '').localeCompare(b[columna] || '')
  }
}

export default function GastoTable({ gastos, onDelete, onUpdate, isLoading }) {
  const { formatMonto, formatFecha } = useUserConfig()
  const [deleting, setDeleting] = useState(null)
  const [confirming, setConfirming] = useState(null)
  const [sortBy, setSortBy] = useState('fecha')
  const [sortDir, setSortDir] = useState('desc')

  const gastosOrdenados = useMemo(() => {
    if (!gastos) return gastos
    const ordenados = [...gastos].sort((a, b) => compararGastos(a, b, sortBy))
    if (sortDir === 'desc') ordenados.reverse()
    return ordenados
  }, [gastos, sortBy, sortDir])

  function handleSort(columna) {
    if (columna === sortBy) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(columna)
      setSortDir('asc')
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este gasto?')) return

    setDeleting(id)
    try {
      await eliminarGasto(id)
      onDelete?.(id)
    } catch (error) {
      alert(error.message)
    } finally {
      setDeleting(null)
    }
  }

  // Confirma una fila generada por una recurrencia (monto_confirmado=false):
  // un PATCH vacío marca la fila como revisada sin tocar el monto (ver
  // web/app/api/gastos/[id]/route.js).
  async function handleConfirm(id) {
    setConfirming(id)
    try {
      const actualizado = await actualizarGasto(id, {})
      onUpdate?.(actualizado)
    } catch (error) {
      alert(error.message)
    } finally {
      setConfirming(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!gastos || gastos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">No hay gastos registrados</p>
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
        {gastosOrdenados.map(gasto => (
          <TableRow key={gasto.id}>
            <TableCell className="font-mono text-sm">
              <div>{formatFecha(gasto.fecha)}</div>
              <div className="text-xs text-muted-foreground">{extractHora(gasto.created_at)}</div>
            </TableCell>
            <TableCell className="text-sm">{gasto.tienda || '-'}</TableCell>
            <TableCell className="text-sm">{CATEGORIA_LABELS[gasto.categoria]}</TableCell>
            <TableCell className="text-sm">{TIPO_PAGO_LABELS[gasto.tipo_pago]}</TableCell>
            <TableCell className="text-right">
              <div className="flex flex-col items-end gap-1">
                <span className="font-mono font-semibold tabular-nums">{formatMonto(gasto.monto)}</span>
                {gasto.monto_confirmado === false && (
                  <Badge variant="outline" className="text-muted-foreground">Pendiente</Badge>
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex gap-1 justify-center">
                {gasto.monto_confirmado === false && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleConfirm(gasto.id)}
                    disabled={confirming === gasto.id}
                    title="Confirmar monto"
                    aria-busy={confirming === gasto.id}
                  >
                    {confirming === gasto.id ? <Loader2 className="animate-spin" /> : <Check />}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  render={<Link href={`/gastos/${gasto.id}/edit`} title="Editar gasto" />}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(gasto.id)}
                  disabled={deleting === gasto.id}
                  title="Eliminar gasto"
                  aria-busy={deleting === gasto.id}
                  className="text-destructive hover:text-destructive"
                >
                  {deleting === gasto.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

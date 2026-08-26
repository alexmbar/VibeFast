'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Pencil, Trash2, Loader2, Check, ArrowDownRight, ArrowUpRight, ArrowLeftRight } from 'lucide-react'
import { eliminarGasto, actualizarGasto } from '@/lib/gastos/client'
import { eliminarIngreso, actualizarIngreso } from '@/lib/ingresos/client'
import { eliminarRetiro } from '@/lib/retiros/client'
import { useUserConfig } from '@/lib/config/UserConfigContext'
import { useSortableTable } from '@/lib/hooks/useSortableTable'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
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
  { key: 'descripcion', label: 'Descripción' },
  { key: 'categoriaLabel', label: 'Categoría' },
  { key: 'cuenta', label: 'Cuenta' },
  { key: 'monto', label: 'Monto', className: 'text-right' },
]

// Rojo = gasto (salida), verde = ingreso (entrada), neutro = retiro
// (transferencia: no consume valor, solo lo traslada -- ver CLAUDE.md).
const MONTO_CLASS = {
  gasto: 'text-destructive',
  ingreso: 'text-emerald-500',
  retiro: 'text-muted-foreground',
}

const TIPO_ICON = {
  gasto: ArrowDownRight,
  ingreso: ArrowUpRight,
  retiro: ArrowLeftRight,
}

function compararTransacciones(a, b, columna) {
  switch (columna) {
    case 'monto':
      return Math.abs(a.monto) - Math.abs(b.monto)
    case 'fecha':
      return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0
    default:
      return (a[columna] || '').localeCompare(b[columna] || '', 'es')
  }
}

async function eliminarPorTipo(tipo, id) {
  if (tipo === 'gasto') return eliminarGasto(id)
  if (tipo === 'ingreso') return eliminarIngreso(id)
  return eliminarRetiro(id)
}

async function confirmarPorTipo(tipo, id) {
  if (tipo === 'gasto') return actualizarGasto(id, {})
  return actualizarIngreso(id, {})
}

export default function TransaccionTable({ transacciones, onDelete, onUpdate, isLoading }) {
  const { formatMonto, formatFecha } = useUserConfig()
  const toast = useToast()
  const [deleting, setDeleting] = useState(null)
  const [confirming, setConfirming] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const { sorted, sortBy, sortDir, handleSort } = useSortableTable(transacciones, compararTransacciones)

  async function handleDelete() {
    const { tipo, id } = confirmDelete
    setDeleting(id)
    try {
      await eliminarPorTipo(tipo, id)
      onDelete?.(tipo, id)
      setConfirmDelete(null)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setDeleting(null)
    }
  }

  async function handleConfirm(tipo, id) {
    setConfirming(id)
    try {
      const actualizado = await confirmarPorTipo(tipo, id)
      onUpdate?.(tipo, actualizado)
    } catch (error) {
      toast.error(error.message)
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

  if (!transacciones || transacciones.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">No hay transacciones para mostrar</p>
        <p className="text-sm text-muted-foreground/70 mt-2">Registra un gasto, ingreso o retiro para empezar</p>
      </div>
    )
  }

  return (
    <>
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
        {sorted.map((t) => {
          const Icon = TIPO_ICON[t.tipo]
          return (
            <TableRow key={`${t.tipo}-${t.id}`}>
              <TableCell className="font-mono text-sm">{formatFecha(t.fecha)}</TableCell>
              <TableCell className="text-sm">
                <div className="flex items-center gap-2">
                  <Icon className={`size-3.5 shrink-0 ${MONTO_CLASS[t.tipo]}`} />
                  {t.descripcion}
                </div>
              </TableCell>
              <TableCell className="text-sm">
                <Badge variant="outline">{t.categoriaLabel}</Badge>
              </TableCell>
              <TableCell className="text-sm">{t.cuenta || '-'}</TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col items-end gap-1">
                  <span className={`font-mono font-semibold tabular-nums ${MONTO_CLASS[t.tipo]}`}>
                    {t.tipo === 'gasto' && '-'}
                    {t.tipo === 'ingreso' && '+'}
                    {formatMonto(Math.abs(t.monto))}
                  </span>
                  {t.pendiente && (
                    <Badge variant="outline" className="text-muted-foreground">Pendiente</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-1 justify-center">
                  {t.pendiente && t.tipo !== 'retiro' && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleConfirm(t.tipo, t.id)}
                      disabled={confirming === t.id}
                      title="Confirmar"
                      aria-busy={confirming === t.id}
                    >
                      {confirming === t.id ? <Loader2 className="animate-spin" /> : <Check />}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    render={<Link href={t.editHref} title="Editar" />}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setConfirmDelete({ tipo: t.tipo, id: t.id })}
                    disabled={deleting === t.id}
                    title="Eliminar"
                    aria-busy={deleting === t.id}
                    className="text-destructive hover:text-destructive"
                  >
                    {deleting === t.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
    <ConfirmDialog
      open={!!confirmDelete}
      onOpenChange={(open) => !open && setConfirmDelete(null)}
      title="¿Eliminar esta transacción?"
      description="Esta acción no se puede deshacer."
      confirmLabel="Eliminar"
      onConfirm={handleDelete}
      loading={!!confirmDelete && deleting === confirmDelete.id}
    />
    </>
  )
}
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Pencil, Loader2 } from 'lucide-react'
import { actualizarBanco } from '@/lib/bancos/client'
import { TIPO_BANCO_LABELS } from '@/lib/bancos/schema'
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
  { key: 'nombre', label: 'Nombre' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'activo', label: 'Activo' },
]

function compararBancos(a, b, columna) {
  switch (columna) {
    case 'tipo':
      return TIPO_BANCO_LABELS[a.tipo].localeCompare(TIPO_BANCO_LABELS[b.tipo])
    case 'activo':
      return Number(a.activo) - Number(b.activo)
    default:
      return (a[columna] || '').localeCompare(b[columna] || '')
  }
}

export default function BancoTable({ bancos, onToggleActivo, isLoading }) {
  const [toggling, setToggling] = useState(null)
  const { sorted, sortBy, sortDir, handleSort } = useSortableTable(bancos, compararBancos, {
    defaultSortBy: 'nombre',
    defaultSortDir: 'asc',
  })

  async function handleToggle(banco) {
    setToggling(banco.id)
    try {
      const actualizado = await actualizarBanco(banco.id, { activo: !banco.activo })
      onToggleActivo?.(actualizado)
    } catch (error) {
      alert(error.message)
    } finally {
      setToggling(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!bancos || bancos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">No hay bancos registrados</p>
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
        {sorted.map(banco => (
          <TableRow key={banco.id}>
            <TableCell className="text-sm">{banco.nombre}</TableCell>
            <TableCell className="text-sm">{TIPO_BANCO_LABELS[banco.tipo]}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {toggling === banco.id ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : (
                  <Switch
                    checked={banco.activo}
                    onCheckedChange={() => handleToggle(banco)}
                  />
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex gap-1 justify-center">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  render={<Link href={`/bancos/${banco.id}/edit`} title="Editar banco" />}
                >
                  <Pencil />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

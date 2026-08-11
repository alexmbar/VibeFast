'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { eliminarGasto } from '@/lib/gastos/client'
import { CATEGORIA_LABELS, TIPO_PAGO_LABELS, formatMonto, formatDate, extractHora } from '@/lib/gastos/schema'

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

export default function GastoTable({ gastos, onDelete, isLoading }) {
  const [deleting, setDeleting] = useState(null)
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

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (!gastos || gastos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-gray-500">No hay gastos registrados</p>
        <p className="text-sm text-gray-400 mt-2">Crea uno nuevo para empezar</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-sm">
        <thead>
          <tr>
            {COLUMNAS.map(({ key, label, className }) => (
              <th key={key} className={className}>
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
              </th>
            ))}
            <th className="text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {gastosOrdenados.map(gasto => (
            <tr key={gasto.id} className="hover">
              <td className="font-mono text-sm">
                <div>{formatDate(gasto.fecha)}</div>
                <div className="text-xs text-gray-500">{extractHora(gasto.created_at)}</div>
              </td>
              <td className="text-sm">{gasto.tienda || '-'}</td>
              <td className="text-sm">{CATEGORIA_LABELS[gasto.categoria]}</td>
              <td className="text-sm">{TIPO_PAGO_LABELS[gasto.tipo_pago]}</td>
              <td className="text-right font-mono font-semibold tabular-nums">
                {formatMonto(gasto.monto)}
              </td>
              <td className="text-center">
                <div className="flex gap-2 justify-center">
                  <Link
                    href={`/gastos/${gasto.id}/edit`}
                    className="btn btn-xs btn-ghost"
                    title="Editar gasto"
                  >
                    ✏️
                  </Link>
                  <button
                    onClick={() => handleDelete(gasto.id)}
                    disabled={deleting === gasto.id}
                    className="btn btn-xs btn-ghost text-error"
                    title="Eliminar gasto"
                    aria-busy={deleting === gasto.id}
                  >
                    {deleting === gasto.id ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      '🗑️'
                    )}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

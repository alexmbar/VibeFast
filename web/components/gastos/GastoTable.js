'use client'

import Link from 'next/link'
import { useState } from 'react'
import { eliminarGasto } from '@/lib/gastos/client'
import { CATEGORIA_LABELS, TIPO_PAGO_LABELS, formatMonto, formatDate, formatHora } from '@/lib/gastos/schema'

export default function GastoTable({ gastos, onDelete, isLoading }) {
  const [deleting, setDeleting] = useState(null)

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
            <th>Fecha</th>
            <th>Tienda</th>
            <th>Categoría</th>
            <th>Tipo de pago</th>
            <th className="text-right">Monto</th>
            <th className="text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {gastos.map(gasto => (
            <tr key={gasto.id} className="hover">
              <td className="font-mono text-sm">
                <div>{formatDate(gasto.fecha)}</div>
                <div className="text-xs text-gray-500">{formatHora(gasto.hora)}</div>
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

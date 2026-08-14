'use client'

import { useMemo, useState } from 'react'

// Encapsula el estado y la logica de ordenamiento que comparten las
// tablas ordenables de la app (▲/▼ por columna, default configurable).
// Cada tabla sigue definiendo su propio comparador(a, b, columna).
export function useSortableTable(items, comparador, { defaultSortBy = 'fecha', defaultSortDir = 'desc' } = {}) {
  const [sortBy, setSortBy] = useState(defaultSortBy)
  const [sortDir, setSortDir] = useState(defaultSortDir)

  const sorted = useMemo(() => {
    if (!items) return items
    const ordenados = [...items].sort((a, b) => comparador(a, b, sortBy))
    if (sortDir === 'desc') ordenados.reverse()
    return ordenados
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, sortBy, sortDir])

  function handleSort(columna) {
    if (columna === sortBy) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(columna)
      setSortDir('asc')
    }
  }

  return { sorted, sortBy, sortDir, handleSort }
}

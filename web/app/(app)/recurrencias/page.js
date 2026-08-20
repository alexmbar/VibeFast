'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { listarRecurrencias } from '@/lib/recurrencias/client'
import { TIPOS, TIPO_LABELS } from '@/lib/recurrencias/schema'
import RecurrenciaTable from '@/components/recurrencias/RecurrenciaTable'
import AlertasRecurrencias from '@/components/recurrencias/AlertasRecurrencias'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ordenarPorLabel, selectItems } from '@/lib/utils'

export default function RecurrenciasPage() {
  const [recurrencias, setRecurrencias] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({ tipo: '', activo: '' })

  async function loadRecurrencias() {
    setIsLoading(true)
    try {
      const data = await listarRecurrencias(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
      )
      setRecurrencias(data)
    } catch (error) {
      console.error('Error loading recurrencias:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRecurrencias()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  function handleSelectFilterChange(name, value, sentinel) {
    setFilters(prev => ({ ...prev, [name]: value === sentinel ? '' : value }))
  }

  function handleChange(actualizada, deletedId) {
    if (deletedId) {
      setRecurrencias(prev => prev.filter(r => r.id !== deletedId))
      return
    }
    setRecurrencias(prev => prev.map(r => (r.id === actualizada.id ? actualizada : r)))
  }

  const hayFiltros = filters.tipo || filters.activo

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Recurrencias</h1>
        <Button render={<Link href="/recurrencias/create" />}>
          <Plus />
          Nueva recurrencia
        </Button>
      </div>

      <AlertasRecurrencias />

      <Card>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Tipo</Label>
              <Select
                value={filters.tipo || 'todos'}
                onValueChange={(value) => handleSelectFilterChange('tipo', value, 'todos')}
                items={{ todos: 'Todos', ...selectItems(TIPOS, TIPO_LABELS) }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {ordenarPorLabel(TIPOS, TIPO_LABELS).map(tipo => (
                    <SelectItem key={tipo} value={tipo}>{TIPO_LABELS[tipo]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Estado</Label>
              <Select
                value={filters.activo || 'todas'}
                onValueChange={(value) => handleSelectFilterChange('activo', value, 'todas')}
                items={{ todas: 'Todas', true: 'Activas', false: 'Inactivas' }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="true">Activas</SelectItem>
                  <SelectItem value="false">Inactivas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {hayFiltros && (
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ tipo: '', activo: '' })}
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <RecurrenciaTable recurrencias={recurrencias} onChange={handleChange} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  )
}

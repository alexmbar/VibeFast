'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { listarIngresos } from '@/lib/ingresos/client'
import { CATEGORIAS, CATEGORIA_LABELS } from '@/lib/ingresos/schema'
import IngresoTable from '@/components/ingresos/IngresoTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function IngresosPage() {
  const [ingresos, setIngresos] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    desde: '',
    hasta: '',
    categoria: '',
  })

  async function loadIngresos() {
    setIsLoading(true)
    try {
      const { ingresos: data } = await listarIngresos(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
      )
      setIngresos(data)
    } catch (error) {
      console.error('Error loading ingresos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadIngresos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  function handleFilterChange(e) {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  function handleSelectFilterChange(name, value, sentinel) {
    setFilters(prev => ({ ...prev, [name]: value === sentinel ? '' : value }))
  }

  function handleDelete(id) {
    setIngresos(prev => prev.filter(i => i.id !== id))
  }

  const hayFiltros = filters.desde || filters.hasta || filters.categoria

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Mis ingresos</h1>
        <Button render={<Link href="/ingresos/create" />}>
          <Plus />
          Nuevo ingreso
        </Button>
      </div>

      <Card>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="desde" className="text-sm">Desde</Label>
              <Input
                id="desde"
                type="date"
                name="desde"
                value={filters.desde}
                onChange={handleFilterChange}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hasta" className="text-sm">Hasta</Label>
              <Input
                id="hasta"
                type="date"
                name="hasta"
                value={filters.hasta}
                onChange={handleFilterChange}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Categoría</Label>
              <Select
                value={filters.categoria || 'todas'}
                onValueChange={(value) => handleSelectFilterChange('categoria', value, 'todas')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {CATEGORIAS.map(cat => (
                    <SelectItem key={cat} value={cat}>{CATEGORIA_LABELS[cat]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {hayFiltros && (
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ desde: '', hasta: '', categoria: '' })}
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <IngresoTable ingresos={ingresos} onDelete={handleDelete} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  )
}

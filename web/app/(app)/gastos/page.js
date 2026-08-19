'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Download } from 'lucide-react'
import { listarGastos } from '@/lib/gastos/client'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import GastoTable from '@/components/gastos/GastoTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CATEGORIAS, TIPOS_PAGO, CATEGORIA_LABELS, TIPO_PAGO_LABELS } from '@/lib/gastos/schema'

export default function GastosPage() {
  const [gastos, setGastos] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    desde: '',
    hasta: '',
    categoria: '',
    tipo_pago: '',
  })

  async function loadGastos() {
    setIsLoading(true)
    try {
      const { gastos: data } = await listarGastos(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
      )
      setGastos(data)
    } catch (error) {
      console.error('Error loading gastos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadGastos()
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
    setGastos(prev => prev.filter(g => g.id !== id))
  }

  const hayFiltros = filters.desde || filters.hasta || filters.categoria || filters.tipo_pago

  function exportUrl(format) {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    )
    params.set('format', format)
    return `/api/gastos/export?${params.toString()}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Mis gastos</h1>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>
              <Download />
              Exportar
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<a href={exportUrl('csv')} />}>CSV</DropdownMenuItem>
              <DropdownMenuItem render={<a href={exportUrl('json')} />}>JSON</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button render={<Link href="/gastos/create" />}>
            <Plus />
            Nuevo gasto
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

            <div className="space-y-1.5">
              <Label className="text-sm">Tipo de pago</Label>
              <Select
                value={filters.tipo_pago || 'todos'}
                onValueChange={(value) => handleSelectFilterChange('tipo_pago', value, 'todos')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {TIPOS_PAGO.map(tipo => (
                    <SelectItem key={tipo} value={tipo}>{TIPO_PAGO_LABELS[tipo]}</SelectItem>
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
                onClick={() => setFilters({ desde: '', hasta: '', categoria: '', tipo_pago: '' })}
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla de gastos */}
      <Card>
        <CardContent>
          <GastoTable gastos={gastos} onDelete={handleDelete} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  )
}

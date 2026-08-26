'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, ChevronDown } from 'lucide-react'
import { listarTransacciones } from '@/lib/transacciones/client'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import TransaccionTable from '@/components/transacciones/TransaccionTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const TIPO_LABELS = {
  gasto: 'Gasto',
  ingreso: 'Ingreso',
  retiro: 'Transferencia',
}

export default function TransaccionesPage() {
  const [transacciones, setTransacciones] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({ desde: '', hasta: '', tipo: '' })

  // Preselecciona el tipo cuando se llega desde el redirect de
  // /gastos o /ingresos (?tipo=gasto|ingreso). Se lee de window en vez
  // de useSearchParams para no forzar un Suspense boundary en esta
  // página -- es una preselección de UI, no algo que deba sobrevivir
  // a un refresh de servidor.
  useEffect(() => {
    const tipo = new URLSearchParams(window.location.search).get('tipo')
    if (tipo === 'gasto' || tipo === 'ingreso' || tipo === 'retiro') {
      setFilters((prev) => ({ ...prev, tipo }))
    }
  }, [])

  async function loadTransacciones() {
    setIsLoading(true)
    try {
      const data = await listarTransacciones(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
      )
      setTransacciones(data)
    } catch (error) {
      console.error('Error loading transacciones:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTransacciones()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  function handleFilterChange(e) {
    const { name, value } = e.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  function handleTipoChange(value) {
    setFilters((prev) => ({ ...prev, tipo: value === 'todos' ? '' : value }))
  }

  function handleDelete(tipo, id) {
    setTransacciones((prev) => prev.filter((t) => !(t.tipo === tipo && t.id === id)))
  }

  function handleUpdate(tipo, actualizado) {
    setTransacciones((prev) =>
      prev.map((t) => (t.tipo === tipo && t.id === actualizado.id ? { ...t, pendiente: false } : t))
    )
  }

  const hayFiltros = filters.desde || filters.hasta || filters.tipo

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Transacciones</h1>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button />}>
            <Plus />
            Registrar
            <ChevronDown />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href="/gastos/create" />}>Gasto</DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/ingresos/create" />}>Ingreso</DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/retiros/create" />}>Retiro de efectivo</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="desde" className="text-sm">Desde</Label>
              <Input id="desde" type="date" name="desde" value={filters.desde} onChange={handleFilterChange} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hasta" className="text-sm">Hasta</Label>
              <Input id="hasta" type="date" name="hasta" value={filters.hasta} onChange={handleFilterChange} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Tipo</Label>
              <Select
                value={filters.tipo || 'todos'}
                onValueChange={handleTipoChange}
                items={{ todos: 'Todos', ...TIPO_LABELS }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ingreso">Ingreso</SelectItem>
                  <SelectItem value="gasto">Gasto</SelectItem>
                  <SelectItem value="retiro">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {hayFiltros && (
            <div className="mt-4">
              <Button variant="ghost" size="sm" onClick={() => setFilters({ desde: '', hasta: '', tipo: '' })}>
                Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <TransaccionTable
            transacciones={transacciones}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  )
}
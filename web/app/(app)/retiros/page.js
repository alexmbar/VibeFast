'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { listarRetiros } from '@/lib/retiros/client'
import RetiroTable from '@/components/retiros/RetiroTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function RetirosPage() {
  const [retiros, setRetiros] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({ desde: '', hasta: '' })

  async function loadRetiros() {
    setIsLoading(true)
    try {
      const { retiros: data } = await listarRetiros(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
      )
      setRetiros(data)
    } catch (error) {
      console.error('Error loading retiros:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRetiros()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  function handleFilterChange(e) {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  function handleDelete(id) {
    setRetiros(prev => prev.filter(r => r.id !== id))
  }

  const hayFiltros = filters.desde || filters.hasta

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Mis retiros</h1>
        <Button render={<Link href="/retiros/create" />}>
          <Plus />
          Nuevo retiro
        </Button>
      </div>

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
          </div>

          {hayFiltros && (
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ desde: '', hasta: '' })}
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <RetiroTable retiros={retiros} onDelete={handleDelete} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  )
}

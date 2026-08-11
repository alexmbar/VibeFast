'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { listarGastos } from '@/lib/gastos/client'
import GastoTable from '@/components/gastos/GastoTable'

export default function GastosPage() {
  const router = useRouter()
  const [gastos, setGastos] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
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
  }, [filters])

  function handleFilterChange(e) {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  function handleDelete(id) {
    setGastos(prev => prev.filter(g => g.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Mis gastos</h1>
        <Link href="/gastos/create" className="btn btn-primary">
          + Nuevo gasto
        </Link>
      </div>

      {/* Filtros */}
      <div className="card bg-base-100 shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm">Desde</span>
            </label>
            <input
              type="date"
              name="desde"
              value={filters.desde}
              onChange={handleFilterChange}
              className="input input-bordered input-sm"
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm">Hasta</span>
            </label>
            <input
              type="date"
              name="hasta"
              value={filters.hasta}
              onChange={handleFilterChange}
              className="input input-bordered input-sm"
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm">Categoría</span>
            </label>
            <select
              name="categoria"
              value={filters.categoria}
              onChange={handleFilterChange}
              className="select select-bordered select-sm"
            >
              <option value="">Todas</option>
              <option value="supermercado">Supermercado</option>
              <option value="restaurantes">Restaurantes</option>
              <option value="cafeteria">Cafetería</option>
              <option value="transporte">Transporte</option>
              <option value="gasolina">Gasolina</option>
              <option value="salud">Salud</option>
              <option value="farmacia">Farmacia</option>
              <option value="hogar">Hogar</option>
              <option value="servicios">Servicios</option>
              <option value="renta">Renta</option>
              <option value="educacion">Educación</option>
              <option value="entretenimiento">Entretenimiento</option>
              <option value="ropa">Ropa</option>
              <option value="tecnologia">Tecnología</option>
              <option value="viajes">Viajes</option>
              <option value="mascotas">Mascotas</option>
              <option value="regalos">Regalos</option>
              <option value="impuestos">Impuestos</option>
              <option value="comisiones">Comisiones</option>
              <option value="otros">Otros</option>
            </select>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm">Tipo de pago</span>
            </label>
            <select
              name="tipo_pago"
              value={filters.tipo_pago}
              onChange={handleFilterChange}
              className="select select-bordered select-sm"
            >
              <option value="">Todos</option>
              <option value="efectivo">Efectivo</option>
              <option value="debito">Débito</option>
              <option value="credito">Crédito</option>
              <option value="transferencia">Transferencia</option>
              <option value="domiciliado">Domiciliado</option>
              <option value="vales">Vales</option>
              <option value="otro">Otro</option>
            </select>
          </div>
        </div>

        {(filters.desde || filters.hasta || filters.categoria || filters.tipo_pago) && (
          <div className="mt-4">
            <button
              onClick={() =>
                setFilters({
                  desde: '',
                  hasta: '',
                  categoria: '',
                  tipo_pago: '',
                })
              }
              className="btn btn-sm btn-ghost"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Tabla de gastos */}
      <GastoTable gastos={gastos} onDelete={handleDelete} isLoading={isLoading} />
    </div>
  )
}

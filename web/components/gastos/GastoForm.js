'use client'

import { useState, useEffect } from 'react'
import { crearGasto, actualizarGasto } from '@/lib/gastos/client'
import {
  CATEGORIAS,
  TIPOS_PAGO,
  CATEGORIA_LABELS,
  TIPO_PAGO_LABELS,
  pesosTocentavos,
  centavosToPesos,
  formatDate,
} from '@/lib/gastos/schema'

export default function GastoForm({ initialData = null, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({
    monto: initialData ? centavosToPesos(initialData.monto) : '',
    fecha: initialData ? formatDate(initialData.fecha) : '',
    categoria: initialData?.categoria || '',
    tipo_pago: initialData?.tipo_pago || '',
    tienda: initialData?.tienda || '',
    banco: initialData?.banco || '',
    notas: initialData?.notas || '',
  })

  const isEdit = !!initialData

  function handleChange(e) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      const data = {
        monto: pesosTocentavos(formData.monto),
        fecha: formData.fecha,
        categoria: formData.categoria,
        tipo_pago: formData.tipo_pago,
        tienda: formData.tienda || null,
        banco: formData.banco || null,
        notas: formData.notas || null,
      }

      if (isEdit) {
        await actualizarGasto(initialData.id, data)
      } else {
        await crearGasto(data)
      }

      onSuccess?.()
    } catch (error) {
      if (error.message.includes('Datos inválidos')) {
        setErrors(error.details || { general: error.message })
      } else {
        setErrors({ general: error.message })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card bg-base-100 shadow-md p-6">
      <div className="space-y-4">
        {/* Monto */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Monto</span>
          </label>
          <div className="input-group">
            <span>$</span>
            <input
              type="number"
              name="monto"
              value={formData.monto}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
              className={`input input-bordered flex-1 ${errors.monto ? 'input-error' : ''}`}
            />
          </div>
          {errors.monto && (
            <label className="label">
              <span className="label-text-alt text-error">{errors.monto}</span>
            </label>
          )}
        </div>

        {/* Fecha */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Fecha</span>
          </label>
          <input
            type="date"
            name="fecha"
            value={formData.fecha}
            onChange={handleChange}
            required
            className={`input input-bordered ${errors.fecha ? 'input-error' : ''}`}
          />
          {errors.fecha && (
            <label className="label">
              <span className="label-text-alt text-error">{errors.fecha}</span>
            </label>
          )}
        </div>

        {/* Categoría */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Categoría</span>
          </label>
          <select
            name="categoria"
            value={formData.categoria}
            onChange={handleChange}
            required
            className={`select select-bordered ${errors.categoria ? 'select-error' : ''}`}
          >
            <option value="">Selecciona una categoría</option>
            {CATEGORIAS.map(cat => (
              <option key={cat} value={cat}>
                {CATEGORIA_LABELS[cat]}
              </option>
            ))}
          </select>
          {errors.categoria && (
            <label className="label">
              <span className="label-text-alt text-error">{errors.categoria}</span>
            </label>
          )}
        </div>

        {/* Tipo de pago */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Tipo de pago</span>
          </label>
          <select
            name="tipo_pago"
            value={formData.tipo_pago}
            onChange={handleChange}
            required
            className={`select select-bordered ${errors.tipo_pago ? 'select-error' : ''}`}
          >
            <option value="">Selecciona tipo de pago</option>
            {TIPOS_PAGO.map(tipo => (
              <option key={tipo} value={tipo}>
                {TIPO_PAGO_LABELS[tipo]}
              </option>
            ))}
          </select>
          {errors.tipo_pago && (
            <label className="label">
              <span className="label-text-alt text-error">{errors.tipo_pago}</span>
            </label>
          )}
        </div>

        {/* Tienda (opcional) */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Tienda</span>
          </label>
          <input
            type="text"
            name="tienda"
            value={formData.tienda}
            onChange={handleChange}
            placeholder="OXXO, Pemex, etc."
            className="input input-bordered"
          />
        </div>

        {/* Banco (opcional) */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Banco</span>
          </label>
          <input
            type="text"
            name="banco"
            value={formData.banco}
            onChange={handleChange}
            placeholder="BBVA, Nu, etc."
            className="input input-bordered"
          />
        </div>

        {/* Notas (opcional) */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Notas</span>
          </label>
          <textarea
            name="notas"
            value={formData.notas}
            onChange={handleChange}
            placeholder="Observaciones..."
            className="textarea textarea-bordered"
            rows="3"
          />
        </div>

        {/* Error general */}
        {errors.general && (
          <div className="alert alert-error">
            <span>{errors.general}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="form-control flex flex-row gap-2 justify-end pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-ghost"
              disabled={loading}
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm" />
            ) : null}
            {isEdit ? 'Guardar cambios' : 'Crear gasto'}
          </button>
        </div>
      </div>
    </form>
  )
}

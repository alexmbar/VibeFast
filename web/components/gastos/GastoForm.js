'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { crearGasto, actualizarGasto } from '@/lib/gastos/client'
import {
  CATEGORIAS,
  TIPOS_PAGO,
  CATEGORIA_LABELS,
  TIPO_PAGO_LABELS,
  pesosTocentavos,
  centavosToPesos,
  formatDate,
  extractHora,
  horaActual,
} from '@/lib/gastos/schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function GastoForm({ initialData = null, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({
    monto: initialData ? centavosToPesos(initialData.monto) : '',
    fecha: initialData ? formatDate(initialData.fecha) : '',
    hora: initialData ? extractHora(initialData.created_at) : horaActual(),
    categoria: initialData?.categoria || '',
    tipo_pago: initialData?.tipo_pago || '',
    tienda: initialData?.tienda || '',
    banco: initialData?.banco || '',
    notas: initialData?.notas || '',
  })

  const isEdit = !!initialData
  const esEfectivo = formData.tipo_pago === 'efectivo'

  // El efectivo no tiene banco asociado: si el usuario cambia a "efectivo"
  // con un banco ya capturado, se limpia para no permitir la combinación.
  useEffect(() => {
    if (esEfectivo && formData.banco) {
      setFormData(prev => ({ ...prev, banco: '' }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esEfectivo])

  function handleChange(e) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  function handleSelectChange(name, value) {
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
      const createdAtDate = new Date(`${formData.fecha}T${formData.hora}:00Z`)

      const data = {
        monto: pesosTocentavos(formData.monto),
        fecha: formData.fecha,
        created_at: createdAtDate.toISOString(),
        categoria: formData.categoria,
        tipo_pago: formData.tipo_pago,
        tienda: formData.tienda || null,
        banco: esEfectivo ? null : formData.banco || null,
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
    <form onSubmit={handleSubmit} className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
      <div className="space-y-4">
        {/* Monto */}
        <div className="space-y-1.5">
          <Label htmlFor="monto">Monto</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="monto"
              type="number"
              name="monto"
              value={formData.monto}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
              aria-invalid={!!errors.monto}
              className="pl-6"
            />
          </div>
          {errors.monto && <p className="text-sm text-destructive">{errors.monto}</p>}
        </div>

        {/* Fecha y Hora */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="fecha">Fecha</Label>
            <Input
              id="fecha"
              type="date"
              name="fecha"
              value={formData.fecha}
              onChange={handleChange}
              required
              aria-invalid={!!errors.fecha}
            />
            {errors.fecha && <p className="text-sm text-destructive">{errors.fecha}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hora">Hora</Label>
            <Input
              id="hora"
              type="time"
              name="hora"
              value={formData.hora}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Categoría */}
        <div className="space-y-1.5">
          <Label htmlFor="categoria">Categoría</Label>
          <Select
            value={formData.categoria}
            onValueChange={(value) => handleSelectChange('categoria', value)}
          >
            <SelectTrigger id="categoria" className="w-full" aria-invalid={!!errors.categoria}>
              <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {CATEGORIA_LABELS[cat]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoria && <p className="text-sm text-destructive">{errors.categoria}</p>}
        </div>

        {/* Tipo de pago */}
        <div className="space-y-1.5">
          <Label htmlFor="tipo_pago">Tipo de pago</Label>
          <Select
            value={formData.tipo_pago}
            onValueChange={(value) => handleSelectChange('tipo_pago', value)}
          >
            <SelectTrigger id="tipo_pago" className="w-full" aria-invalid={!!errors.tipo_pago}>
              <SelectValue placeholder="Selecciona tipo de pago" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_PAGO.map(tipo => (
                <SelectItem key={tipo} value={tipo}>
                  {TIPO_PAGO_LABELS[tipo]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.tipo_pago && <p className="text-sm text-destructive">{errors.tipo_pago}</p>}
        </div>

        {/* Tienda (opcional) */}
        <div className="space-y-1.5">
          <Label htmlFor="tienda">Tienda</Label>
          <Input
            id="tienda"
            type="text"
            name="tienda"
            value={formData.tienda}
            onChange={handleChange}
            placeholder="OXXO, Pemex, etc."
          />
        </div>

        {/* Banco (opcional, no aplica si el pago es en efectivo) */}
        <div className="space-y-1.5">
          <Label htmlFor="banco">Banco</Label>
          <Input
            id="banco"
            type="text"
            name="banco"
            value={formData.banco}
            onChange={handleChange}
            placeholder="BBVA, Nu, etc."
            disabled={esEfectivo}
          />
          {esEfectivo && (
            <p className="text-xs text-muted-foreground">Efectivo no tiene banco asociado.</p>
          )}
          {errors.banco && <p className="text-sm text-destructive">{errors.banco}</p>}
        </div>

        {/* Notas (opcional) */}
        <div className="space-y-1.5">
          <Label htmlFor="notas">Notas</Label>
          <Textarea
            id="notas"
            name="notas"
            value={formData.notas}
            onChange={handleChange}
            placeholder="Observaciones..."
            rows={3}
          />
        </div>

        {/* Error general */}
        {errors.general && (
          <Alert variant="destructive">
            <AlertDescription>{errors.general}</AlertDescription>
          </Alert>
        )}

        {/* Buttons */}
        <div className="flex flex-row gap-2 justify-end pt-4">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={loading} aria-busy={loading}>
            {loading && <Loader2 className="animate-spin" />}
            {isEdit ? 'Guardar cambios' : 'Crear gasto'}
          </Button>
        </div>
      </div>
    </form>
  )
}

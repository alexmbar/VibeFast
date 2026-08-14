'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { crearRetiro, actualizarRetiro } from '@/lib/retiros/client'
import { listarBancos } from '@/lib/bancos/client'
import { pesosTocentavos, centavosToPesos, formatDate } from '@/lib/gastos/schema'
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

export default function RetiroForm({ initialData = null, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [bancos, setBancos] = useState([])
  const [loadingBancos, setLoadingBancos] = useState(true)
  const [formData, setFormData] = useState({
    monto: initialData ? centavosToPesos(initialData.monto) : '',
    fecha: initialData ? formatDate(initialData.fecha) : formatDate(new Date()),
    banco_id: initialData?.banco_id ? String(initialData.banco_id) : '',
    notas: initialData?.notas || '',
  })

  const isEdit = !!initialData

  // Un retiro solo puede salir de un banco tipo=debito.
  useEffect(() => {
    let cancelled = false
    setLoadingBancos(true)
    listarBancos({ activo: true, tipo: 'debito' })
      .then(data => {
        if (!cancelled) setBancos(data)
      })
      .catch(() => {
        if (!cancelled) setBancos([])
      })
      .finally(() => {
        if (!cancelled) setLoadingBancos(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

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
      const data = {
        monto: pesosTocentavos(formData.monto),
        fecha: formData.fecha,
        banco_id: formData.banco_id || null,
        notas: formData.notas || null,
      }

      if (isEdit) {
        await actualizarRetiro(initialData.id, data)
      } else {
        await crearRetiro(data)
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

        {/* Fecha */}
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

        {/* Banco (débito) */}
        <div className="space-y-1.5">
          <Label htmlFor="banco_id">Banco</Label>
          <Select
            value={formData.banco_id}
            onValueChange={(value) => handleSelectChange('banco_id', value)}
            disabled={loadingBancos}
          >
            <SelectTrigger id="banco_id" className="w-full" aria-invalid={!!errors.banco_id}>
              <SelectValue placeholder="Selecciona un banco" />
            </SelectTrigger>
            <SelectContent>
              {bancos.map(banco => (
                <SelectItem key={banco.id} value={String(banco.id)}>
                  {banco.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!loadingBancos && bancos.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No tienes bancos de débito registrados.{' '}
              <Link href="/bancos/create" className="underline hover:text-foreground">
                Agrega uno
              </Link>
              .
            </p>
          )}
          {errors.banco_id && <p className="text-sm text-destructive">{errors.banco_id}</p>}
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
            {isEdit ? 'Guardar cambios' : 'Crear retiro'}
          </Button>
        </div>
      </div>
    </form>
  )
}

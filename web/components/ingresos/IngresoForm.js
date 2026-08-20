'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { crearIngreso, actualizarIngreso } from '@/lib/ingresos/client'
import { listarBancos } from '@/lib/bancos/client'
import { CATEGORIAS, CATEGORIA_LABELS } from '@/lib/ingresos/schema'
import { pesosTocentavos, centavosToPesos, formatDate } from '@/lib/gastos/schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MoneyInput } from '@/components/ui/money-input'
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
import { ordenarPorLabel, selectItems } from '@/lib/utils'

const SIN_BANCO = '__sin_banco__'

export default function IngresoForm({ initialData = null, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [bancos, setBancos] = useState([])
  const [loadingBancos, setLoadingBancos] = useState(true)
  const [formData, setFormData] = useState({
    monto: initialData ? centavosToPesos(initialData.monto) : '',
    fecha: initialData ? formatDate(initialData.fecha) : formatDate(new Date()),
    categoria: initialData?.categoria || '',
    banco_id: initialData?.banco_id ? String(initialData.banco_id) : '',
    notas: initialData?.notas || '',
  })

  const isEdit = !!initialData

  // Un ingreso puede caer en cualquier tipo de cuenta (a diferencia de un
  // retiro, que solo puede ser de débito), así que se listan todos.
  useEffect(() => {
    let cancelled = false
    setLoadingBancos(true)
    listarBancos({ activo: true })
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
        categoria: formData.categoria,
        banco_id: formData.banco_id || null,
        notas: formData.notas || null,
      }

      if (isEdit) {
        await actualizarIngreso(initialData.id, data)
      } else {
        await crearIngreso(data)
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
            <MoneyInput
              id="monto"
              name="monto"
              value={formData.monto}
              onChange={handleChange}
              placeholder="0.00"
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

        {/* Categoría */}
        <div className="space-y-1.5">
          <Label htmlFor="categoria">Categoría</Label>
          <Select
            value={formData.categoria}
            onValueChange={(value) => handleSelectChange('categoria', value)}
            items={selectItems(CATEGORIAS, CATEGORIA_LABELS)}
          >
            <SelectTrigger id="categoria" className="w-full" aria-invalid={!!errors.categoria}>
              <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
              {ordenarPorLabel(CATEGORIAS, CATEGORIA_LABELS).map(cat => (
                <SelectItem key={cat} value={cat}>
                  {CATEGORIA_LABELS[cat]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoria && <p className="text-sm text-destructive">{errors.categoria}</p>}
        </div>

        {/* Banco (opcional) */}
        <div className="space-y-1.5">
          <Label htmlFor="banco_id">Banco (opcional)</Label>
          <Select
            value={formData.banco_id || SIN_BANCO}
            onValueChange={(value) => handleSelectChange('banco_id', value === SIN_BANCO ? '' : value)}
            disabled={loadingBancos}
            items={{ [SIN_BANCO]: 'Ninguno', ...Object.fromEntries(bancos.map(banco => [String(banco.id), banco.nombre])) }}
          >
            <SelectTrigger id="banco_id" className="w-full" aria-invalid={!!errors.banco_id}>
              <SelectValue placeholder="Selecciona un banco" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SIN_BANCO}>Ninguno</SelectItem>
              {[...bancos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map(banco => (
                <SelectItem key={banco.id} value={String(banco.id)}>{banco.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!loadingBancos && bancos.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No tienes bancos registrados.{' '}
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
            {isEdit ? 'Guardar cambios' : 'Crear ingreso'}
          </Button>
        </div>
      </div>
    </form>
  )
}

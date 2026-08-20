'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { crearBanco, actualizarBanco } from '@/lib/bancos/client'
import { TIPOS_BANCO, TIPO_BANCO_LABELS } from '@/lib/bancos/schema'
import { pesosTocentavos, centavosToPesos } from '@/lib/gastos/schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MoneyInput } from '@/components/ui/money-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function BancoForm({ initialData = null, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({
    nombre: initialData?.nombre || '',
    tipo: initialData?.tipo || '',
    dia_corte: initialData?.dia_corte ?? '',
    dia_limite_pago: initialData?.dia_limite_pago ?? '',
    limite_credito:
      initialData?.limite_credito !== undefined && initialData?.limite_credito !== null
        ? centavosToPesos(initialData.limite_credito)
        : '',
    alias: initialData?.alias || '',
    tasa_interes: initialData?.tasa_interes ?? '',
  })

  const isEdit = !!initialData
  const esCredito = formData.tipo === 'credito'

  // Los campos de credito no aplican a un banco tipo=debito: si el usuario
  // cambia el tipo, se limpian para no mandar datos inconsistentes.
  useEffect(() => {
    if (!esCredito) {
      setFormData(prev => ({
        ...prev,
        dia_corte: '',
        dia_limite_pago: '',
        limite_credito: '',
        alias: '',
        tasa_interes: '',
      }))
    }
  }, [esCredito])

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
        nombre: formData.nombre,
        tipo: formData.tipo,
        dia_corte: esCredito && formData.dia_corte !== '' ? Number(formData.dia_corte) : null,
        dia_limite_pago:
          esCredito && formData.dia_limite_pago !== '' ? Number(formData.dia_limite_pago) : null,
        limite_credito:
          esCredito && formData.limite_credito !== '' ? pesosTocentavos(formData.limite_credito) : null,
        alias: esCredito && formData.alias.trim() ? formData.alias.trim() : null,
        tasa_interes: esCredito && formData.tasa_interes !== '' ? Number(formData.tasa_interes) : null,
      }

      if (isEdit) {
        await actualizarBanco(initialData.id, data)
      } else {
        await crearBanco(data)
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
        {/* Nombre */}
        <div className="space-y-1.5">
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            placeholder="BBVA, Nu, etc."
            required
            aria-invalid={!!errors.nombre}
          />
          {errors.nombre && <p className="text-sm text-destructive">{errors.nombre}</p>}
        </div>

        {/* Tipo */}
        <div className="space-y-1.5">
          <Label htmlFor="tipo">Tipo</Label>
          <Select
            value={formData.tipo}
            onValueChange={(value) => handleSelectChange('tipo', value)}
          >
            <SelectTrigger id="tipo" className="w-full" aria-invalid={!!errors.tipo}>
              <SelectValue placeholder="Selecciona un tipo" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_BANCO.map(tipo => (
                <SelectItem key={tipo} value={tipo}>
                  {TIPO_BANCO_LABELS[tipo]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.tipo && <p className="text-sm text-destructive">{errors.tipo}</p>}
          <p className="text-xs text-muted-foreground">
            Si usas el mismo banco para débito y crédito por separado, regístralo dos veces (uno por tipo).
          </p>
        </div>

        {/* Datos de credito (solo aplican si tipo=credito) */}
        {esCredito && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="dia_corte">Día de corte</Label>
                <Input
                  id="dia_corte"
                  type="number"
                  name="dia_corte"
                  min={1}
                  max={31}
                  value={formData.dia_corte}
                  onChange={handleChange}
                  placeholder="15"
                  aria-invalid={!!errors.dia_corte}
                />
                {errors.dia_corte && <p className="text-sm text-destructive">{errors.dia_corte}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dia_limite_pago">Día límite de pago</Label>
                <Input
                  id="dia_limite_pago"
                  type="number"
                  name="dia_limite_pago"
                  min={1}
                  max={31}
                  value={formData.dia_limite_pago}
                  onChange={handleChange}
                  placeholder="5"
                  aria-invalid={!!errors.dia_limite_pago}
                />
                {errors.dia_limite_pago && (
                  <p className="text-sm text-destructive">{errors.dia_limite_pago}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="limite_credito">Límite de crédito</Label>
              <MoneyInput
                id="limite_credito"
                name="limite_credito"
                value={formData.limite_credito}
                onChange={handleChange}
                placeholder="20,000"
                aria-invalid={!!errors.limite_credito}
              />
              {errors.limite_credito && (
                <p className="text-sm text-destructive">{errors.limite_credito}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="alias">Alias (opcional)</Label>
              <Input
                id="alias"
                type="text"
                name="alias"
                value={formData.alias}
                onChange={handleChange}
                placeholder="Últimos 4 dígitos o apodo, ej. 4532 o Nu Ultravioleta"
                aria-invalid={!!errors.alias}
              />
              {errors.alias && <p className="text-sm text-destructive">{errors.alias}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tasa_interes">Tasa de interés anual / CAT (opcional)</Label>
              <Input
                id="tasa_interes"
                type="number"
                name="tasa_interes"
                min={0}
                step="0.01"
                value={formData.tasa_interes}
                onChange={handleChange}
                placeholder="45.00"
                aria-invalid={!!errors.tasa_interes}
              />
              {errors.tasa_interes && (
                <p className="text-sm text-destructive">{errors.tasa_interes}</p>
              )}
            </div>
          </>
        )}

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
            {isEdit ? 'Guardar cambios' : 'Crear banco'}
          </Button>
        </div>
      </div>
    </form>
  )
}

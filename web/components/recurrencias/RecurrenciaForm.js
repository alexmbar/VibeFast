'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { crearRecurrencia, actualizarRecurrencia } from '@/lib/recurrencias/client'
import { listarBancos } from '@/lib/bancos/client'
import {
  TIPOS,
  TIPO_LABELS,
  FRECUENCIAS,
  FRECUENCIA_LABELS,
  DIA_SEMANA_LABELS,
  TIPOS_PAGO,
  TIPO_PAGO_LABELS,
  categoriasDe,
  categoriaLabelsDe,
} from '@/lib/recurrencias/schema'
import { pesosTocentavos, centavosToPesos, formatDate } from '@/lib/gastos/schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MoneyInput } from '@/components/ui/money-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ordenarPorLabel } from '@/lib/utils'

const TIPOS_PAGO_BANCO = ['debito', 'credito']
const SIN_BANCO = '__sin_banco__'
const DIAS_MES = Array.from({ length: 31 }, (_, i) => i + 1)

export default function RecurrenciaForm({ initialData = null, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [bancos, setBancos] = useState([])
  const [loadingBancos, setLoadingBancos] = useState(false)
  const [formData, setFormData] = useState({
    tipo: initialData?.tipo || 'gasto',
    frecuencia: initialData?.frecuencia || 'mensual',
    dia_semana: initialData?.dia_semana != null ? String(initialData.dia_semana) : '',
    dia_mes_1: initialData?.dias_mes?.[0] ? String(initialData.dias_mes[0]) : '',
    dia_mes_2: initialData?.dias_mes?.[1] ? String(initialData.dias_mes[1]) : '',
    monto_default: initialData ? centavosToPesos(initialData.monto_default) : '',
    categoria: initialData?.categoria || '',
    tipo_pago: initialData?.tipo_pago || '',
    banco_id: initialData?.banco_id ? String(initialData.banco_id) : '',
    tienda: initialData?.tienda || '',
    notas: initialData?.notas || '',
    fecha_inicio: initialData ? formatDate(initialData.fecha_inicio) : formatDate(new Date()),
    fecha_fin: initialData?.fecha_fin ? formatDate(initialData.fecha_fin) : '',
    activo: initialData?.activo ?? true,
  })

  const isEdit = !!initialData
  const esGasto = formData.tipo === 'gasto'
  const esEfectivo = formData.tipo_pago === 'efectivo'

  // Cambiar entre ingreso/gasto invalida la categoría (catálogos distintos)
  // y los campos exclusivos de gasto -- se limpian, pero no en el montaje
  // inicial (para no perder los valores precargados al editar).
  const montado = useRef(false)
  useEffect(() => {
    if (!montado.current) {
      montado.current = true
      return
    }
    setFormData(prev => ({ ...prev, categoria: '', tipo_pago: '', banco_id: '', tienda: '' }))
  }, [formData.tipo])

  // El efectivo no tiene banco asociado, igual que en GastoForm.
  useEffect(() => {
    if (esEfectivo && formData.banco_id) {
      setFormData(prev => ({ ...prev, banco_id: '' }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esEfectivo])

  useEffect(() => {
    if (!esGasto || esEfectivo) {
      setBancos([])
      return
    }
    let cancelled = false
    setLoadingBancos(true)
    const filtroTipo = TIPOS_PAGO_BANCO.includes(formData.tipo_pago) ? formData.tipo_pago : undefined
    listarBancos({ activo: true, ...(filtroTipo ? { tipo: filtroTipo } : {}) })
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
  }, [esGasto, formData.tipo_pago, esEfectivo])

  useEffect(() => {
    if (!formData.banco_id || loadingBancos) return
    const stillValid = bancos.some(b => String(b.id) === formData.banco_id)
    if (!stillValid) {
      setFormData(prev => ({ ...prev, banco_id: '' }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bancos, loadingBancos])

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
        tipo: formData.tipo,
        frecuencia: formData.frecuencia,
        dia_semana: formData.frecuencia === 'semanal' ? Number(formData.dia_semana) : null,
        dias_mes:
          formData.frecuencia === 'mensual'
            ? [Number(formData.dia_mes_1)]
            : formData.frecuencia === 'quincenal'
              ? [Number(formData.dia_mes_1), Number(formData.dia_mes_2)]
              : null,
        monto_default: pesosTocentavos(formData.monto_default),
        categoria: formData.categoria,
        tipo_pago: esGasto ? formData.tipo_pago : null,
        banco_id: esGasto ? (esEfectivo ? null : formData.banco_id || null) : null,
        tienda: esGasto ? (formData.tienda || null) : null,
        notas: formData.notas || null,
        fecha_inicio: formData.fecha_inicio,
        fecha_fin: formData.fecha_fin || null,
        activo: formData.activo,
      }

      if (isEdit) {
        await actualizarRecurrencia(initialData.id, data)
      } else {
        await crearRecurrencia(data)
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
        {/* Tipo */}
        <div className="space-y-1.5">
          <Label htmlFor="tipo">Tipo</Label>
          <Select value={formData.tipo} onValueChange={(value) => handleSelectChange('tipo', value)}>
            <SelectTrigger id="tipo" className="w-full" aria-invalid={!!errors.tipo}>
              <SelectValue placeholder="Selecciona un tipo" />
            </SelectTrigger>
            <SelectContent>
              {ordenarPorLabel(TIPOS, TIPO_LABELS).map(tipo => (
                <SelectItem key={tipo} value={tipo}>{TIPO_LABELS[tipo]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.tipo && <p className="text-sm text-destructive">{errors.tipo}</p>}
        </div>

        {/* Monto sugerido */}
        <div className="space-y-1.5">
          <Label htmlFor="monto_default">Monto sugerido</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <MoneyInput
              id="monto_default"
              name="monto_default"
              value={formData.monto_default}
              onChange={handleChange}
              placeholder="0.00"
              required
              aria-invalid={!!errors.monto_default}
              className="pl-6"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Cada ocurrencia se genera con este monto, pendiente de confirmar hasta que la revises.
          </p>
          {errors.monto_default && <p className="text-sm text-destructive">{errors.monto_default}</p>}
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
              {ordenarPorLabel(categoriasDe(formData.tipo), categoriaLabelsDe(formData.tipo)).map(cat => (
                <SelectItem key={cat} value={cat}>
                  {categoriaLabelsDe(formData.tipo)[cat]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoria && <p className="text-sm text-destructive">{errors.categoria}</p>}
        </div>

        {/* Tipo de pago y banco (solo gasto) */}
        {esGasto && (
          <>
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
                  {ordenarPorLabel(TIPOS_PAGO, TIPO_PAGO_LABELS).map(tipo => (
                    <SelectItem key={tipo} value={tipo}>{TIPO_PAGO_LABELS[tipo]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.tipo_pago && <p className="text-sm text-destructive">{errors.tipo_pago}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tienda">Tienda (opcional)</Label>
              <Input
                id="tienda"
                type="text"
                name="tienda"
                value={formData.tienda}
                onChange={handleChange}
                placeholder="Netflix, CFE, etc."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="banco_id">Banco</Label>
              <Select
                value={formData.banco_id || SIN_BANCO}
                onValueChange={(value) => handleSelectChange('banco_id', value === SIN_BANCO ? '' : value)}
                disabled={esEfectivo || loadingBancos}
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
              {esEfectivo && (
                <p className="text-xs text-muted-foreground">Efectivo no tiene banco asociado.</p>
              )}
              {errors.banco_id && <p className="text-sm text-destructive">{errors.banco_id}</p>}
            </div>
          </>
        )}

        {/* Frecuencia */}
        <div className="space-y-1.5">
          <Label htmlFor="frecuencia">Frecuencia</Label>
          <Select
            value={formData.frecuencia}
            onValueChange={(value) => handleSelectChange('frecuencia', value)}
          >
            <SelectTrigger id="frecuencia" className="w-full" aria-invalid={!!errors.frecuencia}>
              <SelectValue placeholder="Selecciona una frecuencia" />
            </SelectTrigger>
            <SelectContent>
              {FRECUENCIAS.map(frec => (
                <SelectItem key={frec} value={frec}>{FRECUENCIA_LABELS[frec]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.frecuencia && <p className="text-sm text-destructive">{errors.frecuencia}</p>}
        </div>

        {/* Día(s) según frecuencia */}
        {formData.frecuencia === 'semanal' && (
          <div className="space-y-1.5">
            <Label htmlFor="dia_semana">Día de la semana</Label>
            <Select
              value={formData.dia_semana}
              onValueChange={(value) => handleSelectChange('dia_semana', value)}
            >
              <SelectTrigger id="dia_semana" className="w-full" aria-invalid={!!errors.dia_semana}>
                <SelectValue placeholder="Selecciona un día" />
              </SelectTrigger>
              <SelectContent>
                {DIA_SEMANA_LABELS.map((label, i) => (
                  <SelectItem key={i} value={String(i)}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.dia_semana && <p className="text-sm text-destructive">{errors.dia_semana}</p>}
          </div>
        )}

        {formData.frecuencia === 'mensual' && (
          <div className="space-y-1.5">
            <Label htmlFor="dia_mes_1">Día del mes</Label>
            <Select
              value={formData.dia_mes_1}
              onValueChange={(value) => handleSelectChange('dia_mes_1', value)}
            >
              <SelectTrigger id="dia_mes_1" className="w-full" aria-invalid={!!errors.dias_mes}>
                <SelectValue placeholder="Selecciona un día" />
              </SelectTrigger>
              <SelectContent>
                {DIAS_MES.map(dia => (
                  <SelectItem key={dia} value={String(dia)}>{dia}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Si el mes es más corto (ej. febrero), se usa el último día del mes.
            </p>
            {errors.dias_mes && <p className="text-sm text-destructive">{errors.dias_mes}</p>}
          </div>
        )}

        {formData.frecuencia === 'quincenal' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="dia_mes_1">Primer día</Label>
              <Select
                value={formData.dia_mes_1}
                onValueChange={(value) => handleSelectChange('dia_mes_1', value)}
              >
                <SelectTrigger id="dia_mes_1" className="w-full" aria-invalid={!!errors.dias_mes}>
                  <SelectValue placeholder="Día" />
                </SelectTrigger>
                <SelectContent>
                  {DIAS_MES.map(dia => (
                    <SelectItem key={dia} value={String(dia)}>{dia}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dia_mes_2">Segundo día</Label>
              <Select
                value={formData.dia_mes_2}
                onValueChange={(value) => handleSelectChange('dia_mes_2', value)}
              >
                <SelectTrigger id="dia_mes_2" className="w-full" aria-invalid={!!errors.dias_mes}>
                  <SelectValue placeholder="Día" />
                </SelectTrigger>
                <SelectContent>
                  {DIAS_MES.map(dia => (
                    <SelectItem key={dia} value={String(dia)}>{dia}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {errors.dias_mes && <p className="col-span-2 text-sm text-destructive">{errors.dias_mes}</p>}
          </div>
        )}

        {/* Fecha inicio y fin */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="fecha_inicio">Desde</Label>
            <Input
              id="fecha_inicio"
              type="date"
              name="fecha_inicio"
              value={formData.fecha_inicio}
              onChange={handleChange}
              required
              aria-invalid={!!errors.fecha_inicio}
            />
            {errors.fecha_inicio && <p className="text-sm text-destructive">{errors.fecha_inicio}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fecha_fin">Hasta (opcional)</Label>
            <Input
              id="fecha_fin"
              type="date"
              name="fecha_fin"
              value={formData.fecha_fin}
              onChange={handleChange}
              aria-invalid={!!errors.fecha_fin}
            />
            {errors.fecha_fin && <p className="text-sm text-destructive">{errors.fecha_fin}</p>}
          </div>
        </div>

        {/* Notas */}
        <div className="space-y-1.5">
          <Label htmlFor="notas">Notas (opcional)</Label>
          <Textarea
            id="notas"
            name="notas"
            value={formData.notas}
            onChange={handleChange}
            placeholder="Observaciones..."
            rows={3}
          />
        </div>

        {/* Activa */}
        <div className="flex items-center justify-between rounded-lg border border-foreground/10 px-3 py-2.5">
          <div>
            <Label htmlFor="activo">Activa</Label>
            <p className="text-xs text-muted-foreground">
              Mientras esté activa, el cron genera sus ocurrencias automáticamente.
            </p>
          </div>
          <Switch
            id="activo"
            checked={formData.activo}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, activo: checked }))}
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
            {isEdit ? 'Guardar cambios' : 'Crear recurrencia'}
          </Button>
        </div>
      </div>
    </form>
  )
}

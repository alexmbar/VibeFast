'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { crearGasto, actualizarGasto } from '@/lib/gastos/client'
import { listarBancos } from '@/lib/bancos/client'
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

// Únicos tipo_pago que mapean 1:1 a un tipo de banco del catálogo. Para
// los demás (transferencia, domiciliado, vales, otro) se muestra el
// catálogo completo sin filtrar, igual criterio que la migración 014.
const TIPOS_PAGO_BANCO = ['debito', 'credito']
const SIN_BANCO = '__sin_banco__'

export default function GastoForm({ initialData = null, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [bancos, setBancos] = useState([])
  const [loadingBancos, setLoadingBancos] = useState(false)
  const [formData, setFormData] = useState({
    monto: initialData ? centavosToPesos(initialData.monto) : '',
    fecha: initialData ? formatDate(initialData.fecha) : '',
    hora: initialData ? extractHora(initialData.created_at) : horaActual(),
    categoria: initialData?.categoria || '',
    tipo_pago: initialData?.tipo_pago || '',
    tienda: initialData?.tienda || '',
    banco_id: initialData?.banco_id ? String(initialData.banco_id) : '',
    notas: initialData?.notas || '',
  })

  const isEdit = !!initialData
  const esEfectivo = formData.tipo_pago === 'efectivo'

  // El efectivo no tiene banco asociado: si el usuario cambia a "efectivo"
  // con un banco ya capturado, se limpia para no permitir la combinación.
  useEffect(() => {
    if (esEfectivo && formData.banco_id) {
      setFormData(prev => ({ ...prev, banco_id: '' }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esEfectivo])

  // Carga el catálogo de bancos del usuario, filtrado por tipo cuando el
  // tipo_pago mapea 1:1 a un tipo de banco (débito/crédito).
  useEffect(() => {
    if (esEfectivo) {
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
  }, [formData.tipo_pago, esEfectivo])

  // Si el banco seleccionado ya no está entre las opciones cargadas (ej.
  // cambió el tipo_pago de débito a crédito), se limpia la selección.
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
      const createdAtDate = new Date(`${formData.fecha}T${formData.hora}:00Z`)

      const data = {
        monto: pesosTocentavos(formData.monto),
        fecha: formData.fecha,
        created_at: createdAtDate.toISOString(),
        categoria: formData.categoria,
        tipo_pago: formData.tipo_pago,
        tienda: formData.tienda || null,
        banco_id: esEfectivo ? null : formData.banco_id || null,
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

        {/* Tipo de pago */}
        <div className="space-y-1.5">
          <Label htmlFor="tipo_pago">Tipo de pago</Label>
          <Select
            value={formData.tipo_pago}
            onValueChange={(value) => handleSelectChange('tipo_pago', value)}
            items={selectItems(TIPOS_PAGO, TIPO_PAGO_LABELS)}
          >
            <SelectTrigger id="tipo_pago" className="w-full" aria-invalid={!!errors.tipo_pago}>
              <SelectValue placeholder="Selecciona tipo de pago" />
            </SelectTrigger>
            <SelectContent>
              {ordenarPorLabel(TIPOS_PAGO, TIPO_PAGO_LABELS).map(tipo => (
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
          <Label htmlFor="banco_id">Banco</Label>
          <Select
            value={formData.banco_id || SIN_BANCO}
            onValueChange={(value) => handleSelectChange('banco_id', value === SIN_BANCO ? '' : value)}
            disabled={esEfectivo || loadingBancos}
            items={{ [SIN_BANCO]: 'Ninguno', ...Object.fromEntries(bancos.map(banco => [String(banco.id), banco.nombre])) }}
          >
            <SelectTrigger id="banco_id" className="w-full" aria-invalid={!!errors.banco_id}>
              <SelectValue placeholder="Selecciona un banco" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SIN_BANCO}>Ninguno</SelectItem>
              {[...bancos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map(banco => (
                <SelectItem key={banco.id} value={String(banco.id)}>
                  {banco.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {esEfectivo && (
            <p className="text-xs text-muted-foreground">Efectivo no tiene banco asociado.</p>
          )}
          {!esEfectivo && !loadingBancos && bancos.length === 0 && (
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
            {isEdit ? 'Guardar cambios' : 'Crear gasto'}
          </Button>
        </div>
      </div>
    </form>
  )
}

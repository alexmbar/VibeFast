'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { crearPresupuesto, actualizarPresupuesto } from '@/lib/presupuestos/client'
import { listarBancos } from '@/lib/bancos/client'
import { CATEGORIAS, CATEGORIA_LABELS, pesosTocentavos, centavosToPesos } from '@/lib/gastos/schema'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { MoneyInput } from '@/components/ui/money-input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ordenarPorLabel, selectItems } from '@/lib/utils'

const MES_CALENDARIO = '__mes_calendario__'

export default function PresupuestoForm({ initialData = null, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [bancos, setBancos] = useState([])
  const [loadingBancos, setLoadingBancos] = useState(true)
  const [formData, setFormData] = useState({
    categoria: initialData?.categoria || '',
    monto_limite: initialData ? centavosToPesos(initialData.monto_limite) : '',
    banco_id: initialData?.banco_id ? String(initialData.banco_id) : '',
  })

  const isEdit = !!initialData

  // Solo tarjetas de crédito con día de corte configurado pueden definir
  // un ciclo -- mismo requisito que valida la API y el trigger en BD.
  useEffect(() => {
    let cancelled = false
    setLoadingBancos(true)
    listarBancos({ tipo: 'credito', activo: true })
      .then(data => {
        if (!cancelled) setBancos(data.filter(b => b.dia_corte))
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
        categoria: formData.categoria,
        monto_limite: pesosTocentavos(formData.monto_limite),
        banco_id: formData.banco_id || null,
      }

      if (isEdit) {
        await actualizarPresupuesto(initialData.id, data)
      } else {
        await crearPresupuesto(data)
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
        {/* Categoría: no editable -- cambiarla en un presupuesto existente
            equivaldría a moverlo a otra categoría, así que se pausa uno y
            se crea otro en vez de permitir el cambio. */}
        <div className="space-y-1.5">
          <Label htmlFor="categoria">Categoría</Label>
          <Select
            value={formData.categoria}
            onValueChange={(value) => handleSelectChange('categoria', value)}
            disabled={isEdit}
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
          {isEdit && (
            <p className="text-xs text-muted-foreground">
              La categoría no se puede cambiar una vez creado el presupuesto.
            </p>
          )}
          {errors.categoria && <p className="text-sm text-destructive">{errors.categoria}</p>}
        </div>

        {/* Límite */}
        <div className="space-y-1.5">
          <Label htmlFor="monto_limite">Límite del periodo</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <MoneyInput
              id="monto_limite"
              name="monto_limite"
              value={formData.monto_limite}
              onChange={handleChange}
              placeholder="0.00"
              required
              aria-invalid={!!errors.monto_limite}
              className="pl-6"
            />
          </div>
          {errors.monto_limite && <p className="text-sm text-destructive">{errors.monto_limite}</p>}
        </div>

        {/* Periodo: mes calendario o ciclo de corte de una tarjeta */}
        <div className="space-y-1.5">
          <Label htmlFor="banco_id">Periodo</Label>
          <Select
            value={formData.banco_id || MES_CALENDARIO}
            onValueChange={(value) => handleSelectChange('banco_id', value === MES_CALENDARIO ? '' : value)}
            disabled={loadingBancos}
            items={{
              [MES_CALENDARIO]: 'Mes calendario',
              ...Object.fromEntries(bancos.map(b => [String(b.id), b.alias || b.nombre])),
            }}
          >
            <SelectTrigger id="banco_id" className="w-full" aria-invalid={!!errors.banco_id}>
              <SelectValue placeholder="Selecciona un periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={MES_CALENDARIO}>Mes calendario</SelectItem>
              {[...bancos]
                .sort((a, b) => (a.alias || a.nombre).localeCompare(b.alias || b.nombre, 'es'))
                .map(banco => (
                  <SelectItem key={banco.id} value={String(banco.id)}>
                    Ciclo de {banco.alias || banco.nombre}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {!loadingBancos && bancos.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No tienes tarjetas de crédito con día de corte configurado.{' '}
              <Link href="/bancos" className="underline hover:text-foreground">
                Configúralo en Bancos
              </Link>{' '}
              para medir este presupuesto por ciclo de corte, o deja &quot;Mes calendario&quot;.
            </p>
          )}
          {errors.banco_id && <p className="text-sm text-destructive">{errors.banco_id}</p>}
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
            {isEdit ? 'Guardar cambios' : 'Crear presupuesto'}
          </Button>
        </div>
      </div>
    </form>
  )
}

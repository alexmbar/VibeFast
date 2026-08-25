'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ordenarPorLabel, selectItems } from '@/lib/utils'
import {
  ZONAS_HORARIAS,
  MONEDAS,
  FORMATOS_FECHA,
  ZONA_HORARIA_LABELS,
  MONEDA_LABELS,
  FORMATO_FECHA_LABELS,
  ZONA_HORARIA_DEFAULT,
  MONEDA_DEFAULT,
  FORMATO_FECHA_DEFAULT,
} from '@/lib/config/schema'

export default function ConfiguracionesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [zonaHoraria, setZonaHoraria] = useState(ZONA_HORARIA_DEFAULT)
  const [moneda, setMoneda] = useState(MONEDA_DEFAULT)
  const [formatoFecha, setFormatoFecha] = useState(FORMATO_FECHA_DEFAULT)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadConfig()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadConfig() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('zona_horaria, moneda, formato_fecha')
        .eq('id', user.id)
        .single()

      if (error) throw error
      setZonaHoraria(data.zona_horaria || ZONA_HORARIA_DEFAULT)
      setMoneda(data.moneda || MONEDA_DEFAULT)
      setFormatoFecha(data.formato_fecha || FORMATO_FECHA_DEFAULT)
    } catch (err) {
      console.error('Error loading configuraciones:', err)
      setError(err.message ? `Error al cargar configuraciones: ${err.message}` : 'Error al cargar configuraciones')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { error } = await supabase
        .from('profiles')
        .update({ zona_horaria: zonaHoraria, moneda, formato_fecha: formatoFecha })
        .eq('id', user.id)

      if (error) throw error

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      router.refresh()
    } catch (err) {
      console.error('Error saving configuraciones:', err)
      setError(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Configuraciones</h1>

      <Card>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="zona_horaria">Zona horaria</Label>
            <Select
              value={zonaHoraria}
              onValueChange={setZonaHoraria}
              items={selectItems(ZONAS_HORARIAS, ZONA_HORARIA_LABELS)}
            >
              <SelectTrigger id="zona_horaria" className="w-full">
                <SelectValue placeholder="Selecciona una zona horaria" />
              </SelectTrigger>
              <SelectContent>
                {ordenarPorLabel(ZONAS_HORARIAS, ZONA_HORARIA_LABELS).map(zona => (
                  <SelectItem key={zona} value={zona}>
                    {ZONA_HORARIA_LABELS[zona]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Se usa para calcular la fecha de los gastos capturados por WhatsApp.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="moneda">Moneda</Label>
            <Select
              value={moneda}
              onValueChange={setMoneda}
              items={selectItems(MONEDAS, MONEDA_LABELS)}
            >
              <SelectTrigger id="moneda" className="w-full">
                <SelectValue placeholder="Selecciona una moneda" />
              </SelectTrigger>
              <SelectContent>
                {ordenarPorLabel(MONEDAS, MONEDA_LABELS).map(m => (
                  <SelectItem key={m} value={m}>
                    {MONEDA_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="formato_fecha">Formato de fecha</Label>
            <Select
              value={formatoFecha}
              onValueChange={setFormatoFecha}
              items={selectItems(FORMATOS_FECHA, FORMATO_FECHA_LABELS)}
            >
              <SelectTrigger id="formato_fecha" className="w-full">
                <SelectValue placeholder="Selecciona un formato" />
              </SelectTrigger>
              <SelectContent>
                {ordenarPorLabel(FORMATOS_FECHA, FORMATO_FECHA_LABELS).map(f => (
                  <SelectItem key={f} value={f}>
                    {FORMATO_FECHA_LABELS[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {success && (
            <Alert>
              <AlertDescription>Guardado correctamente</AlertDescription>
            </Alert>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving && <Loader2 className="animate-spin" />}
            Guardar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

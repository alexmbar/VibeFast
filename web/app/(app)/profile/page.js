'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function ProfilePage() {
  const supabase = createClient()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [phone, setPhone] = useState('')
  const [mostrarPensamientoAgente, setMostrarPensamientoAgente] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      setProfile(data)
      setPhone(data.phone || '')
      setMostrarPensamientoAgente(!!data.mostrar_pensamiento_agente)
    } catch (err) {
      console.error('Error loading profile:', err)
      setError(err.message ? `Error al cargar perfil: ${err.message}` : 'Error al cargar perfil')
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
        .update({ phone, mostrar_pensamiento_agente: mostrarPensamientoAgente })
        .eq('id', user.id)

      if (error) throw error

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving profile:', err)
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
      <h1 className="text-2xl font-bold tracking-tight mb-6">Mi Perfil</h1>

      <Card>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {profile && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={profile.email || ''} disabled />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="full_name">Nombre</Label>
                <Input id="full_name" type="text" value={profile.full_name || ''} disabled />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Teléfono WhatsApp</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+5216145138306"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Formato: +52 código de país + número</p>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <div>
                  <Label htmlFor="mostrar-pensamiento">Mostrar razonamiento del agente de gastos</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    En /agente, muestra qué consultas hace el agente antes de responder. Desactivado por default.
                  </p>
                </div>
                <Switch
                  id="mostrar-pensamiento"
                  checked={mostrarPensamientoAgente}
                  onCheckedChange={setMostrarPensamientoAgente}
                />
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

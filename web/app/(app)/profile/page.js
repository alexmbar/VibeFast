'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Mi Perfil</h1>

      <div className="card bg-base-100 shadow-md p-6 space-y-4">
        {error && (
          <div className="alert alert-error text-sm">
            <span>{error}</span>
          </div>
        )}

        {profile && (
          <>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                value={profile.email || ''}
                disabled
                className="input input-bordered"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Nombre</span>
              </label>
              <input
                type="text"
                value={profile.full_name || ''}
                disabled
                className="input input-bordered"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Teléfono WhatsApp</span>
              </label>
              <input
                type="tel"
                placeholder="+5216145138306"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input input-bordered"
              />
              <label className="label">
                <span className="label-text-alt text-xs">Formato: +52 código de país + número</span>
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  checked={mostrarPensamientoAgente}
                  onChange={(e) => setMostrarPensamientoAgente(e.target.checked)}
                  className="toggle toggle-primary"
                />
                <span className="label-text">Mostrar razonamiento del agente de gastos</span>
              </label>
              <label className="label">
                <span className="label-text-alt text-xs">
                  En /agente, muestra qué consultas hace el agente antes de responder. Desactivado por default.
                </span>
              </label>
            </div>

            {success && (
              <div className="alert alert-success text-sm">
                <span>Guardado correctamente</span>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary w-full"
            >
              {saving ? <span className="loading loading-spinner loading-sm" /> : 'Guardar'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { obtenerRecurrencia } from '@/lib/recurrencias/client'
import RecurrenciaForm from '@/components/recurrencias/RecurrenciaForm'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function EditRecurrenciaPage() {
  const router = useRouter()
  const params = useParams()
  const [recurrencia, setRecurrencia] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadRecurrencia() {
      try {
        const data = await obtenerRecurrencia(params.id)
        setRecurrencia(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadRecurrencia()
  }, [params.id])

  function handleSuccess() {
    router.push('/recurrencias')
  }

  function handleCancel() {
    router.back()
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!recurrencia) {
    return (
      <Alert>
        <AlertDescription>Recurrencia no encontrada</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Editar recurrencia</h1>
      <div className="max-w-2xl">
        <RecurrenciaForm initialData={recurrencia} onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  )
}

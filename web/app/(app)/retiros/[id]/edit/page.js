'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { obtenerRetiro } from '@/lib/retiros/client'
import RetiroForm from '@/components/retiros/RetiroForm'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function EditRetiroPage() {
  const router = useRouter()
  const params = useParams()
  const [retiro, setRetiro] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadRetiro() {
      try {
        const data = await obtenerRetiro(params.id)
        setRetiro(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadRetiro()
  }, [params.id])

  function handleSuccess() {
    router.push('/retiros')
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

  if (!retiro) {
    return (
      <Alert>
        <AlertDescription>Retiro no encontrado</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Editar retiro</h1>
      <div className="max-w-2xl">
        <RetiroForm initialData={retiro} onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  )
}

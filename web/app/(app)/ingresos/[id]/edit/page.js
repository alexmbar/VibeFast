'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { obtenerIngreso } from '@/lib/ingresos/client'
import IngresoForm from '@/components/ingresos/IngresoForm'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function EditIngresoPage() {
  const router = useRouter()
  const params = useParams()
  const [ingreso, setIngreso] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadIngreso() {
      try {
        const data = await obtenerIngreso(params.id)
        setIngreso(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadIngreso()
  }, [params.id])

  function handleSuccess() {
    router.push('/ingresos')
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

  if (!ingreso) {
    return (
      <Alert>
        <AlertDescription>Ingreso no encontrado</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Editar ingreso</h1>
      <div className="max-w-2xl">
        <IngresoForm initialData={ingreso} onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { obtenerPresupuesto } from '@/lib/presupuestos/client'
import PresupuestoForm from '@/components/presupuestos/PresupuestoForm'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function EditPresupuestoPage() {
  const router = useRouter()
  const params = useParams()
  const [presupuesto, setPresupuesto] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadPresupuesto() {
      try {
        const data = await obtenerPresupuesto(params.id)
        setPresupuesto(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadPresupuesto()
  }, [params.id])

  function handleSuccess() {
    router.push('/presupuestos')
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

  if (!presupuesto) {
    return (
      <Alert>
        <AlertDescription>Presupuesto no encontrado</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Editar presupuesto</h1>
      <div className="max-w-2xl">
        <PresupuestoForm initialData={presupuesto} onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  )
}

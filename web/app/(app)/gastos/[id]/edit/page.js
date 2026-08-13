'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { obtenerGasto } from '@/lib/gastos/client'
import GastoForm from '@/components/gastos/GastoForm'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function EditGastoPage() {
  const router = useRouter()
  const params = useParams()
  const [gasto, setGasto] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadGasto() {
      try {
        const data = await obtenerGasto(params.id)
        setGasto(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadGasto()
  }, [params.id])

  function handleSuccess() {
    router.push('/gastos')
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

  if (!gasto) {
    return (
      <Alert>
        <AlertDescription>Gasto no encontrado</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Editar gasto</h1>
      <div className="max-w-2xl">
        <GastoForm initialData={gasto} onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  )
}

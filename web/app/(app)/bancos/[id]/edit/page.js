'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { obtenerBanco } from '@/lib/bancos/client'
import BancoForm from '@/components/bancos/BancoForm'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function EditBancoPage() {
  const router = useRouter()
  const params = useParams()
  const [banco, setBanco] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadBanco() {
      try {
        const data = await obtenerBanco(params.id)
        setBanco(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadBanco()
  }, [params.id])

  function handleSuccess() {
    router.push('/bancos')
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

  if (!banco) {
    return (
      <Alert>
        <AlertDescription>Banco no encontrado</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Editar banco</h1>
      <div className="max-w-2xl">
        <BancoForm initialData={banco} onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  )
}

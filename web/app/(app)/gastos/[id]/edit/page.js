'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { obtenerGasto } from '@/lib/gastos/client'
import GastoForm from '@/components/gastos/GastoForm'

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
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>{error}</span>
      </div>
    )
  }

  if (!gasto) {
    return (
      <div className="alert alert-warning">
        <span>Gasto no encontrado</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Editar gasto</h1>
      <div className="max-w-2xl">
        <GastoForm initialData={gasto} onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  )
}

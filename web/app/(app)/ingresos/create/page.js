'use client'

import { useRouter } from 'next/navigation'
import IngresoForm from '@/components/ingresos/IngresoForm'

export default function CreateIngresoPage() {
  const router = useRouter()

  function handleSuccess() {
    router.push('/ingresos')
  }

  function handleCancel() {
    router.back()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Nuevo ingreso</h1>
      <div className="max-w-2xl">
        <IngresoForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  )
}

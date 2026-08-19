'use client'

import { useRouter } from 'next/navigation'
import RecurrenciaForm from '@/components/recurrencias/RecurrenciaForm'

export default function CreateRecurrenciaPage() {
  const router = useRouter()

  function handleSuccess() {
    router.push('/recurrencias')
  }

  function handleCancel() {
    router.back()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Nueva recurrencia</h1>
      <div className="max-w-2xl">
        <RecurrenciaForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import RetiroForm from '@/components/retiros/RetiroForm'

export default function CreateRetiroPage() {
  const router = useRouter()

  function handleSuccess() {
    router.push('/retiros')
  }

  function handleCancel() {
    router.back()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Nuevo retiro</h1>
      <div className="max-w-2xl">
        <RetiroForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  )
}

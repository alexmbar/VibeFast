'use client'

import { useRouter } from 'next/navigation'
import GastoForm from '@/components/gastos/GastoForm'

export default function CreateGastoPage() {
  const router = useRouter()

  function handleSuccess() {
    router.push('/transacciones')
  }

  function handleCancel() {
    router.back()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Nuevo gasto</h1>
      <div className="max-w-2xl">
        <GastoForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  )
}

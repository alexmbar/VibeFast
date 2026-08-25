'use client'

import { useRouter } from 'next/navigation'
import PresupuestoForm from '@/components/presupuestos/PresupuestoForm'

export default function CreatePresupuestoPage() {
  const router = useRouter()

  function handleSuccess() {
    router.push('/presupuestos')
  }

  function handleCancel() {
    router.back()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Nuevo presupuesto</h1>
      <div className="max-w-2xl">
        <PresupuestoForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  )
}

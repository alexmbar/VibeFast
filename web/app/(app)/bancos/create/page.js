'use client'

import { useRouter } from 'next/navigation'
import BancoForm from '@/components/bancos/BancoForm'

export default function CreateBancoPage() {
  const router = useRouter()

  function handleSuccess() {
    router.push('/bancos')
  }

  function handleCancel() {
    router.back()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Nuevo banco</h1>
      <div className="max-w-2xl">
        <BancoForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  )
}

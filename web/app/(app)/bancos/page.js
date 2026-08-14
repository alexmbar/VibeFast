'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { listarBancos } from '@/lib/bancos/client'
import BancoTable from '@/components/bancos/BancoTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function BancosPage() {
  const [bancos, setBancos] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  async function loadBancos() {
    setIsLoading(true)
    try {
      const data = await listarBancos()
      setBancos(data)
    } catch (error) {
      console.error('Error loading bancos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadBancos()
  }, [])

  function handleToggleActivo(actualizado) {
    setBancos(prev => prev.map(b => (b.id === actualizado.id ? actualizado : b)))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Mis bancos</h1>
        <Button render={<Link href="/bancos/create" />}>
          <Plus />
          Nuevo banco
        </Button>
      </div>

      <Card>
        <CardContent>
          <BancoTable bancos={bancos} onToggleActivo={handleToggleActivo} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  )
}

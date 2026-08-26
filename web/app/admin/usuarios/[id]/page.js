'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Ban, CheckCircle2 } from 'lucide-react'
import { obtenerUsuario, actualizarEstadoCuenta } from '@/lib/admin/client'
import { formatMonto } from '@/lib/gastos/schema'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

function formatFechaHora(fecha) {
  if (!fecha) return '-'
  return new Date(fecha).toLocaleString('es-MX')
}

export default function AdminUsuarioDetallePage() {
  const { id } = useParams()
  const toast = useToast()
  const [datos, setDatos] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  async function cargar() {
    setIsLoading(true)
    try {
      const data = await obtenerUsuario(id)
      setDatos(data)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleToggleEstado() {
    const nuevoEstado = datos.perfil.estado_cuenta === 'suspendida' ? 'activa' : 'suspendida'
    setActualizando(true)
    try {
      await actualizarEstadoCuenta(id, nuevoEstado)
      setDatos((prev) => ({ ...prev, perfil: { ...prev.perfil, estado_cuenta: nuevoEstado } }))
      toast.success(nuevoEstado === 'suspendida' ? 'Cuenta suspendida' : 'Cuenta reactivada')
      setConfirmando(false)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setActualizando(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!datos) return null

  const { perfil, actividad, auditLog } = datos
  const suspendida = perfil.estado_cuenta === 'suspendida'

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/usuarios"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver a usuarios
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{perfil.email}</h1>
          <p className="text-sm text-muted-foreground">{perfil.full_name || 'Sin nombre'}</p>
        </div>
        <Button
          variant={suspendida ? 'default' : 'destructive'}
          onClick={() => setConfirmando(true)}
          disabled={actualizando}
        >
          {suspendida ? <CheckCircle2 /> : <Ban />}
          {suspendida ? 'Reactivar cuenta' : 'Suspender cuenta'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estado</span>
              {suspendida ? (
                <Badge variant="destructive">Suspendida</Badge>
              ) : (
                <Badge variant="outline">Activa</Badge>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rol</span>
              <span>{perfil.role === 'admin' ? <Badge variant="secondary">admin</Badge> : 'usuario'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span>{perfil.plan || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Teléfono</span>
              <span>{perfil.phone || 'No configurado'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">WhatsApp confirmado</span>
              <span>{formatFechaHora(perfil.whatsapp_confirmado_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Onboarding</span>
              <span>{perfil.onboarding_step || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Alta</span>
              <span>{formatFechaHora(perfil.created_at)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actividad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gastos capturados</span>
              <span className="font-mono tabular-nums">{actividad.gastosCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ingresos capturados</span>
              <span className="font-mono tabular-nums">{actividad.ingresosCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Costo OpenAI acumulado</span>
              <span className="font-mono tabular-nums">
                {formatMonto(actividad.costoOpenaiCentavos, 'USD')}
              </span>
            </div>
            <p className="pt-2 text-xs text-muted-foreground">
              Nunca se muestran montos, categorías, tiendas ni bancos de este usuario.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Auditoría</CardTitle>
        </CardHeader>
        <CardContent>
          {auditLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin acciones registradas</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLog.map((entrada) => (
                  <TableRow key={entrada.id}>
                    <TableCell className="text-sm">{formatFechaHora(entrada.created_at)}</TableCell>
                    <TableCell className="text-sm">{entrada.accion}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entrada.detalle ? JSON.stringify(entrada.detalle) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmando}
        onOpenChange={setConfirmando}
        title={suspendida ? '¿Reactivar esta cuenta?' : '¿Suspender esta cuenta?'}
        description={
          suspendida
            ? `${perfil.email} podrá volver a usar la app normalmente.`
            : `${perfil.email} no podrá usar la app hasta que se reactive.`
        }
        confirmLabel={suspendida ? 'Reactivar' : 'Suspender'}
        variant={suspendida ? 'default' : 'destructive'}
        onConfirm={handleToggleEstado}
        loading={actualizando}
      />
    </div>
  )
}

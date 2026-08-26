'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, ChevronLeft, ChevronRight, Ban, CheckCircle2 } from 'lucide-react'
import { listarUsuarios, actualizarEstadoCuenta } from '@/lib/admin/client'
import { Card, CardContent } from '@/components/ui/card'
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

const LIMIT = 20

const COLUMNAS = [
  { key: 'email', label: 'Email' },
  { key: 'full_name', label: 'Nombre' },
  { key: 'plan', label: 'Plan' },
  { key: 'role', label: 'Rol' },
  { key: 'estado_cuenta', label: 'Estado' },
  { key: 'onboarding_step', label: 'Onboarding' },
  { key: 'created_at', label: 'Alta' },
]

function formatFecha(fecha) {
  if (!fecha) return '-'
  return new Date(fecha).toLocaleDateString('es-MX')
}

export default function AdminUsuariosPage() {
  const toast = useToast()
  const [usuarios, setUsuarios] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [isLoading, setIsLoading] = useState(true)
  const [suspendiendoId, setSuspendiendoId] = useState(null)
  const [confirmUsuario, setConfirmUsuario] = useState(null)

  async function cargar() {
    setIsLoading(true)
    try {
      const { usuarios: data, total: totalCount } = await listarUsuarios({
        orderBy: sortBy,
        orderDir: sortDir,
        limit: LIMIT,
        offset,
      })
      setUsuarios(data)
      setTotal(totalCount)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortDir, offset])

  function handleSort(columna) {
    if (columna === sortBy) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(columna)
      setSortDir('asc')
    }
    setOffset(0)
  }

  async function handleToggleEstado() {
    const usuario = confirmUsuario
    const nuevoEstado = usuario.estado_cuenta === 'suspendida' ? 'activa' : 'suspendida'
    setSuspendiendoId(usuario.id)
    try {
      await actualizarEstadoCuenta(usuario.id, nuevoEstado)
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuario.id ? { ...u, estado_cuenta: nuevoEstado } : u))
      )
      toast.success(
        nuevoEstado === 'suspendida' ? 'Cuenta suspendida' : 'Cuenta reactivada'
      )
      setConfirmUsuario(null)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSuspendiendoId(null)
    }
  }

  const desde = total === 0 ? 0 : offset + 1
  const hasta = Math.min(offset + LIMIT, total)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>

      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : usuarios.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">No hay usuarios registrados</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    {COLUMNAS.map(({ key, label }) => (
                      <TableHead key={key}>
                        <button
                          type="button"
                          onClick={() => handleSort(key)}
                          className="inline-flex items-center gap-1 hover:text-primary"
                        >
                          {label}
                          <span className="text-xs">
                            {sortBy === key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                          </span>
                        </button>
                      </TableHead>
                    ))}
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell className="text-sm">
                        <Link href={`/admin/usuarios/${usuario.id}`} className="hover:underline">
                          {usuario.email}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{usuario.full_name || '-'}</TableCell>
                      <TableCell className="text-sm">{usuario.plan || '-'}</TableCell>
                      <TableCell className="text-sm">
                        {usuario.role === 'admin' ? (
                          <Badge variant="secondary">admin</Badge>
                        ) : (
                          'usuario'
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {usuario.estado_cuenta === 'suspendida' ? (
                          <Badge variant="destructive">Suspendida</Badge>
                        ) : (
                          <Badge variant="outline">Activa</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{usuario.onboarding_step || '-'}</TableCell>
                      <TableCell className="text-sm">{formatFecha(usuario.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setConfirmUsuario(usuario)}
                            disabled={suspendiendoId === usuario.id}
                            title={usuario.estado_cuenta === 'suspendida' ? 'Reactivar cuenta' : 'Suspender cuenta'}
                            aria-busy={suspendiendoId === usuario.id}
                            className={usuario.estado_cuenta === 'suspendida' ? '' : 'text-destructive hover:text-destructive'}
                          >
                            {suspendiendoId === usuario.id ? (
                              <Loader2 className="animate-spin" />
                            ) : usuario.estado_cuenta === 'suspendida' ? (
                              <CheckCircle2 />
                            ) : (
                              <Ban />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {desde}-{hasta} de {total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOffset((prev) => Math.max(0, prev - LIMIT))}
                    disabled={offset === 0}
                  >
                    <ChevronLeft />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOffset((prev) => prev + LIMIT)}
                    disabled={offset + LIMIT >= total}
                  >
                    Siguiente
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!confirmUsuario}
        onOpenChange={(open) => !open && setConfirmUsuario(null)}
        title={
          confirmUsuario?.estado_cuenta === 'suspendida'
            ? '¿Reactivar esta cuenta?'
            : '¿Suspender esta cuenta?'
        }
        description={
          confirmUsuario?.estado_cuenta === 'suspendida'
            ? `${confirmUsuario?.email} podrá volver a usar la app normalmente.`
            : `${confirmUsuario?.email} no podrá usar la app hasta que se reactive.`
        }
        confirmLabel={confirmUsuario?.estado_cuenta === 'suspendida' ? 'Reactivar' : 'Suspender'}
        variant={confirmUsuario?.estado_cuenta === 'suspendida' ? 'default' : 'destructive'}
        onConfirm={handleToggleEstado}
        loading={suspendiendoId === confirmUsuario?.id}
      />
    </div>
  )
}

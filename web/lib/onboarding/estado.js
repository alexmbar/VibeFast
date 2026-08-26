// Estado de los 3 pasos opcionales de onboarding (carga inicial de
// efectivo, bancos, recurrencias) -- ya no son pantallas de wizard,
// se infieren de datos reales para el banner del dashboard.

import { listarBancos } from '@/lib/bancos/client'
import { listarRecurrencias } from '@/lib/recurrencias/client'
import { listarRetiros } from '@/lib/retiros/client'

export async function obtenerEstadoOnboarding() {
  const [bancos, recurrencias, retirosRes] = await Promise.all([
    listarBancos({ activo: true }),
    listarRecurrencias(),
    listarRetiros({ limit: 100 }),
  ])

  return {
    cargaInicial: retirosRes.retiros.some((r) => r.es_carga_inicial),
    bancos: bancos.length > 0,
    recurrencias: recurrencias.length > 0,
  }
}

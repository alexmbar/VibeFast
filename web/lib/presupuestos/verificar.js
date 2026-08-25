// Verificacion de presupuestos: se llama despues de cada insert/update de
// gasto que pueda cruzar un umbral (ver CLAUDE.md, seccion
// "Presupuestos", puntos de enganche). Best-effort, nunca lanza -- un
// fallo aqui no debe tumbar la captura del gasto que lo disparo.
//
// La alerta dentro de la app no depende de esta funcion: AlertasPresupuestos
// lee /api/presupuestos/estado en vivo y calcula el bucket (ok/acercandose/
// excedido) cada vez, sin marca de idempotencia. ultimo_alerta_pct /
// ultimo_alerta_periodo_inicio solo existen para no reenviar el mismo
// aviso de WhatsApp mas de una vez por periodo (mismo patron que
// bancos.ultimo_recordatorio_pago).

import { enviarPlantillaWhatsApp } from '@/lib/whatsapp/kapso'
import { registrarIntegracion } from '@/lib/admin/db'
import { CATEGORIA_LABELS } from '@/lib/gastos/schema'
import { PCT_ACERCANDOSE, PCT_EXCEDIDO, calcularPct } from './schema'

const TEMPLATE_NAME = 'presupuesto_alerta'

export async function verificarPresupuesto(supabase, userId, categoria) {
  try {
    const { data: presupuesto } = await supabase
      .from('presupuestos')
      .select('id, monto_limite, ultimo_alerta_pct, ultimo_alerta_periodo_inicio')
      .eq('user_id', userId)
      .eq('categoria', categoria)
      .eq('activo', true)
      .maybeSingle()

    if (!presupuesto) return

    const { data: estados, error } = await supabase.rpc('presupuestos_estado', { p_user_id: userId })
    if (error) throw error

    const estado = (estados || []).find(e => e.presupuesto_id === presupuesto.id)
    if (!estado) return

    const pct = calcularPct(estado.total_gastado, presupuesto.monto_limite)

    // Si el periodo vigente cambio respecto al guardado, el umbral ya
    // avisado no aplica -- se puede volver a avisar desde cero.
    const alertaVigente = presupuesto.ultimo_alerta_periodo_inicio === estado.periodo_inicio
      ? presupuesto.ultimo_alerta_pct
      : null

    let umbralNuevo = null
    if (pct >= PCT_EXCEDIDO && alertaVigente !== PCT_EXCEDIDO) {
      umbralNuevo = PCT_EXCEDIDO
    } else if (pct >= PCT_ACERCANDOSE && alertaVigente === null) {
      umbralNuevo = PCT_ACERCANDOSE
    }

    if (!umbralNuevo) return

    const { data: perfil } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', userId)
      .maybeSingle()

    if (!perfil?.phone) return

    await enviarPlantillaWhatsApp(perfil.phone, TEMPLATE_NAME, {
      categoria: CATEGORIA_LABELS[categoria] || categoria,
      porcentaje: String(pct),
      monto_limite: (presupuesto.monto_limite / 100).toFixed(2),
      total_gastado: (estado.total_gastado / 100).toFixed(2),
    })

    await supabase
      .from('presupuestos')
      .update({ ultimo_alerta_pct: umbralNuevo, ultimo_alerta_periodo_inicio: estado.periodo_inicio })
      .eq('id', presupuesto.id)
  } catch (error) {
    console.error('Error en verificarPresupuesto:', error)
    await registrarIntegracion(supabase, {
      tipo: 'presupuesto_verificacion',
      nivel: 'error',
      userId,
      detalle: { categoria, mensaje: error.message },
    })
  }
}

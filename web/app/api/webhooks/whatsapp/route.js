import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { crearGastoDesdeWhatsApp } from '@/lib/gastos/whatsapp'
import { crearRetiroDesdeWhatsApp } from '@/lib/retiros/whatsapp'
import { verificarFirmaKapso, enviarMensajeWhatsApp } from '@/lib/whatsapp/kapso'

const formatoMoneda = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

export async function POST(request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-webhook-signature')

    if (!verificarFirmaKapso(rawBody, signature)) {
      return NextResponse.json({ success: false, error: 'Firma invalida' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)
    const eventType = request.headers.get('x-webhook-event')
    if (eventType && eventType !== 'whatsapp.message.received') {
      return NextResponse.json({ success: true, skipped: true })
    }

    const message = payload.message
    if (!message || !message.from) {
      return NextResponse.json({ success: true, skipped: true })
    }

    const userPhone = `+${message.from}`
    const body = message.text?.body || message.image?.caption || message.document?.caption || ''
    const mediaUrl = message.kapso?.media_data?.url
    const mediaContentType = message.kapso?.media_data?.content_type

    // Obtener usuario por teléfono (usar Service Role Key para saltear RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const { data: user } = await supabase
      .from('profiles')
      .select('id, full_name, whatsapp_confirmado_at')
      .eq('phone', userPhone)
      .single()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' })
    }

    if (!user.whatsapp_confirmado_at) {
      await confirmarPrimerMensaje(supabase, user, userPhone)
    }

    // Un mensaje que empieza con "retiro" se captura como retiro de
    // efectivo, no como gasto; el resto del flujo no cambia.
    const esRetiro = /^\s*retiro\b/i.test(body)

    const resultado = esRetiro
      ? await crearRetiroDesdeWhatsApp(supabase, user.id, body)
      : await crearGastoDesdeWhatsApp(supabase, user.id, body, mediaUrl, mediaContentType)

    await responderWhatsApp(userPhone, esRetiro, resultado)

    if (!resultado.success) {
      return NextResponse.json({ success: false })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en webhook WhatsApp:', error)
    return NextResponse.json(
      { message: 'Error interno' },
      { status: 500 }
    )
  }
}

// Saludo de bienvenida, una sola vez, en el primer mensaje que manda
// el usuario después de vincular su teléfono en /profile. No se puede
// mandar en el momento del guardado del teléfono (acción del sitio,
// sin sesión de WhatsApp abierta) — Meta solo permite que el negocio
// escriba primero dentro de una sesión de servicio o vía plantilla
// aprobada, así que se aprovecha este primer mensaje entrante. No
// bloquea el procesamiento normal del mensaje si falla.
async function confirmarPrimerMensaje(supabase, user, userPhone) {
  try {
    const nombre = user.full_name ? `, ${user.full_name.split(' ')[0]}` : ''
    await enviarMensajeWhatsApp(
      userPhone,
      `¡Hola${nombre}! Tu WhatsApp quedó vinculado. A partir de ahora puedes mandarme tus gastos así: "500 oxxo", una foto del ticket, o "retiro 2000 bbva" si sacaste efectivo.`
    )
    await supabase
      .from('profiles')
      .update({ whatsapp_confirmado_at: new Date().toISOString() })
      .eq('id', user.id)
  } catch (error) {
    console.error('Error mandando bienvenida de WhatsApp:', error)
  }
}

// Confirma o reporta el error de vuelta al usuario por WhatsApp. No
// bloquea el procesamiento del webhook si el envío falla.
async function responderWhatsApp(userPhone, esRetiro, resultado) {
  try {
    if (!resultado.success) {
      await enviarMensajeWhatsApp(userPhone, resultado.error)
      return
    }

    if (esRetiro) {
      const { retiro, banco } = resultado
      await enviarMensajeWhatsApp(
        userPhone,
        `Retiro registrado: ${formatoMoneda.format(retiro.monto / 100)} de ${banco.nombre}`
      )
    } else {
      const { gasto } = resultado
      const destino = gasto.tienda || gasto.categoria
      await enviarMensajeWhatsApp(
        userPhone,
        `Gasto registrado: ${formatoMoneda.format(gasto.monto / 100)} en ${destino}`
      )
    }
  } catch (error) {
    console.error('Error mandando confirmacion por WhatsApp:', error)
  }
}

export async function GET() {
  return NextResponse.json({ message: 'WhatsApp webhook activo' })
}

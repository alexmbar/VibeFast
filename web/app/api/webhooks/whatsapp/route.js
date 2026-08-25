import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { crearGastoDesdeWhatsApp } from '@/lib/gastos/whatsapp'
import { crearRetiroDesdeWhatsApp, crearCargaInicialDesdeWhatsApp } from '@/lib/retiros/whatsapp'
import { verificarFirmaKapso, enviarMensajeWhatsApp } from '@/lib/whatsapp/kapso'
import { transcribirAudioWhatsApp } from '@/lib/whatsapp/audio'
import { createAdminClient, registrarIntegracion } from '@/lib/admin/db'
import { formatMonto } from '@/lib/gastos/schema'

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
    const esAudio = !!message.audio
    let body = message.text?.body || message.image?.caption || message.document?.caption || ''
    const mediaUrl = message.kapso?.media_data?.url
    const mediaContentType = message.kapso?.media_data?.content_type

    // Obtener usuario por teléfono (usar Service Role Key para saltear RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const { data: user } = await supabase
      .from('profiles')
      .select('id, full_name, whatsapp_confirmado_at, onboarding_step, zona_horaria, moneda')
      .eq('phone', userPhone)
      .single()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' })
    }

    if (!user.whatsapp_confirmado_at) {
      await confirmarPrimerMensaje(supabase, user, userPhone)
    }

    // Una nota de voz no tiene "body" propio: se transcribe primero y el
    // texto resultante sigue el mismo camino que un mensaje escrito (incluida
    // la detección de "retiro").
    let transcripcion = null
    if (esAudio && mediaUrl) {
      transcripcion = await transcribirAudioWhatsApp(supabase, user.id, mediaUrl, mediaContentType)

      if (!transcripcion) {
        await enviarMensajeWhatsApp(
          userPhone,
          'No pude entender el audio. Intenta de nuevo o escribe el gasto como texto.'
        )
        return NextResponse.json({ success: false })
      }

      body = transcripcion
    }

    // Mientras el usuario esté en el paso de carga inicial del wizard de
    // onboarding, cualquier mensaje entrante se interpreta como el efectivo
    // que tiene contado (sin prefijo ni banco), no como gasto/retiro normal.
    // El wizard avanza el paso cuando el usuario confirma el monto en la UI.
    if (user.onboarding_step === 'carga_inicial') {
      const resultado = await crearCargaInicialDesdeWhatsApp(supabase, user.id, body, user.zona_horaria)
      await responderCargaInicialWhatsApp(userPhone, resultado, transcripcion, user.moneda)
      return NextResponse.json({ success: resultado.success })
    }

    // Un mensaje que empieza con "retiro" se captura como retiro de
    // efectivo, no como gasto; el resto del flujo no cambia.
    const esRetiro = /^\s*retiro\b/i.test(body)

    const resultado = esRetiro
      ? await crearRetiroDesdeWhatsApp(supabase, user.id, body, user.zona_horaria)
      : await crearGastoDesdeWhatsApp(
          supabase,
          user.id,
          body,
          esAudio ? null : mediaUrl,
          mediaContentType,
          { origenAudio: esAudio, zonaHoraria: user.zona_horaria }
        )

    await responderWhatsApp(userPhone, esRetiro, resultado, transcripcion, user.moneda)

    if (!resultado.success) {
      return NextResponse.json({ success: false })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en webhook WhatsApp:', error)
    // Este catch-all corre incluso si la falla fue antes de crear el
    // cliente de sesion (ej. JSON invalido), asi que arma uno propio.
    await registrarIntegracion(createAdminClient(), {
      tipo: 'webhook_whatsapp',
      nivel: 'error',
      detalle: { mensaje: error.message },
    })
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
      `¡Hola${nombre}! Tu WhatsApp quedó vinculado. A partir de ahora puedes mandarme tus gastos así: "500 oxxo", una nota de voz, una foto del ticket, o "retiro 2000 bbva" si sacaste efectivo.`
    )
    await supabase
      .from('profiles')
      .update({ whatsapp_confirmado_at: new Date().toISOString() })
      .eq('id', user.id)
  } catch (error) {
    console.error('Error mandando bienvenida de WhatsApp:', error)
  }
}

// Confirma la carga inicial de efectivo (o el error) por WhatsApp. El
// usuario todavía tiene que confirmar el monto en el wizard -- este
// mensaje solo le avisa que ya llegó, para que vuelva a la pantalla.
async function responderCargaInicialWhatsApp(userPhone, resultado, transcripcion, moneda) {
  try {
    const sufijoTranscripcion = transcripcion ? `\n(escuché: "${transcripcion}")` : ''

    if (!resultado.success) {
      await enviarMensajeWhatsApp(userPhone, `${resultado.error}${sufijoTranscripcion}`)
      return
    }

    const { cargaInicial } = resultado
    await enviarMensajeWhatsApp(
      userPhone,
      `Recibido: ${formatMonto(cargaInicial.monto, moneda)} en efectivo. Vuelve a la app para confirmarlo.${sufijoTranscripcion}`
    )
  } catch (error) {
    console.error('Error mandando confirmacion de carga inicial por WhatsApp:', error)
  }
}

// Confirma o reporta el error de vuelta al usuario por WhatsApp. No
// bloquea el procesamiento del webhook si el envío falla. Si el mensaje
// venía de una nota de voz, se incluye lo que se transcribió: la
// transcripción tiene más margen de error que texto escrito, así que el
// usuario necesita poder detectar de inmediato si se entendió mal.
async function responderWhatsApp(userPhone, esRetiro, resultado, transcripcion, moneda) {
  try {
    const sufijoTranscripcion = transcripcion ? `\n(escuché: "${transcripcion}")` : ''

    if (!resultado.success) {
      await enviarMensajeWhatsApp(userPhone, `${resultado.error}${sufijoTranscripcion}`)
      return
    }

    if (esRetiro) {
      const { retiro, banco } = resultado
      await enviarMensajeWhatsApp(
        userPhone,
        `Retiro registrado: ${formatMonto(retiro.monto, moneda)} de ${banco.nombre}${sufijoTranscripcion}`
      )
    } else {
      const { gasto } = resultado
      const destino = gasto.tienda || gasto.categoria
      await enviarMensajeWhatsApp(
        userPhone,
        `Gasto registrado: ${formatMonto(gasto.monto, moneda)} en ${destino}${sufijoTranscripcion}`
      )
    }
  } catch (error) {
    console.error('Error mandando confirmacion por WhatsApp:', error)
  }
}

export async function GET() {
  return NextResponse.json({ message: 'WhatsApp webhook activo' })
}

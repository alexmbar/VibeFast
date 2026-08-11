import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { crearGastoDesdeWhatsApp } from '@/lib/gastos/whatsapp'
import { validateTwilioWebhook } from '@/lib/whatsapp/twilio'

export async function POST(request) {
  try {
    // Validar que viene de Twilio
    const isValid = await validateTwilioWebhook(request)
    if (!isValid) {
      return NextResponse.json(
        { message: 'Webhook inválido' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const from = formData.get('From') // whatsapp:+52XXXXXXXXXX
    const body = formData.get('Body') || ''
    const mediaUrl = formData.get('MediaUrl0')
    const mediaContentType = formData.get('MediaContentType0')

    // Extraer número de usuario (sin whatsapp: prefix)
    const userPhone = from.replace('whatsapp:', '')

    // Obtener o crear usuario por teléfono
    const supabase = await createClient()
    let { data: user } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('phone', userPhone)
      .single()

    if (!user) {
      // Usuario no existe - podría crear invitación o responder que se registre
      return NextResponse.json({
        message: 'Usuario no registrado. Por favor, haz login en la app primero.',
      })
    }

    // Parsear el gasto del mensaje
    const resultado = await crearGastoDesdeWhatsApp(
      supabase,
      user.user_id,
      body,
      mediaUrl,
      mediaContentType
    )

    if (!resultado.success) {
      return respondToWhatsApp(from, `❌ Error: ${resultado.error}`)
    }

    // Responder al usuario
    const { gasto } = resultado
    return respondToWhatsApp(
      from,
      `✅ Gasto registrado\n💰 $${(gasto.monto / 100).toFixed(2)}\n📍 ${gasto.tienda || 'Sin tienda'}\n📂 ${gasto.categoria}`
    )
  } catch (error) {
    console.error('Error en webhook WhatsApp:', error)
    return NextResponse.json(
      { message: 'Error interno' },
      { status: 500 }
    )
  }
}

async function respondToWhatsApp(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_NUMBER

  if (!accountSid || !authToken) {
    console.warn('Twilio credentials no configuradas')
    return NextResponse.json({ success: true })
  }

  try {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: from,
        To: to,
        Body: message,
      }).toString(),
    })
  } catch (error) {
    console.error('Error enviando respuesta WhatsApp:', error)
  }

  return NextResponse.json({ success: true })
}

export async function GET(request) {
  // Verificación de webhook de Twilio
  return NextResponse.json({ message: 'WhatsApp webhook activo' })
}

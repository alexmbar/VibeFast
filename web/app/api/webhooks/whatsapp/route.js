import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { crearGastoDesdeWhatsApp } from '@/lib/gastos/whatsapp'
import { validateTwilioWebhook } from '@/lib/whatsapp/twilio'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const from = formData.get('From')
    const body = formData.get('Body') || ''
    const mediaUrl = formData.get('MediaUrl0')
    const mediaContentType = formData.get('MediaContentType0')

    const userPhone = from.replace('whatsapp:', '')

    // Obtener o crear usuario por teléfono
    // Usar Service Role Key para permisos de admin (saltear RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    let { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', userPhone)
      .single()

    if (!user) {
      await respondToWhatsApp(from, 'Por favor, inicia sesión en la app primero para capturar gastos por WhatsApp.')
      return NextResponse.json({ success: false })
    }

    const resultado = await crearGastoDesdeWhatsApp(
      supabase,
      user.id,
      body,
      mediaUrl,
      mediaContentType
    )

    if (!resultado.success) {
      await respondToWhatsApp(from, `❌ Error: ${resultado.error}`)
      return NextResponse.json({ success: false })
    }

    // Responder al usuario
    const { gasto } = resultado
    await respondToWhatsApp(
      from,
      `✅ Gasto registrado\n💰 $${(gasto.monto / 100).toFixed(2)}\n📍 ${gasto.tienda || 'Sin tienda'}\n📂 ${gasto.categoria}`
    )
    return NextResponse.json({ success: true })
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

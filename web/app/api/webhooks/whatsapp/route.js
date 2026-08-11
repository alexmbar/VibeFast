import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { crearGastoDesdeWhatsApp } from '@/lib/gastos/whatsapp'
import { validateTwilioWebhook } from '@/lib/whatsapp/twilio'

export async function POST(request) {
  try {
    console.log('Webhook WhatsApp recibido')

    // TODO: Validar que viene de Twilio (temporalmente desactivado para debug)
    // const isValid = await validateTwilioWebhook(request)
    // if (!isValid) {
    //   return NextResponse.json(
    //     { message: 'Webhook inválido' },
    //     { status: 401 }
    //   )
    // }

    const formData = await request.formData()
    const from = formData.get('From') // whatsapp:+52XXXXXXXXXX
    const body = formData.get('Body') || ''
    const mediaUrl = formData.get('MediaUrl0')
    const mediaContentType = formData.get('MediaContentType0')

    console.log('From:', from, 'Body:', body)

    // Extraer número de usuario (sin whatsapp: prefix)
    const userPhone = from.replace('whatsapp:', '')
    console.log('userPhone:', userPhone)

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

    console.log('User found:', user, 'Error:', userError)

    if (!user) {
      console.log('Usuario no encontrado con phone:', userPhone)
      await respondToWhatsApp(from, 'Por favor, inicia sesión en la app primero para capturar gastos por WhatsApp.')
      return NextResponse.json({ success: false })
    }

    // Parsear el gasto del mensaje
    console.log('Llamando crearGastoDesdeWhatsApp...')
    const resultado = await crearGastoDesdeWhatsApp(
      supabase,
      user.id,
      body,
      mediaUrl,
      mediaContentType
    )

    console.log('Resultado:', resultado)

    if (!resultado.success) {
      console.log('Error en creación:', resultado.error)
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
  console.log('respondToWhatsApp called:', { to, message })
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_NUMBER

  console.log('Twilio config:', { accountSid: accountSid ? 'OK' : 'MISSING', authToken: authToken ? 'OK' : 'MISSING', from })

  if (!accountSid || !authToken) {
    console.warn('Twilio credentials no configuradas')
    return NextResponse.json({ success: true })
  }

  try {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
    const requestBody = new URLSearchParams({
      From: from,
      To: to,
      Body: message,
    }).toString()

    console.log('Enviando a Twilio:', { from, to, message: message.substring(0, 50) })
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: requestBody,
    })

    const responseText = await response.text()
    console.log('Twilio response status:', response.status)
    console.log('Twilio response:', responseText.substring(0, 200))
  } catch (error) {
    console.error('Error enviando respuesta WhatsApp:', error)
  }

  return NextResponse.json({ success: true })
}

export async function GET(request) {
  // Verificación de webhook de Twilio
  return NextResponse.json({ message: 'WhatsApp webhook activo' })
}

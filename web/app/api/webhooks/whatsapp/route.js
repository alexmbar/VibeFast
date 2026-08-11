import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { crearGastoDesdeWhatsApp } from '@/lib/gastos/whatsapp'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const from = formData.get('From')
    const body = formData.get('Body') || ''
    const mediaUrl = formData.get('MediaUrl0')
    const mediaContentType = formData.get('MediaContentType0')

    const userPhone = from.replace('whatsapp:', '')

    // Obtener usuario por teléfono (usar Service Role Key para saltear RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const { data: user } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', userPhone)
      .single()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' })
    }

    const resultado = await crearGastoDesdeWhatsApp(
      supabase,
      user.id,
      body,
      mediaUrl,
      mediaContentType
    )

    if (!resultado.success) {
      return NextResponse.json({ success: false })
    }

    // Gasto capturado exitosamente
    // TODO: Enviar confirmación a WhatsApp (requiere resolver autenticación Twilio)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en webhook WhatsApp:', error)
    return NextResponse.json(
      { message: 'Error interno' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ message: 'WhatsApp webhook activo' })
}

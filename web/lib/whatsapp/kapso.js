import crypto from 'crypto'

// Verifica que el webhook viene de Kapso comparando la firma HMAC-SHA256
// del body crudo contra el header X-Webhook-Signature. rawBody debe ser
// el texto sin parsear (la firma no coincide si se recalcula sobre el
// objeto ya parseado y re-serializado).
export function verificarFirmaKapso(rawBody, signature) {
  const secret = process.env.KAPSO_WEBHOOK_SECRET

  if (!signature || !secret) {
    return false
  }

  const esperada = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

  const a = Buffer.from(signature)
  const b = Buffer.from(esperada)
  if (a.length !== b.length) {
    return false
  }

  return crypto.timingSafeEqual(a, b)
}

// Envia un mensaje de texto de WhatsApp a traves de la API de Kapso.
// `to` puede venir con o sin "+"; la API espera el numero sin el.
export async function enviarMensajeWhatsApp(to, body) {
  const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID
  const apiKey = process.env.KAPSO_API_KEY
  const numero = to.replace('+', '')

  const response = await fetch(
    `https://api.kapso.ai/meta/whatsapp/v24.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: numero,
        type: 'text',
        text: { body },
      }),
    }
  )

  if (!response.ok) {
    const detalle = await response.text()
    throw new Error(`Kapso send failed (${response.status}): ${detalle}`)
  }

  return response.json()
}

// Descarga un archivo de media (foto/PDF) referenciado en un mensaje
// entrante. Los media_url de Kapso viven bajo api.kapso.ai y requieren
// la misma X-API-Key que el resto de la API.
export async function descargarMediaKapso(mediaUrl) {
  const response = await fetch(mediaUrl, {
    headers: { 'X-API-Key': process.env.KAPSO_API_KEY },
  })

  if (!response.ok) {
    throw new Error(`No se pudo descargar media de Kapso (${response.status})`)
  }

  return response.arrayBuffer()
}

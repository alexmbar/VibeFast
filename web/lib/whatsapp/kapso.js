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

// Envia un mensaje de WhatsApp usando un template pre-aprobado por Meta.
// Necesario para mensajes proactivos fuera de la ventana de 24h (un
// mensaje de texto libre se rechaza en ese caso). `params` es un objeto
// {nombre_param: valor} -- los templates de este proyecto usan
// parameter_format: "NAMED", asi que cada parametro va con su
// parameter_name en vez de posicional ({{1}}, {{2}}...).
export async function enviarPlantillaWhatsApp(to, templateName, params = {}) {
  const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID
  const apiKey = process.env.KAPSO_API_KEY
  const numero = to.replace('+', '')

  const parameters = Object.entries(params).map(([nombre, valor]) => ({
    type: 'text',
    parameter_name: nombre,
    text: String(valor),
  }))

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
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'es_MX' },
          components: [{ type: 'body', parameters }],
        },
      }),
    }
  )

  if (!response.ok) {
    const detalle = await response.text()
    throw new Error(`Kapso send template failed (${response.status}): ${detalle}`)
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

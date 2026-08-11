import crypto from 'crypto'

// Validar que el webhook viene de Twilio
export async function validateTwilioWebhook(request) {
  const twilioSignature = request.headers.get('x-twilio-signature')
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN

  if (!twilioSignature || !twilioAuthToken) {
    return false
  }

  try {
    const url = request.url
    const body = await request.text()

    // Reconstruir el body para validación
    const hash = crypto
      .createHmac('sha1', twilioAuthToken)
      .update(url + body, 'utf8')
      .digest('Base64')

    return hash === twilioSignature
  } catch {
    return false
  }
}

import OpenAI, { toFile } from 'openai'
import { descargarMediaKapso } from './kapso'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Transcribe una nota de voz de WhatsApp (descargada de Kapso) con Whisper.
// Las notas de voz de WhatsApp llegan como audio/ogg (codec opus); Whisper
// las acepta directamente. Devuelve el texto o null si falla, para que el
// caller pueda seguir el mismo camino de error que un mensaje vacío.
export async function transcribirAudioWhatsApp(mediaUrl, mediaContentType) {
  try {
    const buffer = await descargarMediaKapso(mediaUrl)
    const archivo = await toFile(Buffer.from(buffer), 'nota-de-voz.ogg', {
      type: mediaContentType || 'audio/ogg',
    })

    const resultado = await openai.audio.transcriptions.create({
      file: archivo,
      model: 'whisper-1',
      language: 'es',
    })

    return resultado.text?.trim() || null
  } catch (error) {
    console.error('Error transcribiendo audio de WhatsApp:', error)
    return null
  }
}

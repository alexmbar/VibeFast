import OpenAI, { toFile } from 'openai'
import { descargarMediaKapso } from './kapso'
import { registrarIntegracion, registrarUsoOpenai } from '@/lib/admin/db'
import { costoWhisperCentavos } from '@/lib/admin/costos'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Transcribe una nota de voz de WhatsApp (descargada de Kapso) con Whisper.
// Las notas de voz de WhatsApp llegan como audio/ogg (codec opus); Whisper
// las acepta directamente. Devuelve el texto o null si falla, para que el
// caller pueda seguir el mismo camino de error que un mensaje vacío.
//
// response_format: 'verbose_json' (en vez del default) para que la
// respuesta traiga `duration` -- Whisper se cobra por minuto de audio,
// no por tokens, así que sin la duración no hay con qué estimar el costo.
export async function transcribirAudioWhatsApp(supabase, userId, mediaUrl, mediaContentType) {
  const modelo = 'whisper-1'
  try {
    const buffer = await descargarMediaKapso(mediaUrl)
    const archivo = await toFile(Buffer.from(buffer), 'nota-de-voz.ogg', {
      type: mediaContentType || 'audio/ogg',
    })

    const resultado = await openai.audio.transcriptions.create({
      file: archivo,
      model: modelo,
      language: 'es',
      response_format: 'verbose_json',
    })

    await registrarUsoOpenai(supabase, {
      userId,
      contexto: 'audio_transcripcion',
      modelo,
      costoEstimadoCentavos: costoWhisperCentavos(resultado.duration),
    })

    return resultado.text?.trim() || null
  } catch (error) {
    console.error('Error transcribiendo audio de WhatsApp:', error)
    await registrarIntegracion(supabase, {
      tipo: 'webhook_whatsapp',
      nivel: 'error',
      userId,
      detalle: { etapa: 'audio_transcripcion', mensaje: error.message },
    })
    return null
  }
}

import OpenAI from 'openai'
import { CATEGORIAS, TIPOS_PAGO } from './schema'
import { descargarMediaKapso } from '@/lib/whatsapp/kapso'
import { subirTicketADrive } from '@/lib/google-drive/client'
import { registrarIntegracion, registrarUsoOpenai } from '@/lib/admin/db'
import { costoChatCentavos } from '@/lib/admin/costos'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Crear gasto desde mensaje de WhatsApp. `opciones.origenAudio` indica que
// `texto` es una transcripción (no algo que el usuario escribió a mano):
// el dictado suele ser lenguaje natural ("gasté como doscientos pesos en
// el oxxo"), no el formato corto "monto + lugar" que espera el regex de
// parsearTexto, así que ese caso usa extracción con OpenAI en vez de regex.
export async function crearGastoDesdeWhatsApp(
  supabase,
  userId,
  texto,
  mediaUrl,
  mediaContentType,
  opciones = {}
) {
  try {
    let gasto = null
    let mediaBuffer = null

    // Si hay media (foto/PDF), descargarla una sola vez: la misma
    // descarga se usa para OpenAI Vision y, mas abajo, para la subida
    // a Google Drive.
    if (mediaUrl) {
      mediaBuffer = await descargarMediaKapso(mediaUrl)
      gasto = await parsearMediaConOpenAI(supabase, userId, mediaBuffer, mediaContentType)
    } else if (opciones.origenAudio && texto) {
      gasto = await parsearTextoConOpenAI(supabase, userId, texto)
    }

    // Si no hay media/audio o la extracción con OpenAI falló, parsear texto
    if (!gasto) {
      gasto = parsearTexto(texto)
    }

    // Si aún no tenemos datos, pedir más info
    if (!gasto.monto) {
      return {
        success: false,
        error: 'No pude extraer el monto. Envía algo como "500 oxxo" o una foto del ticket.',
      }
    }

    if (!gasto.categoria) {
      gasto.categoria = 'otros'
    }

    if (!gasto.tipo_pago) {
      gasto.tipo_pago = 'efectivo'
    }

    // Validar fecha
    if (!gasto.fecha) {
      gasto.fecha = new Date().toISOString().split('T')[0]
    }

    // Validar que la fecha no sea en el futuro
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const selectedDate = new Date(gasto.fecha)
    if (selectedDate > today) {
      gasto.fecha = new Date().toISOString().split('T')[0]
    }

    // Validar categoría
    if (!CATEGORIAS.includes(gasto.categoria)) {
      gasto.categoria = 'otros'
    }

    // Validar tipo de pago
    if (!TIPOS_PAGO.includes(gasto.tipo_pago)) {
      gasto.tipo_pago = 'efectivo'
    }

    // Insertar en Supabase
    const { data, error } = await supabase
      .from('gastos')
      .insert({
        user_id: userId,
        monto: gasto.monto,
        fecha: gasto.fecha,
        categoria: gasto.categoria,
        tipo_pago: gasto.tipo_pago,
        tienda: gasto.tienda || null,
        notas: gasto.notas || `Capturado por WhatsApp: ${texto}`,
      })
      .select()
      .single()

    if (error) {
      return {
        success: false,
        error: 'Error al guardar el gasto',
      }
    }

    // Subida a Drive best-effort: si el usuario no tiene Drive
    // conectado o la subida falla, el gasto ya quedo guardado igual.
    if (mediaBuffer) {
      const extension = mediaContentType?.includes('pdf') ? 'pdf' : 'jpg'
      const subida = await subirTicketADrive(supabase, userId, {
        buffer: mediaBuffer,
        filename: `${data.fecha}-${data.tienda || data.categoria}.${extension}`,
        mimeType: mediaContentType?.includes('pdf') ? 'application/pdf' : 'image/jpeg',
      })

      if (subida) {
        await supabase
          .from('gastos')
          .update({ drive_file_id: subida.driveFileId, drive_file_url: subida.driveFileUrl })
          .eq('id', data.id)
        data.drive_file_id = subida.driveFileId
        data.drive_file_url = subida.driveFileUrl
      }
    }

    return {
      success: true,
      gasto: data,
    }
  } catch (error) {
    console.error('Error en crearGastoDesdeWhatsApp:', error)
    return {
      success: false,
      error: 'Error procesando tu mensaje',
    }
  }
}

// Parsear imagen/PDF con OpenAI Vision. `buffer` ya viene descargado
// (ver crearGastoDesdeWhatsApp, se descarga una sola vez y se reusa
// para la subida a Drive).
async function parsearMediaConOpenAI(supabase, userId, buffer, mediaContentType) {
  const modelo = 'gpt-4-vision-preview'
  try {
    const base64 = Buffer.from(buffer).toString('base64')

    // Determinar media type
    const mediaType = mediaContentType?.includes('pdf') ? 'application/pdf' : 'image/jpeg'

    // Enviar a OpenAI Vision
    const result = await openai.chat.completions.create({
      model: modelo,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mediaType};base64,${base64}`,
              },
            },
            {
              type: 'text',
              text: `Extrae información del gasto de esta imagen:
              - Monto (número entero en centavos, ej: 150050 = $1500.50)
              - Tienda/comercio (ej: OXXO, Starbucks)
              - Fecha (YYYY-MM-DD, si no aparece usa hoy)
              - Categoría (supermercado, restaurantes, cafeteria, transporte, gasolina, salud, farmacia, hogar, servicios, renta, educacion, entretenimiento, ropa, tecnologia, viajes, mascotas, regalos, impuestos, comisiones, otros)
              - Tipo de pago (efectivo, debito, credito, transferencia, domiciliado, vales, otro)

              Responde SOLO en JSON sin markdown:
              {"monto": 150050, "tienda": "OXXO", "fecha": "2025-08-10", "categoria": "otros", "tipo_pago": "efectivo"}`,
            },
          ],
        },
      ],
      max_tokens: 500,
    })

    const content = result.choices[0].message.content
    const json = JSON.parse(content)

    await registrarUsoOpenai(supabase, {
      userId,
      contexto: 'vision_ticket',
      modelo,
      tokensEntrada: result.usage?.prompt_tokens,
      tokensSalida: result.usage?.completion_tokens,
      costoEstimadoCentavos: costoChatCentavos(modelo, result.usage?.prompt_tokens, result.usage?.completion_tokens),
    })

    return {
      monto: json.monto,
      tienda: json.tienda,
      fecha: json.fecha,
      categoria: json.categoria,
      tipo_pago: json.tipo_pago,
    }
  } catch (error) {
    console.error('Error en OpenAI Vision:', error)
    await registrarIntegracion(supabase, {
      tipo: 'openai_vision',
      nivel: 'error',
      userId,
      detalle: { mensaje: error.message },
    })
    return {}
  }
}

// Extrae los datos del gasto de una transcripción de audio con OpenAI. A
// diferencia de parsearTexto (regex para "500 oxxo"), esto interpreta
// lenguaje natural dictado por voz.
async function parsearTextoConOpenAI(supabase, userId, texto) {
  const modelo = 'gpt-4o-mini'
  try {
    const result = await openai.chat.completions.create({
      model: modelo,
      messages: [
        {
          role: 'user',
          content: `Extrae información del gasto de esta transcripción de una nota de voz de WhatsApp: "${texto}"

              - Monto (número entero en centavos, ej: 150050 = $1500.50)
              - Tienda/comercio (ej: OXXO, Starbucks), o null si no se menciona
              - Fecha (YYYY-MM-DD, si no aparece usa hoy: ${new Date().toISOString().split('T')[0]})
              - Categoría (supermercado, restaurantes, cafeteria, transporte, gasolina, salud, farmacia, hogar, servicios, renta, educacion, entretenimiento, ropa, tecnologia, viajes, mascotas, regalos, impuestos, comisiones, otros)
              - Tipo de pago (efectivo, debito, credito, transferencia, domiciliado, vales, otro; si no se menciona usa efectivo)

              Responde SOLO en JSON sin markdown:
              {"monto": 150050, "tienda": "OXXO", "fecha": "2025-08-10", "categoria": "otros", "tipo_pago": "efectivo"}`,
        },
      ],
      max_tokens: 500,
    })

    const content = result.choices[0].message.content
    const json = JSON.parse(content)

    await registrarUsoOpenai(supabase, {
      userId,
      contexto: 'audio_texto_gasto',
      modelo,
      tokensEntrada: result.usage?.prompt_tokens,
      tokensSalida: result.usage?.completion_tokens,
      costoEstimadoCentavos: costoChatCentavos(modelo, result.usage?.prompt_tokens, result.usage?.completion_tokens),
    })

    return {
      monto: json.monto,
      tienda: json.tienda,
      fecha: json.fecha,
      categoria: json.categoria,
      tipo_pago: json.tipo_pago,
    }
  } catch (error) {
    console.error('Error en extracción de audio con OpenAI:', error)
    await registrarIntegracion(supabase, {
      tipo: 'webhook_whatsapp',
      nivel: 'error',
      userId,
      detalle: { etapa: 'audio_texto_gasto', mensaje: error.message },
    })
    return null
  }
}

// Parsear texto simple
function parsearTexto(texto) {
  const gasto = {
    monto: null,
    tienda: null,
    fecha: null,
    categoria: null,
    tipo_pago: 'efectivo',
  }

  // Buscar patrón: número + tienda
  // Ej: "500 oxxo", "1500.50 starbucks", "$200 uber", "1,000 starbuks", "2,500.12 walmart"
  const matches = texto.match(/[\$]?\s*(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*(.+)?/i)
  if (matches) {
    const pesos = parseFloat(matches[1].replace(/,/g, ''))
    gasto.monto = Math.round(pesos * 100) // Convertir a centavos

    if (matches[2]) {
      const tiendaTexto = matches[2].trim().toLowerCase()
      gasto.tienda = tiendaTexto

      // Inferir categoría por tienda
      gasto.categoria = inferirCategoria(tiendaTexto)
    }
  }

  // Buscar patrón de fecha
  const fechaMatches = texto.match(/(\d{4}-\d{2}-\d{2})/i)
  if (fechaMatches) {
    gasto.fecha = fechaMatches[1]
  }

  return gasto
}

// Inferir categoría por nombre de tienda
function inferirCategoria(tiendaTexto) {
  const lower = tiendaTexto.toLowerCase()

  if (/oxxo|walmart|soriana|costco|super/.test(lower)) return 'supermercado'
  if (/restaurante|mcdonalds|burger/.test(lower)) return 'restaurantes'
  if (/cafe|starbucks|coffee/.test(lower)) return 'cafeteria'
  if (/uber|taxi|lyft|transporte/.test(lower)) return 'transporte'
  if (/pemex|gasolina|gas|combustible/.test(lower)) return 'gasolina'
  if (/doctor|hospital|farmacia/.test(lower)) return 'salud'
  if (/farmacia|medicinas/.test(lower)) return 'farmacia'
  if (/casa|hogar|home|lowes/.test(lower)) return 'hogar'
  if (/agua|luz|internet|servicios/.test(lower)) return 'servicios'
  if (/renta|vivienda|alquiler/.test(lower)) return 'renta'
  if (/escuela|universidad|educacion/.test(lower)) return 'educacion'
  if (/cine|musica|juego|entretenimiento/.test(lower)) return 'entretenimiento'
  if (/ropa|zapatos|zara|adidas/.test(lower)) return 'ropa'
  if (/apple|samsung|laptop|computadora/.test(lower)) return 'tecnologia'
  if (/viaje|hotel|vuelo|avion/.test(lower)) return 'viajes'
  if (/mascota|veterinaria|perro|gato/.test(lower)) return 'mascotas'
  if (/regalo|presente/.test(lower)) return 'regalos'
  if (/impuesto|irs|sat/.test(lower)) return 'impuestos'
  if (/comision|banco|transferencia/.test(lower)) return 'comisiones'

  return null
}

import OpenAI from 'openai'
import { CATEGORIAS, TIPOS_PAGO } from './schema'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Crear gasto desde mensaje de WhatsApp
export async function crearGastoDesdeWhatsApp(supabase, userId, texto, mediaUrl, mediaContentType) {
  try {
    let gasto = null

    // Si hay media (foto/PDF), usar OpenAI Vision
    if (mediaUrl) {
      gasto = await parsearMediaConOpenAI(mediaUrl, mediaContentType)
    }

    // Si no hay media o Vision falló, parsear texto
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
    console.log('Insertando gasto:', { userId, monto: gasto.monto, fecha: gasto.fecha, categoria: gasto.categoria })
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

    console.log('Insert result:', { data, error })

    if (error) {
      console.error('Error insertando gasto:', error)
      return {
        success: false,
        error: `Error al guardar el gasto: ${error.message}`,
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

// Parsear imagen/PDF con OpenAI Vision
async function parsearMediaConOpenAI(mediaUrl, mediaContentType) {
  try {
    // Descargar la imagen
    const response = await fetch(mediaUrl)
    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    // Determinar media type
    const mediaType = mediaContentType?.includes('pdf') ? 'application/pdf' : 'image/jpeg'

    // Enviar a OpenAI Vision
    const result = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
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

    return {
      monto: json.monto,
      tienda: json.tienda,
      fecha: json.fecha,
      categoria: json.categoria,
      tipo_pago: json.tipo_pago,
    }
  } catch (error) {
    console.error('Error en OpenAI Vision:', error)
    return {}
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
  // Ej: "500 oxxo", "1500.50 starbucks", "$200 uber"
  const matches = texto.match(/[\$]?\s*(\d+(?:\.\d{2})?)\s*(.+)?/i)
  if (matches) {
    const pesos = parseFloat(matches[1])
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

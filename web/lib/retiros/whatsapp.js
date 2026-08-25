// Parseo y creacion de retiros desde WhatsApp (solo texto, ej. "retiro 2000 bbva")

import { hoyEnZona } from '@/lib/config/fechas'
import { ZONA_HORARIA_DEFAULT } from '@/lib/config/schema'

const REGEX_MONTO = /[\$]?\s*(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*(.+)?/i

// Extrae monto y el texto de banco de un mensaje de retiro.
// Reutiliza la misma regex numerica que el parser de gastos.
export function parsearRetiro(texto) {
  const sinPrefijo = texto.replace(/^\s*retiro\s+/i, '').trim()
  const retiro = { monto: null, bancoTexto: null }

  const matches = sinPrefijo.match(REGEX_MONTO)
  if (matches) {
    const pesos = parseFloat(matches[1].replace(/,/g, ''))
    retiro.monto = Math.round(pesos * 100) // Convertir a centavos

    if (matches[2]) {
      retiro.bancoTexto = matches[2].trim().toLowerCase()
    }
  }

  return retiro
}

// Extrae solo el monto de un mensaje (sin banco). Usado por la carga
// inicial de efectivo del wizard: durante ese paso, cualquier texto
// entrante del usuario se interpreta como el efectivo que tiene contado,
// sin prefijo ni banco.
function extraerMonto(texto) {
  const matches = texto.trim().match(REGEX_MONTO)
  if (!matches) return null

  const pesos = parseFloat(matches[1].replace(/,/g, ''))
  return Math.round(pesos * 100)
}

// Busca el banco de tipo debito del usuario que coincide con el texto
// capturado. Match exacto primero, luego contencion de substring en
// ambas direcciones. banco_id es FK obligatoria en retiros, asi que ya
// no hay fallback a texto libre como en gastos: si no matchea, se pide
// al usuario registrar el banco en la web primero.
export async function matchBanco(supabase, userId, textoBanco) {
  if (!textoBanco) {
    return { banco: null, ambiguous: false }
  }

  const { data: bancos } = await supabase
    .from('bancos')
    .select('id, nombre')
    .eq('user_id', userId)
    .eq('tipo', 'debito')
    .eq('activo', true)

  if (!bancos || bancos.length === 0) {
    return { banco: null, ambiguous: false }
  }

  const normalizado = textoBanco.trim().toLowerCase()

  const exacto = bancos.find(b => b.nombre.trim().toLowerCase() === normalizado)
  if (exacto) {
    return { banco: exacto, ambiguous: false }
  }

  const porSubstring = bancos.filter(b => {
    const nombre = b.nombre.trim().toLowerCase()
    return nombre.includes(normalizado) || normalizado.includes(nombre)
  })

  if (porSubstring.length === 1) {
    return { banco: porSubstring[0], ambiguous: false }
  }
  if (porSubstring.length > 1) {
    return { banco: null, ambiguous: true }
  }

  return { banco: null, ambiguous: false }
}

// Crear retiro desde mensaje de WhatsApp
export async function crearRetiroDesdeWhatsApp(supabase, userId, texto, zonaHoraria = ZONA_HORARIA_DEFAULT) {
  try {
    const { monto, bancoTexto } = parsearRetiro(texto)

    if (!monto) {
      return {
        success: false,
        error: 'No pude extraer el monto. Envía algo como "retiro 2000 bbva".',
      }
    }

    const { banco, ambiguous } = await matchBanco(supabase, userId, bancoTexto)

    if (ambiguous) {
      return {
        success: false,
        error: 'Encontré más de un banco que coincide con ese nombre. Sé más específico o revisa tu catálogo en /bancos.',
      }
    }

    if (!banco) {
      return {
        success: false,
        error: 'No encontré ese banco en tu catálogo. Regístralo primero en la app en /bancos.',
      }
    }

    const fecha = hoyEnZona(zonaHoraria)

    const { data, error } = await supabase
      .from('retiros')
      .insert({
        user_id: userId,
        monto,
        fecha,
        banco_id: banco.id,
        notas: `Capturado por WhatsApp: ${texto}`,
      })
      .select()
      .single()

    if (error) {
      return {
        success: false,
        error: 'Error al guardar el retiro',
      }
    }

    return {
      success: true,
      retiro: data,
      banco,
    }
  } catch (error) {
    console.error('Error en crearRetiroDesdeWhatsApp:', error)
    return {
      success: false,
      error: 'Error procesando tu mensaje',
    }
  }
}

// Crear o corregir la carga inicial de efectivo del wizard de onboarding
// (paso profiles.onboarding_step = 'carga_inicial'). Se guarda como un
// retiro sin banco (es_carga_inicial=true, ver 024_onboarding_wizard.sql):
// mientras el usuario no confirme el monto en el wizard, puede corregirlo
// reenviando otro mensaje -- por eso hace upsert manual en vez de insert.
export async function crearCargaInicialDesdeWhatsApp(supabase, userId, texto, zonaHoraria = ZONA_HORARIA_DEFAULT) {
  try {
    const monto = extraerMonto(texto)

    if (!monto) {
      return {
        success: false,
        error: 'No pude extraer el monto. Manda solo el número, ej. "3000".',
      }
    }

    const fecha = hoyEnZona(zonaHoraria)

    const { data: existente } = await supabase
      .from('retiros')
      .select('id')
      .eq('user_id', userId)
      .eq('es_carga_inicial', true)
      .maybeSingle()

    const { data, error } = existente
      ? await supabase
          .from('retiros')
          .update({ monto, fecha })
          .eq('id', existente.id)
          .select()
          .single()
      : await supabase
          .from('retiros')
          .insert({
            user_id: userId,
            monto,
            fecha,
            banco_id: null,
            es_carga_inicial: true,
            notas: 'Carga inicial capturada por WhatsApp',
          })
          .select()
          .single()

    if (error) {
      return {
        success: false,
        error: 'Error al guardar la carga inicial',
      }
    }

    return {
      success: true,
      cargaInicial: data,
    }
  } catch (error) {
    console.error('Error en crearCargaInicialDesdeWhatsApp:', error)
    return {
      success: false,
      error: 'Error procesando tu mensaje',
    }
  }
}

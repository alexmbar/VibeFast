// Precios de OpenAI en USD por cada 1M tokens (texto) o por minuto
// (Whisper). Son un estimado para /admin/costos, no facturación real
// -- esa la maneja OpenAI directamente. costo_estimado_centavos en
// uso_openai queda en centavos de USD, no de MXN (el resto de la app
// usa centavos de MXN, pero convertir con un tipo de cambio fijo aquí
// sería inventar precisión que no tenemos).
const PRECIOS_USD_POR_1M_TOKENS = {
  "gpt-4o-mini": { entrada: 0.15, salida: 0.6 },
  "gpt-4o": { entrada: 2.5, salida: 10 },
  "gpt-4-vision-preview": { entrada: 10, salida: 30 },
}

const PRECIO_USD_WHISPER_POR_MINUTO = 0.006

export function costoChatCentavos(modelo, tokensEntrada, tokensSalida) {
  const precio = PRECIOS_USD_POR_1M_TOKENS[modelo]
  if (!precio) {
    console.warn(`[admin/costos] modelo sin precio registrado: ${modelo}`)
    return 0
  }
  const usd =
    (tokensEntrada / 1_000_000) * precio.entrada + (tokensSalida / 1_000_000) * precio.salida
  return Math.round(usd * 100)
}

export function costoWhisperCentavos(duracionSegundos) {
  const usd = ((duracionSegundos || 0) / 60) * PRECIO_USD_WHISPER_POR_MINUTO
  return Math.round(usd * 100)
}

// Llamadas crudas al OAuth2/Drive de Google, sin el paquete `googleapis`
// (el proyecto no tiene ninguna dependencia de Google; sigue el mismo
// estilo fetch-crudo que ya usa web/lib/whatsapp/kapso.js para Kapso).

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'openid',
  'email',
].join(' ')

function redirectUri() {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/google-drive/callback`
}

// URL del consent screen de Google a la que se redirige al usuario.
// access_type=offline + prompt=consent para garantizar que siempre
// regrese un refresh_token, incluso si el usuario ya habia conectado
// antes (Google solo lo manda la primera vez sin prompt=consent).
export function construirUrlAutorizacion(state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_DRIVE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

// Intercambia el `code` del callback por access_token + refresh_token.
export async function intercambiarCodigoPorTokens(code) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_DRIVE_CLIENT_ID,
      client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const detalle = await response.text()
    throw new Error(`Google token exchange failed (${response.status}): ${detalle}`)
  }

  return response.json()
}

// Refresca un access_token vencido usando el refresh_token guardado.
// Google no regresa un refresh_token nuevo en esta llamada.
export async function refrescarAccessToken(refreshToken) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_DRIVE_CLIENT_ID,
      client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const detalle = await response.text()
    throw new Error(`Google token refresh failed (${response.status}): ${detalle}`)
  }

  return response.json()
}

// Cuenta de Google conectada (requiere los scopes openid+email pedidos
// arriba), solo para mostrar "Conectado como ..." en /profile.
export async function obtenerEmailGoogle(accessToken) {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) return null

  const data = await response.json()
  return data.email || null
}

// Revoca el refresh_token en Google (llamado al desconectar). Best-effort:
// el caller decide si un fallo aqui debe bloquear la desconexion local.
export async function revocarToken(token) {
  const response = await fetch(
    `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
    { method: 'POST' }
  )

  if (!response.ok) {
    const detalle = await response.text()
    throw new Error(`Google token revoke failed (${response.status}): ${detalle}`)
  }
}

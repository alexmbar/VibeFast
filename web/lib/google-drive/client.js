import { cifrar, descifrar } from './crypto'
import { refrescarAccessToken } from './oauth'

const NOMBRE_CARPETA = 'Controla Gasto - Tickets'
const MARGEN_EXPIRACION_MS = 60_000

// Devuelve un access_token utilizable para el usuario, refrescandolo y
// persistiendolo si el guardado ya vencio (o vence en menos de un
// minuto). Regresa null si el usuario no tiene Drive conectado.
export async function obtenerAccessTokenValido(supabase, userId) {
  const { data: conexion } = await supabase
    .from('google_drive_conexiones')
    .select('access_token_cifrado, refresh_token_cifrado, access_token_expira_en')
    .eq('user_id', userId)
    .maybeSingle()

  if (!conexion) return null

  const expira = new Date(conexion.access_token_expira_en).getTime()
  if (expira - Date.now() > MARGEN_EXPIRACION_MS) {
    return descifrar(conexion.access_token_cifrado)
  }

  const refreshToken = descifrar(conexion.refresh_token_cifrado)
  const tokens = await refrescarAccessToken(refreshToken)
  const nuevaExpiracion = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await supabase
    .from('google_drive_conexiones')
    .update({
      access_token_cifrado: cifrar(tokens.access_token),
      access_token_expira_en: nuevaExpiracion,
    })
    .eq('user_id', userId)

  return tokens.access_token
}

// Busca la carpeta "Controla Gasto - Tickets" en el Drive del usuario;
// si no existe la crea. Cachea el id en drive_folder_id para no repetir
// la busqueda en cada subida.
export async function obtenerOCrearCarpeta(supabase, userId, accessToken) {
  const { data: conexion } = await supabase
    .from('google_drive_conexiones')
    .select('drive_folder_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (conexion?.drive_folder_id) {
    return conexion.drive_folder_id
  }

  const query = `name='${NOMBRE_CARPETA}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const buscar = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!buscar.ok) {
    throw new Error(`Drive folder search failed (${buscar.status}): ${await buscar.text()}`)
  }
  const { files } = await buscar.json()

  let folderId = files?.[0]?.id

  if (!folderId) {
    const crear = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: NOMBRE_CARPETA,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    })
    if (!crear.ok) {
      throw new Error(`Drive folder create failed (${crear.status}): ${await crear.text()}`)
    }
    folderId = (await crear.json()).id
  }

  await supabase
    .from('google_drive_conexiones')
    .update({ drive_folder_id: folderId })
    .eq('user_id', userId)

  return folderId
}

// Sube un archivo a la carpeta indicada vía Drive v3 (multipart upload).
export async function subirArchivo(accessToken, folderId, { buffer, filename, mimeType }) {
  const metadata = { name: filename, parents: [folderId] }
  const boundary = 'controla_gasto_drive_upload'

  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`

  const cierre = `\r\n--${boundary}--`

  const multipartBody = Buffer.concat([
    Buffer.from(body, 'utf8'),
    Buffer.from(buffer),
    Buffer.from(cierre, 'utf8'),
  ])

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  )

  if (!response.ok) {
    throw new Error(`Drive upload failed (${response.status}): ${await response.text()}`)
  }

  return response.json()
}

// Orquesta obtener token + carpeta + subida para el caso de uso de
// "subir un ticket recien capturado". Best-effort: nunca lanza. Si el
// usuario no tiene Drive conectado, es el camino normal (sin log). Si
// la subida falla por otra razon, se loguea y se regresa null.
export async function subirTicketADrive(supabase, userId, { buffer, filename, mimeType }) {
  try {
    const accessToken = await obtenerAccessTokenValido(supabase, userId)
    if (!accessToken) return null

    const folderId = await obtenerOCrearCarpeta(supabase, userId, accessToken)
    const archivo = await subirArchivo(accessToken, folderId, { buffer, filename, mimeType })

    return { driveFileId: archivo.id, driveFileUrl: archivo.webViewLink }
  } catch (error) {
    console.error('Error subiendo ticket a Drive:', error)
    return null
  }
}

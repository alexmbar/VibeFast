import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  intercambiarCodigoPorTokens,
  obtenerEmailGoogle,
} from '@/lib/google-drive/oauth'
import { cifrar } from '@/lib/google-drive/crypto'

const COOKIE_STATE = 'gdrive_oauth_state'

function redirigirAPerfil(request, resultado) {
  const url = new URL('/profile', process.env.NEXT_PUBLIC_APP_URL)
  url.searchParams.set('drive', resultado)

  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocal = process.env.NODE_ENV === 'development'
  if (!isLocal && forwardedHost) {
    url.protocol = 'https:'
    url.host = forwardedHost
  }

  const response = NextResponse.redirect(url)
  response.cookies.delete(COOKIE_STATE)
  return response
}

// Callback de Google OAuth para la conexion de Drive. Distinto y
// separado de web/app/auth/callback/route.js (login "Continuar con
// Google" de Supabase Auth) — no toca esa ruta.
export async function GET(request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  const stateCookie = request.cookies.get(COOKIE_STATE)?.value

  if (error || !code || !state || state !== stateCookie) {
    return redirigirAPerfil(request, 'error')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirigirAPerfil(request, 'error')
  }

  try {
    const tokens = await intercambiarCodigoPorTokens(code)
    if (!tokens.refresh_token) {
      // No deberia pasar con prompt=consent, pero sin refresh_token no
      // hay forma de renovar el access_token despues de que expire.
      throw new Error('Google no regreso refresh_token')
    }

    const googleEmail = await obtenerEmailGoogle(tokens.access_token)

    const { error: dbError } = await supabase.from('google_drive_conexiones').upsert(
      {
        user_id: user.id,
        access_token_cifrado: cifrar(tokens.access_token),
        refresh_token_cifrado: cifrar(tokens.refresh_token),
        access_token_expira_en: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scope: tokens.scope,
        google_email: googleEmail,
        drive_folder_id: null,
      },
      { onConflict: 'user_id' }
    )

    if (dbError) throw dbError

    return redirigirAPerfil(request, 'connected')
  } catch (err) {
    console.error('Error conectando Google Drive:', err)
    return redirigirAPerfil(request, 'error')
  }
}

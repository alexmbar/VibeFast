import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { construirUrlAutorizacion } from '@/lib/google-drive/oauth'

const COOKIE_STATE = 'gdrive_oauth_state'

// Inicia la conexion de Google Drive: genera un `state` (CSRF) en cookie
// httpOnly de corta duracion y redirige al consent screen de Google.
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL))
  }

  const state = crypto.randomBytes(16).toString('hex')

  const response = NextResponse.redirect(construirUrlAutorizacion(state))
  response.cookies.set(COOKIE_STATE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  })

  return response
}

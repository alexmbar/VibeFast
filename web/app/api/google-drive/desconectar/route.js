import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { descifrar } from '@/lib/google-drive/crypto'
import { revocarToken } from '@/lib/google-drive/oauth'

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 })
  }

  const { data: conexion } = await supabase
    .from('google_drive_conexiones')
    .select('refresh_token_cifrado')
    .eq('user_id', user.id)
    .maybeSingle()

  if (conexion) {
    try {
      await revocarToken(descifrar(conexion.refresh_token_cifrado))
    } catch (err) {
      // Best-effort: si Google ya invalido el token o falla la red, de
      // todos modos borramos la conexion localmente.
      console.error('Error revocando token de Google Drive:', err)
    }
  }

  const { error } = await supabase
    .from('google_drive_conexiones')
    .delete()
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ message: 'Error al desconectar' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

import crypto from 'crypto'

// Cifrado en reposo para los tokens OAuth de Google guardados en
// google_drive_conexiones (ver migracion 025). Es el primer dato
// cifrado en reposo de este proyecto: AES-256-GCM con una clave fija
// de 32 bytes en GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY (generar con
// `openssl rand -base64 32`).

function obtenerClave() {
  const clave = process.env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY
  if (!clave) {
    throw new Error('Falta GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY')
  }

  const buffer = Buffer.from(clave, 'base64')
  if (buffer.length !== 32) {
    throw new Error('GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY debe decodificar a 32 bytes')
  }

  return buffer
}

// Cifra un string y devuelve "iv:authTag:ciphertext" (cada segmento en
// base64), listo para guardar en una columna TEXT.
export function cifrar(texto) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', obtenerClave(), iv)

  const ciphertext = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [iv, authTag, ciphertext].map((buf) => buf.toString('base64')).join(':')
}

// Inverso de cifrar(). Lanza si el valor esta corrupto o el authTag no valida.
export function descifrar(valorCifrado) {
  const [ivB64, authTagB64, ciphertextB64] = valorCifrado.split(':')
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error('Valor cifrado con formato invalido')
  }

  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const ciphertext = Buffer.from(ciphertextB64, 'base64')

  const decipher = crypto.createDecipheriv('aes-256-gcm', obtenerClave(), iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

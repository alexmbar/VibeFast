-- ============================================================
-- Tabla google_drive_conexiones: conexion OAuth de Drive por usuario
-- Migracion 025
-- ------------------------------------------------------------
-- Cada usuario conecta su propio Google Drive (OAuth por usuario, no
-- una cuenta compartida) para que los tickets/estados de cuenta
-- capturados por WhatsApp (ver web/lib/gastos/whatsapp.js) se suban
-- automaticamente a su Drive personal. access_token y refresh_token
-- se guardan cifrados (AES-256-GCM, ver web/lib/google-drive/crypto.js)
-- porque el refresh_token es de larga duracion. Relacion 1:1 con el
-- usuario (UNIQUE en user_id): conectar de nuevo reemplaza la conexion
-- anterior.
-- ============================================================

CREATE TABLE google_drive_conexiones (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  access_token_cifrado TEXT NOT NULL,
  refresh_token_cifrado TEXT NOT NULL,
  access_token_expira_en TIMESTAMP WITH TIME ZONE NOT NULL,

  scope TEXT NOT NULL, -- scopes concedidos, ej. "https://www.googleapis.com/auth/drive.file"
  google_email TEXT, -- cuenta de Google conectada, solo para mostrar en /profile
  drive_folder_id TEXT, -- id cacheado de la carpeta "Controla Gasto - Tickets"

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT scope_no_vacio CHECK (scope <> '')
);

CREATE INDEX idx_google_drive_conexiones_user ON google_drive_conexiones(user_id);

-- Habilitar RLS
ALTER TABLE google_drive_conexiones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own google_drive_conexiones" ON google_drive_conexiones
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own google_drive_conexiones" ON google_drive_conexiones
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own google_drive_conexiones" ON google_drive_conexiones
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own google_drive_conexiones" ON google_drive_conexiones
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_google_drive_conexiones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER google_drive_conexiones_updated_at_trigger
BEFORE UPDATE ON google_drive_conexiones
FOR EACH ROW
EXECUTE FUNCTION update_google_drive_conexiones_updated_at();

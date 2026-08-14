-- ============================================================
-- Tabla bancos: catalogo de bancos por usuario
-- Migracion 013
-- ------------------------------------------------------------
-- Cada fila es un instrumento financiero (cuenta o tarjeta), no
-- solo un nombre de banco: el mismo banco puede tener una fila
-- tipo "debito" y otra tipo "credito" si el usuario los usa por
-- separado. Ver 014 para la migracion de gastos.banco (texto
-- libre historico) hacia este catalogo.
-- ============================================================

CREATE TABLE bancos (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT nombre_no_vacio CHECK (btrim(nombre) <> ''),
  CONSTRAINT tipo_banco_valido CHECK (tipo IN ('debito', 'credito'))
);

-- Un mismo nombre no se puede repetir dos veces para el mismo
-- usuario y tipo (comparacion insensible a mayusculas/espacios).
-- Si el usuario tiene "BBVA" en debito y en credito, son dos filas.
CREATE UNIQUE INDEX idx_bancos_user_tipo_nombre ON bancos (user_id, tipo, lower(btrim(nombre)));
CREATE INDEX idx_bancos_user_activo ON bancos(user_id, activo);

-- Habilitar RLS
ALTER TABLE bancos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bancos" ON bancos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bancos" ON bancos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bancos" ON bancos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bancos" ON bancos
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_bancos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bancos_updated_at_trigger
BEFORE UPDATE ON bancos
FOR EACH ROW
EXECUTE FUNCTION update_bancos_updated_at();

-- ============================================================
-- Tabla retiros: retiros de efectivo (banco -> cartera fisica)
-- Migracion 015
-- ------------------------------------------------------------
-- Un retiro no es un gasto: no consume valor, solo lo traslada
-- de una cuenta de debito al efectivo en mano. Se modela como
-- tabla separada de gastos para que los reportes de gasto real
-- nunca se contaminen con transferencias/retiros. Alimenta el
-- saldo de Cartera (ver 016_cartera_saldo_function.sql).
-- ============================================================

CREATE TABLE retiros (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  monto INTEGER NOT NULL,              -- centavos, igual que gastos.monto
  fecha DATE NOT NULL,
  banco_id BIGINT NOT NULL REFERENCES bancos(id) ON DELETE RESTRICT,
  notas TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT monto_positivo CHECK (monto > 0)
);

CREATE INDEX idx_retiros_user_fecha ON retiros(user_id, fecha DESC);
CREATE INDEX idx_retiros_banco_id ON retiros(banco_id);

-- Habilitar RLS
ALTER TABLE retiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own retiros" ON retiros
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own retiros" ON retiros
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own retiros" ON retiros
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own retiros" ON retiros
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_retiros_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER retiros_updated_at_trigger
BEFORE UPDATE ON retiros
FOR EACH ROW
EXECUTE FUNCTION update_retiros_updated_at();

-- Un retiro solo puede ser de un banco tipo=debito, y ese banco debe
-- pertenecer al mismo usuario del retiro. No es un CHECK simple porque
-- necesita leer la tabla bancos, asi que va como trigger: respaldo duro
-- en BD ademas de la validacion en la API (que da el mensaje legible).
CREATE OR REPLACE FUNCTION validar_banco_debito_retiro()
RETURNS TRIGGER AS $$
DECLARE
  v_tipo TEXT;
  v_user_id UUID;
BEGIN
  SELECT tipo, user_id INTO v_tipo, v_user_id FROM bancos WHERE id = NEW.banco_id;

  IF v_user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'El banco no pertenece al usuario';
  END IF;

  IF v_tipo IS DISTINCT FROM 'debito' THEN
    RAISE EXCEPTION 'El banco de un retiro debe ser de tipo debito';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER retiros_valida_banco_debito_trigger
BEFORE INSERT OR UPDATE ON retiros
FOR EACH ROW
EXECUTE FUNCTION validar_banco_debito_retiro();

-- ============================================================
-- Tabla presupuestos: limite de gasto por categoria por usuario
-- Migracion 037
-- ------------------------------------------------------------
-- Un presupuesto por categoria por usuario (indice unico parcial,
-- solo entre los activos: pausar uno con soft-delete libera la
-- categoria para crear otro despues). El periodo es mes calendario
-- por defecto, o el ciclo de corte de una tarjeta de credito
-- especifica si banco_id apunta a una (ver presupuestos_estado en
-- 038_presupuestos_estado_function.sql).
--
-- ultimo_alerta_pct / ultimo_alerta_periodo_inicio son la marca de
-- idempotencia de los avisos de 80%/100%, mismo patron que
-- bancos.ultimo_recordatorio_pago: evita mandar el mismo aviso mas
-- de una vez por periodo.
-- ============================================================

CREATE TABLE presupuestos (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  categoria TEXT NOT NULL,
  monto_limite INTEGER NOT NULL,        -- centavos, igual que gastos.monto
  banco_id BIGINT REFERENCES bancos(id) ON DELETE SET NULL,  -- NULL = mes calendario; si se llena, ciclo de corte de esa tarjeta

  activo BOOLEAN NOT NULL DEFAULT true, -- soft delete, igual que bancos.activo

  ultimo_alerta_pct SMALLINT,           -- 80 o 100, NULL = sin alerta enviada en el periodo vigente
  ultimo_alerta_periodo_inicio DATE,    -- periodo_inicio al que corresponde ultimo_alerta_pct

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT categoria_valida CHECK (categoria IN (
    'supermercado','restaurantes','cafeteria','transporte','gasolina','salud','farmacia',
    'hogar','servicios','renta','educacion','entretenimiento','ropa','tecnologia','viajes',
    'mascotas','regalos','impuestos','comisiones','otros'
  )),
  CONSTRAINT monto_limite_positivo CHECK (monto_limite > 0),
  CONSTRAINT ultimo_alerta_pct_valido CHECK (ultimo_alerta_pct IS NULL OR ultimo_alerta_pct IN (80, 100))
);

CREATE UNIQUE INDEX idx_presupuestos_user_categoria_activo ON presupuestos(user_id, categoria) WHERE activo = true;
CREATE INDEX idx_presupuestos_user_activo ON presupuestos(user_id, activo);

-- Habilitar RLS
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own presupuestos" ON presupuestos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own presupuestos" ON presupuestos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presupuestos" ON presupuestos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own presupuestos" ON presupuestos
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_presupuestos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER presupuestos_updated_at_trigger
BEFORE UPDATE ON presupuestos
FOR EACH ROW
EXECUTE FUNCTION update_presupuestos_updated_at();

-- Un presupuesto con banco_id debe apuntar a una tarjeta de credito del
-- mismo usuario con dia_corte configurado -- mismas 3 capas que "un
-- retiro solo puede ser de un banco tipo=debito" (015_retiros.sql): el
-- <select> del form solo lista tarjetas con dia_corte, la API lo
-- revalida con un mensaje legible, este trigger es el respaldo duro en
-- base de datos.
CREATE OR REPLACE FUNCTION validar_banco_credito_presupuesto()
RETURNS TRIGGER AS $$
DECLARE
  v_tipo TEXT;
  v_user_id UUID;
  v_dia_corte INTEGER;
BEGIN
  IF NEW.banco_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT tipo, user_id, dia_corte INTO v_tipo, v_user_id, v_dia_corte
  FROM bancos WHERE id = NEW.banco_id;

  IF v_user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'El banco no pertenece al usuario';
  END IF;
  IF v_tipo IS DISTINCT FROM 'credito' THEN
    RAISE EXCEPTION 'El presupuesto por ciclo de corte requiere un banco tipo credito';
  END IF;
  IF v_dia_corte IS NULL THEN
    RAISE EXCEPTION 'El banco no tiene dia_corte configurado';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER presupuestos_valida_banco_credito_trigger
BEFORE INSERT OR UPDATE ON presupuestos
FOR EACH ROW
EXECUTE FUNCTION validar_banco_credito_presupuesto();

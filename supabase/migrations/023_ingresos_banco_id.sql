-- ============================================================
-- banco_id en ingresos
-- Migracion 023
-- ------------------------------------------------------------
-- A diferencia de gastos, ingresos nunca tuvo columna de banco.
-- Se agrega como FK opcional al catalogo (un ingreso puede caer
-- en cualquier tipo de cuenta, no solo debito -- a diferencia de
-- retiros, que exige debito). Es prerequisito para conciliacion
-- bancaria: sin saber a que banco entro un ingreso no se puede
-- cruzar contra el estado de cuenta de ese banco.
-- ============================================================

ALTER TABLE ingresos
  ADD COLUMN banco_id BIGINT REFERENCES bancos(id) ON DELETE SET NULL;

CREATE INDEX idx_ingresos_banco_id ON ingresos(banco_id) WHERE banco_id IS NOT NULL;

-- El banco debe pertenecer al mismo usuario del ingreso. Mismo patron que
-- validar_banco_debito_retiro() en 015_retiros.sql, sin restriccion de
-- tipo (debito o credito son validos para un ingreso).
CREATE OR REPLACE FUNCTION validar_banco_ingreso()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF NEW.banco_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_user_id FROM bancos WHERE id = NEW.banco_id;

  IF v_user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'El banco no pertenece al usuario';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ingresos_valida_banco_trigger
BEFORE INSERT OR UPDATE ON ingresos
FOR EACH ROW
EXECUTE FUNCTION validar_banco_ingreso();

-- ============================================================
-- Datos de credito en bancos: dia de corte, dia limite de pago,
-- limite de credito, alias y tasa de interes
-- Migracion 022
-- ------------------------------------------------------------
-- Todas las columnas son nullable y solo tienen sentido cuando
-- tipo='credito'. El CHECK constraint las obliga a NULL en bancos
-- tipo='debito' -- mismo patron de validacion en capas que ya usa
-- el proyecto (UI oculta el campo, API lo revalida, BD lo
-- constrine), igual que la regla de efectivo/banco_id en gastos y
-- el trigger de retiros que exige banco tipo=debito.
-- ============================================================

ALTER TABLE bancos
  ADD COLUMN dia_corte INTEGER,
  ADD COLUMN dia_limite_pago INTEGER,
  ADD COLUMN limite_credito INTEGER,    -- centavos, igual que gastos.monto
  ADD COLUMN alias TEXT,                -- ultimos 4 digitos o apodo, texto libre
  ADD COLUMN tasa_interes NUMERIC(5,2); -- porcentaje anual / CAT

ALTER TABLE bancos
  ADD CONSTRAINT dia_corte_valido CHECK (dia_corte IS NULL OR dia_corte BETWEEN 1 AND 31),
  ADD CONSTRAINT dia_limite_pago_valido CHECK (dia_limite_pago IS NULL OR dia_limite_pago BETWEEN 1 AND 31),
  ADD CONSTRAINT limite_credito_positivo CHECK (limite_credito IS NULL OR limite_credito > 0),
  ADD CONSTRAINT tasa_interes_valida CHECK (tasa_interes IS NULL OR tasa_interes >= 0),
  ADD CONSTRAINT alias_no_vacio CHECK (alias IS NULL OR btrim(alias) <> ''),
  ADD CONSTRAINT campos_credito_solo_en_credito CHECK (
    tipo = 'credito' OR (
      dia_corte IS NULL
      AND dia_limite_pago IS NULL
      AND limite_credito IS NULL
      AND alias IS NULL
      AND tasa_interes IS NULL
    )
  );

-- ============================================================
-- Tabla ingresos: control de ingresos (version simple)
-- Migracion 019
-- ------------------------------------------------------------
-- Captura manual de ingresos puntuales (nomina capturada a mano,
-- bono, reembolso, venta, regalo, etc.). La recurrencia automatica
-- ("nomina" generada sola cada quincena) queda pendiente en el TODO
-- de CLAUDE.md -- esta version solo cubre captura manual + vista +
-- balance neto (ver 020_balance_neto_function.sql).
--
-- Tabla separada de gastos, igual criterio que retiros: nunca se
-- mezclan en la misma tabla para que los reportes de gasto real no
-- se contaminen.
-- ============================================================

CREATE TABLE ingresos (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  monto INTEGER NOT NULL,              -- centavos, igual que gastos.monto
  fecha DATE NOT NULL,
  categoria TEXT NOT NULL,             -- enum: 7 valores
  notas TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT monto_positivo CHECK (monto > 0),
  CONSTRAINT categoria_valida CHECK (categoria IN (
    'nomina', 'bono', 'reembolso', 'venta', 'regalo', 'inversion', 'otro'
  ))
);

CREATE INDEX idx_ingresos_user_fecha ON ingresos(user_id, fecha DESC);

-- Habilitar RLS
ALTER TABLE ingresos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ingresos" ON ingresos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ingresos" ON ingresos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ingresos" ON ingresos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ingresos" ON ingresos
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_ingresos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ingresos_updated_at_trigger
BEFORE UPDATE ON ingresos
FOR EACH ROW
EXECUTE FUNCTION update_ingresos_updated_at();

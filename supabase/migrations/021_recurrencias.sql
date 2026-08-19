-- ============================================================
-- Tabla recurrencias: motor de recurrencia compartido por
-- ingresos y gastos (nomina, renta, suscripciones, etc.)
-- Migracion 021
-- ------------------------------------------------------------
-- Una fila aqui es una regla ("cada viernes $X de nomina", "el
-- dia 5 $Y de renta"), no una ocurrencia. Las ocurrencias reales
-- se generan por adelantado (cron diario, ver
-- web/app/api/cron/generar-recurrencias) como filas normales en
-- gastos o ingresos, enlazadas via recurrencia_id. El monto de la
-- regla es solo un default: cada fila generada nace con
-- monto_confirmado = false hasta que el usuario la revisa/edita
-- (nomina/gasto variable, no siempre el mismo monto exacto).
-- ============================================================

CREATE TABLE recurrencias (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  tipo TEXT NOT NULL,
  frecuencia TEXT NOT NULL,

  -- dia_semana: 0=domingo..6=sabado (igual que Date.getDay()). Requerido si frecuencia='semanal'.
  dia_semana SMALLINT CHECK (dia_semana BETWEEN 0 AND 6),
  -- dias_mes: 1 elemento si frecuencia='mensual', 2 si frecuencia='quincenal'. Cada valor 1-31;
  -- si el mes es mas corto que el dia pedido se usa el ultimo dia del mes (resuelto en el cron, no aqui).
  dias_mes SMALLINT[],

  monto_default INTEGER NOT NULL,   -- centavos, monto sugerido (ver monto_confirmado en gastos/ingresos)
  categoria TEXT NOT NULL,
  tipo_pago TEXT,                   -- solo tipo='gasto'
  banco_id BIGINT REFERENCES bancos(id) ON DELETE SET NULL,  -- solo tipo='gasto', opcional
  tienda TEXT,                      -- solo tipo='gasto', opcional
  notas TEXT,

  activo BOOLEAN NOT NULL DEFAULT true,
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin DATE,
  ultima_generacion DATE,           -- hasta que fecha ya se generaron ocurrencias (catch-up del cron)

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT tipo_valido CHECK (tipo IN ('ingreso', 'gasto')),
  CONSTRAINT frecuencia_valida CHECK (frecuencia IN ('semanal', 'quincenal', 'mensual')),
  CONSTRAINT monto_default_positivo CHECK (monto_default > 0),
  CONSTRAINT fecha_fin_posterior CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio),

  CONSTRAINT frecuencia_campos_validos CHECK (
    (frecuencia = 'semanal' AND dia_semana IS NOT NULL AND dias_mes IS NULL)
    OR (frecuencia = 'mensual' AND dia_semana IS NULL AND array_length(dias_mes, 1) = 1)
    OR (frecuencia = 'quincenal' AND dia_semana IS NULL AND array_length(dias_mes, 1) = 2)
  ),
  -- Sin subquery (Postgres no permite subqueries en CHECK): se indexa
  -- directo, valido porque frecuencia_campos_validos ya garantiza 1 o 2
  -- elementos.
  CONSTRAINT dias_mes_en_rango CHECK (
    dias_mes IS NULL OR (
      dias_mes[1] BETWEEN 1 AND 31
      AND (array_length(dias_mes, 1) < 2 OR dias_mes[2] BETWEEN 1 AND 31)
    )
  ),
  CONSTRAINT tipo_pago_solo_gasto CHECK (
    (tipo = 'gasto' AND tipo_pago IS NOT NULL)
    OR (tipo = 'ingreso' AND tipo_pago IS NULL AND banco_id IS NULL AND tienda IS NULL)
  ),
  CONSTRAINT tipo_pago_valido CHECK (
    tipo_pago IS NULL
    OR tipo_pago IN ('efectivo', 'debito', 'credito', 'transferencia', 'domiciliado', 'vales', 'otro')
  ),
  CONSTRAINT banco_no_efectivo CHECK (NOT (tipo_pago = 'efectivo' AND banco_id IS NOT NULL)),
  CONSTRAINT categoria_valida CHECK (
    (tipo = 'ingreso' AND categoria IN ('nomina', 'bono', 'reembolso', 'venta', 'regalo', 'inversion', 'otro'))
    OR (tipo = 'gasto' AND categoria IN (
      'supermercado', 'restaurantes', 'cafeteria', 'transporte', 'gasolina', 'salud', 'farmacia',
      'hogar', 'servicios', 'renta', 'educacion', 'entretenimiento', 'ropa', 'tecnologia', 'viajes',
      'mascotas', 'regalos', 'impuestos', 'comisiones', 'otros'
    ))
  )
);

CREATE INDEX idx_recurrencias_user_activo ON recurrencias(user_id, activo);
CREATE INDEX idx_recurrencias_banco_id ON recurrencias(banco_id) WHERE banco_id IS NOT NULL;

-- Habilitar RLS
ALTER TABLE recurrencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recurrencias" ON recurrencias
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurrencias" ON recurrencias
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurrencias" ON recurrencias
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurrencias" ON recurrencias
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_recurrencias_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recurrencias_updated_at_trigger
BEFORE UPDATE ON recurrencias
FOR EACH ROW
EXECUTE FUNCTION update_recurrencias_updated_at();

-- ------------------------------------------------------------
-- Enlace de ocurrencias generadas: cada fila que el cron inserta
-- en gastos/ingresos queda ligada a la regla que la genero, y
-- nace sin confirmar (el monto es un default, no lo capturo el
-- usuario). Cualquier PATCH manual sobre la fila la marca como
-- confirmada (ver web/app/api/gastos/[id]/route.js e
-- web/app/api/ingresos/[id]/route.js).
-- ------------------------------------------------------------

ALTER TABLE gastos
  ADD COLUMN recurrencia_id BIGINT REFERENCES recurrencias(id) ON DELETE SET NULL,
  ADD COLUMN monto_confirmado BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE ingresos
  ADD COLUMN recurrencia_id BIGINT REFERENCES recurrencias(id) ON DELETE SET NULL,
  ADD COLUMN monto_confirmado BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX idx_gastos_recurrencia ON gastos(recurrencia_id) WHERE recurrencia_id IS NOT NULL;
CREATE INDEX idx_ingresos_recurrencia ON ingresos(recurrencia_id) WHERE recurrencia_id IS NOT NULL;

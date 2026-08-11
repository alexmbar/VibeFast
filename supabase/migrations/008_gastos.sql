-- ============================================================
-- Tabla gastos: control de gastos personales
-- Migracion 008
-- ============================================================

-- Crear tabla gastos
CREATE TABLE gastos (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Campos obligatorios (según CLAUDE.md)
  monto INTEGER NOT NULL,              -- centavos (ej: 150050 = $1500.50)
  fecha DATE NOT NULL,                 -- sin hora (agrupa por día correcto)
  categoria TEXT NOT NULL,             -- enum: 20 valores
  tipo_pago TEXT NOT NULL,             -- enum: 7 valores

  -- Campos opcionales
  tienda TEXT,                         -- "OXXO", "Pemex", etc.
  banco TEXT,                          -- "BBVA", "Nu", lista abierta
  notas TEXT,                          -- observaciones libres

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Validaciones a nivel DB
  CONSTRAINT monto_positivo CHECK (monto > 0),
  CONSTRAINT categoria_valida CHECK (categoria IN (
    'supermercado', 'restaurantes', 'cafeteria', 'transporte', 'gasolina',
    'salud', 'farmacia', 'hogar', 'servicios', 'renta', 'educacion',
    'entretenimiento', 'ropa', 'tecnologia', 'viajes', 'mascotas', 'regalos',
    'impuestos', 'comisiones', 'otros'
  )),
  CONSTRAINT tipo_pago_valido CHECK (tipo_pago IN (
    'efectivo', 'debito', 'credito', 'transferencia', 'domiciliado', 'vales', 'otro'
  ))
);

-- Crear índices para queries frecuentes
CREATE INDEX idx_gastos_user_fecha ON gastos(user_id, fecha DESC);
CREATE INDEX idx_gastos_user_categoria ON gastos(user_id, categoria);

-- Habilitar RLS
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Solo el propietario ve/edita sus gastos
CREATE POLICY "Users can view own gastos" ON gastos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gastos" ON gastos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gastos" ON gastos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own gastos" ON gastos
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_gastos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gastos_updated_at_trigger
BEFORE UPDATE ON gastos
FOR EACH ROW
EXECUTE FUNCTION update_gastos_updated_at();

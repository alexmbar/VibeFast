-- ============================================================
-- Agregar campo hora a gastos
-- Migracion 011
-- ============================================================

-- Agregar campo hora a gastos
ALTER TABLE gastos
ADD COLUMN hora TIME DEFAULT now()::time;

-- Crear indice para busquedas por hora
CREATE INDEX idx_gastos_user_hora ON gastos(user_id, hora);

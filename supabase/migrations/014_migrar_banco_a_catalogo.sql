-- ============================================================
-- Migrar gastos.banco (texto libre) al catalogo de bancos
-- Migracion 014
-- ------------------------------------------------------------
-- ADVERTENCIA: esta migracion muta datos existentes en gastos,
-- no solo esquema. Antes de correrla en el proyecto real, hacer
-- un backup desde el dashboard de Supabase (Database > Backups).
--
-- Solo los gastos con tipo_pago IN ('debito','credito') generan
-- entradas de catalogo: son los dos unicos valores que mapean 1:1
-- al campo bancos.tipo. Los demas tipo_pago (efectivo,
-- transferencia, domiciliado, vales, otro) no generan catalogo;
-- esos gastos quedan con banco_id NULL y conservan su texto
-- original en gastos.banco intacto.
--
-- Si el mismo nombre aparece con ambos tipos de pago (ej. "BBVA"
-- en debito y en credito), se crean DOS filas de catalogo: son
-- instrumentos financieros distintos.
--
-- Normalizacion exacta (comparacion por lower(btrim(...))), sin
-- fuzzy matching: variantes como "BBVA" vs "Bbva Digital" no se
-- fusionan solas y requieren limpieza manual en /bancos despues.
-- El texto se conserva tal cual esta capturado (sin recapitalizar)
-- para no alterar acronimos como "BBVA" o "HSBC".
--
-- gastos.banco (texto) NO se elimina: queda como respaldo/
-- auditoria, y de aqui en adelante el servidor la escribe como
-- columna denormalizada derivada de banco_id (ver GastoForm y
-- api/gastos). Asi listarGastos.js y cualquier lectura existente
-- de gasto.banco siguen funcionando sin tocarlas.
-- ============================================================

ALTER TABLE gastos ADD COLUMN banco_id BIGINT REFERENCES bancos(id) ON DELETE SET NULL;
CREATE INDEX idx_gastos_user_banco_id ON gastos(user_id, banco_id);

-- 1. Poblar catalogo desde texto historico (solo debito/credito)
INSERT INTO bancos (user_id, nombre, tipo)
SELECT DISTINCT user_id, btrim(banco), tipo_pago
FROM gastos
WHERE tipo_pago IN ('debito', 'credito')
  AND banco IS NOT NULL AND btrim(banco) <> ''
ON CONFLICT (user_id, tipo, lower(btrim(nombre))) DO NOTHING;

-- 2. Enlazar gastos.banco_id por match exacto normalizado
UPDATE gastos g SET banco_id = b.id
FROM bancos b
WHERE g.user_id = b.user_id
  AND g.tipo_pago = b.tipo
  AND g.tipo_pago IN ('debito', 'credito')
  AND lower(btrim(g.banco)) = lower(btrim(b.nombre));

-- 3. Auditoria: correr despues de aplicar esta migracion para ver
-- que gastos quedaron sin matchear (tipicamente typos/variantes):
--
-- SELECT id, user_id, banco, tipo_pago FROM gastos
-- WHERE tipo_pago IN ('debito','credito')
--   AND banco IS NOT NULL AND banco_id IS NULL;

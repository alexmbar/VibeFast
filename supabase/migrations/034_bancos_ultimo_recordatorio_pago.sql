-- ============================================================
-- Marca de idempotencia para el recordatorio de pago de credito
-- Migracion 034
-- ------------------------------------------------------------
-- Registra la fecha en que se mando por ultima vez el recordatorio
-- de pago de un banco tipo=credito, para que el cron no lo mande
-- dos veces si corre mas de una vez el mismo dia. Mismo patron que
-- recurrencias.ultima_generacion.
-- ============================================================

ALTER TABLE bancos
  ADD COLUMN ultimo_recordatorio_pago DATE;

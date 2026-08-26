-- ============================================================
-- banco_confirmado en gastos
-- Migracion 040
-- ------------------------------------------------------------
-- Cuando un ticket se captura por WhatsApp con tipo_pago debito/credito,
-- se intenta matchear el banco automaticamente comparando los ultimos
-- digitos que lee Vision del ticket contra bancos.alias del usuario (ver
-- web/lib/gastos/whatsapp.js). Si no hay match, el gasto se guarda sin
-- banco_id y banco_confirmado=false, mismo patron visual/UX que
-- monto_confirmado (021_recurrencias.sql): badge "Pendiente" en /gastos,
-- se confirma con cualquier PATCH manual sobre la fila.
--
-- Default true: las filas existentes y las creadas manualmente (GastoForm,
-- donde el usuario ya elige el banco a mano del catalogo) no requieren
-- confirmacion -- este flag solo lo pone en false el matching automatico
-- de WhatsApp cuando no logra resolver el banco.
-- ============================================================

ALTER TABLE gastos ADD COLUMN banco_confirmado BOOLEAN NOT NULL DEFAULT true;
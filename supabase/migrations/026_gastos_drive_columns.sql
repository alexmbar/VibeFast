-- ============================================================
-- Agregar columnas de referencia a Google Drive en gastos
-- Migracion 026
-- ------------------------------------------------------------
-- Cuando un ticket/estado de cuenta llega por WhatsApp con foto o PDF
-- y el usuario tiene su Google Drive conectado (ver migracion 025,
-- google_drive_conexiones), el archivo original se sube a su Drive
-- personal. Estas columnas guardan la referencia para poder mostrar
-- un link "Ver ticket original" mas adelante (UI no incluida en esta
-- migracion, solo se deja el dato disponible).
-- ============================================================

ALTER TABLE gastos
ADD COLUMN drive_file_id TEXT,
ADD COLUMN drive_file_url TEXT;

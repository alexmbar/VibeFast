-- ============================================================
-- Tabla integraciones_log: salud de integraciones y anomalias
-- Migracion 029
-- ------------------------------------------------------------
-- Resuelve el TODO pendiente en CLAUDE.md: el cron de recurrencias
-- (generar-recurrencias/route.js) ya junta un arreglo `errores` por
-- regla que truena, pero nadie lo lee porque un cron que responde
-- 200 no dispara ninguna alerta. A partir de esta tabla, ese cron
-- (y el webhook de WhatsApp, y el parseo con OpenAI Vision) escriben
-- aqui en vez de perder el error en la respuesta JSON.
--
-- user_id es nullable: un fallo de webhook o de cron puede no estar
-- atado a un usuario especifico; cuando si lo esta (ej. costo_anomalo
-- de un usuario puntual) queda enlazado para filtrar en /admin.
-- ============================================================

CREATE TABLE integraciones_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  tipo TEXT NOT NULL,
  nivel TEXT NOT NULL DEFAULT 'error',
  detalle JSONB,
  resuelto BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT tipo_integracion_valido CHECK (tipo IN (
    'webhook_whatsapp', 'cron_recurrencias', 'openai_vision', 'costo_anomalo'
  )),
  CONSTRAINT nivel_valido CHECK (nivel IN ('info', 'warning', 'error'))
);

CREATE INDEX idx_integraciones_log_tipo_resuelto ON integraciones_log(tipo, resuelto, created_at DESC);
CREATE INDEX idx_integraciones_log_user ON integraciones_log(user_id);

-- Solo service_role (backend de /admin y los crons/webhooks que
-- escriben aqui via API route con la service role key).
ALTER TABLE integraciones_log ENABLE ROW LEVEL SECURITY;

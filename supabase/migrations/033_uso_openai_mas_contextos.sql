-- ============================================================
-- uso_openai: ampliar contexto_valido
-- Migracion 033
-- ------------------------------------------------------------
-- 030_uso_openai.sql solo prevein 'vision_ticket' y 'agente_chat'.
-- Al instrumentar de verdad las llamadas a OpenAI aparecieron dos
-- mas: la transcripcion de notas de voz con Whisper
-- (web/lib/whatsapp/audio.js) y la extraccion de gasto desde esa
-- transcripcion con GPT (web/lib/gastos/whatsapp.js,
-- parsearTextoConOpenAI).
-- ============================================================

ALTER TABLE uso_openai DROP CONSTRAINT contexto_valido;

ALTER TABLE uso_openai ADD CONSTRAINT contexto_valido CHECK (contexto IN (
  'vision_ticket', 'agente_chat', 'audio_transcripcion', 'audio_texto_gasto'
));

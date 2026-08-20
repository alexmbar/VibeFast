-- ============================================================
-- uso_openai: permitir insert propio desde el cliente de sesion
-- Migracion 032
-- ------------------------------------------------------------
-- 030_uso_openai.sql dejo la tabla sin policies (solo service_role).
-- Eso funciona para el webhook de WhatsApp y el cron (ya usan
-- service_role), pero el agente conversacional (/api/agente/chat)
-- corre con el cliente de sesion del usuario, no con service_role
-- -- mismo caso que tool_calls (005_tool_calls.sql), que ya permite
-- insert propio.
--
-- Sigue sin haber policy de SELECT: un usuario puede registrar su
-- propio consumo pero no leerlo de vuelta. Si mas adelante se quiere
-- mostrar "tu consumo de IA" en el perfil, se agrega esa policy aparte.
-- ============================================================

CREATE POLICY "uso_openai_insert_own" ON uso_openai
  FOR INSERT WITH CHECK (auth.uid() = user_id);

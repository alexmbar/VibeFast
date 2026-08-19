-- ============================================================
-- profiles.whatsapp_confirmado_at
-- Migracion 018
-- ------------------------------------------------------------
-- Marca cuando un usuario mando su primer mensaje de WhatsApp
-- despues de vincular su telefono (PhoneGate). El webhook
-- (web/app/api/webhooks/whatsapp/route.js) lo usa para mandar un
-- saludo de bienvenida personalizado una sola vez, antes de la
-- confirmacion normal del gasto/retiro.
--
-- No se puede mandar ese saludo en el momento en que se guarda el
-- telefono en /profile: Meta solo permite que el negocio le escriba
-- primero a un numero si hay una sesion de servicio abierta (el
-- usuario escribio en las ultimas 24h) o via plantilla aprobada. Por
-- eso el saludo se dispara en el primer mensaje entrante, no en el
-- guardado del telefono.
-- ============================================================

alter table public.profiles
  add column if not exists whatsapp_confirmado_at timestamptz;

-- ============================================================
-- profiles.phone unico
-- Migracion 017
-- ------------------------------------------------------------
-- El webhook de WhatsApp (web/app/api/webhooks/whatsapp/route.js)
-- busca al usuario con `.eq('phone', ...).single()`. Sin un
-- constraint unico, dos cuentas podrian guardar el mismo numero y
-- esa busqueda fallaria en silencio (single() con mas de una fila
-- devuelve error, no la fila) justo como el bug que PhoneGate
-- resuelve para el caso de telefono ausente.
--
-- NULL sigue permitido y sin choques entre si (unique en Postgres
-- no compara NULLs entre ellos), asi que los perfiles que aun no
-- completaron el onboarding de PhoneGate no se ven afectados.
--
-- El indice no unico de la migracion 009 queda redundante: el
-- constraint unico ya crea su propio indice.
-- ============================================================

drop index if exists public.idx_profiles_phone;

alter table public.profiles
  add constraint profiles_phone_unique unique (phone);

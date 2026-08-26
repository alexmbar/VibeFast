-- ============================================================
-- Simplifica el wizard de onboarding a un solo paso obligatorio
-- Migracion 042
-- ------------------------------------------------------------
-- Decidido el 2026-08-26 tras explorar la demo de un competidor
-- (Zentavo, que no tiene wizard secuencial): los pasos "carga_inicial",
-- "bancos" y "recurrencias" ya eran opcionales (cada uno con boton
-- "Omitir por ahora"/"Continuar sin agregar"), pero igual forzaban 3
-- pantallas completas entre el registro y el primer uso real de la
-- app. Se reemplazan por un banner descartable en el dashboard
-- (OnboardingBanner, web/components/onboarding/) que nudgea sin
-- bloquear -- ver "Transacciones (vista combinada)" y el resto de
-- decisiones de este mismo dia en CLAUDE.md para el contexto completo.
--
-- "telefono" se queda como el unico paso bloqueante: sin eso la
-- captura por WhatsApp no puede identificar al usuario (ver
-- web/app/api/webhooks/whatsapp/route.js), no es opcional.
-- ============================================================

-- Cualquiera a medio wizard ya paso el unico paso que de verdad
-- importa (telefono) -- se marca completado, igual que el backfill
-- que ya hizo 024_onboarding_wizard.sql para los usuarios pre-wizard.
update public.profiles
  set onboarding_step = 'completado'
  where onboarding_step in ('carga_inicial', 'bancos', 'recurrencias');

alter table public.profiles
  drop constraint onboarding_step_valido;

alter table public.profiles
  add constraint onboarding_step_valido
  check (onboarding_step in ('telefono', 'completado'));

-- Dismiss persistente del banner (por usuario, no global): una vez que
-- alguien lo cierra, no debe reaparecer en cada visita al dashboard.
alter table public.profiles
  add column if not exists onboarding_banner_dismissed boolean not null default false;

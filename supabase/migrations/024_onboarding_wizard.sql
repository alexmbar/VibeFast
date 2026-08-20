-- ============================================================
-- Wizard de onboarding: carga inicial de efectivo por WhatsApp
-- Migracion 023
-- ------------------------------------------------------------
-- Extiende el registro de un solo paso (telefono) a un wizard de
-- 4 pasos: telefono, carga inicial de efectivo (validada por
-- WhatsApp), cuentas bancarias y movimientos recurrentes.
-- ============================================================

-- ------------------------------------------------------------
-- a) profiles.onboarding_step: en que paso del wizard va cada
-- usuario. El webhook de WhatsApp lo usa para saber si un mensaje
-- entrante es la carga inicial de efectivo o un gasto/retiro
-- normal (ver web/app/api/webhooks/whatsapp/route.js).
-- ------------------------------------------------------------

alter table public.profiles
  add column if not exists onboarding_step text not null default 'telefono';

alter table public.profiles
  add constraint onboarding_step_valido
  check (onboarding_step in ('telefono', 'carga_inicial', 'bancos', 'recurrencias', 'completado'));

-- Los usuarios que ya tenian telefono registrado ya pasaron el gate
-- actual (PhoneGate): no deben volver a ver el wizard. Sin este
-- backfill, el DEFAULT 'telefono' de la columna nueva los dejaria
-- atorados en el primer paso.
update public.profiles set onboarding_step = 'completado' where phone is not null;

-- ------------------------------------------------------------
-- b) retiros admite un retiro "carga inicial" sin banco. La carga
-- inicial de efectivo ocurre antes de que el usuario tenga bancos
-- registrados, asi que banco_id no puede seguir siendo NOT NULL.
-- ------------------------------------------------------------

alter table retiros alter column banco_id drop not null;

alter table retiros add column es_carga_inicial boolean not null default false;

alter table retiros add constraint retiro_banco_o_carga_inicial
  check (es_carga_inicial or banco_id is not null);

-- Solo una carga inicial por usuario.
create unique index idx_retiros_carga_inicial_unica
  on retiros(user_id) where es_carga_inicial;

-- El trigger de 015_retiros.sql exige banco tipo=debito para todo
-- retiro; la carga inicial no tiene banco, asi que se salta esa
-- validacion cuando es_carga_inicial=true.
create or replace function validar_banco_debito_retiro()
returns trigger as $$
declare
  v_tipo text;
  v_user_id uuid;
begin
  if NEW.es_carga_inicial then
    return NEW;
  end if;

  select tipo, user_id into v_tipo, v_user_id from bancos where id = NEW.banco_id;

  if v_user_id is distinct from NEW.user_id then
    raise exception 'El banco no pertenece al usuario';
  end if;

  if v_tipo is distinct from 'debito' then
    raise exception 'El banco de un retiro debe ser de tipo debito';
  end if;

  return NEW;
end;
$$ language plpgsql;

-- ------------------------------------------------------------
-- c) bancos.alias deja de ser exclusivo de cuentas credito: el
-- paso de bancos del wizard permite capturar ultimos 4 digitos /
-- apodo tambien en cuentas debito. El resto de los campos de
-- 022_bancos_datos_credito.sql (dia_corte, dia_limite_pago,
-- limite_credito, tasa_interes) se quedan exclusivos de credito.
-- ------------------------------------------------------------

alter table bancos drop constraint campos_credito_solo_en_credito;

alter table bancos add constraint campos_credito_solo_en_credito check (
  tipo = 'credito' or (
    dia_corte is null
    and dia_limite_pago is null
    and limite_credito is null
    and tasa_interes is null
  )
);

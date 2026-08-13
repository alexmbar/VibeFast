-- Preferencia por usuario: mostrar u ocultar el razonamiento y las tool
-- calls del agente de gastos (/agente). Deshabilitado por default: el
-- usuario ve solo la respuesta final salvo que lo active desde /profile.
alter table public.profiles
add column if not exists mostrar_pensamiento_agente boolean not null default false;

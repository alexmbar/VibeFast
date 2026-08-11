-- Agregar campo phone a profiles para WhatsApp
alter table public.profiles
add column if not exists phone text;

create index if not exists idx_profiles_phone on public.profiles(phone);

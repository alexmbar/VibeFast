-- ============================================================
-- 010 · Backfill de profiles faltantes
-- ------------------------------------------------------------
-- Usuarios en auth.users sin fila en public.profiles (cuentas
-- creadas antes de que existiera el trigger handle_new_user, o
-- casos donde el trigger no corrio) rompen /profile con el error
-- de PostgREST "Cannot coerce the result to a single JSON object"
-- porque el .single() no encuentra fila.
--
-- Esta migracion inserta la fila faltante para cada uno,
-- replicando la misma logica que public.handle_new_user().
-- ============================================================

insert into public.profiles (id, email, full_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

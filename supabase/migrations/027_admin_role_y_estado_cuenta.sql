-- ============================================================
-- Rol de admin y estado de cuenta en profiles
-- Migracion 027
-- ------------------------------------------------------------
-- role: distingue al dueno del SaaS ("admin") de un usuario
-- normal. Es la fuente de verdad que valida el middleware/layout
-- de /admin antes de dejar entrar a esa zona.
--
-- estado_cuenta: independiente de role. "suspendida" bloquea el
-- portal web (se redirige a un aviso de renovar suscripcion) pero
-- NO bloquea la captura por WhatsApp: el webhook sigue guardando
-- gastos con normalidad, solo se le agrega un recordatorio de
-- renovar en la respuesta. Ver web/app/api/webhooks/whatsapp/route.js.
-- ============================================================

ALTER TABLE profiles
ADD COLUMN role TEXT NOT NULL DEFAULT 'usuario',
ADD COLUMN estado_cuenta TEXT NOT NULL DEFAULT 'activa';

ALTER TABLE profiles
ADD CONSTRAINT role_valido CHECK (role IN ('usuario', 'admin')),
ADD CONSTRAINT estado_cuenta_valido CHECK (estado_cuenta IN ('activa', 'suspendida'));

-- ------------------------------------------------------------
-- La policy "profiles_update_own" (007_rls_policies.sql) deja
-- que cada usuario actualice cualquier columna de su propia fila,
-- role y estado_cuenta incluidos. Sin este trigger, un usuario
-- podria auto-promoverse a admin con un UPDATE directo desde el
-- cliente. Solo el service_role (usado por el backend del admin,
-- que ignora RLS) puede tocar estas dos columnas.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_self_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.estado_cuenta IS DISTINCT FROM OLD.estado_cuenta)
     AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'role y estado_cuenta solo los puede cambiar el admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER profiles_prevent_self_privilege_escalation
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION prevent_self_privilege_escalation();

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_estado_cuenta ON profiles(estado_cuenta);

-- ============================================================
-- Tabla admin_audit_log: bitacora de acciones del admin
-- Migracion 028
-- ------------------------------------------------------------
-- El admin puede leer/tocar datos de cualquier usuario saltandose
-- RLS (via service_role, solo desde el backend de /admin). Sin
-- esta bitacora no hay forma de saber que vio o cambio.
--
-- entidad + entidad_id describen la fila afectada de forma libre
-- ("profiles" / el uuid del usuario, por ejemplo) porque el admin
-- puede tocar mas de una tabla y no vale la pena una FK por cada
-- una.
-- ============================================================

CREATE TABLE admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  accion TEXT NOT NULL,
  entidad TEXT NOT NULL,
  entidad_id TEXT,
  detalle JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT accion_no_vacia CHECK (btrim(accion) <> ''),
  CONSTRAINT entidad_no_vacia CHECK (btrim(entidad) <> '')
);

CREATE INDEX idx_admin_audit_log_admin_fecha ON admin_audit_log(admin_id, created_at DESC);
CREATE INDEX idx_admin_audit_log_entidad ON admin_audit_log(entidad, entidad_id);

-- Habilitar RLS sin policies: nadie desde el cliente lee o escribe
-- esta tabla. Solo el service_role (backend de /admin) la usa,
-- porque ignora RLS. Mismo patron que waitlist (007_rls_policies.sql).
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

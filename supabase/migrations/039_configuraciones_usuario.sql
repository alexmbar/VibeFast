-- ============================================================
-- Configuraciones de usuario: zona horaria, moneda, formato de fecha
-- ------------------------------------------------------------
-- Preferencias por usuario (no globales). zona_horaria se usa para
-- convertir la hora de captura por WhatsApp a la `fecha` que se guarda
-- (nunca cambia el tipo de `fecha`, ver "Reglas de esquema" en
-- CLAUDE.md). moneda y formato_fecha solo afectan como se muestran
-- montos/fechas ya guardados.
-- ============================================================

ALTER TABLE profiles
ADD COLUMN zona_horaria TEXT NOT NULL DEFAULT 'America/Mexico_City',
ADD COLUMN moneda TEXT NOT NULL DEFAULT 'MXN',
ADD COLUMN formato_fecha TEXT NOT NULL DEFAULT 'DD/MM/AAAA';

ALTER TABLE profiles
ADD CONSTRAINT zona_horaria_valida CHECK (
  zona_horaria IN ('America/Mexico_City', 'America/Tijuana', 'America/Hermosillo', 'America/Cancun')
),
ADD CONSTRAINT moneda_valida CHECK (moneda IN ('MXN', 'USD')),
ADD CONSTRAINT formato_fecha_valido CHECK (
  formato_fecha IN ('DD/MM/AAAA', 'MM/DD/AAAA', 'AAAA-MM-DD')
);

-- Reutiliza "profiles_update_own" (007_rls_policies.sql): ya permite que
-- cada usuario actualice cualquier columna de su propia fila, y estas 3
-- no son privilegiadas (no necesitan el trigger de
-- prevent_self_privilege_escalation que protege role/estado_cuenta).

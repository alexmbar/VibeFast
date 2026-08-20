-- ============================================================
-- Funciones de agregados para /admin
-- Migracion 031
-- ------------------------------------------------------------
-- A diferencia de balance_neto/cartera_saldo (016, 020), estas
-- funciones SI cruzan usuarios -- por diseno, es lo que necesita
-- el dashboard del dueno. SECURITY DEFINER + search_path fijo para
-- que corran con el dueno de la funcion (que si puede leer todas
-- las filas) sin importar RLS, pero el GRANT/REVOKE de abajo deja
-- su ejecucion exclusiva al service_role: nunca a "anon" ni
-- "authenticated", para que un usuario normal no pueda invocarlas
-- via RPC aunque conozca el nombre.
--
-- Solo devuelven conteos y montos agregados de TODA la plataforma,
-- nunca una fila identificable de gasto/ingreso de un usuario --
-- esa es la frontera acordada para lo que el admin puede ver.
-- ============================================================

CREATE OR REPLACE FUNCTION admin_metricas_negocio()
RETURNS TABLE (
  usuarios_totales BIGINT,
  altas_semana BIGINT,
  usuarios_activos_30d BIGINT,
  gastos_capturados_mes BIGINT,
  ingresos_capturados_mes BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM profiles),
    (SELECT COUNT(*) FROM profiles WHERE created_at >= now() - INTERVAL '7 days'),
    (
      SELECT COUNT(DISTINCT user_id) FROM (
        SELECT user_id FROM gastos WHERE fecha >= (CURRENT_DATE - INTERVAL '30 days')
        UNION
        SELECT user_id FROM ingresos WHERE fecha >= (CURRENT_DATE - INTERVAL '30 days')
      ) activos
    ),
    (SELECT COUNT(*) FROM gastos WHERE fecha >= date_trunc('month', CURRENT_DATE)),
    (SELECT COUNT(*) FROM ingresos WHERE fecha >= date_trunc('month', CURRENT_DATE));
$$;

CREATE OR REPLACE FUNCTION admin_costos_openai_diario(p_desde DATE, p_hasta DATE)
RETURNS TABLE (
  fecha DATE,
  costo_centavos BIGINT,
  llamadas BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    created_at::date AS fecha,
    COALESCE(SUM(costo_estimado_centavos), 0),
    COUNT(*)
  FROM uso_openai
  WHERE created_at::date >= p_desde AND created_at::date <= p_hasta
  GROUP BY created_at::date
  ORDER BY created_at::date;
$$;

CREATE OR REPLACE FUNCTION admin_costos_openai_por_usuario(p_desde DATE, p_hasta DATE)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  costo_centavos BIGINT,
  llamadas BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.user_id,
    p.email,
    COALESCE(SUM(u.costo_estimado_centavos), 0),
    COUNT(*)
  FROM uso_openai u
  JOIN profiles p ON p.id = u.user_id
  WHERE u.created_at::date >= p_desde AND u.created_at::date <= p_hasta
  GROUP BY u.user_id, p.email
  ORDER BY COALESCE(SUM(u.costo_estimado_centavos), 0) DESC;
$$;

REVOKE ALL ON FUNCTION admin_metricas_negocio() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION admin_costos_openai_diario(DATE, DATE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION admin_costos_openai_por_usuario(DATE, DATE) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION admin_metricas_negocio() TO service_role;
GRANT EXECUTE ON FUNCTION admin_costos_openai_diario(DATE, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION admin_costos_openai_por_usuario(DATE, DATE) TO service_role;

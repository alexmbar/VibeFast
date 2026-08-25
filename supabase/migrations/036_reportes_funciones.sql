-- ============================================================
-- Funciones de /reportes: resumen, series por mes/dia y top
-- categorias
-- Migracion 036
-- ------------------------------------------------------------
-- Se calculan en la BD, no en JS -- mismo motivo que balance_neto
-- (020) y gastos_por_corte (035): reportes/page.js sumaba estas
-- mismas cifras en el cliente sobre listarGastos/listarIngresos con
-- limit=1000, asi que un usuario con mas de 1000 movimientos en el
-- rango filtrado veia totales truncados sin ningun aviso.
--
-- p_desde/p_hasta son NULL por defecto (sin acotar = todo el
-- historial), igual que balance_neto. SECURITY INVOKER + auth.uid()
-- explicito en cada tabla, mismo criterio de "no confiar en la capa
-- de API" que ya usa el resto de funciones del proyecto.
-- ============================================================

-- Totales y conteos para las tarjetas de resumen de /reportes.
CREATE OR REPLACE FUNCTION gastos_ingresos_resumen(p_desde DATE DEFAULT NULL, p_hasta DATE DEFAULT NULL)
RETURNS TABLE(total_gastos INTEGER, total_ingresos INTEGER, num_gastos INTEGER, num_ingresos INTEGER, dias_unicos INTEGER)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    COALESCE((
      SELECT SUM(monto) FROM gastos
      WHERE user_id = auth.uid()
        AND (p_desde IS NULL OR fecha >= p_desde)
        AND (p_hasta IS NULL OR fecha <= p_hasta)
    ), 0)::INTEGER,
    COALESCE((
      SELECT SUM(monto) FROM ingresos
      WHERE user_id = auth.uid()
        AND (p_desde IS NULL OR fecha >= p_desde)
        AND (p_hasta IS NULL OR fecha <= p_hasta)
    ), 0)::INTEGER,
    COALESCE((
      SELECT COUNT(*) FROM gastos
      WHERE user_id = auth.uid()
        AND (p_desde IS NULL OR fecha >= p_desde)
        AND (p_hasta IS NULL OR fecha <= p_hasta)
    ), 0)::INTEGER,
    COALESCE((
      SELECT COUNT(*) FROM ingresos
      WHERE user_id = auth.uid()
        AND (p_desde IS NULL OR fecha >= p_desde)
        AND (p_hasta IS NULL OR fecha <= p_hasta)
    ), 0)::INTEGER,
    COALESCE((
      SELECT COUNT(DISTINCT fecha) FROM gastos
      WHERE user_id = auth.uid()
        AND (p_desde IS NULL OR fecha >= p_desde)
        AND (p_hasta IS NULL OR fecha <= p_hasta)
    ), 0)::INTEGER;
$$;

-- Serie mensual (gasto vs. ingreso), hasta p_meses filas, la mas
-- reciente primero -- el caller la revierte para graficar ascendente.
CREATE OR REPLACE FUNCTION gastos_ingresos_por_mes(p_desde DATE DEFAULT NULL, p_hasta DATE DEFAULT NULL, p_meses INTEGER DEFAULT 12)
RETURNS TABLE(mes TEXT, total_gastos INTEGER, total_ingresos INTEGER)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH meses_gasto AS (
    SELECT to_char(fecha, 'YYYY-MM') AS mes, SUM(monto) AS total
    FROM gastos
    WHERE user_id = auth.uid()
      AND (p_desde IS NULL OR fecha >= p_desde)
      AND (p_hasta IS NULL OR fecha <= p_hasta)
    GROUP BY mes
  ),
  meses_ingreso AS (
    SELECT to_char(fecha, 'YYYY-MM') AS mes, SUM(monto) AS total
    FROM ingresos
    WHERE user_id = auth.uid()
      AND (p_desde IS NULL OR fecha >= p_desde)
      AND (p_hasta IS NULL OR fecha <= p_hasta)
    GROUP BY mes
  ),
  todos_meses AS (
    SELECT mes FROM meses_gasto
    UNION
    SELECT mes FROM meses_ingreso
  )
  SELECT
    t.mes,
    COALESCE(g.total, 0)::INTEGER,
    COALESCE(i.total, 0)::INTEGER
  FROM todos_meses t
  LEFT JOIN meses_gasto g ON g.mes = t.mes
  LEFT JOIN meses_ingreso i ON i.mes = t.mes
  ORDER BY t.mes DESC
  LIMIT p_meses;
$$;

-- Serie diaria (gasto vs. ingreso), hasta p_dias filas, la mas
-- reciente primero -- el caller la revierte para graficar ascendente.
CREATE OR REPLACE FUNCTION gastos_ingresos_por_dia(p_desde DATE DEFAULT NULL, p_hasta DATE DEFAULT NULL, p_dias INTEGER DEFAULT 30)
RETURNS TABLE(fecha DATE, total_gastos INTEGER, total_ingresos INTEGER)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH dias_gasto AS (
    SELECT fecha, SUM(monto) AS total
    FROM gastos
    WHERE user_id = auth.uid()
      AND (p_desde IS NULL OR fecha >= p_desde)
      AND (p_hasta IS NULL OR fecha <= p_hasta)
    GROUP BY fecha
  ),
  dias_ingreso AS (
    SELECT fecha, SUM(monto) AS total
    FROM ingresos
    WHERE user_id = auth.uid()
      AND (p_desde IS NULL OR fecha >= p_desde)
      AND (p_hasta IS NULL OR fecha <= p_hasta)
    GROUP BY fecha
  ),
  todos_dias AS (
    SELECT fecha FROM dias_gasto
    UNION
    SELECT fecha FROM dias_ingreso
  )
  SELECT
    t.fecha,
    COALESCE(g.total, 0)::INTEGER,
    COALESCE(i.total, 0)::INTEGER
  FROM todos_dias t
  LEFT JOIN dias_gasto g ON g.fecha = t.fecha
  LEFT JOIN dias_ingreso i ON i.fecha = t.fecha
  ORDER BY t.fecha DESC
  LIMIT p_dias;
$$;

-- Top categorias de gasto por total, p_top filas (default 5, para la
-- grafica de pastel "Top 5 Categorias").
CREATE OR REPLACE FUNCTION gastos_por_categoria(p_desde DATE DEFAULT NULL, p_hasta DATE DEFAULT NULL, p_top INTEGER DEFAULT 5)
RETURNS TABLE(categoria TEXT, total INTEGER)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT categoria, SUM(monto)::INTEGER AS total
  FROM gastos
  WHERE user_id = auth.uid()
    AND (p_desde IS NULL OR fecha >= p_desde)
    AND (p_hasta IS NULL OR fecha <= p_hasta)
  GROUP BY categoria
  ORDER BY total DESC
  LIMIT p_top;
$$;

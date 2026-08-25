-- ============================================================
-- Funcion gastos_por_corte: totales de gasto por ciclo de corte
-- de una tarjeta de credito
-- Migracion 035
-- ------------------------------------------------------------
-- Se calcula en la BD, no en JS -- mismo motivo que balance_neto
-- (020) y cartera_saldo (016): sumar listas paginadas en el
-- cliente da un total incorrecto en cuanto el historial pasa esa
-- pagina.
--
-- Un ciclo es [periodo_inicio, periodo_fin), usando las fechas de
-- corte consecutivas del banco (dia_corte, clampado al ultimo dia
-- del mes si es mas corto, igual que resolverDiaMes en
-- lib/recurrencias/fechas.js). Regresa hasta p_ciclos filas, la mas
-- reciente primero, incluyendo el ciclo en curso (todavia no
-- cerrado).
--
-- SECURITY INVOKER + auth.uid() explicito en ambas tablas (bancos y
-- gastos), para que no se pueda pedir el corte de un banco ajeno
-- aunque falle algo en la capa de API -- mismo criterio que
-- balance_neto.
-- ============================================================

CREATE OR REPLACE FUNCTION gastos_por_corte(p_banco_id BIGINT, p_ciclos INTEGER DEFAULT 12)
RETURNS TABLE(periodo_inicio DATE, periodo_fin DATE, total INTEGER, num_movimientos INTEGER)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  v_dia_corte INTEGER;
BEGIN
  SELECT dia_corte INTO v_dia_corte
  FROM bancos
  WHERE id = p_banco_id AND user_id = auth.uid() AND tipo = 'credito';

  IF v_dia_corte IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH meses AS (
    SELECT generate_series(
      date_trunc('month', CURRENT_DATE) - ((p_ciclos + 1) || ' months')::interval,
      date_trunc('month', CURRENT_DATE) + interval '1 month',
      interval '1 month'
    )::date AS mes_inicio
  ),
  fechas_corte AS (
    SELECT (
      mes_inicio + (LEAST(
        v_dia_corte,
        EXTRACT(DAY FROM ((mes_inicio + interval '1 month') - interval '1 day'))::int
      ) - 1) * interval '1 day'
    )::date AS fecha_corte
    FROM meses
  ),
  ciclos AS (
    SELECT
      LAG(fecha_corte) OVER (ORDER BY fecha_corte) AS c_inicio,
      fecha_corte AS c_fin
    FROM fechas_corte
  )
  SELECT
    c.c_inicio,
    c.c_fin,
    COALESCE(SUM(g.monto), 0)::INTEGER,
    COUNT(g.id)::INTEGER
  FROM ciclos c
  LEFT JOIN gastos g
    ON g.banco_id = p_banco_id
    AND g.user_id = auth.uid()
    AND g.fecha >= c.c_inicio
    AND g.fecha < c.c_fin
  WHERE c.c_inicio IS NOT NULL
  GROUP BY c.c_inicio, c.c_fin
  ORDER BY c.c_fin DESC
  LIMIT p_ciclos;
END;
$$;

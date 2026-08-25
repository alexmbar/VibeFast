-- ============================================================
-- Funcion presupuestos_estado: gasto acumulado del periodo vigente
-- por presupuesto activo
-- Migracion 038
-- ------------------------------------------------------------
-- Se calcula en la BD, no en JS -- mismo motivo que balance_neto (020),
-- gastos_por_corte (035) y las funciones de reportes (036): sumar
-- gastos de una lista paginada en el cliente da un total incorrecto en
-- cuanto el historial pasa esa pagina.
--
-- Para cada presupuesto activo de p_user_id, el "periodo vigente" es:
--   - banco_id IS NULL: el mes calendario en curso.
--   - banco_id IS NOT NULL: el ciclo de corte en curso de esa tarjeta,
--     con el mismo clamp de dia_corte al ultimo dia del mes que usa
--     gastos_por_corte (035) -- pero solo el ciclo actual, no 12 de
--     historial.
-- El presupuesto cuenta *todo* el gasto de ese periodo, incluido el
-- anterior a la fecha en que se creo el presupuesto (no hay columna de
-- "desde cuando cuenta"): confirmado con el usuario como comportamiento
-- esperado.
--
-- Recibe p_user_id explicito en vez de depender solo de auth.uid()
-- porque el hook que la llama (verificarPresupuesto, ver CLAUDE.md
-- seccion "Presupuestos") corre tambien desde contextos de
-- service-role sin sesion (webhook de WhatsApp, cron de recurrencias),
-- donde auth.uid() es NULL. Sigue siendo seguro para un caller
-- autenticado normal: RLS sobre presupuestos/gastos sigue filtrando
-- por auth.uid() = user_id sin importar que p_user_id se intente pasar.
-- ============================================================

CREATE OR REPLACE FUNCTION presupuestos_estado(p_user_id UUID)
RETURNS TABLE(
  presupuesto_id BIGINT,
  categoria TEXT,
  banco_id BIGINT,
  monto_limite INTEGER,
  periodo_inicio DATE,
  periodo_fin DATE,
  total_gastado INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  r RECORD;
  v_dia_corte INTEGER;
  v_mes_actual DATE;
  v_mes_anterior DATE;
  v_mes_siguiente DATE;
  v_corte_este_mes DATE;
  v_corte_mes_anterior DATE;
  v_corte_mes_siguiente DATE;
  v_periodo_inicio DATE;
  v_periodo_fin DATE;
BEGIN
  v_mes_actual := date_trunc('month', CURRENT_DATE)::date;
  v_mes_anterior := (v_mes_actual - interval '1 month')::date;
  v_mes_siguiente := (v_mes_actual + interval '1 month')::date;

  FOR r IN
    SELECT p.id, p.categoria, p.banco_id, p.monto_limite
    FROM presupuestos p
    WHERE p.user_id = p_user_id AND p.activo = true
  LOOP
    IF r.banco_id IS NULL THEN
      v_periodo_inicio := v_mes_actual;
      v_periodo_fin := v_mes_siguiente;
    ELSE
      SELECT b.dia_corte INTO v_dia_corte
      FROM bancos b
      WHERE b.id = r.banco_id AND b.user_id = p_user_id;

      v_corte_este_mes := (v_mes_actual + (LEAST(
        v_dia_corte,
        EXTRACT(DAY FROM (v_mes_siguiente - interval '1 day'))::int
      ) - 1) * interval '1 day')::date;

      IF CURRENT_DATE < v_corte_este_mes THEN
        v_corte_mes_anterior := (v_mes_anterior + (LEAST(
          v_dia_corte,
          EXTRACT(DAY FROM (v_mes_actual - interval '1 day'))::int
        ) - 1) * interval '1 day')::date;
        v_periodo_inicio := v_corte_mes_anterior;
        v_periodo_fin := v_corte_este_mes;
      ELSE
        v_corte_mes_siguiente := (v_mes_siguiente + (LEAST(
          v_dia_corte,
          EXTRACT(DAY FROM ((v_mes_siguiente + interval '1 month') - interval '1 day'))::int
        ) - 1) * interval '1 day')::date;
        v_periodo_inicio := v_corte_este_mes;
        v_periodo_fin := v_corte_mes_siguiente;
      END IF;
    END IF;

    RETURN QUERY
    SELECT
      r.id,
      r.categoria,
      r.banco_id,
      r.monto_limite,
      v_periodo_inicio,
      v_periodo_fin,
      COALESCE((
        SELECT SUM(g.monto) FROM gastos g
        WHERE g.user_id = p_user_id
          AND g.categoria = r.categoria
          AND g.fecha >= v_periodo_inicio
          AND g.fecha < v_periodo_fin
      ), 0)::INTEGER;
  END LOOP;
END;
$$;

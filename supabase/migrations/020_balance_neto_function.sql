-- ============================================================
-- Funcion balance_neto: ingresos - gastos en un rango de fechas
-- Migracion 020
-- ------------------------------------------------------------
-- Se calcula en la BD, no en JS -- mismo motivo que cartera_saldo
-- (016): listarGastos/listarIngresos paginan, asi que sumar una
-- lista paginada en el cliente da un total incorrecto en cuanto el
-- historial pase esa pagina.
--
-- p_desde/p_hasta son NULL por defecto (sin acotar = todo el
-- historial). Usa auth.uid() internamente, no recibe user_id por
-- parametro, para que no se pueda pedir el balance de otro usuario
-- aunque falle algo en la capa de API.
-- ============================================================

CREATE OR REPLACE FUNCTION balance_neto(p_desde DATE DEFAULT NULL, p_hasta DATE DEFAULT NULL)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    COALESCE((
      SELECT SUM(monto) FROM ingresos
      WHERE user_id = auth.uid()
        AND (p_desde IS NULL OR fecha >= p_desde)
        AND (p_hasta IS NULL OR fecha <= p_hasta)
    ), 0)
    - COALESCE((
      SELECT SUM(monto) FROM gastos
      WHERE user_id = auth.uid()
        AND (p_desde IS NULL OR fecha >= p_desde)
        AND (p_hasta IS NULL OR fecha <= p_hasta)
    ), 0);
$$;

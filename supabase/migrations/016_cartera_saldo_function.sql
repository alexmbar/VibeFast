-- ============================================================
-- Funcion cartera_saldo: saldo de efectivo disponible
-- Migracion 016
-- ------------------------------------------------------------
-- saldo = suma(retiros.monto) - suma(gastos.monto donde
-- tipo_pago = 'efectivo'). Se calcula en la BD (no en JS) porque
-- listarGastos/listarRetiros paginan: sumar una lista paginada en
-- el cliente daria un saldo incorrecto en cuanto el historial pase
-- esa pagina.
--
-- Usa auth.uid() internamente (no recibe user_id por parametro)
-- para que no se pueda pedir el saldo de otro usuario aunque falle
-- algo en la capa de API.
-- ============================================================

CREATE OR REPLACE FUNCTION cartera_saldo()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    COALESCE((SELECT SUM(monto) FROM retiros WHERE user_id = auth.uid()), 0)
    - COALESCE((SELECT SUM(monto) FROM gastos WHERE user_id = auth.uid() AND tipo_pago = 'efectivo'), 0);
$$;

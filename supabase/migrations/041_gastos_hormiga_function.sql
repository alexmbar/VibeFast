-- ============================================================
-- Funcion gastos_hormiga: deteccion de compras pequenas repetidas
-- Migracion 041
-- ------------------------------------------------------------
-- Agrupa gastos por `tienda` (no por categoria) dentro del periodo del
-- reporte y marca como "hormiga" los grupos con p_min_compras o mas
-- compras -- mismo criterio que se observo en la demo de un competidor
-- (Zentavo) explorando su deteccion: agrupan por texto exacto del
-- campo "Negocio", con un umbral de repeticion >= 3 (2 compras a un
-- mismo comercio no calificaron, 4 si). No necesita cambios al parseo
-- de OpenAI Vision ni una tabla nueva -- es una vista agregada sobre
-- `gastos` existente, mismo patron que gastos_por_categoria (036): se
-- calcula en la BD, nunca sumando/agrupando en JS sobre una lista
-- paginada.
--
-- Excluye tienda NULL/vacia: sin nombre de comercio no hay grupo
-- significativo que marcar como hormiga.
-- ============================================================

CREATE OR REPLACE FUNCTION gastos_hormiga(p_desde DATE DEFAULT NULL, p_hasta DATE DEFAULT NULL, p_min_compras INTEGER DEFAULT 3)
RETURNS TABLE(tienda TEXT, num_compras INTEGER, total INTEGER, promedio INTEGER)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    tienda,
    COUNT(*)::INTEGER AS num_compras,
    SUM(monto)::INTEGER AS total,
    ROUND(AVG(monto))::INTEGER AS promedio
  FROM gastos
  WHERE user_id = auth.uid()
    AND tienda IS NOT NULL
    AND tienda <> ''
    AND (p_desde IS NULL OR fecha >= p_desde)
    AND (p_hasta IS NULL OR fecha <= p_hasta)
  GROUP BY tienda
  HAVING COUNT(*) >= p_min_compras
  ORDER BY total DESC;
$$;
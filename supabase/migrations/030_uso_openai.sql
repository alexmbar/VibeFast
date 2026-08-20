-- ============================================================
-- Tabla uso_openai: costo operativo por llamada a OpenAI
-- Migracion 030
-- ------------------------------------------------------------
-- Una fila por llamada (Vision al parsear un ticket/PDF, o el
-- agente conversacional). Es costo NUESTRO (lo que pagamos a
-- OpenAI), no un dato financiero del usuario, por eso el admin
-- puede ver el desglose por usuario en /admin/costos sin romper
-- la regla de "nunca ver datos financieros de los usuarios" --
-- esa regla aplica a gastos/ingresos, no a esta tabla.
--
-- costo_estimado_centavos: igual que gastos.monto, entero en
-- centavos, nunca float (misma regla de esquema del proyecto).
-- ============================================================

CREATE TABLE uso_openai (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  contexto TEXT NOT NULL,
  modelo TEXT NOT NULL,
  tokens_entrada INTEGER NOT NULL,
  tokens_salida INTEGER NOT NULL,
  costo_estimado_centavos INTEGER NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT contexto_valido CHECK (contexto IN ('vision_ticket', 'agente_chat')),
  CONSTRAINT tokens_entrada_no_negativos CHECK (tokens_entrada >= 0),
  CONSTRAINT tokens_salida_no_negativos CHECK (tokens_salida >= 0),
  CONSTRAINT costo_no_negativo CHECK (costo_estimado_centavos >= 0)
);

CREATE INDEX idx_uso_openai_user_fecha ON uso_openai(user_id, created_at DESC);
CREATE INDEX idx_uso_openai_fecha ON uso_openai(created_at DESC);

-- Solo service_role: ni el propio usuario ni ningun otro cliente
-- autenticado necesita leer esto hoy. Si mas adelante se quiere
-- mostrar "tu consumo de IA" al usuario, se agrega una policy
-- select-own aparte -- no abrirla por defecto.
ALTER TABLE uso_openai ENABLE ROW LEVEL SECURITY;

-- Quick RLS Fix - Execute no Supabase Dashboard > SQL Editor
-- Este script adiciona as policies mínimas para formulários públicos funcionarem

-- 1. RLS para Analytics (tracking público)
ALTER TABLE yeslaser_formulario_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert analytics" ON yeslaser_formulario_analytics;
CREATE POLICY "Public can insert analytics" ON yeslaser_formulario_analytics
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can view analytics" ON yeslaser_formulario_analytics;
CREATE POLICY "Authenticated can view analytics" ON yeslaser_formulario_analytics
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. RLS para Submissões (envio de formulário público)
ALTER TABLE yeslaser_formulario_submissoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert submissoes" ON yeslaser_formulario_submissoes;
CREATE POLICY "Public can insert submissoes" ON yeslaser_formulario_submissoes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM yeslaser_formularios
      WHERE id = formulario_id
      AND ativo = true
    )
  );

DROP POLICY IF EXISTS "Authenticated can view submissoes" ON yeslaser_formulario_submissoes;
CREATE POLICY "Authenticated can view submissoes" ON yeslaser_formulario_submissoes
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. RLS para Leads (criação via formulário público)
ALTER TABLE sistema_leads_yeslaser ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert leads" ON sistema_leads_yeslaser;
CREATE POLICY "Public can insert leads" ON sistema_leads_yeslaser
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can view leads" ON sistema_leads_yeslaser;
CREATE POLICY "Authenticated can view leads" ON sistema_leads_yeslaser
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can update leads" ON sistema_leads_yeslaser;
CREATE POLICY "Authenticated can update leads" ON sistema_leads_yeslaser
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Criar tabela A/B Tests (se não existir)
CREATE TABLE IF NOT EXISTS yeslaser_formulario_ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_original_id uuid NOT NULL REFERENCES yeslaser_formularios(id) ON DELETE CASCADE,
  franqueado_id uuid REFERENCES yeslaser_franqueados(id),
  nome varchar(255) NOT NULL,
  descricao text,
  status varchar(20) DEFAULT 'rascunho',
  metrica_principal varchar(50) DEFAULT 'conversion_rate',
  duracao_dias integer,
  min_submissoes integer DEFAULT 100,
  vencedor_id uuid REFERENCES yeslaser_formularios(id),
  confianca_estatistica decimal(5,2),
  inicio_at timestamp with time zone,
  fim_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS para A/B Tests
ALTER TABLE yeslaser_formulario_ab_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can manage ab_tests" ON yeslaser_formulario_ab_tests;
CREATE POLICY "Authenticated can manage ab_tests" ON yeslaser_formulario_ab_tests
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ab_tests_formulario ON yeslaser_formulario_ab_tests(formulario_original_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON yeslaser_formulario_ab_tests(status);

-- Verificação
SELECT 'RLS Policies aplicadas com sucesso!' as resultado;

-- Migration: 20250128_fix_rls_and_ab_tests.sql
-- Purpose: Fix RLS policies for public form submission and create A/B tests table
-- Author: Claude + Danilo
-- Date: 2025-01-28

-- ROLLBACK PLAN:
-- BEGIN;
-- DROP TABLE IF EXISTS yeslaser_formulario_ab_tests;
-- DROP POLICY IF EXISTS "Public can insert analytics" ON yeslaser_formulario_analytics;
-- DROP POLICY IF EXISTS "Public can insert submissoes" ON yeslaser_formulario_submissoes;
-- DROP POLICY IF EXISTS "Public can insert leads from forms" ON sistema_leads_yeslaser;
-- COMMIT;

BEGIN;

-- =============================================================
-- 1. CREATE A/B TESTS TABLE
-- =============================================================

CREATE TABLE IF NOT EXISTS yeslaser_formulario_ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_original_id uuid NOT NULL REFERENCES yeslaser_formularios(id) ON DELETE CASCADE,
  franqueado_id uuid REFERENCES yeslaser_franqueados(id),
  nome varchar(255) NOT NULL,
  descricao text,
  status varchar(20) DEFAULT 'rascunho', -- rascunho, ativo, pausado, finalizado
  metrica_principal varchar(50) DEFAULT 'conversion_rate', -- conversion_rate, submit_rate, time_on_form
  duracao_dias integer,
  min_submissoes integer DEFAULT 100,
  vencedor_id uuid REFERENCES yeslaser_formularios(id),
  confianca_estatistica decimal(5,2),
  inicio_at timestamp with time zone,
  fim_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add comment
COMMENT ON TABLE yeslaser_formulario_ab_tests IS 'Testes A/B para comparar variantes de formularios';

-- Indexes for A/B tests table
CREATE INDEX IF NOT EXISTS idx_ab_tests_formulario ON yeslaser_formulario_ab_tests(formulario_original_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON yeslaser_formulario_ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_tests_franqueado ON yeslaser_formulario_ab_tests(franqueado_id);

-- =============================================================
-- 2. RLS POLICIES FOR A/B TESTS TABLE
-- =============================================================

ALTER TABLE yeslaser_formulario_ab_tests ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view A/B tests
DROP POLICY IF EXISTS "Authenticated users can view ab_tests" ON yeslaser_formulario_ab_tests;
CREATE POLICY "Authenticated users can view ab_tests" ON yeslaser_formulario_ab_tests
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert A/B tests
DROP POLICY IF EXISTS "Authenticated users can insert ab_tests" ON yeslaser_formulario_ab_tests;
CREATE POLICY "Authenticated users can insert ab_tests" ON yeslaser_formulario_ab_tests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update A/B tests
DROP POLICY IF EXISTS "Authenticated users can update ab_tests" ON yeslaser_formulario_ab_tests;
CREATE POLICY "Authenticated users can update ab_tests" ON yeslaser_formulario_ab_tests
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete A/B tests
DROP POLICY IF EXISTS "Authenticated users can delete ab_tests" ON yeslaser_formulario_ab_tests;
CREATE POLICY "Authenticated users can delete ab_tests" ON yeslaser_formulario_ab_tests
  FOR DELETE
  TO authenticated
  USING (true);

-- =============================================================
-- 3. RLS POLICIES FOR ANALYTICS (PUBLIC INSERT)
-- =============================================================

-- Enable RLS if not already enabled
ALTER TABLE yeslaser_formulario_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert analytics (public tracking)
DROP POLICY IF EXISTS "Public can insert analytics" ON yeslaser_formulario_analytics;
CREATE POLICY "Public can insert analytics" ON yeslaser_formulario_analytics
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can view analytics
DROP POLICY IF EXISTS "Authenticated users can view analytics" ON yeslaser_formulario_analytics;
CREATE POLICY "Authenticated users can view analytics" ON yeslaser_formulario_analytics
  FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================
-- 4. RLS POLICIES FOR SUBMISSOES (PUBLIC INSERT)
-- =============================================================

-- Enable RLS if not already enabled
ALTER TABLE yeslaser_formulario_submissoes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert submissoes for active forms
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

-- Policy: Authenticated users can view submissoes
DROP POLICY IF EXISTS "Authenticated users can view submissoes" ON yeslaser_formulario_submissoes;
CREATE POLICY "Authenticated users can view submissoes" ON yeslaser_formulario_submissoes
  FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================
-- 5. RLS POLICIES FOR LEADS (PUBLIC INSERT FROM FORMS)
-- =============================================================

-- Enable RLS if not already enabled
ALTER TABLE sistema_leads_yeslaser ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert leads (from public forms)
DROP POLICY IF EXISTS "Public can insert leads from forms" ON sistema_leads_yeslaser;
CREATE POLICY "Public can insert leads from forms" ON sistema_leads_yeslaser
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can view all leads
DROP POLICY IF EXISTS "Authenticated users can view leads" ON sistema_leads_yeslaser;
CREATE POLICY "Authenticated users can view leads" ON sistema_leads_yeslaser
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update leads
DROP POLICY IF EXISTS "Authenticated users can update leads" ON sistema_leads_yeslaser;
CREATE POLICY "Authenticated users can update leads" ON sistema_leads_yeslaser
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =============================================================
-- 6. ADD MISSING COLUMNS TO LEADS TABLE (IF NOT EXISTS)
-- =============================================================

-- Add indicacao columns to leads if they don't exist
DO $$
BEGIN
  -- indicado_por_id - who referred this lead
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sistema_leads_yeslaser' AND column_name = 'indicado_por_id'
  ) THEN
    ALTER TABLE sistema_leads_yeslaser ADD COLUMN indicado_por_id uuid REFERENCES sistema_leads_yeslaser(id);
  END IF;

  -- quantidade_indicacoes - how many people this lead referred
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sistema_leads_yeslaser' AND column_name = 'quantidade_indicacoes'
  ) THEN
    ALTER TABLE sistema_leads_yeslaser ADD COLUMN quantidade_indicacoes integer DEFAULT 0;
  END IF;

  -- codigo_indicacao - unique referral code
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sistema_leads_yeslaser' AND column_name = 'codigo_indicacao'
  ) THEN
    ALTER TABLE sistema_leads_yeslaser ADD COLUMN codigo_indicacao varchar(10);
  END IF;

  -- landing_page - which LP generated this lead
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sistema_leads_yeslaser' AND column_name = 'landing_page'
  ) THEN
    ALTER TABLE sistema_leads_yeslaser ADD COLUMN landing_page varchar(255);
  END IF;
END $$;

-- Create index for indicacao columns
CREATE INDEX IF NOT EXISTS idx_leads_indicado_por ON sistema_leads_yeslaser(indicado_por_id);
CREATE INDEX IF NOT EXISTS idx_leads_codigo_indicacao ON sistema_leads_yeslaser(codigo_indicacao);

-- =============================================================
-- 7. FUNCTION TO GENERATE REFERRAL CODE
-- =============================================================

CREATE OR REPLACE FUNCTION gerar_codigo_indicacao()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo_indicacao IS NULL THEN
    NEW.codigo_indicacao := UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS trigger_gerar_codigo_indicacao ON sistema_leads_yeslaser;
CREATE TRIGGER trigger_gerar_codigo_indicacao
BEFORE INSERT ON sistema_leads_yeslaser
FOR EACH ROW EXECUTE FUNCTION gerar_codigo_indicacao();

-- =============================================================
-- 8. FUNCTION TO UPDATE REFERRAL COUNTER
-- =============================================================

CREATE OR REPLACE FUNCTION atualizar_contador_indicacoes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.indicado_por_id IS NOT NULL THEN
    UPDATE sistema_leads_yeslaser
    SET quantidade_indicacoes = COALESCE(quantidade_indicacoes, 0) + 1
    WHERE id = NEW.indicado_por_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS trigger_contador_indicacoes ON sistema_leads_yeslaser;
CREATE TRIGGER trigger_contador_indicacoes
AFTER INSERT ON sistema_leads_yeslaser
FOR EACH ROW
WHEN (NEW.indicado_por_id IS NOT NULL)
EXECUTE FUNCTION atualizar_contador_indicacoes();

COMMIT;

-- =============================================================
-- VERIFICATION
-- =============================================================

DO $$
DECLARE
  v_ab_tests_exists BOOLEAN;
  v_analytics_policy_count INT;
  v_submissoes_policy_count INT;
  v_leads_policy_count INT;
BEGIN
  -- Check if ab_tests table exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'yeslaser_formulario_ab_tests'
  ) INTO v_ab_tests_exists;

  -- Count RLS policies
  SELECT COUNT(*) INTO v_analytics_policy_count
  FROM pg_policies WHERE tablename = 'yeslaser_formulario_analytics';

  SELECT COUNT(*) INTO v_submissoes_policy_count
  FROM pg_policies WHERE tablename = 'yeslaser_formulario_submissoes';

  SELECT COUNT(*) INTO v_leads_policy_count
  FROM pg_policies WHERE tablename = 'sistema_leads_yeslaser';

  RAISE NOTICE '========================================'  ;
  RAISE NOTICE 'MIGRATION RLS + A/B TESTS COMPLETED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'A/B Tests table exists: %', v_ab_tests_exists;
  RAISE NOTICE 'Analytics policies: %', v_analytics_policy_count;
  RAISE NOTICE 'Submissoes policies: %', v_submissoes_policy_count;
  RAISE NOTICE 'Leads policies: %', v_leads_policy_count;
  RAISE NOTICE '========================================';
END $$;

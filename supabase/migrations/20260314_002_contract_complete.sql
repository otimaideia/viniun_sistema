-- Migration: 20260314_002_contract_complete.sql
-- Purpose: Adicionar colunas faltantes em contratos + campos pessoais + tabela de histórico
-- Date: 2026-03-14

-- ═══ mt_influencer_contracts: colunas faltantes ═══
ALTER TABLE mt_influencer_contracts ADD COLUMN IF NOT EXISTS servicos_permuta JSONB DEFAULT '[]';
ALTER TABLE mt_influencer_contracts ADD COLUMN IF NOT EXISTS template_tipo VARCHAR(50);
ALTER TABLE mt_influencer_contracts ADD COLUMN IF NOT EXISTS texto_contrato TEXT;
ALTER TABLE mt_influencer_contracts ADD COLUMN IF NOT EXISTS aditivos_count INTEGER DEFAULT 0;

-- ═══ mt_influencers: campos pessoais para contrato ═══
ALTER TABLE mt_influencers ADD COLUMN IF NOT EXISTS rg VARCHAR(20);
ALTER TABLE mt_influencers ADD COLUMN IF NOT EXISTS estado_civil VARCHAR(30);
ALTER TABLE mt_influencers ADD COLUMN IF NOT EXISTS profissao VARCHAR(100);
ALTER TABLE mt_influencers ADD COLUMN IF NOT EXISTS naturalidade VARCHAR(100);

-- ═══ mt_influencer_contract_history: tabela de histórico e aditivos ═══
CREATE TABLE IF NOT EXISTS mt_influencer_contract_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  contract_id UUID NOT NULL REFERENCES mt_influencer_contracts(id) ON DELETE CASCADE,

  -- Snapshot do contrato antes/depois da alteração
  dados_anteriores JSONB,
  dados_novos JSONB,

  -- Tipo de mudança: criacao, atualizacao, aditivo, assinatura, encerramento
  tipo_alteracao VARCHAR(30) NOT NULL DEFAULT 'atualizacao',

  -- Status tracking
  status_anterior VARCHAR(20),
  status_novo VARCHAR(20),
  motivo TEXT,

  -- Aditivo contratual
  aditivo_numero INTEGER,
  aditivo_descricao TEXT,

  -- Audit
  usuario_id UUID,
  ip_address VARCHAR(45),
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contract_history_contract ON mt_influencer_contract_history(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_history_tenant ON mt_influencer_contract_history(tenant_id);

ALTER TABLE mt_influencer_contract_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mt_contract_history_select') THEN
    CREATE POLICY mt_contract_history_select ON mt_influencer_contract_history FOR SELECT
    USING (
      is_platform_admin() OR
      (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
      (tenant_id = current_tenant_id())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mt_contract_history_insert') THEN
    CREATE POLICY mt_contract_history_insert ON mt_influencer_contract_history FOR INSERT
    WITH CHECK (
      is_platform_admin() OR
      (is_tenant_admin() AND tenant_id = current_tenant_id())
    );
  END IF;
END $$;

-- ROLLBACK:
-- ALTER TABLE mt_influencer_contracts DROP COLUMN IF EXISTS servicos_permuta;
-- ALTER TABLE mt_influencer_contracts DROP COLUMN IF EXISTS template_tipo;
-- ALTER TABLE mt_influencer_contracts DROP COLUMN IF EXISTS texto_contrato;
-- ALTER TABLE mt_influencer_contracts DROP COLUMN IF EXISTS aditivos_count;
-- ALTER TABLE mt_influencers DROP COLUMN IF EXISTS rg;
-- ALTER TABLE mt_influencers DROP COLUMN IF EXISTS estado_civil;
-- ALTER TABLE mt_influencers DROP COLUMN IF EXISTS profissao;
-- ALTER TABLE mt_influencers DROP COLUMN IF EXISTS naturalidade;
-- DROP TABLE IF EXISTS mt_influencer_contract_history;

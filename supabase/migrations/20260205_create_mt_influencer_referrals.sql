-- =============================================================================
-- Migration: Criar tabela mt_influencer_referrals
-- Data: 2026-02-05
-- Descrição: Tabela para rastrear indicações de influenciadoras
-- =============================================================================

-- Criar tabela
CREATE TABLE IF NOT EXISTS mt_influencer_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Relacionamentos
    influencer_id UUID NOT NULL REFERENCES mt_influencers(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES mt_leads(id) ON DELETE SET NULL,

    -- Dados da indicação
    codigo_usado VARCHAR(50) NOT NULL,
    campanha VARCHAR(100),
    landing_page VARCHAR(255),
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),

    -- Status e conversão
    status VARCHAR(20) DEFAULT 'pendente', -- pendente, convertido, cancelado
    data_indicacao TIMESTAMPTZ DEFAULT NOW(),
    data_conversao TIMESTAMPTZ,

    -- Valores
    valor_comissao DECIMAL(10,2),
    valor_servico DECIMAL(10,2),
    percentual_comissao DECIMAL(5,2),

    -- Observações
    observacoes TEXT,
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_influencer_referrals_tenant ON mt_influencer_referrals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_influencer_referrals_franchise ON mt_influencer_referrals(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_influencer_referrals_influencer ON mt_influencer_referrals(influencer_id);
CREATE INDEX IF NOT EXISTS idx_mt_influencer_referrals_lead ON mt_influencer_referrals(lead_id);
CREATE INDEX IF NOT EXISTS idx_mt_influencer_referrals_codigo ON mt_influencer_referrals(codigo_usado);
CREATE INDEX IF NOT EXISTS idx_mt_influencer_referrals_status ON mt_influencer_referrals(status);
CREATE INDEX IF NOT EXISTS idx_mt_influencer_referrals_data ON mt_influencer_referrals(data_indicacao);

COMMENT ON TABLE mt_influencer_referrals IS 'Histórico de leads indicados por influenciadoras';

-- Trigger de updated_at
CREATE TRIGGER trigger_mt_influencer_referrals_updated_at
    BEFORE UPDATE ON mt_influencer_referrals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE mt_influencer_referrals ENABLE ROW LEVEL SECURITY;

-- Policy para SELECT
CREATE POLICY "mt_influencer_referrals_select" ON mt_influencer_referrals FOR SELECT
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
    (tenant_id = current_tenant_id())
);

-- Policy para INSERT
CREATE POLICY "mt_influencer_referrals_insert" ON mt_influencer_referrals FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id())
);

-- Policy para UPDATE
CREATE POLICY "mt_influencer_referrals_update" ON mt_influencer_referrals FOR UPDATE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id())
);

-- Policy para DELETE
CREATE POLICY "mt_influencer_referrals_delete" ON mt_influencer_referrals FOR DELETE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- Migrar dados da tabela legacy
INSERT INTO mt_influencer_referrals (
    id,
    tenant_id,
    franchise_id,
    influencer_id,
    lead_id,
    codigo_usado,
    campanha,
    landing_page,
    status,
    data_indicacao,
    data_conversao,
    valor_comissao,
    observacoes,
    created_at
)
SELECT
    i.id,
    'ebf87fe2-093a-4fba-bb56-c6835cbc1465'::uuid as tenant_id, -- YESlaser
    COALESCE(
        (SELECT franchise_id FROM mt_influencers WHERE id = i.influenciadora_id),
        NULL
    ) as franchise_id,
    i.influenciadora_id as influencer_id,
    i.lead_id,
    i.codigo_usado,
    i.campanha,
    i.landing_page,
    i.status,
    i.data_indicacao,
    i.data_conversao,
    i.valor_comissao,
    i.observacoes,
    i.created_at
FROM yeslaser_influenciadora_indicacoes i
WHERE EXISTS (SELECT 1 FROM mt_influencers inf WHERE inf.id = i.influenciadora_id)
AND NOT EXISTS (
    SELECT 1 FROM mt_influencer_referrals r WHERE r.id = i.id
)
ON CONFLICT (id) DO NOTHING;

-- Verificar quantos registros foram migrados
DO $$
DECLARE
  migrated_count INT;
BEGIN
  SELECT COUNT(*) INTO migrated_count FROM mt_influencer_referrals;
  RAISE NOTICE '✅ % indicações migradas para mt_influencer_referrals', migrated_count;
END $$;

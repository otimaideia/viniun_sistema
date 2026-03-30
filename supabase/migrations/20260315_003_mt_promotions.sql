-- Migration: 20260315_003_mt_promotions.sql
-- Purpose: Módulo de Promoções Unificado (universal para todo o sistema)
-- Tables: mt_promotions, mt_promotion_services, mt_promotion_assets,
--         mt_promotion_subscriptions, mt_promotion_uses, mt_notification_log
-- Author: Claude + Danilo
-- Date: 2026-03-15

-- ============================================================
-- 1. TABELA PRINCIPAL: mt_promotions
-- ============================================================
CREATE TABLE IF NOT EXISTS mt_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),

  -- Identidade
  codigo VARCHAR(50) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(50) NOT NULL DEFAULT 'desconto',

  -- Regras de desconto
  desconto_tipo VARCHAR(20),
  desconto_valor NUMERIC(10,2),
  valor_minimo NUMERIC(10,2),

  -- Validade
  data_inicio TIMESTAMPTZ,
  data_fim TIMESTAMPTZ,

  -- Limites de uso
  max_usos INTEGER,
  usos_count INTEGER DEFAULT 0,
  max_usos_por_lead INTEGER,

  -- Público-alvo
  publico_alvo VARCHAR(50) DEFAULT 'todos',

  -- Vínculo opcional com campanha
  campaign_id UUID REFERENCES mt_campaigns(id),

  -- Visual
  banner_url TEXT,
  banner_mobile_url TEXT,
  cor_destaque VARCHAR(7),

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'rascunho',
  is_public BOOLEAN DEFAULT false,

  -- Termos
  termos TEXT,
  regulamento_url TEXT,

  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES mt_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  UNIQUE(tenant_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_mt_promotions_tenant ON mt_promotions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_promotions_franchise ON mt_promotions(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_promotions_status ON mt_promotions(status);
CREATE INDEX IF NOT EXISTS idx_mt_promotions_dates ON mt_promotions(data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS idx_mt_promotions_deleted ON mt_promotions(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 2. JUNCTION: mt_promotion_services
-- ============================================================
CREATE TABLE IF NOT EXISTS mt_promotion_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES mt_promotions(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES mt_services(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),

  desconto_tipo VARCHAR(20),
  desconto_valor NUMERIC(10,2),
  preco_promocional NUMERIC(10,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(promotion_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_mt_promo_services_promo ON mt_promotion_services(promotion_id);
CREATE INDEX IF NOT EXISTS idx_mt_promo_services_service ON mt_promotion_services(service_id);
CREATE INDEX IF NOT EXISTS idx_mt_promo_services_tenant ON mt_promotion_services(tenant_id);

-- ============================================================
-- 3. ASSETS: mt_promotion_assets
-- ============================================================
CREATE TABLE IF NOT EXISTS mt_promotion_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES mt_promotions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),

  tipo VARCHAR(30) NOT NULL DEFAULT 'banner',
  titulo VARCHAR(255),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  mime_type VARCHAR(100),
  tamanho_bytes INTEGER,
  dimensoes VARCHAR(20),
  ordem INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mt_promo_assets_promo ON mt_promotion_assets(promotion_id);
CREATE INDEX IF NOT EXISTS idx_mt_promo_assets_tenant ON mt_promotion_assets(tenant_id);

-- ============================================================
-- 4. SUBSCRIPTIONS: mt_promotion_subscriptions (adesão influenciadora)
-- ============================================================
CREATE TABLE IF NOT EXISTS mt_promotion_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES mt_promotions(id) ON DELETE CASCADE,
  influencer_id UUID NOT NULL REFERENCES mt_influencers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),

  status VARCHAR(20) NOT NULL DEFAULT 'pendente',
  aderiu_at TIMESTAMPTZ,

  link_gerado TEXT,
  total_cliques INTEGER DEFAULT 0,
  total_leads INTEGER DEFAULT 0,
  total_vendas INTEGER DEFAULT 0,
  valor_vendas NUMERIC(10,2) DEFAULT 0,

  notificado_at TIMESTAMPTZ,
  notificado_via VARCHAR(20),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(promotion_id, influencer_id)
);

CREATE INDEX IF NOT EXISTS idx_mt_promo_subs_promo ON mt_promotion_subscriptions(promotion_id);
CREATE INDEX IF NOT EXISTS idx_mt_promo_subs_influencer ON mt_promotion_subscriptions(influencer_id);
CREATE INDEX IF NOT EXISTS idx_mt_promo_subs_status ON mt_promotion_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_mt_promo_subs_tenant ON mt_promotion_subscriptions(tenant_id);

-- ============================================================
-- 5. LOG DE USO: mt_promotion_uses
-- ============================================================
CREATE TABLE IF NOT EXISTS mt_promotion_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES mt_promotions(id),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),

  lead_id UUID REFERENCES mt_leads(id),
  sale_id UUID REFERENCES mt_sales(id),
  influencer_id UUID REFERENCES mt_influencers(id),
  subscription_id UUID REFERENCES mt_promotion_subscriptions(id),

  desconto_aplicado NUMERIC(10,2),
  source VARCHAR(50),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mt_promo_uses_promo ON mt_promotion_uses(promotion_id);
CREATE INDEX IF NOT EXISTS idx_mt_promo_uses_lead ON mt_promotion_uses(lead_id);
CREATE INDEX IF NOT EXISTS idx_mt_promo_uses_influencer ON mt_promotion_uses(influencer_id);
CREATE INDEX IF NOT EXISTS idx_mt_promo_uses_tenant ON mt_promotion_uses(tenant_id);

-- ============================================================
-- 6. LOG UNIVERSAL DE NOTIFICAÇÕES: mt_notification_log
-- ============================================================
CREATE TABLE IF NOT EXISTS mt_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),

  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,

  tipo VARCHAR(30) NOT NULL,
  assunto VARCHAR(255),
  conteudo TEXT NOT NULL,

  canal VARCHAR(20) NOT NULL,
  enviado_at TIMESTAMPTZ,
  entregue_at TIMESTAMPTZ,
  lido_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pendente',
  erro_mensagem TEXT,

  reference_type VARCHAR(50),
  reference_id UUID,

  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES mt_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mt_notif_log_entity ON mt_notification_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_mt_notif_log_ref ON mt_notification_log(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_mt_notif_log_tenant ON mt_notification_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_notif_log_status ON mt_notification_log(status);

-- ============================================================
-- 7. RLS em todas as 6 tabelas
-- ============================================================

-- mt_promotions
ALTER TABLE mt_promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_promotions_select" ON mt_promotions FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_promotions_insert" ON mt_promotions FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()) OR (is_franchise_admin() AND franchise_id = current_franchise_id()));
CREATE POLICY "mt_promotions_update" ON mt_promotions FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_promotions_delete" ON mt_promotions FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- mt_promotion_services
ALTER TABLE mt_promotion_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_promo_services_select" ON mt_promotion_services FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_promo_services_insert" ON mt_promotion_services FOR INSERT
WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_promo_services_update" ON mt_promotion_services FOR UPDATE
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_promo_services_delete" ON mt_promotion_services FOR DELETE
USING (is_platform_admin() OR tenant_id = current_tenant_id());

-- mt_promotion_assets
ALTER TABLE mt_promotion_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_promo_assets_select" ON mt_promotion_assets FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_promo_assets_insert" ON mt_promotion_assets FOR INSERT
WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_promo_assets_update" ON mt_promotion_assets FOR UPDATE
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_promo_assets_delete" ON mt_promotion_assets FOR DELETE
USING (is_platform_admin() OR tenant_id = current_tenant_id());

-- mt_promotion_subscriptions
ALTER TABLE mt_promotion_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_promo_subs_select" ON mt_promotion_subscriptions FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_promo_subs_insert" ON mt_promotion_subscriptions FOR INSERT
WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_promo_subs_update" ON mt_promotion_subscriptions FOR UPDATE
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_promo_subs_delete" ON mt_promotion_subscriptions FOR DELETE
USING (is_platform_admin() OR tenant_id = current_tenant_id());

-- mt_promotion_uses
ALTER TABLE mt_promotion_uses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_promo_uses_select" ON mt_promotion_uses FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_promo_uses_insert" ON mt_promotion_uses FOR INSERT
WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id());

-- mt_notification_log
ALTER TABLE mt_notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_notif_log_select" ON mt_notification_log FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_notif_log_insert" ON mt_notification_log FOR INSERT
WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id());

-- ============================================================
-- 8. REGISTRAR MÓDULO
-- ============================================================
INSERT INTO mt_modules (codigo, nome, descricao, icone, categoria, ordem, is_core, is_active)
VALUES ('promocoes', 'Promoções', 'Gestão de promoções, descontos e campanhas promocionais', 'Tag', 'marketing', 16, false, true)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  icone = EXCLUDED.icone;

-- Habilitar para todos os tenants
INSERT INTO mt_tenant_modules (tenant_id, module_id, is_active)
SELECT t.id, m.id, true
FROM mt_tenants t
CROSS JOIN mt_modules m
WHERE m.codigo = 'promocoes'
AND NOT EXISTS (
  SELECT 1 FROM mt_tenant_modules tm
  WHERE tm.tenant_id = t.id AND tm.module_id = m.id
);

-- ============================================================
-- 9. COLUNAS EXTRAS EM TABELAS EXISTENTES
-- ============================================================
ALTER TABLE mt_leads ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES mt_promotions(id);
ALTER TABLE mt_sales ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES mt_promotions(id);

-- ═══════════════════════════════════════════════════════════
-- Migration: Módulo PROPOSTAS IMOBILIÁRIAS
-- 4 tabelas: templates, proposals, items, history
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────
-- 1. TEMPLATES DE PROPOSTA
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_property_proposal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  nome TEXT NOT NULL,
  tipo TEXT DEFAULT 'venda' CHECK (tipo IN ('venda', 'locacao', 'temporada')),
  html_template TEXT DEFAULT '',
  variaveis JSONB DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mt_prop_tpl_tenant ON mt_property_proposal_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_prop_tpl_tipo ON mt_property_proposal_templates(tipo);
CREATE INDEX IF NOT EXISTS idx_mt_prop_tpl_deleted ON mt_property_proposal_templates(deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE mt_property_proposal_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_prop_tpl_select" ON mt_property_proposal_templates FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_prop_tpl_insert" ON mt_property_proposal_templates FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_prop_tpl_update" ON mt_property_proposal_templates FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_prop_tpl_delete" ON mt_property_proposal_templates FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- ───────────────────────────────────────────
-- 2. PROPOSTAS IMOBILIÁRIAS
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_property_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),

  -- Identificação
  numero_proposta TEXT,

  -- Relacionamentos (bare UUIDs - FKs opcionais)
  property_id UUID NOT NULL,
  lead_id UUID,
  client_id UUID,
  corretor_id UUID,
  inquiry_id UUID,

  -- Valores
  valor_imovel NUMERIC(15,2),
  valor_proposta NUMERIC(15,2) NOT NULL,
  valor_entrada NUMERIC(15,2) DEFAULT 0,
  valor_financiamento NUMERIC(15,2) DEFAULT 0,
  parcelas INTEGER DEFAULT 1,
  desconto_percentual NUMERIC(5,2) DEFAULT 0,
  valor_final NUMERIC(15,2),

  -- Condições de pagamento
  condicoes_pagamento JSONB DEFAULT '{}',
  forma_pagamento TEXT,
  prazo_validade_dias INTEGER DEFAULT 15,

  -- Status
  status TEXT DEFAULT 'rascunho' CHECK (status IN (
    'rascunho', 'enviada', 'visualizada', 'aceita',
    'contrapropostada', 'rejeitada', 'expirada'
  )),

  -- Documento
  template_id UUID REFERENCES mt_property_proposal_templates(id),
  html_content TEXT,
  pdf_url TEXT,

  -- Token de acesso público (link da proposta)
  token_acesso TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  enviada_em TIMESTAMPTZ,
  visualizada_em TIMESTAMPTZ,
  respondida_em TIMESTAMPTZ,
  validade_ate TIMESTAMPTZ,

  -- Negociação
  observacoes TEXT,
  motivo_rejeicao TEXT,
  contraproposta_valor NUMERIC(15,2),
  contraproposta_condicoes TEXT,

  -- Auditoria
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mt_prop_proposals_tenant ON mt_property_proposals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_prop_proposals_property ON mt_property_proposals(property_id);
CREATE INDEX IF NOT EXISTS idx_mt_prop_proposals_lead ON mt_property_proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_mt_prop_proposals_corretor ON mt_property_proposals(corretor_id);
CREATE INDEX IF NOT EXISTS idx_mt_prop_proposals_status ON mt_property_proposals(status);
CREATE INDEX IF NOT EXISTS idx_mt_prop_proposals_token ON mt_property_proposals(token_acesso);
CREATE INDEX IF NOT EXISTS idx_mt_prop_proposals_deleted ON mt_property_proposals(deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE mt_property_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_prop_proposals_select" ON mt_property_proposals FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_prop_proposals_insert" ON mt_property_proposals FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_prop_proposals_update" ON mt_property_proposals FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_prop_proposals_delete" ON mt_property_proposals FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- ───────────────────────────────────────────
-- 3. ITENS DA PROPOSTA (parcelas, entradas, etc.)
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_property_proposal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  proposal_id UUID NOT NULL REFERENCES mt_property_proposals(id) ON DELETE CASCADE,

  tipo TEXT DEFAULT 'parcela' CHECK (tipo IN (
    'entrada', 'parcela', 'intermediaria', 'chaves',
    'financiamento', 'sinal', 'outro'
  )),
  descricao TEXT,
  valor NUMERIC(15,2) NOT NULL,
  data_vencimento DATE,
  numero_parcela INTEGER,
  quantidade INTEGER DEFAULT 1,
  ordem INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mt_prop_items_tenant ON mt_property_proposal_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_prop_items_proposal ON mt_property_proposal_items(proposal_id);

ALTER TABLE mt_property_proposal_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_prop_items_select" ON mt_property_proposal_items FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_prop_items_insert" ON mt_property_proposal_items FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_prop_items_update" ON mt_property_proposal_items FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_prop_items_delete" ON mt_property_proposal_items FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- ───────────────────────────────────────────
-- 4. HISTÓRICO DA PROPOSTA
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_property_proposal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  proposal_id UUID NOT NULL REFERENCES mt_property_proposals(id) ON DELETE CASCADE,

  tipo_alteracao TEXT NOT NULL CHECK (tipo_alteracao IN (
    'criacao', 'envio', 'visualizacao', 'contraproposta',
    'aceite', 'rejeicao', 'expiracao', 'edicao', 'cancelamento'
  )),
  dados JSONB DEFAULT '{}',
  usuario_id UUID,
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mt_prop_hist_tenant ON mt_property_proposal_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_prop_hist_proposal ON mt_property_proposal_history(proposal_id);
CREATE INDEX IF NOT EXISTS idx_mt_prop_hist_tipo ON mt_property_proposal_history(tipo_alteracao);

ALTER TABLE mt_property_proposal_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_prop_hist_select" ON mt_property_proposal_history FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_prop_hist_insert" ON mt_property_proposal_history FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_prop_hist_update" ON mt_property_proposal_history FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_prop_hist_delete" ON mt_property_proposal_history FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- ───────────────────────────────────────────
-- REGISTRO DO MÓDULO
-- ───────────────────────────────────────────
INSERT INTO mt_modules (codigo, nome, descricao, icone, categoria, ordem, is_core, is_active, rota_base, depends_on)
VALUES ('propostas_imoveis', 'Propostas Imobiliárias', 'Gestão de propostas digitais de compra/locação de imóveis', 'FileSignature', 'imobiliario', 65, false, true, '/imoveis/propostas', '{"imoveis","leads"}')
ON CONFLICT (codigo) DO UPDATE SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao, icone = EXCLUDED.icone, rota_base = EXCLUDED.rota_base, depends_on = EXCLUDED.depends_on;

-- Habilitar para todos os tenants
INSERT INTO mt_tenant_modules (tenant_id, module_id, is_active)
SELECT t.id, m.id, true
FROM mt_tenants t CROSS JOIN mt_modules m
WHERE m.codigo = 'propostas_imoveis'
AND NOT EXISTS (SELECT 1 FROM mt_tenant_modules tm WHERE tm.tenant_id = t.id AND tm.module_id = m.id);

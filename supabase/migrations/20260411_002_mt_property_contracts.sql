-- ═══════════════════════════════════════════════════════════
-- Migration: Módulo CONTRATOS IMOBILIÁRIOS
-- 4 tabelas: templates, contracts, signatories, history
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────
-- 1. TEMPLATES DE CONTRATO
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_property_contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  nome TEXT NOT NULL,
  tipo_contrato TEXT DEFAULT 'venda' CHECK (tipo_contrato IN (
    'venda', 'locacao_definitiva', 'locacao_temporada', 'compra'
  )),
  html_template TEXT DEFAULT '',
  clausulas_padrao JSONB DEFAULT '[]',
  variaveis JSONB DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mt_contract_tpl_tenant ON mt_property_contract_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_contract_tpl_tipo ON mt_property_contract_templates(tipo_contrato);
CREATE INDEX IF NOT EXISTS idx_mt_contract_tpl_deleted ON mt_property_contract_templates(deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE mt_property_contract_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_contract_tpl_select" ON mt_property_contract_templates FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_contract_tpl_insert" ON mt_property_contract_templates FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_contract_tpl_update" ON mt_property_contract_templates FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_contract_tpl_delete" ON mt_property_contract_templates FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- ───────────────────────────────────────────
-- 2. CONTRATOS IMOBILIÁRIOS
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_property_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),

  -- Identificação
  numero_contrato TEXT,

  -- Relacionamentos
  proposal_id UUID REFERENCES mt_property_proposals(id),
  property_id UUID NOT NULL,
  lead_id UUID,
  client_id UUID,
  corretor_id UUID,
  owner_id UUID,

  -- Tipo e status
  tipo TEXT DEFAULT 'venda' CHECK (tipo IN (
    'venda', 'locacao_definitiva', 'locacao_temporada', 'compra'
  )),
  status TEXT DEFAULT 'rascunho' CHECK (status IN (
    'rascunho', 'pendente_assinatura', 'assinado_parcialmente',
    'assinado', 'em_execucao', 'finalizado', 'cancelado', 'distrato'
  )),

  -- Valores
  valor_contrato NUMERIC(15,2) NOT NULL,
  valor_mensal NUMERIC(15,2),
  taxa_administracao NUMERIC(5,2),
  comissao_corretor NUMERIC(5,2),
  valor_comissao NUMERIC(15,2),

  -- Datas
  data_inicio DATE,
  data_vencimento DATE,
  data_assinatura TIMESTAMPTZ,
  data_cancelamento TIMESTAMPTZ,

  -- Documento
  template_id UUID REFERENCES mt_property_contract_templates(id),
  html_content TEXT,
  pdf_url TEXT,

  -- Token de acesso público (link do contrato)
  token_acesso TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),

  -- Cláusulas e reajuste
  clausulas JSONB DEFAULT '[]',
  multa_rescisoria NUMERIC(5,2),
  indice_reajuste TEXT CHECK (indice_reajuste IN ('IGPM', 'IPCA', 'INPC', 'fixo', 'nenhum')),
  percentual_reajuste NUMERIC(5,2),

  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mt_contracts_tenant ON mt_property_contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_contracts_property ON mt_property_contracts(property_id);
CREATE INDEX IF NOT EXISTS idx_mt_contracts_proposal ON mt_property_contracts(proposal_id);
CREATE INDEX IF NOT EXISTS idx_mt_contracts_lead ON mt_property_contracts(lead_id);
CREATE INDEX IF NOT EXISTS idx_mt_contracts_corretor ON mt_property_contracts(corretor_id);
CREATE INDEX IF NOT EXISTS idx_mt_contracts_status ON mt_property_contracts(status);
CREATE INDEX IF NOT EXISTS idx_mt_contracts_tipo ON mt_property_contracts(tipo);
CREATE INDEX IF NOT EXISTS idx_mt_contracts_token ON mt_property_contracts(token_acesso);
CREATE INDEX IF NOT EXISTS idx_mt_contracts_deleted ON mt_property_contracts(deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE mt_property_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_contracts_select" ON mt_property_contracts FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_contracts_insert" ON mt_property_contracts FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_contracts_update" ON mt_property_contracts FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_contracts_delete" ON mt_property_contracts FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- ───────────────────────────────────────────
-- 3. SIGNATÁRIOS DO CONTRATO
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_property_contract_signatories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  contract_id UUID NOT NULL REFERENCES mt_property_contracts(id) ON DELETE CASCADE,

  -- Dados do signatário
  tipo TEXT NOT NULL CHECK (tipo IN (
    'comprador', 'vendedor', 'locatario', 'locador',
    'fiador', 'testemunha', 'corretor'
  )),
  nome TEXT NOT NULL,
  cpf_cnpj TEXT,
  email TEXT,
  telefone TEXT,
  ordem_assinatura INTEGER DEFAULT 0,

  -- Assinatura
  assinado BOOLEAN DEFAULT false,
  assinado_em TIMESTAMPTZ,
  assinatura_hash TEXT,
  assinatura_canvas_data TEXT,

  -- Rastreamento
  ip_address INET,
  user_agent TEXT,
  token_assinatura TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mt_contract_sign_tenant ON mt_property_contract_signatories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_contract_sign_contract ON mt_property_contract_signatories(contract_id);
CREATE INDEX IF NOT EXISTS idx_mt_contract_sign_token ON mt_property_contract_signatories(token_assinatura);

ALTER TABLE mt_property_contract_signatories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_contract_sign_select" ON mt_property_contract_signatories FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_contract_sign_insert" ON mt_property_contract_signatories FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_contract_sign_update" ON mt_property_contract_signatories FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_contract_sign_delete" ON mt_property_contract_signatories FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- ───────────────────────────────────────────
-- 4. HISTÓRICO DO CONTRATO
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_property_contract_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  contract_id UUID NOT NULL REFERENCES mt_property_contracts(id) ON DELETE CASCADE,

  tipo_alteracao TEXT NOT NULL CHECK (tipo_alteracao IN (
    'criacao', 'envio', 'assinatura', 'assinatura_parcial',
    'aditivo', 'distrato', 'cancelamento', 'finalizacao', 'edicao'
  )),
  dados JSONB DEFAULT '{}',
  usuario_id UUID,
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mt_contract_hist_tenant ON mt_property_contract_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_contract_hist_contract ON mt_property_contract_history(contract_id);
CREATE INDEX IF NOT EXISTS idx_mt_contract_hist_tipo ON mt_property_contract_history(tipo_alteracao);

ALTER TABLE mt_property_contract_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_contract_hist_select" ON mt_property_contract_history FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_contract_hist_insert" ON mt_property_contract_history FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_contract_hist_update" ON mt_property_contract_history FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_contract_hist_delete" ON mt_property_contract_history FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- ───────────────────────────────────────────
-- REGISTRO DO MÓDULO
-- ───────────────────────────────────────────
INSERT INTO mt_modules (codigo, nome, descricao, icone, categoria, ordem, is_core, is_active, rota_base, depends_on)
VALUES ('contratos_imoveis', 'Contratos Imobiliários', 'Gestão de contratos de compra, venda e locação com assinatura digital', 'FileCheck2', 'imobiliario', 66, false, true, '/imoveis/contratos', '{"propostas_imoveis"}')
ON CONFLICT (codigo) DO UPDATE SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao, icone = EXCLUDED.icone, rota_base = EXCLUDED.rota_base, depends_on = EXCLUDED.depends_on;

-- Habilitar para todos os tenants
INSERT INTO mt_tenant_modules (tenant_id, module_id, is_active)
SELECT t.id, m.id, true
FROM mt_tenants t CROSS JOIN mt_modules m
WHERE m.codigo = 'contratos_imoveis'
AND NOT EXISTS (SELECT 1 FROM mt_tenant_modules tm WHERE tm.tenant_id = t.id AND tm.module_id = m.id);

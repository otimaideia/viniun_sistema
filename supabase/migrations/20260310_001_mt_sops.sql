-- Migration: 20260310_001_mt_sops.sql
-- Purpose: Criar tabelas do módulo de Processos e Procedimentos (SOPs) + FAQ
-- Author: Claude + Danilo
-- Date: 2026-03-10

-- ============================================================
-- MÓDULO 1: PROCESSOS E PROCEDIMENTOS (SOPs) - 9 tabelas
-- ============================================================

-- 1. Categorias de SOPs (hierárquicas)
CREATE TABLE IF NOT EXISTS mt_sop_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  icone VARCHAR(50),
  cor VARCHAR(7),
  parent_id UUID REFERENCES mt_sop_categories(id),
  ordem INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, nome, parent_id)
);
CREATE INDEX IF NOT EXISTS idx_mt_sop_categories_tenant ON mt_sop_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_sop_categories_deleted ON mt_sop_categories(deleted_at) WHERE deleted_at IS NULL;

-- 2. SOPs (Procedimentos Operacionais Padrão)
CREATE TABLE IF NOT EXISTS mt_sops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  category_id UUID REFERENCES mt_sop_categories(id),
  department_id UUID REFERENCES mt_departments(id),
  codigo VARCHAR(50) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  objetivo TEXT,
  escopo TEXT,
  versao INT DEFAULT 1,
  versao_label VARCHAR(20) DEFAULT 'v1.0',
  status VARCHAR(20) DEFAULT 'rascunho' CHECK (status IN ('rascunho','em_revisao','aprovado','publicado','arquivado')),
  prioridade VARCHAR(20) DEFAULT 'normal' CHECK (prioridade IN ('baixa','normal','alta','critica')),
  responsavel_id UUID REFERENCES mt_users(id),
  aprovador_id UUID REFERENCES mt_users(id),
  aprovado_em TIMESTAMPTZ,
  publicado_em TIMESTAMPTZ,
  revisao_proxima DATE,
  tempo_estimado_min INT,
  tags TEXT[],
  thumbnail_url TEXT,
  is_template BOOLEAN DEFAULT false,
  parent_sop_id UUID REFERENCES mt_sops(id),
  created_by UUID REFERENCES mt_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, codigo, versao)
);
CREATE INDEX IF NOT EXISTS idx_mt_sops_tenant ON mt_sops(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_sops_franchise ON mt_sops(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_sops_department ON mt_sops(department_id);
CREATE INDEX IF NOT EXISTS idx_mt_sops_status ON mt_sops(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mt_sops_deleted ON mt_sops(deleted_at) WHERE deleted_at IS NULL;

-- 3. Passos do SOP
CREATE TABLE IF NOT EXISTS mt_sop_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  sop_id UUID NOT NULL REFERENCES mt_sops(id) ON DELETE CASCADE,
  ordem INT NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(20) DEFAULT 'acao' CHECK (tipo IN ('acao','decisao','espera','verificacao','registro')),
  instrucoes TEXT,
  responsavel_role VARCHAR(50),
  tempo_estimado_min INT,
  is_obrigatorio BOOLEAN DEFAULT true,
  has_checklist BOOLEAN DEFAULT false,
  imagem_url TEXT,
  video_url TEXT,
  documento_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_mt_sop_steps_sop ON mt_sop_steps(sop_id, ordem);

-- 4. Checklist items dentro de cada passo
CREATE TABLE IF NOT EXISTS mt_sop_step_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  step_id UUID NOT NULL REFERENCES mt_sop_steps(id) ON DELETE CASCADE,
  ordem INT NOT NULL,
  descricao VARCHAR(500) NOT NULL,
  is_obrigatorio BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_mt_sop_step_checklist_step ON mt_sop_step_checklist(step_id, ordem);

-- 5. Permissões por role para cada SOP
CREATE TABLE IF NOT EXISTS mt_sop_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  sop_id UUID NOT NULL REFERENCES mt_sops(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  can_view BOOLEAN DEFAULT true,
  can_execute BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sop_id, role)
);

-- 6. Execuções de SOPs
CREATE TABLE IF NOT EXISTS mt_sop_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  sop_id UUID NOT NULL REFERENCES mt_sops(id),
  user_id UUID NOT NULL REFERENCES mt_users(id),
  status VARCHAR(20) DEFAULT 'em_andamento' CHECK (status IN ('em_andamento','concluido','cancelado','pausado')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  tempo_gasto_min INT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mt_sop_executions_tenant ON mt_sop_executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_sop_executions_sop ON mt_sop_executions(sop_id);
CREATE INDEX IF NOT EXISTS idx_mt_sop_executions_user ON mt_sop_executions(user_id);

-- 7. Progresso passo-a-passo de cada execução
CREATE TABLE IF NOT EXISTS mt_sop_execution_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  execution_id UUID NOT NULL REFERENCES mt_sop_executions(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES mt_sop_steps(id),
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente','em_andamento','concluido','pulado','nao_aplicavel')),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES mt_users(id),
  observacoes TEXT,
  evidencia_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mt_sop_execution_steps_exec ON mt_sop_execution_steps(execution_id);

-- 8. Checklist marcados durante execução
CREATE TABLE IF NOT EXISTS mt_sop_execution_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  execution_step_id UUID NOT NULL REFERENCES mt_sop_execution_steps(id) ON DELETE CASCADE,
  checklist_item_id UUID NOT NULL REFERENCES mt_sop_step_checklist(id),
  is_checked BOOLEAN DEFAULT false,
  checked_at TIMESTAMPTZ,
  checked_by UUID REFERENCES mt_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Conexões entre passos para diagrama de fluxo
CREATE TABLE IF NOT EXISTS mt_sop_flow_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  sop_id UUID NOT NULL REFERENCES mt_sops(id) ON DELETE CASCADE,
  from_step_id UUID NOT NULL REFERENCES mt_sop_steps(id),
  to_step_id UUID NOT NULL REFERENCES mt_sop_steps(id),
  condition_label VARCHAR(255),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MÓDULO 2: FAQ / PERGUNTAS FREQUENTES - 4 tabelas
-- ============================================================

-- 10. Categorias de FAQ
CREATE TABLE IF NOT EXISTS mt_faq_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  department_id UUID REFERENCES mt_departments(id),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  icone VARCHAR(50),
  cor VARCHAR(7),
  parent_id UUID REFERENCES mt_faq_categories(id),
  ordem INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, nome, parent_id)
);
CREATE INDEX IF NOT EXISTS idx_mt_faq_categories_tenant ON mt_faq_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_faq_categories_deleted ON mt_faq_categories(deleted_at) WHERE deleted_at IS NULL;

-- 11. FAQs (Perguntas e Respostas)
CREATE TABLE IF NOT EXISTS mt_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  category_id UUID REFERENCES mt_faq_categories(id),
  department_id UUID REFERENCES mt_departments(id),
  sop_id UUID REFERENCES mt_sops(id),
  pergunta TEXT NOT NULL,
  resposta TEXT NOT NULL,
  tags TEXT[],
  ordem INT DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  views_count INT DEFAULT 0,
  helpful_count INT DEFAULT 0,
  not_helpful_count INT DEFAULT 0,
  created_by UUID REFERENCES mt_users(id),
  updated_by UUID REFERENCES mt_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_mt_faqs_tenant ON mt_faqs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_faqs_category ON mt_faqs(category_id);
CREATE INDEX IF NOT EXISTS idx_mt_faqs_sop ON mt_faqs(sop_id);
CREATE INDEX IF NOT EXISTS idx_mt_faqs_deleted ON mt_faqs(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mt_faqs_search ON mt_faqs USING gin(to_tsvector('portuguese', pergunta || ' ' || COALESCE(resposta, '')));

-- 12. Votos de utilidade
CREATE TABLE IF NOT EXISTS mt_faq_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  faq_id UUID NOT NULL REFERENCES mt_faqs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES mt_users(id),
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(faq_id, user_id)
);

-- 13. Visualizações
CREATE TABLE IF NOT EXISTS mt_faq_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  faq_id UUID NOT NULL REFERENCES mt_faqs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES mt_users(id),
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mt_faq_views_faq ON mt_faq_views(faq_id, viewed_at);

-- ============================================================
-- RLS para todas as tabelas SOP + FAQ
-- ============================================================

ALTER TABLE mt_sop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_sop_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_sop_step_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_sop_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_sop_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_sop_execution_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_sop_execution_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_sop_flow_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_faq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_faq_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_faq_views ENABLE ROW LEVEL SECURITY;

-- Políticas RLS padrão para SOP Categories
CREATE POLICY "mt_sop_categories_select" ON mt_sop_categories FOR SELECT USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND (franchise_id = current_franchise_id() OR franchise_id IS NULL) AND tenant_id = current_tenant_id()) OR
  (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_sop_categories_insert" ON mt_sop_categories FOR INSERT WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);
CREATE POLICY "mt_sop_categories_update" ON mt_sop_categories FOR UPDATE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);
CREATE POLICY "mt_sop_categories_delete" ON mt_sop_categories FOR DELETE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- Políticas RLS padrão para SOPs
CREATE POLICY "mt_sops_select" ON mt_sops FOR SELECT USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND (franchise_id = current_franchise_id() OR franchise_id IS NULL) AND tenant_id = current_tenant_id()) OR
  (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_sops_insert" ON mt_sops FOR INSERT WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);
CREATE POLICY "mt_sops_update" ON mt_sops FOR UPDATE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);
CREATE POLICY "mt_sops_delete" ON mt_sops FOR DELETE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- Políticas RLS para tabelas filhas (herdam do parent via JOIN)
CREATE POLICY "mt_sop_steps_select" ON mt_sop_steps FOR SELECT USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_sop_steps_insert" ON mt_sop_steps FOR INSERT WITH CHECK (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_sop_steps_update" ON mt_sop_steps FOR UPDATE USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_sop_steps_delete" ON mt_sop_steps FOR DELETE USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);

CREATE POLICY "mt_sop_step_checklist_select" ON mt_sop_step_checklist FOR SELECT USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_sop_step_checklist_insert" ON mt_sop_step_checklist FOR INSERT WITH CHECK (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_sop_step_checklist_update" ON mt_sop_step_checklist FOR UPDATE USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_sop_step_checklist_delete" ON mt_sop_step_checklist FOR DELETE USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);

CREATE POLICY "mt_sop_roles_select" ON mt_sop_roles FOR SELECT USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_sop_roles_insert" ON mt_sop_roles FOR INSERT WITH CHECK (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_sop_roles_update" ON mt_sop_roles FOR UPDATE USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_sop_roles_delete" ON mt_sop_roles FOR DELETE USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);

CREATE POLICY "mt_sop_executions_select" ON mt_sop_executions FOR SELECT USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_sop_executions_insert" ON mt_sop_executions FOR INSERT WITH CHECK (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_sop_executions_update" ON mt_sop_executions FOR UPDATE USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);

CREATE POLICY "mt_sop_execution_steps_select" ON mt_sop_execution_steps FOR SELECT USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_sop_execution_steps_insert" ON mt_sop_execution_steps FOR INSERT WITH CHECK (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_sop_execution_steps_update" ON mt_sop_execution_steps FOR UPDATE USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);

CREATE POLICY "mt_sop_execution_checklist_select" ON mt_sop_execution_checklist FOR SELECT USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_sop_execution_checklist_insert" ON mt_sop_execution_checklist FOR INSERT WITH CHECK (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_sop_execution_checklist_update" ON mt_sop_execution_checklist FOR UPDATE USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);

CREATE POLICY "mt_sop_flow_connections_select" ON mt_sop_flow_connections FOR SELECT USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_sop_flow_connections_insert" ON mt_sop_flow_connections FOR INSERT WITH CHECK (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_sop_flow_connections_update" ON mt_sop_flow_connections FOR UPDATE USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_sop_flow_connections_delete" ON mt_sop_flow_connections FOR DELETE USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);

-- Políticas RLS para FAQ
CREATE POLICY "mt_faq_categories_select" ON mt_faq_categories FOR SELECT USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_faq_categories_insert" ON mt_faq_categories FOR INSERT WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);
CREATE POLICY "mt_faq_categories_update" ON mt_faq_categories FOR UPDATE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);
CREATE POLICY "mt_faq_categories_delete" ON mt_faq_categories FOR DELETE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_faqs_select" ON mt_faqs FOR SELECT USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_faqs_insert" ON mt_faqs FOR INSERT WITH CHECK (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_faqs_update" ON mt_faqs FOR UPDATE USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_faqs_delete" ON mt_faqs FOR DELETE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_faq_votes_select" ON mt_faq_votes FOR SELECT USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_faq_votes_insert" ON mt_faq_votes FOR INSERT WITH CHECK (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_faq_votes_update" ON mt_faq_votes FOR UPDATE USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);

CREATE POLICY "mt_faq_views_select" ON mt_faq_views FOR SELECT USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_faq_views_insert" ON mt_faq_views FOR INSERT WITH CHECK (
  is_platform_admin() OR tenant_id = current_tenant_id()
);

-- ============================================================
-- Registrar módulo processos em mt_modules
-- ============================================================

INSERT INTO mt_modules (codigo, nome, descricao, icone, categoria, ordem, is_core, is_active)
VALUES ('processos', 'Processos e Procedimentos', 'SOPs, FAQ e procedimentos operacionais padrão', 'ClipboardList', 'operacao', 25, false, true)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao;

-- Habilitar para todos os tenants
INSERT INTO mt_tenant_modules (tenant_id, module_id, is_active)
SELECT t.id, m.id, true
FROM mt_tenants t
CROSS JOIN mt_modules m
WHERE m.codigo = 'processos'
AND NOT EXISTS (
  SELECT 1 FROM mt_tenant_modules tm
  WHERE tm.tenant_id = t.id AND tm.module_id = m.id
);

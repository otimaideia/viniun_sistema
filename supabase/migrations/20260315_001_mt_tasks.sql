-- =====================================================
-- MIGRATION: Módulo de Tarefas (Delegação com Acompanhamento)
-- Data: 2026-03-15
-- Descrição: Sistema de delegação de tarefas ad-hoc com
--   acompanhamento, documentação, métricas de tempo e notificações.
-- Tabelas: 8 (mt_task_*)
-- =====================================================

-- =====================================================
-- 1. mt_task_categories — Categorias de tarefas
-- =====================================================
CREATE TABLE IF NOT EXISTS mt_task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),

  nome VARCHAR(100) NOT NULL,
  cor VARCHAR(20) DEFAULT '#6B7280',
  icone VARCHAR(50) DEFAULT 'FolderOpen',
  ordem INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  UNIQUE(tenant_id, nome)
);

CREATE INDEX idx_mt_task_categories_tenant ON mt_task_categories(tenant_id);
CREATE INDEX idx_mt_task_categories_deleted ON mt_task_categories(deleted_at) WHERE deleted_at IS NULL;

-- =====================================================
-- 2. mt_task_templates — Templates de tarefas comuns
-- =====================================================
CREATE TABLE IF NOT EXISTS mt_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),

  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  prioridade VARCHAR(20) DEFAULT 'normal'
    CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
  category_id UUID REFERENCES mt_task_categories(id),
  estimated_minutes INT,
  tags TEXT[] DEFAULT '{}',
  subtasks_json JSONB DEFAULT '[]',

  created_by UUID REFERENCES mt_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_mt_task_templates_tenant ON mt_task_templates(tenant_id);
CREATE INDEX idx_mt_task_templates_deleted ON mt_task_templates(deleted_at) WHERE deleted_at IS NULL;

-- =====================================================
-- 3. mt_tasks — Tarefas delegadas (tabela principal)
-- =====================================================
CREATE TABLE IF NOT EXISTS mt_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),

  -- Core
  titulo VARCHAR(500) NOT NULL,
  descricao TEXT,

  -- Status e Prioridade
  status VARCHAR(30) NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'em_andamento', 'aguardando', 'concluida', 'finalizada', 'recusada', 'cancelada')),
  prioridade VARCHAR(20) NOT NULL DEFAULT 'normal'
    CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),

  -- Delegação
  delegated_by UUID NOT NULL REFERENCES mt_users(id),

  -- Datas do ciclo de vida
  due_date TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Finalização (conferência do delegador)
  finalized_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES mt_users(id),
  finalization_status VARCHAR(20)
    CHECK (finalization_status IN ('aprovada', 'recusada')),
  finalization_notes TEXT,

  -- Organização
  category_id UUID REFERENCES mt_task_categories(id),
  parent_task_id UUID REFERENCES mt_tasks(id),
  template_id UUID REFERENCES mt_task_templates(id),

  -- Metadata
  ordem INT DEFAULT 0,
  estimated_minutes INT,
  tags TEXT[] DEFAULT '{}',

  -- Timestamps padrão MT
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes para performance
CREATE INDEX idx_mt_tasks_tenant ON mt_tasks(tenant_id);
CREATE INDEX idx_mt_tasks_franchise ON mt_tasks(franchise_id);
CREATE INDEX idx_mt_tasks_delegated_by ON mt_tasks(delegated_by);
CREATE INDEX idx_mt_tasks_status ON mt_tasks(status);
CREATE INDEX idx_mt_tasks_prioridade ON mt_tasks(prioridade);
CREATE INDEX idx_mt_tasks_due_date ON mt_tasks(due_date);
CREATE INDEX idx_mt_tasks_parent ON mt_tasks(parent_task_id);
CREATE INDEX idx_mt_tasks_category ON mt_tasks(category_id);
CREATE INDEX idx_mt_tasks_finalized_by ON mt_tasks(finalized_by);
CREATE INDEX idx_mt_tasks_deleted ON mt_tasks(deleted_at) WHERE deleted_at IS NULL;
-- Index para detecção de atraso
CREATE INDEX idx_mt_tasks_overdue ON mt_tasks(due_date, status)
  WHERE due_date IS NOT NULL
    AND status NOT IN ('concluida', 'finalizada', 'cancelada')
    AND deleted_at IS NULL;
-- Index para tarefas aguardando conferência
CREATE INDEX idx_mt_tasks_pending_review ON mt_tasks(status, completed_at)
  WHERE status = 'concluida' AND deleted_at IS NULL;

-- =====================================================
-- 4. mt_task_assignees — Responsáveis por tarefa (N:N)
-- =====================================================
CREATE TABLE IF NOT EXISTS mt_task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  task_id UUID NOT NULL REFERENCES mt_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES mt_users(id),

  status VARCHAR(30) DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'em_andamento', 'concluida')),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(task_id, user_id)
);

CREATE INDEX idx_mt_task_assignees_tenant ON mt_task_assignees(tenant_id);
CREATE INDEX idx_mt_task_assignees_task ON mt_task_assignees(task_id);
CREATE INDEX idx_mt_task_assignees_user ON mt_task_assignees(user_id);
CREATE INDEX idx_mt_task_assignees_user_status ON mt_task_assignees(user_id, status);

-- =====================================================
-- 5. mt_task_comments — Comentários/discussão
-- =====================================================
CREATE TABLE IF NOT EXISTS mt_task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  task_id UUID NOT NULL REFERENCES mt_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES mt_users(id),

  conteudo TEXT NOT NULL,
  mentioned_user_ids UUID[] DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_mt_task_comments_task ON mt_task_comments(task_id);
CREATE INDEX idx_mt_task_comments_user ON mt_task_comments(user_id);
CREATE INDEX idx_mt_task_comments_deleted ON mt_task_comments(deleted_at) WHERE deleted_at IS NULL;

-- =====================================================
-- 6. mt_task_attachments — Anexos (fotos, documentos)
-- =====================================================
CREATE TABLE IF NOT EXISTS mt_task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  task_id UUID NOT NULL REFERENCES mt_tasks(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES mt_task_comments(id) ON DELETE CASCADE,

  uploaded_by UUID NOT NULL REFERENCES mt_users(id),

  file_name VARCHAR(500) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(100),
  file_size BIGINT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mt_task_attachments_task ON mt_task_attachments(task_id);
CREATE INDEX idx_mt_task_attachments_comment ON mt_task_attachments(comment_id);

-- =====================================================
-- 7. mt_task_activities — Timeline/Auditoria (append-only)
-- =====================================================
CREATE TABLE IF NOT EXISTS mt_task_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  task_id UUID NOT NULL REFERENCES mt_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES mt_users(id),

  acao VARCHAR(50) NOT NULL
    CHECK (acao IN (
      'criou', 'editou', 'atribuiu', 'desatribuiu',
      'status_alterado', 'prioridade_alterada', 'prazo_alterado',
      'comentou', 'anexou', 'removeu_anexo',
      'concluiu', 'finalizou', 'recusou', 'reabriu', 'cancelou',
      'sub_tarefa_criada', 'sub_tarefa_concluida'
    )),
  descricao TEXT,
  dados_json JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mt_task_activities_task ON mt_task_activities(task_id);
CREATE INDEX idx_mt_task_activities_created ON mt_task_activities(created_at DESC);

-- =====================================================
-- 8. mt_task_config — Configuração de notificações
-- =====================================================
CREATE TABLE IF NOT EXISTS mt_task_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),

  -- Canais de notificação
  notif_whatsapp_enabled BOOLEAN DEFAULT true,
  notif_email_enabled BOOLEAN DEFAULT true,
  notif_inapp_enabled BOOLEAN DEFAULT true,

  -- CC recipients
  notif_whatsapp_cc TEXT[] DEFAULT '{}',
  notif_email_cc TEXT[] DEFAULT '{}',

  -- Triggers de notificação
  notif_on_criacao BOOLEAN DEFAULT true,
  notif_on_status_change BOOLEAN DEFAULT true,
  notif_on_comment BOOLEAN DEFAULT true,
  notif_on_overdue BOOLEAN DEFAULT true,
  notif_on_completion BOOLEAN DEFAULT true,

  -- Configuração de alertas de atraso
  overdue_alert_hours INT DEFAULT 24,
  overdue_repeat_hours INT DEFAULT 24,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, COALESCE(franchise_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

CREATE INDEX idx_mt_task_config_tenant ON mt_task_config(tenant_id);

-- =====================================================
-- RLS — Row Level Security para todas as tabelas
-- =====================================================

-- mt_task_categories
ALTER TABLE mt_task_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_task_categories_select" ON mt_task_categories FOR SELECT USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
  (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_task_categories_insert" ON mt_task_categories FOR INSERT WITH CHECK (
  is_platform_admin() OR
  (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_task_categories_update" ON mt_task_categories FOR UPDATE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);

CREATE POLICY "mt_task_categories_delete" ON mt_task_categories FOR DELETE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- mt_task_templates
ALTER TABLE mt_task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_task_templates_select" ON mt_task_templates FOR SELECT USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
  (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_task_templates_insert" ON mt_task_templates FOR INSERT WITH CHECK (
  is_platform_admin() OR
  (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_task_templates_update" ON mt_task_templates FOR UPDATE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);

CREATE POLICY "mt_task_templates_delete" ON mt_task_templates FOR DELETE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- mt_tasks (SELECT especial: vê apenas tarefas que delegou OU é responsável)
ALTER TABLE mt_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_tasks_select" ON mt_tasks FOR SELECT USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
  (tenant_id = current_tenant_id() AND (
    delegated_by = current_user_id() OR
    id IN (SELECT task_id FROM mt_task_assignees WHERE user_id = current_user_id())
  ))
);

CREATE POLICY "mt_tasks_insert" ON mt_tasks FOR INSERT WITH CHECK (
  is_platform_admin() OR
  (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_tasks_update" ON mt_tasks FOR UPDATE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (tenant_id = current_tenant_id() AND delegated_by = current_user_id()) OR
  (tenant_id = current_tenant_id() AND id IN (
    SELECT task_id FROM mt_task_assignees WHERE user_id = current_user_id()
  ))
);

CREATE POLICY "mt_tasks_delete" ON mt_tasks FOR DELETE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (tenant_id = current_tenant_id() AND delegated_by = current_user_id())
);

-- mt_task_assignees
ALTER TABLE mt_task_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_task_assignees_select" ON mt_task_assignees FOR SELECT USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_task_assignees_insert" ON mt_task_assignees FOR INSERT WITH CHECK (
  is_platform_admin() OR
  (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_task_assignees_update" ON mt_task_assignees FOR UPDATE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (tenant_id = current_tenant_id() AND user_id = current_user_id())
);

CREATE POLICY "mt_task_assignees_delete" ON mt_task_assignees FOR DELETE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (tenant_id = current_tenant_id() AND task_id IN (
    SELECT id FROM mt_tasks WHERE delegated_by = current_user_id()
  ))
);

-- mt_task_comments
ALTER TABLE mt_task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_task_comments_select" ON mt_task_comments FOR SELECT USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_task_comments_insert" ON mt_task_comments FOR INSERT WITH CHECK (
  is_platform_admin() OR
  (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_task_comments_update" ON mt_task_comments FOR UPDATE USING (
  is_platform_admin() OR
  (tenant_id = current_tenant_id() AND user_id = current_user_id())
);

CREATE POLICY "mt_task_comments_delete" ON mt_task_comments FOR DELETE USING (
  is_platform_admin() OR
  (tenant_id = current_tenant_id() AND user_id = current_user_id())
);

-- mt_task_attachments
ALTER TABLE mt_task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_task_attachments_select" ON mt_task_attachments FOR SELECT USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_task_attachments_insert" ON mt_task_attachments FOR INSERT WITH CHECK (
  is_platform_admin() OR
  (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_task_attachments_delete" ON mt_task_attachments FOR DELETE USING (
  is_platform_admin() OR
  (tenant_id = current_tenant_id() AND uploaded_by = current_user_id())
);

-- mt_task_activities
ALTER TABLE mt_task_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_task_activities_select" ON mt_task_activities FOR SELECT USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_task_activities_insert" ON mt_task_activities FOR INSERT WITH CHECK (
  is_platform_admin() OR
  (tenant_id = current_tenant_id())
);

-- mt_task_config
ALTER TABLE mt_task_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_task_config_select" ON mt_task_config FOR SELECT USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND (
    franchise_id = current_franchise_id() OR franchise_id IS NULL
  ) AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_task_config_insert" ON mt_task_config FOR INSERT WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);

CREATE POLICY "mt_task_config_update" ON mt_task_config FOR UPDATE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);

-- =====================================================
-- Registro do Módulo
-- =====================================================

INSERT INTO mt_modules (codigo, nome, descricao, icone, categoria, ordem, is_core, is_active)
VALUES (
  'tarefas',
  'Tarefas',
  'Delegação de tarefas com acompanhamento, métricas de tempo e notificações',
  'ListTodo',
  'gestao',
  17,
  false,
  true
)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao;

-- Habilitar para todos os tenants
INSERT INTO mt_tenant_modules (tenant_id, module_id, is_active)
SELECT t.id, m.id, true
FROM mt_tenants t
CROSS JOIN mt_modules m
WHERE m.codigo = 'tarefas'
AND NOT EXISTS (
  SELECT 1 FROM mt_tenant_modules tm
  WHERE tm.tenant_id = t.id AND tm.module_id = m.id
);

-- =====================================================
-- Categorias padrão
-- =====================================================
INSERT INTO mt_task_categories (tenant_id, nome, cor, icone, ordem)
SELECT t.id, cat.nome, cat.cor, cat.icone, cat.ordem
FROM mt_tenants t
CROSS JOIN (VALUES
  ('Administrativo', '#6366F1', 'Building2', 1),
  ('Financeiro', '#22C55E', 'DollarSign', 2),
  ('Marketing', '#F59E0B', 'Megaphone', 3),
  ('Operacional', '#3B82F6', 'Wrench', 4),
  ('RH', '#EC4899', 'Users', 5),
  ('Comercial', '#8B5CF6', 'TrendingUp', 6),
  ('TI / Suporte', '#06B6D4', 'Monitor', 7),
  ('Outro', '#6B7280', 'FolderOpen', 8)
) AS cat(nome, cor, icone, ordem)
WHERE NOT EXISTS (
  SELECT 1 FROM mt_task_categories tc
  WHERE tc.tenant_id = t.id AND tc.nome = cat.nome
);

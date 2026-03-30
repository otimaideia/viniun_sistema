-- Migration: 20260312_002_mt_checklists.sql
-- Purpose: Criar tabelas do módulo de Checklist Diário (7 tabelas)
-- Author: Claude + Danilo
-- Date: 2026-03-12

-- ============================================================
-- MÓDULO: CHECKLIST DIÁRIO - 7 tabelas
-- Templates reutilizáveis, execução hora a hora, logs, relatórios, gamificação
-- ============================================================

-- 1. Templates de Checklist (definição reutilizável)
CREATE TABLE IF NOT EXISTS mt_checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  icone VARCHAR(50) DEFAULT 'ClipboardList',
  cor VARCHAR(7) DEFAULT '#6366F1',

  -- Atribuição: a quem este checklist se aplica
  assignment_type VARCHAR(20) NOT NULL DEFAULT 'role'
    CHECK (assignment_type IN ('role', 'user', 'department', 'team')),
  role_id UUID REFERENCES mt_roles(id),
  user_id UUID REFERENCES mt_users(id),
  department_id UUID REFERENCES mt_departments(id),
  team_id UUID REFERENCES mt_teams(id),

  -- Recorrência
  recurrence VARCHAR(20) DEFAULT 'diaria'
    CHECK (recurrence IN ('diaria', 'semanal', 'mensal', 'pontual')),
  dias_semana INT[] DEFAULT '{1,2,3,4,5}',
  dia_mes INT,

  -- Horário de trabalho (para blocos hora a hora)
  hora_inicio TIME DEFAULT '08:00',
  hora_fim TIME DEFAULT '18:00',

  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES mt_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_mt_checklist_templates_tenant ON mt_checklist_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_checklist_templates_franchise ON mt_checklist_templates(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_checklist_templates_assignment ON mt_checklist_templates(assignment_type);
CREATE INDEX IF NOT EXISTS idx_mt_checklist_templates_deleted ON mt_checklist_templates(deleted_at) WHERE deleted_at IS NULL;

-- 2. Itens do Template
CREATE TABLE IF NOT EXISTS mt_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES mt_checklist_templates(id) ON DELETE CASCADE,

  titulo VARCHAR(500) NOT NULL,
  descricao TEXT,
  instrucoes TEXT,

  -- Bloco de horário
  hora_bloco TIME,
  duracao_min INT DEFAULT 30,
  ordem INT NOT NULL DEFAULT 0,

  -- Classificação
  prioridade VARCHAR(20) DEFAULT 'normal'
    CHECK (prioridade IN ('baixa', 'normal', 'alta', 'critica')),
  categoria VARCHAR(50),

  -- Requisitos de evidência
  requer_foto BOOLEAN DEFAULT false,
  requer_observacao BOOLEAN DEFAULT false,
  is_obrigatorio BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_mt_checklist_items_tenant ON mt_checklist_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_checklist_items_template ON mt_checklist_items(template_id);
CREATE INDEX IF NOT EXISTS idx_mt_checklist_items_deleted ON mt_checklist_items(deleted_at) WHERE deleted_at IS NULL;

-- 3. Instância Diária (gerada por dia/usuário)
CREATE TABLE IF NOT EXISTS mt_checklist_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES mt_franchises(id),
  template_id UUID NOT NULL REFERENCES mt_checklist_templates(id),
  user_id UUID NOT NULL REFERENCES mt_users(id),

  data DATE NOT NULL,
  hora_inicio TIME NOT NULL DEFAULT '08:00',
  hora_fim TIME NOT NULL DEFAULT '18:00',

  status VARCHAR(20) DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'incompleto', 'cancelado')),

  -- Resumo (atualizado conforme execução)
  total_items INT DEFAULT 0,
  items_concluidos INT DEFAULT 0,
  items_nao_concluidos INT DEFAULT 0,
  percentual_conclusao NUMERIC(5,2) DEFAULT 0,

  -- Modificações da gerente
  modificado_por UUID REFERENCES mt_users(id),
  modificado_em TIMESTAMPTZ,
  observacoes_gestor TEXT,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(template_id, user_id, data)
);
CREATE INDEX IF NOT EXISTS idx_mt_checklist_daily_tenant ON mt_checklist_daily(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_checklist_daily_franchise ON mt_checklist_daily(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_checklist_daily_user ON mt_checklist_daily(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_checklist_daily_data ON mt_checklist_daily(data);
CREATE INDEX IF NOT EXISTS idx_mt_checklist_daily_status ON mt_checklist_daily(status);
CREATE INDEX IF NOT EXISTS idx_mt_checklist_daily_user_data ON mt_checklist_daily(user_id, data);

-- 4. Itens da Execução Diária
CREATE TABLE IF NOT EXISTS mt_checklist_daily_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
  daily_id UUID NOT NULL REFERENCES mt_checklist_daily(id) ON DELETE CASCADE,
  item_id UUID REFERENCES mt_checklist_items(id),

  titulo VARCHAR(500) NOT NULL,
  descricao TEXT,
  instrucoes TEXT,
  hora_bloco TIME,
  duracao_min INT DEFAULT 30,
  ordem INT NOT NULL DEFAULT 0,
  prioridade VARCHAR(20) DEFAULT 'normal',
  categoria VARCHAR(50),
  is_obrigatorio BOOLEAN DEFAULT true,
  requer_foto BOOLEAN DEFAULT false,
  requer_observacao BOOLEAN DEFAULT false,

  -- Execução
  status VARCHAR(20) DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'concluido', 'nao_feito', 'pulado')),
  concluido_em TIMESTAMPTZ,
  concluido_por UUID REFERENCES mt_users(id),

  -- Evidências
  observacoes TEXT,
  foto_url TEXT,
  evidencia_urls TEXT[],

  -- Não conformidade
  has_nao_conformidade BOOLEAN DEFAULT false,
  nao_conformidade_descricao TEXT,
  nao_conformidade_acao TEXT,

  -- Item ad-hoc (adicionado pela gerente no dia)
  is_ad_hoc BOOLEAN DEFAULT false,
  adicionado_por UUID REFERENCES mt_users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mt_checklist_daily_items_tenant ON mt_checklist_daily_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_checklist_daily_items_daily ON mt_checklist_daily_items(daily_id);
CREATE INDEX IF NOT EXISTS idx_mt_checklist_daily_items_status ON mt_checklist_daily_items(status);

-- 5. Logs de Auditoria (hora a hora)
CREATE TABLE IF NOT EXISTS mt_checklist_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
  daily_id UUID NOT NULL REFERENCES mt_checklist_daily(id) ON DELETE CASCADE,
  daily_item_id UUID REFERENCES mt_checklist_daily_items(id),

  acao VARCHAR(50) NOT NULL,
  descricao TEXT,
  user_id UUID NOT NULL REFERENCES mt_users(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mt_checklist_logs_tenant ON mt_checklist_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_checklist_logs_daily ON mt_checklist_logs(daily_id);
CREATE INDEX IF NOT EXISTS idx_mt_checklist_logs_user ON mt_checklist_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_checklist_logs_created ON mt_checklist_logs(created_at);

-- 6. Relatórios Pré-Computados
CREATE TABLE IF NOT EXISTS mt_checklist_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES mt_franchises(id),

  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('diario', 'semanal', 'mensal')),
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,

  user_id UUID REFERENCES mt_users(id),
  template_id UUID REFERENCES mt_checklist_templates(id),

  total_checklists INT DEFAULT 0,
  total_items INT DEFAULT 0,
  items_concluidos INT DEFAULT 0,
  items_nao_concluidos INT DEFAULT 0,
  percentual_medio NUMERIC(5,2) DEFAULT 0,
  nao_conformidades INT DEFAULT 0,
  dias_consecutivos_100 INT DEFAULT 0,

  dados_json JSONB,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mt_checklist_reports_tenant ON mt_checklist_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_checklist_reports_tipo ON mt_checklist_reports(tipo);
CREATE INDEX IF NOT EXISTS idx_mt_checklist_reports_dates ON mt_checklist_reports(data_inicio, data_fim);

-- 7. Streaks / Gamificação
CREATE TABLE IF NOT EXISTS mt_checklist_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES mt_users(id),
  template_id UUID REFERENCES mt_checklist_templates(id),

  streak_atual INT DEFAULT 0,
  melhor_streak INT DEFAULT 0,
  ultimo_dia_completo DATE,
  xp_ganho_total INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, user_id, template_id)
);
CREATE INDEX IF NOT EXISTS idx_mt_checklist_streaks_tenant ON mt_checklist_streaks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_checklist_streaks_user ON mt_checklist_streaks(user_id);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

ALTER TABLE mt_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_checklist_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_checklist_daily_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_checklist_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_checklist_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_checklist_streaks ENABLE ROW LEVEL SECURITY;

-- Templates: admin/gerente vê todos do tenant, franchise vê os da franchise + globais
CREATE POLICY "mt_checklist_templates_select" ON mt_checklist_templates FOR SELECT USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND (franchise_id = current_franchise_id() OR franchise_id IS NULL) AND tenant_id = current_tenant_id()) OR
  (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_checklist_templates_insert" ON mt_checklist_templates FOR INSERT WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);
CREATE POLICY "mt_checklist_templates_update" ON mt_checklist_templates FOR UPDATE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);
CREATE POLICY "mt_checklist_templates_delete" ON mt_checklist_templates FOR DELETE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- Items: herdam do template via tenant_id
CREATE POLICY "mt_checklist_items_select" ON mt_checklist_items FOR SELECT USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_checklist_items_insert" ON mt_checklist_items FOR INSERT WITH CHECK (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_checklist_items_update" ON mt_checklist_items FOR UPDATE USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_checklist_items_delete" ON mt_checklist_items FOR DELETE USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);

-- Daily: admin vê tudo, franchise vê da franchise, user vê o próprio
CREATE POLICY "mt_checklist_daily_select" ON mt_checklist_daily FOR SELECT USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
  (user_id = current_user_id())
);
CREATE POLICY "mt_checklist_daily_insert" ON mt_checklist_daily FOR INSERT WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
  (user_id = current_user_id() AND tenant_id = current_tenant_id())
);
CREATE POLICY "mt_checklist_daily_update" ON mt_checklist_daily FOR UPDATE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
  (user_id = current_user_id())
);

-- Daily Items: mesma lógica do daily (user vê os próprios)
CREATE POLICY "mt_checklist_daily_items_select" ON mt_checklist_daily_items FOR SELECT USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_checklist_daily_items_insert" ON mt_checklist_daily_items FOR INSERT WITH CHECK (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_checklist_daily_items_update" ON mt_checklist_daily_items FOR UPDATE USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);

-- Logs: leitura por tenant, insert por tenant
CREATE POLICY "mt_checklist_logs_select" ON mt_checklist_logs FOR SELECT USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_checklist_logs_insert" ON mt_checklist_logs FOR INSERT WITH CHECK (
  is_platform_admin() OR tenant_id = current_tenant_id()
);

-- Reports: admin/franchise pode ler
CREATE POLICY "mt_checklist_reports_select" ON mt_checklist_reports FOR SELECT USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
  (user_id = current_user_id())
);
CREATE POLICY "mt_checklist_reports_insert" ON mt_checklist_reports FOR INSERT WITH CHECK (
  is_platform_admin() OR tenant_id = current_tenant_id()
);

-- Streaks: user vê o próprio, admin vê todos
CREATE POLICY "mt_checklist_streaks_select" ON mt_checklist_streaks FOR SELECT USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (user_id = current_user_id())
);
CREATE POLICY "mt_checklist_streaks_insert" ON mt_checklist_streaks FOR INSERT WITH CHECK (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_checklist_streaks_update" ON mt_checklist_streaks FOR UPDATE USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);

-- ============================================================
-- SEED: Registrar módulo + habilitar para tenants
-- ============================================================

INSERT INTO mt_modules (codigo, nome, descricao, icone, categoria, ordem, is_core, is_active)
VALUES ('checklist', 'Checklist Diário', 'Tarefas diárias por cargo com rastreamento hora a hora', 'ClipboardCheck', 'operacao', 15, false, true)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  icone = EXCLUDED.icone;

-- Habilitar para todos os tenants
INSERT INTO mt_tenant_modules (tenant_id, module_id, is_active)
SELECT t.id, m.id, true
FROM mt_tenants t
CROSS JOIN mt_modules m
WHERE m.codigo = 'checklist'
AND NOT EXISTS (
  SELECT 1 FROM mt_tenant_modules tm
  WHERE tm.tenant_id = t.id AND tm.module_id = m.id
);

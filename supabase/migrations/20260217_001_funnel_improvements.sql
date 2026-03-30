-- =============================================================================
-- Migration: 20260217_001_funnel_improvements.sql
-- Purpose: Melhorias completas no Funil de Vendas
-- Author: Claude + Danilo
-- Date: 2026-02-17
--
-- Mudanças:
-- 1. Adicionar colunas faltantes em mt_funnel_leads
-- 2. Criar mt_funnel_stage_history (tracking de tempo por etapa)
-- 3. Criar mt_funnel_role_access (controle de acesso por dept/equipe)
-- 4. Criar mt_franchise_default_funnels (funil padrão por franquia)
-- 5. Adicionar campos de automação em mt_funnel_stages
-- =============================================================================

-- =============================================================================
-- 1. COLUNAS FALTANTES em mt_funnel_leads
-- =============================================================================

-- data_entrada: quando o lead entrou no funil
ALTER TABLE mt_funnel_leads ADD COLUMN IF NOT EXISTS data_entrada TIMESTAMPTZ DEFAULT NOW();

-- data_etapa: quando o lead entrou na etapa ATUAL (atualizado a cada movimentação)
ALTER TABLE mt_funnel_leads ADD COLUMN IF NOT EXISTS data_etapa TIMESTAMPTZ DEFAULT NOW();

-- responsavel_id: usuário responsável pelo lead neste funil
ALTER TABLE mt_funnel_leads ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES mt_users(id) ON DELETE SET NULL;

-- tags: etiquetas para categorização
ALTER TABLE mt_funnel_leads ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- observacoes: notas internas
ALTER TABLE mt_funnel_leads ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- prioridade: ordem do card no Kanban (pode já existir como posicao)
ALTER TABLE mt_funnel_leads ADD COLUMN IF NOT EXISTS prioridade INTEGER DEFAULT 0;

-- updated_at: timestamp de última atualização
ALTER TABLE mt_funnel_leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_mt_funnel_leads_responsavel ON mt_funnel_leads(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_mt_funnel_leads_data_etapa ON mt_funnel_leads(data_etapa);
CREATE INDEX IF NOT EXISTS idx_mt_funnel_leads_data_entrada ON mt_funnel_leads(data_entrada);

-- =============================================================================
-- 2. TABELA mt_funnel_stage_history
-- Rastreia quanto tempo cada lead ficou em cada etapa
-- =============================================================================

CREATE TABLE IF NOT EXISTS mt_funnel_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
  funnel_lead_id UUID NOT NULL REFERENCES mt_funnel_leads(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES mt_leads(id) ON DELETE CASCADE,
  funnel_id UUID NOT NULL REFERENCES mt_funnels(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES mt_funnel_stages(id) ON DELETE CASCADE,

  -- Timestamps
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exited_at TIMESTAMPTZ,

  -- Métricas calculadas (preenchidas ao sair da etapa)
  duration_seconds INTEGER,
  duration_business_hours INTEGER, -- Excluindo fins de semana/feriados (futuro)

  -- Quem moveu
  moved_by UUID REFERENCES mt_users(id) ON DELETE SET NULL,
  move_reason TEXT,

  -- De/para (quando saiu)
  next_stage_id UUID REFERENCES mt_funnel_stages(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_mt_fsh_funnel_lead ON mt_funnel_stage_history(funnel_lead_id);
CREATE INDEX IF NOT EXISTS idx_mt_fsh_lead ON mt_funnel_stage_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_mt_fsh_stage ON mt_funnel_stage_history(stage_id);
CREATE INDEX IF NOT EXISTS idx_mt_fsh_funnel ON mt_funnel_stage_history(funnel_id);
CREATE INDEX IF NOT EXISTS idx_mt_fsh_tenant ON mt_funnel_stage_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_fsh_entered ON mt_funnel_stage_history(entered_at);
CREATE INDEX IF NOT EXISTS idx_mt_fsh_exited ON mt_funnel_stage_history(exited_at) WHERE exited_at IS NOT NULL;

-- RLS
ALTER TABLE mt_funnel_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_funnel_stage_history_select" ON mt_funnel_stage_history FOR SELECT
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  tenant_id = current_tenant_id()
);

CREATE POLICY "mt_funnel_stage_history_insert" ON mt_funnel_stage_history FOR INSERT
WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  tenant_id = current_tenant_id()
);

CREATE POLICY "mt_funnel_stage_history_update" ON mt_funnel_stage_history FOR UPDATE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- =============================================================================
-- 3. TABELA mt_funnel_role_access
-- Controle de quais funis cada departamento/equipe pode ver
-- =============================================================================

CREATE TABLE IF NOT EXISTS mt_funnel_role_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
  funnel_id UUID NOT NULL REFERENCES mt_funnels(id) ON DELETE CASCADE,

  -- Quem tem acesso (pelo menos um deve ser preenchido)
  department_id UUID REFERENCES mt_departments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES mt_teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES mt_users(id) ON DELETE CASCADE,

  -- Permissões granulares
  can_view BOOLEAN DEFAULT true,
  can_move_leads BOOLEAN DEFAULT true,
  can_add_leads BOOLEAN DEFAULT true,
  can_remove_leads BOOLEAN DEFAULT false,
  can_edit_funnel BOOLEAN DEFAULT false,
  can_manage_automations BOOLEAN DEFAULT false,

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES mt_users(id) ON DELETE SET NULL,

  -- Constraint: pelo menos um target deve estar preenchido
  CONSTRAINT chk_funnel_role_target CHECK (
    department_id IS NOT NULL OR team_id IS NOT NULL OR user_id IS NOT NULL
  ),

  -- Evitar duplicatas
  UNIQUE(funnel_id, department_id, team_id, user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_fra_tenant ON mt_funnel_role_access(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_fra_funnel ON mt_funnel_role_access(funnel_id);
CREATE INDEX IF NOT EXISTS idx_mt_fra_department ON mt_funnel_role_access(department_id) WHERE department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mt_fra_team ON mt_funnel_role_access(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mt_fra_user ON mt_funnel_role_access(user_id) WHERE user_id IS NOT NULL;

-- RLS
ALTER TABLE mt_funnel_role_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_funnel_role_access_select" ON mt_funnel_role_access FOR SELECT
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND tenant_id = current_tenant_id()) OR
  tenant_id = current_tenant_id()
);

CREATE POLICY "mt_funnel_role_access_insert" ON mt_funnel_role_access FOR INSERT
WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_funnel_role_access_update" ON mt_funnel_role_access FOR UPDATE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_funnel_role_access_delete" ON mt_funnel_role_access FOR DELETE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- =============================================================================
-- 4. TABELA mt_franchise_default_funnels
-- Define qual funil é o padrão para cada franquia
-- =============================================================================

CREATE TABLE IF NOT EXISTS mt_franchise_default_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
  franchise_id UUID NOT NULL REFERENCES mt_franchises(id) ON DELETE CASCADE,
  funnel_id UUID NOT NULL REFERENCES mt_funnels(id) ON DELETE CASCADE,

  -- Configurações por franquia
  is_active BOOLEAN DEFAULT true,
  notes TEXT, -- Notas do admin sobre por que escolheu este funil

  -- Quem definiu
  set_by UUID REFERENCES mt_users(id) ON DELETE SET NULL,
  set_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Uma franquia só pode ter um funil padrão
  UNIQUE(franchise_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_fdf_tenant ON mt_franchise_default_funnels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_fdf_franchise ON mt_franchise_default_funnels(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_fdf_funnel ON mt_franchise_default_funnels(funnel_id);

-- RLS
ALTER TABLE mt_franchise_default_funnels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_franchise_default_funnels_select" ON mt_franchise_default_funnels FOR SELECT
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND tenant_id = current_tenant_id()) OR
  tenant_id = current_tenant_id()
);

CREATE POLICY "mt_franchise_default_funnels_insert" ON mt_franchise_default_funnels FOR INSERT
WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_franchise_default_funnels_update" ON mt_franchise_default_funnels FOR UPDATE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_franchise_default_funnels_delete" ON mt_franchise_default_funnels FOR DELETE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- =============================================================================
-- 5. CAMPOS ADICIONAIS em mt_funnel_stages (automação)
-- =============================================================================

-- Config JSON para ação automática (complementa acao_automatica varchar)
ALTER TABLE mt_funnel_stages ADD COLUMN IF NOT EXISTS acao_automatica_config JSONB DEFAULT '{}';

-- Dias para auto-mover (simplificação do trigger de tempo)
ALTER TABLE mt_funnel_stages ADD COLUMN IF NOT EXISTS automacao_dias INTEGER;

-- Etapa destino do auto-mover
ALTER TABLE mt_funnel_stages ADD COLUMN IF NOT EXISTS automacao_destino_id UUID REFERENCES mt_funnel_stages(id) ON DELETE SET NULL;

-- Ícone da etapa (pode já existir)
ALTER TABLE mt_funnel_stages ADD COLUMN IF NOT EXISTS icone VARCHAR(50) DEFAULT 'circle';

-- Soft delete
ALTER TABLE mt_funnel_stages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- =============================================================================
-- 6. CAMPOS em mt_funnels
-- =============================================================================

-- Soft delete
ALTER TABLE mt_funnels ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Template flags
ALTER TABLE mt_funnels ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
ALTER TABLE mt_funnels ADD COLUMN IF NOT EXISTS template_origem_id UUID REFERENCES mt_funnels(id) ON DELETE SET NULL;

-- =============================================================================
-- 7. VIEW para métricas de tempo por etapa (agregação)
-- =============================================================================

CREATE OR REPLACE VIEW v_funnel_stage_time_metrics AS
SELECT
  fsh.tenant_id,
  fsh.funnel_id,
  fsh.stage_id,
  fs.nome AS stage_nome,
  fs.ordem AS stage_ordem,
  COUNT(*) AS total_leads_passed,
  COUNT(fsh.exited_at) AS total_leads_exited,
  COUNT(*) - COUNT(fsh.exited_at) AS total_leads_current,
  AVG(fsh.duration_seconds) FILTER (WHERE fsh.duration_seconds IS NOT NULL) AS avg_duration_seconds,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY fsh.duration_seconds)
    FILTER (WHERE fsh.duration_seconds IS NOT NULL) AS median_duration_seconds,
  MIN(fsh.duration_seconds) FILTER (WHERE fsh.duration_seconds IS NOT NULL) AS min_duration_seconds,
  MAX(fsh.duration_seconds) FILTER (WHERE fsh.duration_seconds IS NOT NULL) AS max_duration_seconds
FROM mt_funnel_stage_history fsh
JOIN mt_funnel_stages fs ON fs.id = fsh.stage_id
GROUP BY fsh.tenant_id, fsh.funnel_id, fsh.stage_id, fs.nome, fs.ordem;

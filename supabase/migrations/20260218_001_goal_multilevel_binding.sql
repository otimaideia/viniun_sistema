-- ============================================================================
-- Migration: 20260218_001_goal_multilevel_binding.sql
-- Purpose: Adicionar vinculação multi-nível em metas (departamento, equipe, pessoa)
-- Author: Claude + Danilo
-- Date: 2026-02-18
-- ============================================================================
--
-- CHANGES:
--   1. Adicionar colunas department_id, team_id, assigned_to em mt_goals
--   2. Criar índices para performance
--   3. Atualizar calculate_goal_value para passar 7 parâmetros ($5=assigned_to, $6=department_id, $7=team_id)
--   4. Atualizar query_templates em mt_goal_type_sources para filtrar por user/dept/team
--
-- ROLLBACK PLAN:
--   ALTER TABLE mt_goals DROP COLUMN IF EXISTS department_id;
--   ALTER TABLE mt_goals DROP COLUMN IF EXISTS team_id;
--   ALTER TABLE mt_goals DROP COLUMN IF EXISTS assigned_to;
--   (Reverter templates e função para versão sem $5/$6/$7)
-- ============================================================================

-- STEP 1: Adicionar colunas
ALTER TABLE mt_goals ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES mt_departments(id) ON DELETE SET NULL;
ALTER TABLE mt_goals ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES mt_teams(id) ON DELETE SET NULL;
ALTER TABLE mt_goals ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES mt_users(id) ON DELETE SET NULL;

-- STEP 2: Índices
CREATE INDEX IF NOT EXISTS idx_mt_goals_department ON mt_goals(department_id) WHERE department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mt_goals_team ON mt_goals(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mt_goals_assigned_to ON mt_goals(assigned_to) WHERE assigned_to IS NOT NULL;

-- STEP 3: Atualizar calculate_goal_value (agora passa 7 parâmetros)
CREATE OR REPLACE FUNCTION calculate_goal_value(p_goal_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_goal RECORD;
  v_source RECORD;
  v_result NUMERIC := 0;
BEGIN
  SELECT tipo, tenant_id, franchise_id, data_inicio, data_fim, valor_atual,
         assigned_to, department_id, team_id
  INTO v_goal
  FROM mt_goals
  WHERE id = p_goal_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  SELECT query_template, source_table
  INTO v_source
  FROM mt_goal_type_sources
  WHERE tipo = v_goal.tipo AND is_active = true;

  IF NOT FOUND THEN
    RETURN COALESCE(v_goal.valor_atual, 0);
  END IF;

  -- Parâmetros: $1=tenant_id, $2=franchise_id, $3=data_inicio, $4=data_fim,
  --             $5=assigned_to, $6=department_id, $7=team_id
  EXECUTE v_source.query_template
  INTO v_result
  USING v_goal.tenant_id, v_goal.franchise_id, v_goal.data_inicio, v_goal.data_fim,
        v_goal.assigned_to, v_goal.department_id, v_goal.team_id;

  RETURN COALESCE(v_result, 0);

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'calculate_goal_value error for goal %: % (SQLSTATE: %)', p_goal_id, SQLERRM, SQLSTATE;
  RETURN COALESCE(v_goal.valor_atual, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 4: Atualizar templates para tipos baseados em mt_leads (responsible_user_id)
-- $5=assigned_to, $6=department_id (via mt_user_departments), $7=team_id (via mt_team_members)

UPDATE mt_goal_type_sources SET query_template =
  'SELECT COALESCE(COUNT(*), 0) FROM mt_leads WHERE tenant_id = $1 AND ($2::uuid IS NULL OR franchise_id = $2) AND created_at >= $3::timestamptz AND created_at <= $4::timestamptz AND deleted_at IS NULL AND ($5::uuid IS NULL OR responsible_user_id = $5) AND ($6::uuid IS NULL OR responsible_user_id IN (SELECT user_id FROM mt_user_departments WHERE department_id = $6 AND is_active = true)) AND ($7::uuid IS NULL OR responsible_user_id IN (SELECT user_id FROM mt_team_members WHERE team_id = $7 AND is_active = true))'
WHERE tipo = 'leads' AND is_active = true;

UPDATE mt_goal_type_sources SET query_template =
  'SELECT COALESCE(COUNT(*), 0) FROM mt_leads WHERE tenant_id = $1 AND ($2::uuid IS NULL OR franchise_id = $2) AND created_at >= $3::timestamptz AND created_at <= $4::timestamptz AND deleted_at IS NULL AND status IN (''convertido'', ''vendido'', ''ganho'', ''fechado'') AND ($5::uuid IS NULL OR responsible_user_id = $5) AND ($6::uuid IS NULL OR responsible_user_id IN (SELECT user_id FROM mt_user_departments WHERE department_id = $6 AND is_active = true)) AND ($7::uuid IS NULL OR responsible_user_id IN (SELECT user_id FROM mt_team_members WHERE team_id = $7 AND is_active = true))'
WHERE tipo = 'conversoes' AND is_active = true;

UPDATE mt_goal_type_sources SET query_template =
  'SELECT COALESCE(SUM(COALESCE(valor_conversao, 0)), 0) FROM mt_leads WHERE tenant_id = $1 AND ($2::uuid IS NULL OR franchise_id = $2) AND created_at >= $3::timestamptz AND created_at <= $4::timestamptz AND deleted_at IS NULL AND status IN (''convertido'', ''vendido'', ''ganho'', ''fechado'') AND ($5::uuid IS NULL OR responsible_user_id = $5) AND ($6::uuid IS NULL OR responsible_user_id IN (SELECT user_id FROM mt_user_departments WHERE department_id = $6 AND is_active = true)) AND ($7::uuid IS NULL OR responsible_user_id IN (SELECT user_id FROM mt_team_members WHERE team_id = $7 AND is_active = true))'
WHERE tipo = 'receita' AND is_active = true;

UPDATE mt_goal_type_sources SET query_template =
  'SELECT COALESCE(AVG(CASE WHEN valor_conversao > 0 THEN valor_conversao END), 0) FROM mt_leads WHERE tenant_id = $1 AND ($2::uuid IS NULL OR franchise_id = $2) AND created_at >= $3::timestamptz AND created_at <= $4::timestamptz AND deleted_at IS NULL AND status IN (''convertido'', ''vendido'', ''ganho'', ''fechado'') AND ($5::uuid IS NULL OR responsible_user_id = $5) AND ($6::uuid IS NULL OR responsible_user_id IN (SELECT user_id FROM mt_user_departments WHERE department_id = $6 AND is_active = true)) AND ($7::uuid IS NULL OR responsible_user_id IN (SELECT user_id FROM mt_team_members WHERE team_id = $7 AND is_active = true))'
WHERE tipo = 'ticket_medio' AND is_active = true;

UPDATE mt_goal_type_sources SET query_template =
  'SELECT CASE WHEN COUNT(*) > 0 THEN ROUND(COUNT(*) FILTER (WHERE status IN (''convertido'',''vendido'',''ganho'',''fechado''))::numeric / COUNT(*) * 100, 2) ELSE 0 END FROM mt_leads WHERE tenant_id = $1 AND ($2::uuid IS NULL OR franchise_id = $2) AND created_at >= $3::timestamptz AND created_at <= $4::timestamptz AND deleted_at IS NULL AND ($5::uuid IS NULL OR responsible_user_id = $5) AND ($6::uuid IS NULL OR responsible_user_id IN (SELECT user_id FROM mt_user_departments WHERE department_id = $6 AND is_active = true)) AND ($7::uuid IS NULL OR responsible_user_id IN (SELECT user_id FROM mt_team_members WHERE team_id = $7 AND is_active = true))'
WHERE tipo = 'taxa_conversao' AND is_active = true;

UPDATE mt_goal_type_sources SET query_template =
  'SELECT COALESCE(SUM(COALESCE(valor_estimado, 0)), 0) FROM mt_leads WHERE tenant_id = $1 AND ($2::uuid IS NULL OR franchise_id = $2) AND created_at >= $3::timestamptz AND created_at <= $4::timestamptz AND deleted_at IS NULL AND status NOT IN (''perdido'',''cancelado'',''convertido'',''vendido'',''ganho'',''fechado'') AND ($5::uuid IS NULL OR responsible_user_id = $5) AND ($6::uuid IS NULL OR responsible_user_id IN (SELECT user_id FROM mt_user_departments WHERE department_id = $6 AND is_active = true)) AND ($7::uuid IS NULL OR responsible_user_id IN (SELECT user_id FROM mt_team_members WHERE team_id = $7 AND is_active = true))'
WHERE tipo = 'pipeline' AND is_active = true;

UPDATE mt_goal_type_sources SET query_template =
  'SELECT COALESCE(COUNT(*), 0) FROM mt_leads WHERE tenant_id = $1 AND ($2::uuid IS NULL OR franchise_id = $2) AND created_at >= $3::timestamptz AND created_at <= $4::timestamptz AND deleted_at IS NULL AND status IN (''recompra'', ''retorno'') AND ($5::uuid IS NULL OR responsible_user_id = $5) AND ($6::uuid IS NULL OR responsible_user_id IN (SELECT user_id FROM mt_user_departments WHERE department_id = $6 AND is_active = true)) AND ($7::uuid IS NULL OR responsible_user_id IN (SELECT user_id FROM mt_team_members WHERE team_id = $7 AND is_active = true))'
WHERE tipo = 'recompra' AND is_active = true;

-- STEP 5: Atualizar templates baseados em mt_appointments (profissional_id)

UPDATE mt_goal_type_sources SET query_template =
  'SELECT COALESCE(COUNT(*), 0) FROM mt_appointments WHERE tenant_id = $1 AND ($2::uuid IS NULL OR franchise_id = $2) AND created_at >= $3::timestamptz AND created_at <= $4::timestamptz AND ($5::uuid IS NULL OR profissional_id = $5) AND ($6::uuid IS NULL OR profissional_id IN (SELECT user_id FROM mt_user_departments WHERE department_id = $6 AND is_active = true)) AND ($7::uuid IS NULL OR profissional_id IN (SELECT user_id FROM mt_team_members WHERE team_id = $7 AND is_active = true))'
WHERE tipo = 'agendamentos' AND is_active = true;

UPDATE mt_goal_type_sources SET query_template =
  'SELECT COALESCE(COUNT(*), 0) FROM mt_appointments WHERE tenant_id = $1 AND ($2::uuid IS NULL OR franchise_id = $2) AND created_at >= $3::timestamptz AND created_at <= $4::timestamptz AND status IN (''concluido'', ''realizado'', ''completed'', ''checked_out'') AND ($5::uuid IS NULL OR profissional_id = $5) AND ($6::uuid IS NULL OR profissional_id IN (SELECT user_id FROM mt_user_departments WHERE department_id = $6 AND is_active = true)) AND ($7::uuid IS NULL OR profissional_id IN (SELECT user_id FROM mt_team_members WHERE team_id = $7 AND is_active = true))'
WHERE tipo = 'atendimentos' AND is_active = true;

UPDATE mt_goal_type_sources SET query_template =
  'SELECT CASE WHEN COUNT(*) > 0 THEN ROUND(COUNT(*) FILTER (WHERE status IN (''concluido'',''realizado'',''completed'',''checked_out'',''checked_in''))::numeric / COUNT(*) * 100, 2) ELSE 0 END FROM mt_appointments WHERE tenant_id = $1 AND ($2::uuid IS NULL OR franchise_id = $2) AND created_at >= $3::timestamptz AND created_at <= $4::timestamptz AND ($5::uuid IS NULL OR profissional_id = $5) AND ($6::uuid IS NULL OR profissional_id IN (SELECT user_id FROM mt_user_departments WHERE department_id = $6 AND is_active = true)) AND ($7::uuid IS NULL OR profissional_id IN (SELECT user_id FROM mt_team_members WHERE team_id = $7 AND is_active = true))'
WHERE tipo = 'comparecimento' AND is_active = true;

UPDATE mt_goal_type_sources SET query_template =
  'SELECT CASE WHEN COUNT(*) > 0 THEN ROUND(COUNT(*) FILTER (WHERE status IN (''no_show'',''nao_compareceu'',''ausente''))::numeric / COUNT(*) * 100, 2) ELSE 0 END FROM mt_appointments WHERE tenant_id = $1 AND ($2::uuid IS NULL OR franchise_id = $2) AND created_at >= $3::timestamptz AND created_at <= $4::timestamptz AND ($5::uuid IS NULL OR profissional_id = $5) AND ($6::uuid IS NULL OR profissional_id IN (SELECT user_id FROM mt_user_departments WHERE department_id = $6 AND is_active = true)) AND ($7::uuid IS NULL OR profissional_id IN (SELECT user_id FROM mt_team_members WHERE team_id = $7 AND is_active = true))'
WHERE tipo = 'no_show' AND is_active = true;

-- STEP 6: Templates sem coluna de responsável (mantêm formato original, sem filtro user/dept/team)
-- formularios, indicacoes, conversas, mensagens, servicos_vendidos, franquias_novas
-- Estes não são alterados pois as tabelas fonte não têm relação direta com user_id

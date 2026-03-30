-- =============================================================================
-- MIGRATION: Sistema de Metas Inteligente v2
-- =============================================================================
-- Resolução dos 5 problemas identificados:
-- 1. Tabela mt_goal_type_sources (mapeamento dinâmico - substitui CASE hardcoded)
-- 2. calculate_goal_value() dinâmico (lê da tabela de mapeamento)
-- 3. Triggers reativos nas tabelas fonte (mt_leads, mt_appointments, etc.)
-- 4. get_goal_analytics() com projeção e tendência para AI
-- 5. Recálculo automático periódico via função batch
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 1: Tabela de Mapeamento Dinâmico
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mt_goal_type_sources (
  tipo VARCHAR(50) PRIMARY KEY,
  source_table VARCHAR(100) NOT NULL,
  query_template TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE mt_goal_type_sources ENABLE ROW LEVEL SECURITY;

-- Todos podem ler (necessário para o calculate_goal_value)
DROP POLICY IF EXISTS "mt_goal_type_sources_select" ON mt_goal_type_sources;
CREATE POLICY "mt_goal_type_sources_select" ON mt_goal_type_sources
  FOR SELECT USING (true);

-- Apenas admins podem modificar
DROP POLICY IF EXISTS "mt_goal_type_sources_admin" ON mt_goal_type_sources;
CREATE POLICY "mt_goal_type_sources_admin" ON mt_goal_type_sources
  FOR ALL USING (is_platform_admin() OR is_tenant_admin());


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 2: Seed dos 17 tipos auto-calculáveis
-- ─────────────────────────────────────────────────────────────────────────────
-- Templates usam: $1=tenant_id, $2=franchise_id, $3=data_inicio, $4=data_fim

INSERT INTO mt_goal_type_sources (tipo, source_table, query_template, description) VALUES

-- VENDAS
('leads', 'mt_leads',
 'SELECT COALESCE(COUNT(*), 0) FROM mt_leads WHERE tenant_id = $1 AND ($2::uuid IS NULL OR franchise_id = $2) AND created_at >= $3::timestamptz AND created_at <= $4::timestamptz AND deleted_at IS NULL',
 'Total de leads captados no período'),

('conversoes', 'mt_leads',
 'SELECT COALESCE(COUNT(*), 0) FROM mt_leads WHERE tenant_id = $1 AND ($2::uuid IS NULL OR franchise_id = $2) AND created_at >= $3::timestamptz AND created_at <= $4::timestamptz AND deleted_at IS NULL AND status IN (''convertido'', ''vendido'', ''ganho'', ''fechado'')',
 'Leads que converteram em venda'),

('receita', 'mt_leads',
 'SELECT COALESCE(SUM(COALESCE(valor_conversao, 0)), 0) FROM mt_leads WHERE tenant_id = $1 AND ($2::uuid IS NULL OR franchise_id = $2) AND created_at >= $3::timestamptz AND created_at <= $4::timestamptz AND deleted_at IS NULL AND status IN (''convertido'', ''vendido'', ''ganho'', ''fechado'')',
 'Receita total dos leads convertidos'),

('ticket_medio', 'mt_leads',
 'SELECT COALESCE(AVG(CASE WHEN valor_conversao > 0 THEN valor_conversao END), 0) FROM mt_leads WHERE tenant_id = $1 AND ($2::uuid IS NULL OR franchise_id = $2) AND created_at >= $3::timestamptz AND created_at <= $4::timestamptz AND deleted_at IS NULL AND status IN (''convertido'', ''vendido'', ''ganho'', ''fechado'')',
 'Valor médio por venda'),

('taxa_conversao', 'mt_leads',
 'SELECT CASE WHEN COUNT(*) > 0 THEN ROUND(COUNT(*) FILTER (WHERE status IN (''convertido'',''vendido'',''ganho'',''fechado''))::numeric / COUNT(*) * 100, 2) ELSE 0 END FROM mt_leads WHERE tenant_id = $1 AND ($2::uuid IS NULL OR franchise_id = $2) AND created_at >= $3::timestamptz AND created_at <= $4::timestamptz AND deleted_at IS NULL',
 'Percentual de leads convertidos'),

('pipeline', 'mt_leads',
 'SELECT COALESCE(SUM(COALESCE(valor_estimado, 0)), 0) FROM mt_leads WHERE tenant_id = $1 AND ($2::uuid IS NULL OR franchise_id = $2) AND created_at >= $3::timestamptz AND created_at <= $4::timestamptz AND deleted_at IS NULL AND status NOT IN (''perdido'',''cancelado'',''convertido'',''vendido'',''ganho'',''fechado'')',
 'Valor total das oportunidades em aberto'),

('recompra', 'mt_leads',
 'SELECT COALESCE(COUNT(*), 0) FROM mt_leads WHERE tenant_id = $1 AND ($2::uuid IS NULL OR franchise_id = $2) AND created_at >= $3::timestamptz AND created_at <= $4::timestamptz AND deleted_at IS NULL AND status IN (''recompra'', ''retorno'')',
 'Clientes que retornaram para nova compra'),

-- OPERAÇÃO
('agendamentos', 'mt_appointments',
 'SELECT COALESCE(COUNT(*), 0) FROM mt_appointments WHERE tenant_id = $1 AND ($2::uuid IS NULL OR franchise_id = $2) AND created_at >= $3::timestamptz AND created_at <= $4::timestamptz',
 'Total de agendamentos no período'),

('atendimentos', 'mt_appointments',
 'SELECT COALESCE(COUNT(*), 0) FROM mt_appointments WHERE tenant_id = $1 AND ($2::uuid IS NULL OR franchise_id = $2) AND created_at >= $3::timestamptz AND created_at <= $4::timestamptz AND status IN (''concluido'', ''realizado'', ''completed'', ''checked_out'')',
 'Atendimentos efetivamente realizados'),

('comparecimento', 'mt_appointments',
 'SELECT CASE WHEN COUNT(*) > 0 THEN ROUND(COUNT(*) FILTER (WHERE status IN (''concluido'',''realizado'',''completed'',''checked_out'',''checked_in''))::numeric / COUNT(*) * 100, 2) ELSE 0 END FROM mt_appointments WHERE tenant_id = $1 AND ($2::uuid IS NULL OR franchise_id = $2) AND created_at >= $3::timestamptz AND created_at <= $4::timestamptz',
 'Taxa de comparecimento aos agendamentos'),

('no_show', 'mt_appointments',
 'SELECT CASE WHEN COUNT(*) > 0 THEN ROUND(COUNT(*) FILTER (WHERE status IN (''no_show'',''nao_compareceu'',''ausente''))::numeric / COUNT(*) * 100, 2) ELSE 0 END FROM mt_appointments WHERE tenant_id = $1 AND ($2::uuid IS NULL OR franchise_id = $2) AND created_at >= $3::timestamptz AND created_at <= $4::timestamptz',
 'Taxa de no-show nos agendamentos'),

-- MARKETING
('formularios', 'mt_form_submissions',
 'SELECT COALESCE(COUNT(*), 0) FROM mt_form_submissions WHERE tenant_id = $1 AND ($2::uuid IS NULL OR franchise_id = $2) AND created_at >= $3::timestamptz AND created_at <= $4::timestamptz',
 'Formulários preenchidos no período'),

('indicacoes', 'mt_influencer_referrals',
 'SELECT COALESCE(COUNT(*), 0) FROM mt_influencer_referrals WHERE tenant_id = $1 AND ($2::uuid IS NULL OR franchise_id = $2) AND created_at >= $3::timestamptz AND created_at <= $4::timestamptz',
 'Indicações recebidas de influenciadoras'),

-- COMUNICAÇÃO
('mensagens', 'mt_whatsapp_messages',
 'SELECT COALESCE(COUNT(*), 0) FROM mt_whatsapp_messages m JOIN mt_whatsapp_conversations c ON c.id = m.conversation_id WHERE m.tenant_id = $1 AND ($2::uuid IS NULL OR c.franchise_id = $2) AND m.created_at >= $3::timestamptz AND m.created_at <= $4::timestamptz AND m.from_me = true',
 'Mensagens WhatsApp enviadas'),

('conversas', 'mt_whatsapp_conversations',
 'SELECT COALESCE(COUNT(*), 0) FROM mt_whatsapp_conversations WHERE tenant_id = $1 AND ($2::uuid IS NULL OR franchise_id = $2) AND created_at >= $3::timestamptz AND created_at <= $4::timestamptz',
 'Conversas WhatsApp atendidas'),

-- GESTÃO
('servicos_vendidos', 'mt_services',
 'SELECT COALESCE(COUNT(*), 0) FROM mt_services WHERE tenant_id = $1 AND ($2::uuid IS NULL OR franchise_id = $2) AND created_at >= $3::timestamptz AND created_at <= $4::timestamptz AND is_active = true',
 'Serviços cadastrados/ativos'),

('franquias_novas', 'mt_franchises',
 'SELECT COALESCE(COUNT(*), 0) FROM mt_franchises WHERE tenant_id = $1 AND created_at >= $3::timestamptz AND created_at <= $4::timestamptz AND is_active = true',
 'Novas franquias abertas no período')

ON CONFLICT (tipo) DO UPDATE SET
  source_table = EXCLUDED.source_table,
  query_template = EXCLUDED.query_template,
  description = EXCLUDED.description;


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 3: calculate_goal_value() DINÂMICO (substitui CASE hardcoded)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION calculate_goal_value(p_goal_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_goal RECORD;
  v_source RECORD;
  v_result NUMERIC := 0;
BEGIN
  -- Buscar dados da meta
  SELECT tipo, tenant_id, franchise_id, data_inicio, data_fim, valor_atual
  INTO v_goal
  FROM mt_goals
  WHERE id = p_goal_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Buscar template de cálculo na tabela de mapeamento
  SELECT query_template, source_table
  INTO v_source
  FROM mt_goal_type_sources
  WHERE tipo = v_goal.tipo AND is_active = true;

  -- Se não encontrou template, retorna valor_atual (tipo manual/custom)
  IF NOT FOUND THEN
    RETURN COALESCE(v_goal.valor_atual, 0);
  END IF;

  -- Executar query dinâmica com parâmetros
  EXECUTE v_source.query_template
  INTO v_result
  USING v_goal.tenant_id, v_goal.franchise_id, v_goal.data_inicio, v_goal.data_fim;

  RETURN COALESCE(v_result, 0);

EXCEPTION WHEN OTHERS THEN
  -- Log de erro e retorna valor atual como fallback
  RAISE WARNING 'calculate_goal_value error for goal %: % (SQLSTATE: %)', p_goal_id, SQLERRM, SQLSTATE;
  RETURN COALESCE(v_goal.valor_atual, 0);
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 4: sync_goal_progress() ATUALIZADO
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_goal_progress(p_goal_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_goal RECORD;
  v_new_value NUMERIC;
  v_percentual NUMERIC;
  v_status TEXT;
  v_old_value NUMERIC;
  v_changed BOOLEAN;
BEGIN
  -- Buscar meta atual
  SELECT * INTO v_goal FROM mt_goals WHERE id = p_goal_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Goal not found');
  END IF;

  v_old_value := COALESCE(v_goal.valor_atual, 0);

  -- Calcular novo valor via mapeamento dinâmico
  v_new_value := calculate_goal_value(p_goal_id);

  -- Calcular percentual
  v_percentual := CASE
    WHEN v_goal.meta_valor > 0 THEN ROUND((v_new_value / v_goal.meta_valor) * 100, 2)
    ELSE 0
  END;

  -- Determinar status
  v_status := CASE
    WHEN v_percentual >= 100 THEN 'atingida'
    WHEN v_goal.data_fim < NOW() THEN 'expirada'
    WHEN v_percentual >= 80 THEN 'proxima'
    ELSE 'em_andamento'
  END;

  v_changed := (v_new_value != v_old_value);

  -- Atualizar meta no banco
  UPDATE mt_goals SET
    valor_atual = v_new_value,
    percentual_atingido = v_percentual,
    status = v_status,
    alerta_50 = (v_percentual >= 50),
    alerta_80 = (v_percentual >= 80),
    alerta_100 = (v_percentual >= 100),
    updated_at = NOW()
  WHERE id = p_goal_id;

  -- Registrar no histórico (apenas se mudou)
  IF v_changed THEN
    BEGIN
      INSERT INTO mt_goals_history (
        goal_id, tenant_id, franchise_id,
        recorded_date, current_value, target_value, progress_percentage,
        notes, metadata
      ) VALUES (
        p_goal_id, v_goal.tenant_id, v_goal.franchise_id,
        CURRENT_DATE, v_new_value, v_goal.meta_valor, v_percentual,
        'Cálculo automático',
        jsonb_build_object(
          'old_value', v_old_value,
          'new_value', v_new_value,
          'status', v_status,
          'trigger', 'auto'
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'sync_goal_progress: history insert failed for goal %: %', p_goal_id, SQLERRM;
    END;
  END IF;

  RETURN jsonb_build_object(
    'goal_id', p_goal_id,
    'tipo', v_goal.tipo,
    'valor_anterior', v_old_value,
    'valor_atual', v_new_value,
    'meta_valor', v_goal.meta_valor,
    'percentual', v_percentual,
    'status', v_status,
    'changed', v_changed
  );
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 5: recalculate_all_goals() ATUALIZADO
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION recalculate_all_goals(p_tenant_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_goal RECORD;
  v_result JSONB;
  v_details JSONB := '[]'::jsonb;
  v_total INT := 0;
  v_changed INT := 0;
BEGIN
  -- Validar acesso ao tenant
  IF p_tenant_id IS NOT NULL AND NOT (is_platform_admin() OR can_access_tenant(p_tenant_id)) THEN
    RETURN jsonb_build_object('error', 'Access denied to tenant');
  END IF;

  -- Iterar metas ativas que possuem tipo mapeado
  FOR v_goal IN
    SELECT g.id, g.tipo
    FROM mt_goals g
    INNER JOIN mt_goal_type_sources s ON s.tipo = g.tipo AND s.is_active = true
    WHERE (p_tenant_id IS NULL OR g.tenant_id = p_tenant_id)
      AND g.status NOT IN ('atingida')
      AND g.deleted_at IS NULL
      AND g.data_fim >= (CURRENT_DATE - INTERVAL '30 days')
    ORDER BY g.created_at
  LOOP
    v_total := v_total + 1;

    v_result := sync_goal_progress(v_goal.id);

    IF (v_result->>'changed')::boolean THEN
      v_changed := v_changed + 1;
    END IF;

    v_details := v_details || v_result;
  END LOOP;

  RETURN jsonb_build_object(
    'total_goals', v_total,
    'goals_changed', v_changed,
    'calculated_at', NOW(),
    'details', v_details
  );
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 6: TRIGGER REATIVO - Recalcula metas quando dados fonte mudam
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trigger_recalculate_goals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_goal RECORD;
  v_source_table TEXT;
BEGIN
  -- Identificar tenant_id do registro afetado
  IF TG_OP = 'DELETE' THEN
    v_tenant_id := OLD.tenant_id;
  ELSE
    v_tenant_id := NEW.tenant_id;
  END IF;

  -- Se não tem tenant_id, sair
  IF v_tenant_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  -- Nome da tabela que disparou o trigger
  v_source_table := TG_TABLE_NAME;

  -- Buscar metas ativas do tenant que usam esta tabela como fonte
  FOR v_goal IN
    SELECT g.id
    FROM mt_goals g
    INNER JOIN mt_goal_type_sources s ON s.tipo = g.tipo AND s.is_active = true
    WHERE g.tenant_id = v_tenant_id
      AND s.source_table = v_source_table
      AND g.status NOT IN ('atingida')
      AND g.data_fim >= CURRENT_DATE
    LIMIT 20  -- Limitar para evitar recalcular muitas metas de uma vez
  LOOP
    -- Recalcular cada meta afetada
    PERFORM sync_goal_progress(v_goal.id);
  END LOOP;

  -- Retornar registro conforme operação
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 7: Anexar triggers nas tabelas fonte
-- ─────────────────────────────────────────────────────────────────────────────

-- mt_leads
DROP TRIGGER IF EXISTS trg_goals_mt_leads ON mt_leads;
CREATE TRIGGER trg_goals_mt_leads
  AFTER INSERT OR UPDATE OF status, valor_conversao, valor_estimado, deleted_at OR DELETE
  ON mt_leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_goals();

-- mt_appointments
DROP TRIGGER IF EXISTS trg_goals_mt_appointments ON mt_appointments;
CREATE TRIGGER trg_goals_mt_appointments
  AFTER INSERT OR UPDATE OF status OR DELETE
  ON mt_appointments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_goals();

-- mt_form_submissions
DROP TRIGGER IF EXISTS trg_goals_mt_form_submissions ON mt_form_submissions;
CREATE TRIGGER trg_goals_mt_form_submissions
  AFTER INSERT OR DELETE
  ON mt_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_goals();

-- mt_influencer_referrals
DROP TRIGGER IF EXISTS trg_goals_mt_influencer_referrals ON mt_influencer_referrals;
CREATE TRIGGER trg_goals_mt_influencer_referrals
  AFTER INSERT OR DELETE
  ON mt_influencer_referrals
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_goals();

-- mt_whatsapp_messages (apenas mensagens enviadas - from_me = true)
DROP TRIGGER IF EXISTS trg_goals_mt_whatsapp_messages ON mt_whatsapp_messages;
CREATE TRIGGER trg_goals_mt_whatsapp_messages
  AFTER INSERT
  ON mt_whatsapp_messages
  FOR EACH ROW
  WHEN (NEW.from_me = true)
  EXECUTE FUNCTION trigger_recalculate_goals();

-- mt_whatsapp_conversations
DROP TRIGGER IF EXISTS trg_goals_mt_whatsapp_conversations ON mt_whatsapp_conversations;
CREATE TRIGGER trg_goals_mt_whatsapp_conversations
  AFTER INSERT
  ON mt_whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_goals();

-- mt_services
DROP TRIGGER IF EXISTS trg_goals_mt_services ON mt_services;
CREATE TRIGGER trg_goals_mt_services
  AFTER INSERT OR UPDATE OF is_active OR DELETE
  ON mt_services
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_goals();

-- mt_franchises
DROP TRIGGER IF EXISTS trg_goals_mt_franchises ON mt_franchises;
CREATE TRIGGER trg_goals_mt_franchises
  AFTER INSERT OR UPDATE OF is_active OR DELETE
  ON mt_franchises
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_goals();


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 8: get_goal_analytics() COM PROJEÇÃO E TENDÊNCIA
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_goal_analytics(
  p_tenant_id UUID,
  p_franchise_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_goals JSONB := '[]'::jsonb;
  v_stats JSONB;
  v_history JSONB := '[]'::jsonb;
  v_goal RECORD;
  v_hist RECORD;
  v_dias_passados INT;
  v_dias_total INT;
  v_velocidade_diaria NUMERIC;
  v_valor_restante NUMERIC;
  v_dias_restantes INT;
  v_data_projetada DATE;
  v_tendencia TEXT;
  v_progresso_primeira_metade NUMERIC;
  v_progresso_segunda_metade NUMERIC;
  v_meio_periodo DATE;
BEGIN
  -- Validar acesso ao tenant
  IF NOT (is_platform_admin() OR can_access_tenant(p_tenant_id)) THEN
    RETURN jsonb_build_object('error', 'Access denied to tenant');
  END IF;

  -- ─── METAS COM PROJEÇÃO ───
  FOR v_goal IN
    SELECT
      g.*,
      s.source_table,
      s.description as tipo_desc
    FROM mt_goals g
    LEFT JOIN mt_goal_type_sources s ON s.tipo = g.tipo
    WHERE g.tenant_id = p_tenant_id
      AND (p_franchise_id IS NULL OR g.franchise_id = p_franchise_id)
      AND g.deleted_at IS NULL
    ORDER BY g.data_fim ASC
  LOOP
    -- Calcular projeção
    v_dias_total := GREATEST(1, (v_goal.data_fim::date - v_goal.data_inicio::date));
    v_dias_passados := GREATEST(0, (CURRENT_DATE - v_goal.data_inicio::date));
    v_dias_restantes := GREATEST(0, (v_goal.data_fim::date - CURRENT_DATE));

    -- Velocidade diária (progresso por dia)
    v_velocidade_diaria := CASE
      WHEN v_dias_passados > 0 THEN ROUND(v_goal.valor_atual::numeric / v_dias_passados, 4)
      ELSE 0
    END;

    -- Valor restante para atingir meta
    v_valor_restante := GREATEST(0, v_goal.meta_valor - v_goal.valor_atual);

    -- Data projetada de conclusão
    v_data_projetada := CASE
      WHEN v_velocidade_diaria > 0 THEN
        CURRENT_DATE + (v_valor_restante / v_velocidade_diaria)::int
      ELSE NULL
    END;

    -- Tendência: comparar progresso primeira vs segunda metade do período
    v_meio_periodo := v_goal.data_inicio::date + (v_dias_total / 2);

    SELECT COALESCE(MAX(progress_percentage), 0) INTO v_progresso_primeira_metade
    FROM mt_goals_history
    WHERE goal_id = v_goal.id AND recorded_date <= v_meio_periodo;

    SELECT COALESCE(MAX(progress_percentage), 0) INTO v_progresso_segunda_metade
    FROM mt_goals_history
    WHERE goal_id = v_goal.id AND recorded_date > v_meio_periodo;

    -- Determinar tendência
    IF v_dias_passados < (v_dias_total / 2) THEN
      v_tendencia := 'inicio'; -- Pouco tempo para avaliar
    ELSIF v_progresso_segunda_metade > v_progresso_primeira_metade * 1.2 THEN
      v_tendencia := 'acelerando'; -- Crescendo mais rápido
    ELSIF v_progresso_segunda_metade < v_progresso_primeira_metade * 0.8 AND v_progresso_primeira_metade > 0 THEN
      v_tendencia := 'desacelerando'; -- Crescimento diminuindo
    ELSE
      v_tendencia := 'estavel'; -- Crescimento constante
    END IF;

    v_goals := v_goals || jsonb_build_object(
      'id', v_goal.id,
      'titulo', v_goal.titulo,
      'tipo', v_goal.tipo,
      'tipo_desc', COALESCE(v_goal.tipo_desc, 'Manual'),
      'source_table', v_goal.source_table,
      'valor_atual', v_goal.valor_atual,
      'meta_valor', v_goal.meta_valor,
      'percentual', COALESCE(v_goal.percentual_atingido, 0),
      'status', COALESCE(v_goal.status, 'em_andamento'),
      'data_inicio', v_goal.data_inicio,
      'data_fim', v_goal.data_fim,
      'is_auto', (v_goal.source_table IS NOT NULL),
      -- Projeção / AI
      'projection', jsonb_build_object(
        'dias_passados', v_dias_passados,
        'dias_restantes', v_dias_restantes,
        'dias_total', v_dias_total,
        'velocidade_diaria', v_velocidade_diaria,
        'valor_restante', v_valor_restante,
        'data_projetada', v_data_projetada,
        'vai_atingir', (v_data_projetada IS NOT NULL AND v_data_projetada <= v_goal.data_fim::date),
        'tendencia', v_tendencia,
        'percentual_tempo', ROUND(v_dias_passados::numeric / v_dias_total * 100, 1),
        'percentual_meta', COALESCE(v_goal.percentual_atingido, 0),
        'ritmo', CASE
          WHEN v_dias_passados = 0 THEN 'sem_dados'
          WHEN COALESCE(v_goal.percentual_atingido, 0) >= (v_dias_passados::numeric / v_dias_total * 100) THEN 'adiantado'
          WHEN COALESCE(v_goal.percentual_atingido, 0) >= (v_dias_passados::numeric / v_dias_total * 100 * 0.7) THEN 'no_ritmo'
          ELSE 'atrasado'
        END
      )
    );
  END LOOP;

  -- ─── STATS AGREGADOS ───
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'atingidas', COUNT(*) FILTER (WHERE status = 'atingida'),
    'em_andamento', COUNT(*) FILTER (WHERE status IN ('em_andamento', 'proxima')),
    'expiradas', COUNT(*) FILTER (WHERE status = 'expirada'),
    'proximas', COUNT(*) FILTER (WHERE status = 'proxima'),
    'auto_calculaveis', COUNT(*) FILTER (WHERE tipo IN (SELECT tipo FROM mt_goal_type_sources WHERE is_active = true)),
    'manuais', COUNT(*) FILTER (WHERE tipo NOT IN (SELECT tipo FROM mt_goal_type_sources WHERE is_active = true)),
    'media_percentual', ROUND(AVG(COALESCE(percentual_atingido, 0))::numeric, 1),
    'media_velocidade', ROUND(AVG(
      CASE WHEN (CURRENT_DATE - data_inicio::date) > 0
        THEN valor_atual::numeric / (CURRENT_DATE - data_inicio::date)
        ELSE 0
      END
    )::numeric, 2),
    'vai_atingir_count', (
      SELECT COUNT(*) FROM mt_goals g2
      WHERE g2.tenant_id = p_tenant_id
        AND (p_franchise_id IS NULL OR g2.franchise_id = p_franchise_id)
        AND g2.status NOT IN ('atingida', 'expirada')
        AND g2.deleted_at IS NULL
        AND (CURRENT_DATE - g2.data_inicio::date) > 0
        AND (g2.valor_atual::numeric / (CURRENT_DATE - g2.data_inicio::date))
          * (g2.data_fim::date - CURRENT_DATE) + g2.valor_atual >= g2.meta_valor
    ),
    'nao_vai_atingir_count', (
      SELECT COUNT(*) FROM mt_goals g3
      WHERE g3.tenant_id = p_tenant_id
        AND (p_franchise_id IS NULL OR g3.franchise_id = p_franchise_id)
        AND g3.status NOT IN ('atingida', 'expirada')
        AND g3.deleted_at IS NULL
        AND (CURRENT_DATE - g3.data_inicio::date) > 7
        AND (g3.valor_atual::numeric / GREATEST(1, (CURRENT_DATE - g3.data_inicio::date)))
          * (g3.data_fim::date - CURRENT_DATE) + g3.valor_atual < g3.meta_valor
    )
  )
  INTO v_stats
  FROM mt_goals
  WHERE tenant_id = p_tenant_id
    AND (p_franchise_id IS NULL OR franchise_id = p_franchise_id)
    AND deleted_at IS NULL;

  -- ─── HISTÓRICO DOS ÚLTIMOS 90 DIAS ───
  SELECT COALESCE(jsonb_agg(row_to_json(h)::jsonb ORDER BY h.recorded_date), '[]'::jsonb)
  INTO v_history
  FROM (
    SELECT
      gh.goal_id,
      g.titulo,
      g.tipo,
      gh.recorded_date,
      gh.current_value,
      gh.target_value,
      gh.progress_percentage,
      gh.notes,
      gh.metadata
    FROM mt_goals_history gh
    JOIN mt_goals g ON g.id = gh.goal_id
    WHERE g.tenant_id = p_tenant_id
      AND (p_franchise_id IS NULL OR g.franchise_id = p_franchise_id)
      AND gh.recorded_date >= CURRENT_DATE - INTERVAL '90 days'
    ORDER BY gh.recorded_date DESC
    LIMIT 500
  ) h;

  RETURN jsonb_build_object(
    'goals', v_goals,
    'stats', v_stats,
    'history', v_history,
    'generated_at', NOW(),
    'tenant_id', p_tenant_id,
    'franchise_id', p_franchise_id
  );
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 9: Função batch para recálculo periódico (chamável por cron ou edge fn)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION batch_recalculate_goals()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant RECORD;
  v_results JSONB := '[]'::jsonb;
  v_result JSONB;
  v_total_changed INT := 0;
BEGIN
  -- Apenas platform admins podem executar batch
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: only platform admins can batch recalculate';
  END IF;

  -- Iterar todos os tenants ativos
  FOR v_tenant IN
    SELECT id, slug FROM mt_tenants WHERE is_active = true
  LOOP
    v_result := recalculate_all_goals(v_tenant.id);
    v_total_changed := v_total_changed + COALESCE((v_result->>'goals_changed')::int, 0);

    v_results := v_results || jsonb_build_object(
      'tenant', v_tenant.slug,
      'goals_recalculated', (v_result->>'total_goals')::int,
      'goals_changed', (v_result->>'goals_changed')::int
    );
  END LOOP;

  RETURN jsonb_build_object(
    'batch_at', NOW(),
    'total_changed', v_total_changed,
    'tenants', v_results
  );
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 10: Coluna deleted_at para soft delete em mt_goals
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE mt_goals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_mt_goals_deleted ON mt_goals(deleted_at) WHERE deleted_at IS NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 11: RLS Policies para mt_goals_history
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE mt_goals_history ENABLE ROW LEVEL SECURITY;

-- SELECT: platform admins veem tudo, tenant/franchise admins veem seus dados
DROP POLICY IF EXISTS "mt_goals_history_select" ON mt_goals_history;
CREATE POLICY "mt_goals_history_select" ON mt_goals_history
  FOR SELECT USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
    (tenant_id = current_tenant_id())
  );

-- INSERT: tenant members podem inserir no seu tenant
DROP POLICY IF EXISTS "mt_goals_history_insert" ON mt_goals_history;
CREATE POLICY "mt_goals_history_insert" ON mt_goals_history
  FOR INSERT WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
    (tenant_id = current_tenant_id())
  );

-- UPDATE: admins podem atualizar
DROP POLICY IF EXISTS "mt_goals_history_update" ON mt_goals_history;
CREATE POLICY "mt_goals_history_update" ON mt_goals_history
  FOR UPDATE USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
  );

-- DELETE: apenas platform admins
DROP POLICY IF EXISTS "mt_goals_history_delete" ON mt_goals_history;
CREATE POLICY "mt_goals_history_delete" ON mt_goals_history
  FOR DELETE USING (
    is_platform_admin()
  );

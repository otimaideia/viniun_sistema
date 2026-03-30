-- Migration: Funções para transferência de registros entre usuários
-- Propósito: Permitir transferir leads, conversas, agendamentos, etc. ao desativar um usuário
-- Data: 2026-02-23

-- ========================================================================
-- Função: count_user_records
-- Conta registros ativos vinculados a um usuário
-- ========================================================================
CREATE OR REPLACE FUNCTION count_user_records(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_leads INT;
  v_conversations INT;
  v_appointments INT;
  v_funnel_leads INT;
  v_goals INT;
  v_queue_entries INT;
BEGIN
  SELECT COUNT(*) INTO v_leads
  FROM mt_leads WHERE atribuido_para = p_user_id AND deleted_at IS NULL;

  SELECT COUNT(*) INTO v_conversations
  FROM mt_whatsapp_conversations WHERE assigned_to = p_user_id AND status != 'closed';

  SELECT COUNT(*) INTO v_appointments
  FROM mt_appointments WHERE profissional_id = p_user_id AND data_agendamento >= CURRENT_DATE AND status NOT IN ('cancelado', 'cancelled');

  SELECT COUNT(*) INTO v_funnel_leads
  FROM mt_funnel_leads WHERE responsavel_id = p_user_id;

  SELECT COUNT(*) INTO v_goals
  FROM mt_goals WHERE (assigned_to = p_user_id OR user_id = p_user_id) AND status IN ('active', 'in_progress', 'ativa');

  SELECT COUNT(*) INTO v_queue_entries
  FROM mt_whatsapp_queue_users WHERE user_id = p_user_id AND status != 'offline';

  RETURN jsonb_build_object(
    'leads', v_leads,
    'conversations', v_conversations,
    'appointments', v_appointments,
    'funnel_leads', v_funnel_leads,
    'goals', v_goals,
    'queue_entries', v_queue_entries,
    'total', v_leads + v_conversations + v_appointments + v_funnel_leads + v_goals + v_queue_entries
  );
END;
$$;

-- ========================================================================
-- Função: transfer_user_records
-- Transfere registros de um usuário para outro (bulk transfer)
-- Usada ao desativar consultoras/usuários
-- ========================================================================
CREATE OR REPLACE FUNCTION transfer_user_records(
  p_from_user_id UUID,
  p_to_user_id UUID,
  p_tenant_id UUID,
  p_transfer_leads BOOLEAN DEFAULT true,
  p_transfer_conversations BOOLEAN DEFAULT true,
  p_transfer_appointments BOOLEAN DEFAULT true,
  p_transfer_funnel BOOLEAN DEFAULT true,
  p_transfer_goals BOOLEAN DEFAULT true,
  p_performed_by UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_leads INT := 0;
  v_conversations INT := 0;
  v_appointments INT := 0;
  v_funnel_leads INT := 0;
  v_goals INT := 0;
  v_queue_removed INT := 0;
  v_from_name TEXT;
  v_to_name TEXT;
  v_performer_name TEXT;
BEGIN
  SELECT nome INTO v_from_name FROM mt_users WHERE id = p_from_user_id;
  SELECT nome INTO v_to_name FROM mt_users WHERE id = p_to_user_id;
  SELECT nome INTO v_performer_name FROM mt_users WHERE id = COALESCE(p_performed_by, p_to_user_id);

  IF v_from_name IS NULL OR v_to_name IS NULL THEN
    RAISE EXCEPTION 'Usuário de origem ou destino não encontrado';
  END IF;

  -- 1. Transferir Leads
  IF p_transfer_leads THEN
    WITH updated AS (
      UPDATE mt_leads
      SET atribuido_para = p_to_user_id,
          updated_at = NOW(),
          updated_by = COALESCE(p_performed_by, p_to_user_id)
      WHERE atribuido_para = p_from_user_id
        AND tenant_id = p_tenant_id
        AND deleted_at IS NULL
      RETURNING id, tenant_id, franchise_id
    )
    SELECT COUNT(*) INTO v_leads FROM updated;

    -- Registrar atividade para cada lead transferido
    IF v_leads > 0 THEN
      INSERT INTO mt_lead_activities (lead_id, tenant_id, tipo, titulo, descricao, user_id, user_nome, dados)
      SELECT
        l.id,
        l.tenant_id,
        'transferencia',
        'Transferência de responsável',
        'Lead transferido de ' || v_from_name || ' para ' || v_to_name || ' (desativação de usuário)',
        COALESCE(p_performed_by, p_to_user_id),
        COALESCE(v_performer_name, v_to_name),
        jsonb_build_object(
          'from_user_id', p_from_user_id,
          'from_user_name', v_from_name,
          'to_user_id', p_to_user_id,
          'to_user_name', v_to_name,
          'action', 'bulk_transfer'
        )
      FROM mt_leads l
      WHERE l.atribuido_para = p_to_user_id
        AND l.tenant_id = p_tenant_id
        AND l.deleted_at IS NULL
        AND l.updated_at >= NOW() - interval '10 seconds';
    END IF;
  END IF;

  -- 2. Transferir Conversas WhatsApp (abertas)
  IF p_transfer_conversations THEN
    WITH updated AS (
      UPDATE mt_whatsapp_conversations
      SET assigned_to = p_to_user_id,
          updated_at = NOW()
      WHERE assigned_to = p_from_user_id
        AND tenant_id = p_tenant_id
        AND status != 'closed'
      RETURNING id
    )
    SELECT COUNT(*) INTO v_conversations FROM updated;
  END IF;

  -- 3. Transferir Agendamentos futuros
  IF p_transfer_appointments THEN
    WITH updated AS (
      UPDATE mt_appointments
      SET profissional_id = p_to_user_id,
          updated_at = NOW()
      WHERE profissional_id = p_from_user_id
        AND tenant_id = p_tenant_id
        AND data_agendamento >= CURRENT_DATE
        AND status NOT IN ('cancelado', 'cancelled')
      RETURNING id
    )
    SELECT COUNT(*) INTO v_appointments FROM updated;
  END IF;

  -- 4. Transferir Leads do Funil
  IF p_transfer_funnel THEN
    WITH updated AS (
      UPDATE mt_funnel_leads
      SET responsavel_id = p_to_user_id
      WHERE responsavel_id = p_from_user_id
        AND tenant_id = p_tenant_id
      RETURNING id
    )
    SELECT COUNT(*) INTO v_funnel_leads FROM updated;
  END IF;

  -- 5. Transferir Metas ativas
  IF p_transfer_goals THEN
    WITH updated AS (
      UPDATE mt_goals
      SET assigned_to = p_to_user_id
      WHERE assigned_to = p_from_user_id
        AND tenant_id = p_tenant_id
        AND status IN ('active', 'in_progress', 'ativa')
      RETURNING id
    )
    SELECT COUNT(*) INTO v_goals FROM updated;
  END IF;

  -- 6. Remover das filas WhatsApp (sempre)
  WITH deleted AS (
    DELETE FROM mt_whatsapp_queue_users
    WHERE user_id = p_from_user_id
      AND tenant_id = p_tenant_id
    RETURNING id
  )
  SELECT COUNT(*) INTO v_queue_removed FROM deleted;

  -- 7. Registrar auditoria
  INSERT INTO mt_audit_logs (
    tenant_id, user_id, action, resource_type, resource_id, resource_name,
    old_data, new_data, changed_fields, status
  ) VALUES (
    p_tenant_id,
    COALESCE(p_performed_by, p_to_user_id),
    'bulk_transfer',
    'user',
    p_from_user_id,
    v_from_name,
    jsonb_build_object('from_user', v_from_name, 'from_user_id', p_from_user_id),
    jsonb_build_object(
      'to_user', v_to_name,
      'to_user_id', p_to_user_id,
      'leads', v_leads,
      'conversations', v_conversations,
      'appointments', v_appointments,
      'funnel_leads', v_funnel_leads,
      'goals', v_goals,
      'queue_removed', v_queue_removed
    ),
    ARRAY['leads', 'conversations', 'appointments', 'funnel_leads', 'goals', 'queue_users'],
    'success'
  );

  RETURN jsonb_build_object(
    'leads', v_leads,
    'conversations', v_conversations,
    'appointments', v_appointments,
    'funnel_leads', v_funnel_leads,
    'goals', v_goals,
    'queue_removed', v_queue_removed,
    'total', v_leads + v_conversations + v_appointments + v_funnel_leads + v_goals,
    'from_user', v_from_name,
    'to_user', v_to_name
  );
END;
$$;

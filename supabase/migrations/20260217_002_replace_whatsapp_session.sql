-- Migration: Função para substituir sessão WhatsApp
-- Permite migrar TODOS os dados de uma sessão antiga para uma nova
-- Útil quando sessão falha no WAHA e precisa ser recriada
-- Autor: Claude + Danilo
-- Data: 2026-02-17

CREATE OR REPLACE FUNCTION replace_whatsapp_session(
  p_old_session_id UUID,
  p_new_session_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_old_session RECORD;
  v_new_session RECORD;
  v_conversations_count INT := 0;
  v_messages_count INT := 0;
  v_leads_count INT := 0;
  v_permissions_count INT := 0;
  v_queues_count INT := 0;
  v_result JSONB;
BEGIN
  -- 1. Validar que ambas sessoes existem
  SELECT * INTO v_old_session FROM mt_whatsapp_sessions WHERE id = p_old_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sessao antiga nao encontrada: %', p_old_session_id;
  END IF;

  SELECT * INTO v_new_session FROM mt_whatsapp_sessions WHERE id = p_new_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sessao nova nao encontrada: %', p_new_session_id;
  END IF;

  -- 2. Validar que pertencem ao mesmo tenant
  IF v_old_session.tenant_id != v_new_session.tenant_id THEN
    RAISE EXCEPTION 'As sessoes devem pertencer ao mesmo tenant';
  END IF;

  -- 3. Validar que sao sessoes diferentes
  IF p_old_session_id = p_new_session_id THEN
    RAISE EXCEPTION 'As sessoes devem ser diferentes';
  END IF;

  -- 4. Para conversas duplicadas (mesmo chat_id nas duas sessoes):
  -- Reparentar mensagens da conversa antiga para a conversa da sessao nova
  UPDATE mt_whatsapp_messages m
  SET conversation_id = new_conv.id,
      session_id = p_new_session_id
  FROM mt_whatsapp_conversations old_conv
  JOIN mt_whatsapp_conversations new_conv
    ON new_conv.session_id = p_new_session_id
    AND new_conv.chat_id = old_conv.chat_id
  WHERE old_conv.session_id = p_old_session_id
    AND m.conversation_id = old_conv.id;

  -- 5. Migrar mensagens restantes (conversas sem duplicata)
  UPDATE mt_whatsapp_messages
  SET session_id = p_new_session_id
  WHERE session_id = p_old_session_id;
  GET DIAGNOSTICS v_messages_count = ROW_COUNT;

  -- 6. Deletar conversas duplicadas da sessao antiga (dados ja migrados)
  DELETE FROM mt_whatsapp_conversations old_conv
  WHERE old_conv.session_id = p_old_session_id
    AND EXISTS (
      SELECT 1 FROM mt_whatsapp_conversations new_conv
      WHERE new_conv.session_id = p_new_session_id
        AND new_conv.chat_id = old_conv.chat_id
    );

  -- 7. Migrar conversas restantes (sem conflito UNIQUE)
  UPDATE mt_whatsapp_conversations
  SET session_id = p_new_session_id
  WHERE session_id = p_old_session_id;
  GET DIAGNOSTICS v_conversations_count = ROW_COUNT;

  -- 8. Migrar leads que referenciavam a sessao antiga
  UPDATE mt_leads
  SET whatsapp_session_id = p_new_session_id
  WHERE whatsapp_session_id = p_old_session_id;
  GET DIAGNOSTICS v_leads_count = ROW_COUNT;

  -- 9. Migrar permissoes de usuario (evitar duplicatas)
  UPDATE mt_whatsapp_user_sessions
  SET whatsapp_session_id = p_new_session_id
  WHERE whatsapp_session_id = p_old_session_id
    AND NOT EXISTS (
      SELECT 1 FROM mt_whatsapp_user_sessions us2
      WHERE us2.whatsapp_session_id = p_new_session_id
        AND us2.user_id = mt_whatsapp_user_sessions.user_id
    );
  GET DIAGNOSTICS v_permissions_count = ROW_COUNT;

  -- Deletar permissoes duplicadas restantes
  DELETE FROM mt_whatsapp_user_sessions
  WHERE whatsapp_session_id = p_old_session_id;

  -- 10. Migrar filas
  UPDATE mt_whatsapp_queues
  SET session_id = p_new_session_id
  WHERE session_id = p_old_session_id;
  GET DIAGNOSTICS v_queues_count = ROW_COUNT;

  -- 11. Migrar bot config
  UPDATE mt_whatsapp_bot_config
  SET session_id = p_new_session_id
  WHERE session_id = p_old_session_id
    AND NOT EXISTS (
      SELECT 1 FROM mt_whatsapp_bot_config bc2
      WHERE bc2.session_id = p_new_session_id
    );
  DELETE FROM mt_whatsapp_bot_config
  WHERE session_id = p_old_session_id;

  -- 12. Migrar automacoes
  UPDATE mt_whatsapp_automations
  SET session_id = p_new_session_id
  WHERE session_id = p_old_session_id;

  -- 13. Migrar agent metrics
  UPDATE mt_whatsapp_agent_metrics
  SET session_id = p_new_session_id
  WHERE session_id = p_old_session_id;

  -- 14. Migrar round robin state
  UPDATE mt_whatsapp_round_robin_state
  SET session_id = p_new_session_id
  WHERE session_id = p_old_session_id;

  -- 15. Migrar session stats
  UPDATE mt_session_stats
  SET whatsapp_session_id = p_new_session_id
  WHERE whatsapp_session_id = p_old_session_id;

  -- 16. Migrar chatbot logs
  UPDATE mt_chatbot_logs
  SET session_id = p_new_session_id
  WHERE session_id = p_old_session_id;

  -- 17. Atualizar chatbot conversations (session_id é varchar, precisa cast)
  UPDATE mt_chatbot_conversations
  SET session_id = p_new_session_id::text
  WHERE session_id = p_old_session_id::text;

  -- 18. Atualizar providers
  UPDATE mt_whatsapp_providers
  SET waha_session_id = p_new_session_id
  WHERE waha_session_id = p_old_session_id;

  -- 19. Copiar metadados da sessao antiga para a nova (incluindo Round Robin)
  UPDATE mt_whatsapp_sessions
  SET
    total_chats = COALESCE(total_chats, 0) + COALESCE(v_old_session.total_chats, 0),
    total_messages = COALESCE(total_messages, 0) + COALESCE(v_old_session.total_messages, 0),
    franchise_id = COALESCE(franchise_id, v_old_session.franchise_id),
    responsible_user_id = COALESCE(responsible_user_id, v_old_session.responsible_user_id),
    department_id = COALESCE(department_id, v_old_session.department_id),
    team_id = COALESCE(team_id, v_old_session.team_id),
    is_default = COALESCE(is_default, v_old_session.is_default),
    round_robin_enabled = COALESCE(v_old_session.round_robin_enabled, false),
    round_robin_mode = COALESCE(v_old_session.round_robin_mode, 'team'),
    round_robin_current_index = COALESCE(v_old_session.round_robin_current_index, 0),
    updated_at = NOW()
  WHERE id = p_new_session_id;

  -- 20. Deletar sessao antiga (agora vazia)
  DELETE FROM mt_whatsapp_sessions WHERE id = p_old_session_id;

  -- Montar resultado
  v_result := jsonb_build_object(
    'success', true,
    'old_session_id', p_old_session_id,
    'new_session_id', p_new_session_id,
    'migrated', jsonb_build_object(
      'conversations', v_conversations_count,
      'messages', v_messages_count,
      'leads', v_leads_count,
      'permissions', v_permissions_count,
      'queues', v_queues_count
    )
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

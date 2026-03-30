-- =============================================================================
-- FIX: Proteger view v_whatsapp_queue_stats com RLS
-- Data: 14/02/2026
-- =============================================================================

-- Recriar view com filtros de segurança embutidos
DROP VIEW IF EXISTS v_whatsapp_queue_stats;

CREATE VIEW v_whatsapp_queue_stats
WITH (security_invoker = true) AS
SELECT
    q.id AS queue_id,
    q.nome AS queue_nome,
    q.tenant_id,
    q.session_id,

    -- Contadores
    COUNT(DISTINCT qu.user_id) FILTER (WHERE qu.is_active = true) AS total_agents,
    COUNT(DISTINCT qu.user_id) FILTER (WHERE qu.status = 'available' AND qu.is_active = true) AS available_agents,
    COUNT(DISTINCT qu.user_id) FILTER (WHERE qu.status = 'busy' AND qu.is_active = true) AS busy_agents,

    -- Conversas
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'queued') AS queued_conversations,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'in_progress') AS active_conversations,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'resolved' AND c.assigned_from_queue_at > NOW() - INTERVAL '1 day') AS resolved_today,

    -- Tempos médios (últimas 24h)
    AVG(c.wait_time_seconds) FILTER (WHERE c.assigned_from_queue_at > NOW() - INTERVAL '1 day') AS avg_wait_time_seconds,

    -- SLA
    q.first_response_sla_minutes,
    q.resolution_sla_minutes,

    -- Capacidade
    SUM(qu.max_concurrent) FILTER (WHERE qu.is_active = true) AS total_capacity,
    SUM(qu.current_conversations) FILTER (WHERE qu.is_active = true) AS current_load,

    -- Última atualização
    MAX(qu.last_activity_at) AS last_activity_at

FROM mt_whatsapp_queues q
LEFT JOIN mt_whatsapp_queue_users qu ON q.id = qu.queue_id
LEFT JOIN mt_whatsapp_conversations c ON q.id = c.queue_id
WHERE
    q.is_active = true
    -- FILTRO DE SEGURANÇA: Respeita hierarquia multi-tenant
    AND (
        -- Platform admin: vê tudo
        is_platform_admin()
        OR
        -- Tenant admin: vê apenas seu tenant
        (is_tenant_admin() AND q.tenant_id = current_tenant_id())
        OR
        -- Franchise admin: vê apenas filas de sua franquia
        (is_franchise_admin() AND c.franchise_id = current_franchise_id())
        OR
        -- User: vê apenas filas onde está cadastrado como agente
        (q.id IN (
            SELECT queue_id FROM mt_whatsapp_queue_users
            WHERE user_id = current_user_id() AND is_active = true
        ))
    )
GROUP BY q.id, q.nome, q.tenant_id, q.session_id, q.first_response_sla_minutes, q.resolution_sla_minutes;

COMMENT ON VIEW v_whatsapp_queue_stats IS
'Estatísticas em tempo real das filas de atendimento com RLS via security_invoker. Aplica filtros de segurança baseados no nível de acesso do usuário.';

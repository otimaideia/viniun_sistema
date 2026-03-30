-- =============================================================================
-- MIGRAÇÃO: WHATSAPP (yeslaser_whatsapp_* → mt_whatsapp_*)
-- Data: 2026-02-02
-- NOTA: PopDents tem 225.772 mensagens - migração em lotes
-- =============================================================================

BEGIN;

-- =============================================================================
-- MIGRAR SESSÕES WHATSAPP YESLASER
-- =============================================================================

INSERT INTO mt_whatsapp_sessions (
    id,
    tenant_id,
    franchise_id,
    session_name,
    phone_number,
    status,
    qr_code,
    config,
    last_activity,
    created_at,
    updated_at
)
SELECT
    s.id,
    'ebf87fe2-093a-4fba-bb56-c6835cbc1465'::uuid as tenant_id,
    COALESCE(
        (SELECT new_id FROM mt_migration_mapping
         WHERE entity_type = 'franchise' AND old_id = s.franqueado_id),
        NULL
    ) as franchise_id,
    s.session_name,
    s.phone_number,
    COALESCE(s.status, 'disconnected') as status,
    s.qr_code,
    COALESCE(s.config, '{}'::jsonb) as config,
    s.last_activity,
    s.created_at,
    s.updated_at
FROM yeslaser_whatsapp_sessoes s
WHERE NOT EXISTS (
    SELECT 1 FROM mt_whatsapp_sessions ws WHERE ws.id = s.id
);

-- Registrar mapeamento
INSERT INTO mt_migration_mapping (entity_type, tenant_slug, old_table, old_id, new_id)
SELECT 'whatsapp_session', 'yeslaser', 'yeslaser_whatsapp_sessoes', s.id, s.id
FROM yeslaser_whatsapp_sessoes s
WHERE EXISTS (SELECT 1 FROM mt_whatsapp_sessions ws WHERE ws.id = s.id)
ON CONFLICT (entity_type, old_id) DO NOTHING;

-- =============================================================================
-- MIGRAR CONVERSAS WHATSAPP YESLASER
-- =============================================================================

INSERT INTO mt_whatsapp_conversations (
    id,
    tenant_id,
    franchise_id,
    session_id,
    lead_id,
    chat_id,
    contact_name,
    contact_phone,
    contact_photo,
    last_message,
    last_message_at,
    unread_count,
    is_group,
    status,
    metadata,
    created_at,
    updated_at
)
SELECT
    c.id,
    'ebf87fe2-093a-4fba-bb56-c6835cbc1465'::uuid as tenant_id,
    (SELECT franchise_id FROM mt_whatsapp_sessions WHERE id = c.sessao_id) as franchise_id,
    c.sessao_id as session_id,
    c.lead_id,
    c.chat_id,
    c.contact_name,
    c.contact_phone,
    c.contact_photo,
    c.last_message,
    c.last_message_at,
    COALESCE(c.unread_count, 0) as unread_count,
    COALESCE(c.is_group, false) as is_group,
    COALESCE(c.status, 'active') as status,
    COALESCE(c.metadata, '{}'::jsonb) as metadata,
    c.created_at,
    c.updated_at
FROM yeslaser_whatsapp_conversas c
WHERE EXISTS (SELECT 1 FROM mt_whatsapp_sessions s WHERE s.id = c.sessao_id)
AND NOT EXISTS (
    SELECT 1 FROM mt_whatsapp_conversations wc WHERE wc.id = c.id
);

-- =============================================================================
-- MIGRAR MENSAGENS WHATSAPP YESLASER
-- =============================================================================

INSERT INTO mt_whatsapp_messages (
    id,
    tenant_id,
    conversation_id,
    session_id,
    waha_id,
    chat_id,
    from_number,
    to_number,
    body,
    media_type,
    media_url,
    media_caption,
    is_from_me,
    status,
    timestamp,
    ack,
    metadata,
    created_at
)
SELECT
    m.id,
    'ebf87fe2-093a-4fba-bb56-c6835cbc1465'::uuid as tenant_id,
    m.conversa_id as conversation_id,
    m.sessao_id as session_id,
    m.waha_id,
    m.chat_id,
    m.from_number,
    m.to_number,
    m.body,
    m.media_type,
    m.media_url,
    m.media_caption,
    COALESCE(m.is_from_me, false) as is_from_me,
    COALESCE(m.status, 'sent') as status,
    m.timestamp,
    m.ack,
    COALESCE(m.metadata, '{}'::jsonb) as metadata,
    m.created_at
FROM yeslaser_whatsapp_mensagens m
WHERE EXISTS (SELECT 1 FROM mt_whatsapp_conversations c WHERE c.id = m.conversa_id)
AND NOT EXISTS (
    SELECT 1 FROM mt_whatsapp_messages wm WHERE wm.id = m.id
);

-- =============================================================================
-- MIGRAR SESSÕES WHATSAPP POPDENTS
-- =============================================================================

INSERT INTO mt_whatsapp_sessions (
    id,
    tenant_id,
    franchise_id,
    session_name,
    phone_number,
    status,
    qr_code,
    config,
    last_activity,
    created_at,
    updated_at
)
SELECT
    s.id,
    'c1c6fcb8-7c52-4441-9609-45a3312f1477'::uuid as tenant_id,
    COALESCE(
        (SELECT new_id FROM mt_migration_mapping
         WHERE entity_type = 'franchise' AND old_id = s.franqueado_id),
        NULL
    ) as franchise_id,
    s.session_name,
    s.phone_number,
    COALESCE(s.status, 'disconnected') as status,
    s.qr_code,
    COALESCE(s.config, '{}'::jsonb) as config,
    s.last_activity,
    s.created_at,
    s.updated_at
FROM popdents_whatsapp_sessions s
WHERE NOT EXISTS (
    SELECT 1 FROM mt_whatsapp_sessions ws WHERE ws.id = s.id
);

-- Registrar mapeamento
INSERT INTO mt_migration_mapping (entity_type, tenant_slug, old_table, old_id, new_id)
SELECT 'whatsapp_session', 'popdents', 'popdents_whatsapp_sessions', s.id, s.id
FROM popdents_whatsapp_sessions s
WHERE EXISTS (SELECT 1 FROM mt_whatsapp_sessions ws WHERE ws.id = s.id)
ON CONFLICT (entity_type, old_id) DO NOTHING;

-- =============================================================================
-- MIGRAR CONVERSAS WHATSAPP POPDENTS
-- =============================================================================

INSERT INTO mt_whatsapp_conversations (
    id,
    tenant_id,
    franchise_id,
    session_id,
    lead_id,
    chat_id,
    contact_name,
    contact_phone,
    contact_photo,
    last_message,
    last_message_at,
    unread_count,
    is_group,
    status,
    metadata,
    created_at,
    updated_at
)
SELECT
    c.id,
    'c1c6fcb8-7c52-4441-9609-45a3312f1477'::uuid as tenant_id,
    (SELECT franchise_id FROM mt_whatsapp_sessions WHERE id = c.session_id) as franchise_id,
    c.session_id,
    c.lead_id,
    c.chat_id,
    c.contact_name,
    c.contact_phone,
    c.contact_photo,
    c.last_message,
    c.last_message_at,
    COALESCE(c.unread_count, 0) as unread_count,
    COALESCE(c.is_group, false) as is_group,
    COALESCE(c.status, 'active') as status,
    COALESCE(c.metadata, '{}'::jsonb) as metadata,
    c.created_at,
    c.updated_at
FROM popdents_whatsapp_conversations c
WHERE EXISTS (SELECT 1 FROM mt_whatsapp_sessions s WHERE s.id = c.session_id)
AND NOT EXISTS (
    SELECT 1 FROM mt_whatsapp_conversations wc WHERE wc.id = c.id
);

COMMIT;

-- =============================================================================
-- MIGRAR MENSAGENS POPDENTS (EM LOTES - 225.772 mensagens)
-- Executar separadamente devido ao volume
-- =============================================================================

-- Migração em lotes de 50.000 mensagens por vez
DO $$
DECLARE
    batch_size INT := 50000;
    total_migrated INT := 0;
    batch_count INT;
BEGIN
    -- Contar total a migrar
    SELECT COUNT(*) INTO batch_count
    FROM popdents_whatsapp_messages m
    WHERE EXISTS (SELECT 1 FROM mt_whatsapp_conversations c WHERE c.id = m.conversation_id)
    AND NOT EXISTS (SELECT 1 FROM mt_whatsapp_messages wm WHERE wm.id = m.id);

    RAISE NOTICE 'Total de mensagens PopDents a migrar: %', batch_count;

    -- Migrar em lotes
    WHILE total_migrated < batch_count LOOP
        INSERT INTO mt_whatsapp_messages (
            id,
            tenant_id,
            conversation_id,
            session_id,
            waha_id,
            chat_id,
            from_number,
            to_number,
            body,
            media_type,
            media_url,
            media_caption,
            is_from_me,
            status,
            timestamp,
            ack,
            metadata,
            created_at
        )
        SELECT
            m.id,
            'c1c6fcb8-7c52-4441-9609-45a3312f1477'::uuid as tenant_id,
            m.conversation_id,
            m.session_id,
            m.waha_id,
            m.chat_id,
            m.from_number,
            m.to_number,
            m.body,
            m.media_type,
            m.media_url,
            m.media_caption,
            COALESCE(m.is_from_me, false) as is_from_me,
            COALESCE(m.status, 'sent') as status,
            m.timestamp,
            m.ack,
            COALESCE(m.metadata, '{}'::jsonb) as metadata,
            m.created_at
        FROM popdents_whatsapp_messages m
        WHERE EXISTS (SELECT 1 FROM mt_whatsapp_conversations c WHERE c.id = m.conversation_id)
        AND NOT EXISTS (SELECT 1 FROM mt_whatsapp_messages wm WHERE wm.id = m.id)
        LIMIT batch_size;

        GET DIAGNOSTICS total_migrated = ROW_COUNT;
        total_migrated := total_migrated + batch_size;

        RAISE NOTICE 'Lote migrado: % mensagens processadas', total_migrated;

        -- Commit parcial para evitar locks longos
        COMMIT;
    END LOOP;

    RAISE NOTICE 'Migração de mensagens PopDents concluída!';
END $$;

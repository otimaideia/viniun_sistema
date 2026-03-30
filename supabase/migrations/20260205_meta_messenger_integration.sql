-- ============================================================================
-- META MESSENGER & INSTAGRAM DIRECT - INTEGRAÇÃO MULTI-TENANT
-- ============================================================================
-- Autor: Claude + Danilo
-- Data: 2025-02-05
-- Versão: 1.0
-- Descrição: Sistema completo de integração com Facebook Messenger e Instagram Direct
--            com suporte multi-tenant, OAuth, auto-criação de leads e rate limiting
-- ============================================================================

-- ROLLBACK PLAN:
-- DROP TABLE IF EXISTS mt_meta_message_queue CASCADE;
-- DROP TABLE IF EXISTS mt_meta_webhook_events CASCADE;
-- DROP TABLE IF EXISTS mt_meta_messages CASCADE;
-- DROP TABLE IF EXISTS mt_meta_conversations CASCADE;
-- DROP TABLE IF EXISTS mt_meta_pages CASCADE;
-- DROP TABLE IF EXISTS mt_meta_accounts CASCADE;
-- DROP FUNCTION IF EXISTS find_similar_leads CASCADE;
-- DELETE FROM mt_tenant_modules WHERE module_id = (SELECT id FROM mt_modules WHERE codigo = 'meta_messenger');
-- DELETE FROM mt_modules WHERE codigo = 'meta_messenger';
-- ALTER TABLE mt_leads DROP COLUMN IF EXISTS meta_participant_id;
-- ALTER TABLE mt_leads DROP COLUMN IF EXISTS meta_participant_username;
-- ALTER TABLE mt_leads DROP COLUMN IF EXISTS meta_conversation_id;

-- ============================================================================
-- 1. EXTENSÕES
-- ============================================================================

-- Habilitar pg_trgm para fuzzy matching de nomes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- 2. REGISTRAR MÓDULO
-- ============================================================================

INSERT INTO mt_modules (codigo, nome, descricao, icone, categoria, ordem, is_core, is_active)
VALUES (
  'meta_messenger',
  'Meta Messenger & Instagram',
  'Integração com Facebook Messenger e Instagram Direct para gestão de conversas e criação automática de leads',
  'MessageSquare',
  'comunicacao',
  12,
  false,
  true
)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  icone = EXCLUDED.icone,
  categoria = EXCLUDED.categoria,
  ordem = EXCLUDED.ordem;

-- Habilitar para todos os tenants
INSERT INTO mt_tenant_modules (tenant_id, module_id, is_active)
SELECT t.id, m.id, true
FROM mt_tenants t
CROSS JOIN mt_modules m
WHERE m.codigo = 'meta_messenger'
AND NOT EXISTS (
  SELECT 1 FROM mt_tenant_modules tm
  WHERE tm.tenant_id = t.id AND tm.module_id = m.id
);

-- ============================================================================
-- 3. ALTERAR TABELA mt_leads (Tracking Meta)
-- ============================================================================

ALTER TABLE mt_leads
ADD COLUMN IF NOT EXISTS meta_participant_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS meta_participant_username VARCHAR(255),
ADD COLUMN IF NOT EXISTS meta_conversation_id VARCHAR(255);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_mt_leads_meta_participant ON mt_leads(tenant_id, meta_participant_id)
WHERE meta_participant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mt_leads_meta_conversation ON mt_leads(tenant_id, meta_conversation_id)
WHERE meta_conversation_id IS NOT NULL;

-- Comentários
COMMENT ON COLUMN mt_leads.meta_participant_id IS 'PSID (Page-Scoped ID) do participante no Meta';
COMMENT ON COLUMN mt_leads.meta_participant_username IS 'Username do Instagram ou nome do Facebook';
COMMENT ON COLUMN mt_leads.meta_conversation_id IS 'ID da conversa no Meta';

-- ============================================================================
-- 4. TABELAS PRINCIPAIS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1. mt_meta_accounts (Contas Facebook/Instagram Conectadas)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_meta_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES mt_franchises(id) ON DELETE CASCADE,

  -- OAuth Data
  user_id VARCHAR(255) NOT NULL, -- Facebook User ID
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,

  -- Account Type
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('facebook', 'instagram')),

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,

  -- Metadata
  raw_data JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(tenant_id, user_id, platform)
);

-- Índices
CREATE INDEX idx_mt_meta_accounts_tenant ON mt_meta_accounts(tenant_id);
CREATE INDEX idx_mt_meta_accounts_franchise ON mt_meta_accounts(franchise_id);
CREATE INDEX idx_mt_meta_accounts_deleted ON mt_meta_accounts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_mt_meta_accounts_token_expiry ON mt_meta_accounts(token_expires_at) WHERE is_active = true;

-- Comentários
COMMENT ON TABLE mt_meta_accounts IS 'Contas Facebook/Instagram conectadas via OAuth por tenant/franquia';
COMMENT ON COLUMN mt_meta_accounts.user_id IS 'Facebook User ID retornado pelo OAuth';
COMMENT ON COLUMN mt_meta_accounts.access_token IS 'Long-lived access token (60 dias)';
COMMENT ON COLUMN mt_meta_accounts.token_expires_at IS 'Data de expiração do token (para auto-refresh)';
COMMENT ON COLUMN mt_meta_accounts.platform IS 'facebook ou instagram';

-- ----------------------------------------------------------------------------
-- 4.2. mt_meta_pages (Páginas/Contas Gerenciadas)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_meta_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES mt_franchises(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES mt_meta_accounts(id) ON DELETE CASCADE,

  -- Page Data (Graph API)
  page_id VARCHAR(255) NOT NULL, -- Facebook Page ID ou Instagram Business Account ID
  page_name VARCHAR(255) NOT NULL,
  page_username VARCHAR(255), -- @username
  page_category VARCHAR(100),
  page_access_token TEXT NOT NULL, -- Page Access Token (específico da página)

  -- Platform
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('facebook', 'instagram')),

  -- Instagram Specific
  instagram_business_account_id VARCHAR(255), -- Para Instagram

  -- Status
  is_active BOOLEAN DEFAULT true,
  webhook_subscribed BOOLEAN DEFAULT false,
  last_webhook_at TIMESTAMPTZ,

  -- Metadata
  raw_data JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(tenant_id, page_id)
);

-- Índices
CREATE INDEX idx_mt_meta_pages_tenant ON mt_meta_pages(tenant_id);
CREATE INDEX idx_mt_meta_pages_franchise ON mt_meta_pages(franchise_id);
CREATE INDEX idx_mt_meta_pages_account ON mt_meta_pages(account_id);
CREATE INDEX idx_mt_meta_pages_page_id ON mt_meta_pages(page_id);
CREATE INDEX idx_mt_meta_pages_deleted ON mt_meta_pages(deleted_at) WHERE deleted_at IS NULL;

-- Comentários
COMMENT ON TABLE mt_meta_pages IS 'Páginas do Facebook e contas do Instagram Business gerenciadas';
COMMENT ON COLUMN mt_meta_pages.page_id IS 'Facebook Page ID ou Instagram Business Account ID';
COMMENT ON COLUMN mt_meta_pages.page_access_token IS 'Token específico da página (nunca expira)';
COMMENT ON COLUMN mt_meta_pages.instagram_business_account_id IS 'ID da conta Instagram Business vinculada (para Facebook Pages)';

-- ----------------------------------------------------------------------------
-- 4.3. mt_meta_conversations (Conversas)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_meta_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES mt_franchises(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES mt_meta_pages(id) ON DELETE CASCADE,

  -- Conversation Data (Graph API)
  conversation_id VARCHAR(255) NOT NULL, -- ID único da conversa
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('facebook', 'instagram')),

  -- Participant (Cliente)
  participant_id VARCHAR(255) NOT NULL, -- PSID (Page-Scoped ID)
  participant_name VARCHAR(255),
  participant_username VARCHAR(255), -- @username do Instagram
  participant_profile_pic VARCHAR(500),

  -- Lead Linking
  lead_id UUID REFERENCES mt_leads(id) ON DELETE SET NULL,

  -- Conversation Status
  status VARCHAR(50) DEFAULT 'active', -- active, archived, deleted
  unread_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,

  -- Metadata
  raw_data JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(tenant_id, conversation_id)
);

-- Índices
CREATE INDEX idx_mt_meta_conversations_tenant ON mt_meta_conversations(tenant_id);
CREATE INDEX idx_mt_meta_conversations_franchise ON mt_meta_conversations(franchise_id);
CREATE INDEX idx_mt_meta_conversations_page ON mt_meta_conversations(page_id);
CREATE INDEX idx_mt_meta_conversations_participant ON mt_meta_conversations(tenant_id, participant_id);
CREATE INDEX idx_mt_meta_conversations_lead ON mt_meta_conversations(lead_id);
CREATE INDEX idx_mt_meta_conversations_deleted ON mt_meta_conversations(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_mt_meta_conversations_last_message ON mt_meta_conversations(last_message_at DESC);

-- Comentários
COMMENT ON TABLE mt_meta_conversations IS 'Conversas do Facebook Messenger e Instagram Direct';
COMMENT ON COLUMN mt_meta_conversations.conversation_id IS 'ID único da conversa retornado pela API';
COMMENT ON COLUMN mt_meta_conversations.participant_id IS 'PSID (Page-Scoped ID) do participante';
COMMENT ON COLUMN mt_meta_conversations.lead_id IS 'Lead vinculado automaticamente';

-- ----------------------------------------------------------------------------
-- 4.4. mt_meta_messages (Mensagens)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_meta_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES mt_franchises(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES mt_meta_pages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES mt_meta_conversations(id) ON DELETE CASCADE,

  -- Message Data (Graph API)
  message_id VARCHAR(255) NOT NULL, -- ID único da mensagem
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('facebook', 'instagram')),

  -- Sender/Receiver
  from_id VARCHAR(255) NOT NULL, -- PSID do remetente
  to_id VARCHAR(255) NOT NULL, -- PSID do destinatário
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('incoming', 'outgoing')),

  -- Message Content
  message_type VARCHAR(50) NOT NULL, -- text, image, video, audio, file, story_mention, story_reply
  text_content TEXT,

  -- Media (imagens, vídeos, documentos)
  media_url VARCHAR(500),
  media_type VARCHAR(50), -- image/jpeg, video/mp4, etc.
  media_size INTEGER,

  -- Story (Instagram)
  story_url VARCHAR(500),
  story_id VARCHAR(255),

  -- Status
  status VARCHAR(50) DEFAULT 'sent', -- sent, delivered, read, failed
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,

  -- Metadata
  raw_data JSONB,
  unique_key VARCHAR(255) UNIQUE, -- Para idempotência: platform_messageId

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(tenant_id, message_id, platform)
);

-- Índices
CREATE INDEX idx_mt_meta_messages_tenant ON mt_meta_messages(tenant_id);
CREATE INDEX idx_mt_meta_messages_franchise ON mt_meta_messages(franchise_id);
CREATE INDEX idx_mt_meta_messages_page ON mt_meta_messages(page_id);
CREATE INDEX idx_mt_meta_messages_conversation ON mt_meta_messages(conversation_id);
CREATE INDEX idx_mt_meta_messages_deleted ON mt_meta_messages(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_mt_meta_messages_sent_at ON mt_meta_messages(sent_at DESC);
CREATE INDEX idx_mt_meta_messages_unique_key ON mt_meta_messages(unique_key);

-- Comentários
COMMENT ON TABLE mt_meta_messages IS 'Mensagens do Facebook Messenger e Instagram Direct';
COMMENT ON COLUMN mt_meta_messages.message_id IS 'ID único da mensagem retornado pela API';
COMMENT ON COLUMN mt_meta_messages.unique_key IS 'Chave única para idempotência (platform_messageId)';
COMMENT ON COLUMN mt_meta_messages.direction IS 'incoming (cliente → empresa) ou outgoing (empresa → cliente)';

-- ----------------------------------------------------------------------------
-- 4.5. mt_meta_webhook_events (Log de Webhooks)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_meta_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES mt_tenants(id) ON DELETE CASCADE,

  -- Webhook Data
  event_type VARCHAR(100) NOT NULL, -- messages, message_reads, message_deliveries, etc.
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('facebook', 'instagram')),
  page_id VARCHAR(255),

  -- Payload
  payload JSONB NOT NULL,

  -- Processing
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_mt_meta_webhook_events_tenant ON mt_meta_webhook_events(tenant_id);
CREATE INDEX idx_mt_meta_webhook_events_processed ON mt_meta_webhook_events(processed, created_at);
CREATE INDEX idx_mt_meta_webhook_events_event_type ON mt_meta_webhook_events(event_type);
CREATE INDEX idx_mt_meta_webhook_events_created_at ON mt_meta_webhook_events(created_at DESC);

-- Comentários
COMMENT ON TABLE mt_meta_webhook_events IS 'Log completo de webhooks recebidos do Meta';
COMMENT ON COLUMN mt_meta_webhook_events.event_type IS 'Tipo de evento (messages, message_reads, etc.)';
COMMENT ON COLUMN mt_meta_webhook_events.processed IS 'Se o webhook foi processado com sucesso';

-- ----------------------------------------------------------------------------
-- 4.6. mt_meta_message_queue (Fila de Mensagens para Rate Limiting)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_meta_message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES mt_franchises(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES mt_meta_pages(id) ON DELETE CASCADE,

  -- Message Data
  recipient_id VARCHAR(255) NOT NULL, -- PSID do destinatário
  message_type VARCHAR(50) NOT NULL, -- text, image, video, etc.
  message_payload JSONB NOT NULL,

  -- Queue Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, sending, sent, failed
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Scheduling
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  -- Error Handling
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_mt_meta_queue_tenant ON mt_meta_message_queue(tenant_id);
CREATE INDEX idx_mt_meta_queue_franchise ON mt_meta_message_queue(franchise_id);
CREATE INDEX idx_mt_meta_queue_page ON mt_meta_message_queue(page_id);
CREATE INDEX idx_mt_meta_queue_status ON mt_meta_message_queue(status, scheduled_at)
WHERE status = 'pending';
CREATE INDEX idx_mt_meta_queue_retry ON mt_meta_message_queue(status, retry_count)
WHERE status = 'failed' AND retry_count < max_retries;

-- Comentários
COMMENT ON TABLE mt_meta_message_queue IS 'Fila de mensagens para controle de rate limiting';
COMMENT ON COLUMN mt_meta_message_queue.scheduled_at IS 'Quando a mensagem deve ser enviada';
COMMENT ON COLUMN mt_meta_message_queue.status IS 'pending, sending, sent ou failed';

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5.1. mt_meta_accounts
-- ----------------------------------------------------------------------------
ALTER TABLE mt_meta_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_meta_accounts_select" ON mt_meta_accounts FOR SELECT
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
  (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_meta_accounts_insert" ON mt_meta_accounts FOR INSERT
WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);

CREATE POLICY "mt_meta_accounts_update" ON mt_meta_accounts FOR UPDATE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);

CREATE POLICY "mt_meta_accounts_delete" ON mt_meta_accounts FOR DELETE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- ----------------------------------------------------------------------------
-- 5.2. mt_meta_pages
-- ----------------------------------------------------------------------------
ALTER TABLE mt_meta_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_meta_pages_select" ON mt_meta_pages FOR SELECT
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
  (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_meta_pages_insert" ON mt_meta_pages FOR INSERT
WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);

CREATE POLICY "mt_meta_pages_update" ON mt_meta_pages FOR UPDATE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);

CREATE POLICY "mt_meta_pages_delete" ON mt_meta_pages FOR DELETE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- ----------------------------------------------------------------------------
-- 5.3. mt_meta_conversations
-- ----------------------------------------------------------------------------
ALTER TABLE mt_meta_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_meta_conversations_select" ON mt_meta_conversations FOR SELECT
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
  (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_meta_conversations_insert" ON mt_meta_conversations FOR INSERT
WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);

CREATE POLICY "mt_meta_conversations_update" ON mt_meta_conversations FOR UPDATE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);

CREATE POLICY "mt_meta_conversations_delete" ON mt_meta_conversations FOR DELETE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- ----------------------------------------------------------------------------
-- 5.4. mt_meta_messages
-- ----------------------------------------------------------------------------
ALTER TABLE mt_meta_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_meta_messages_select" ON mt_meta_messages FOR SELECT
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
  (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_meta_messages_insert" ON mt_meta_messages FOR INSERT
WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);

CREATE POLICY "mt_meta_messages_update" ON mt_meta_messages FOR UPDATE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);

CREATE POLICY "mt_meta_messages_delete" ON mt_meta_messages FOR DELETE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- ----------------------------------------------------------------------------
-- 5.5. mt_meta_webhook_events
-- ----------------------------------------------------------------------------
ALTER TABLE mt_meta_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_meta_webhook_events_select" ON mt_meta_webhook_events FOR SELECT
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_meta_webhook_events_insert" ON mt_meta_webhook_events FOR INSERT
WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_meta_webhook_events_update" ON mt_meta_webhook_events FOR UPDATE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_meta_webhook_events_delete" ON mt_meta_webhook_events FOR DELETE
USING (is_platform_admin());

-- ----------------------------------------------------------------------------
-- 5.6. mt_meta_message_queue
-- ----------------------------------------------------------------------------
ALTER TABLE mt_meta_message_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_meta_queue_select" ON mt_meta_message_queue FOR SELECT
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);

CREATE POLICY "mt_meta_queue_insert" ON mt_meta_message_queue FOR INSERT
WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);

CREATE POLICY "mt_meta_queue_update" ON mt_meta_message_queue FOR UPDATE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_meta_queue_delete" ON mt_meta_message_queue FOR DELETE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- ============================================================================
-- 6. FUNÇÕES RPC (Remote Procedure Calls)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 6.1. find_similar_leads (Fuzzy Matching com pg_trgm)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION find_similar_leads(
  p_tenant_id UUID,
  p_nome VARCHAR,
  p_threshold FLOAT DEFAULT 0.85
)
RETURNS TABLE (
  id UUID,
  nome VARCHAR,
  telefone VARCHAR,
  email VARCHAR,
  similarity_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.nome,
    l.telefone,
    l.email,
    similarity(l.nome, p_nome) as similarity_score
  FROM mt_leads l
  WHERE l.tenant_id = p_tenant_id
    AND l.deleted_at IS NULL
    AND similarity(l.nome, p_nome) > p_threshold
  ORDER BY similarity_score DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário
COMMENT ON FUNCTION find_similar_leads IS 'Busca leads com nomes similares usando pg_trgm (threshold padrão 85%)';

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- Trigger para updated_at (mt_meta_accounts)
CREATE OR REPLACE FUNCTION update_mt_meta_accounts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mt_meta_accounts_timestamp
BEFORE UPDATE ON mt_meta_accounts
FOR EACH ROW
EXECUTE FUNCTION update_mt_meta_accounts_timestamp();

-- Trigger para updated_at (mt_meta_pages)
CREATE OR REPLACE FUNCTION update_mt_meta_pages_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mt_meta_pages_timestamp
BEFORE UPDATE ON mt_meta_pages
FOR EACH ROW
EXECUTE FUNCTION update_mt_meta_pages_timestamp();

-- Trigger para updated_at (mt_meta_conversations)
CREATE OR REPLACE FUNCTION update_mt_meta_conversations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mt_meta_conversations_timestamp
BEFORE UPDATE ON mt_meta_conversations
FOR EACH ROW
EXECUTE FUNCTION update_mt_meta_conversations_timestamp();

-- Trigger para updated_at (mt_meta_messages)
CREATE OR REPLACE FUNCTION update_mt_meta_messages_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mt_meta_messages_timestamp
BEFORE UPDATE ON mt_meta_messages
FOR EACH ROW
EXECUTE FUNCTION update_mt_meta_messages_timestamp();

-- Trigger para updated_at (mt_meta_message_queue)
CREATE OR REPLACE FUNCTION update_mt_meta_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mt_meta_queue_timestamp
BEFORE UPDATE ON mt_meta_message_queue
FOR EACH ROW
EXECUTE FUNCTION update_mt_meta_queue_timestamp();

-- ============================================================================
-- 8. GRANTS (Permissões)
-- ============================================================================

-- Service role tem acesso total
GRANT ALL ON mt_meta_accounts TO service_role;
GRANT ALL ON mt_meta_pages TO service_role;
GRANT ALL ON mt_meta_conversations TO service_role;
GRANT ALL ON mt_meta_messages TO service_role;
GRANT ALL ON mt_meta_webhook_events TO service_role;
GRANT ALL ON mt_meta_message_queue TO service_role;

-- Authenticated users (via RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON mt_meta_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON mt_meta_pages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON mt_meta_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON mt_meta_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON mt_meta_webhook_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON mt_meta_message_queue TO authenticated;

-- Anon (apenas webhook pode inserir)
GRANT INSERT ON mt_meta_webhook_events TO anon;

-- RPC functions
GRANT EXECUTE ON FUNCTION find_similar_leads TO authenticated;
GRANT EXECUTE ON FUNCTION find_similar_leads TO service_role;

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================

-- Validações Finais
DO $$
DECLARE
  v_tables_count INTEGER;
  v_module_exists BOOLEAN;
  v_extension_exists BOOLEAN;
BEGIN
  -- Verificar se todas as 6 tabelas foram criadas
  SELECT COUNT(*) INTO v_tables_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN (
    'mt_meta_accounts',
    'mt_meta_pages',
    'mt_meta_conversations',
    'mt_meta_messages',
    'mt_meta_webhook_events',
    'mt_meta_message_queue'
  );

  IF v_tables_count != 6 THEN
    RAISE EXCEPTION 'Erro: Apenas % de 6 tabelas Meta foram criadas', v_tables_count;
  END IF;

  -- Verificar se módulo foi registrado
  SELECT EXISTS(
    SELECT 1 FROM mt_modules WHERE codigo = 'meta_messenger'
  ) INTO v_module_exists;

  IF NOT v_module_exists THEN
    RAISE EXCEPTION 'Erro: Módulo meta_messenger não foi registrado';
  END IF;

  -- Verificar se pg_trgm foi habilitada
  SELECT EXISTS(
    SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'
  ) INTO v_extension_exists;

  IF NOT v_extension_exists THEN
    RAISE EXCEPTION 'Erro: Extensão pg_trgm não foi habilitada';
  END IF;

  RAISE NOTICE '✅ Migration Meta Messenger & Instagram concluída com sucesso!';
  RAISE NOTICE '   - 6 tabelas mt_meta_* criadas';
  RAISE NOTICE '   - RLS habilitado em todas as tabelas';
  RAISE NOTICE '   - Módulo meta_messenger registrado';
  RAISE NOTICE '   - Extensão pg_trgm habilitada';
  RAISE NOTICE '   - Função find_similar_leads criada';
  RAISE NOTICE '   - mt_leads alterada com colunas Meta';
END $$;

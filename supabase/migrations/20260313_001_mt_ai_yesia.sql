-- Migration: 20260313_001_mt_ai_yesia.sql
-- Purpose: YESia — Agente IA Orquestrador Multi-Tenant
-- Tables: mt_ai_config, mt_ai_memory, mt_ai_token_usage, mt_ai_skill_executions,
--         mt_ai_learning_jobs, mt_ai_document_embeddings, mt_ai_proactive_rules,
--         mt_ad_campaigns, mt_ad_attributions
-- Extensions: mt_ai_agents (skill + orchestration columns)
-- Author: Claude + Danilo
-- Date: 2026-03-13

-- ============================================================
-- STEP 1: Extend mt_ai_agents with Skill + Orchestration columns
-- ============================================================

-- Skill columns
ALTER TABLE mt_ai_agents ADD COLUMN IF NOT EXISTS skill_category VARCHAR(30) DEFAULT 'general';
ALTER TABLE mt_ai_agents ADD COLUMN IF NOT EXISTS trigger_type VARCHAR(30) DEFAULT 'manual';
ALTER TABLE mt_ai_agents ADD COLUMN IF NOT EXISTS trigger_config JSONB DEFAULT '{}';
ALTER TABLE mt_ai_agents ADD COLUMN IF NOT EXISTS data_sources TEXT[] DEFAULT '{}';
ALTER TABLE mt_ai_agents ADD COLUMN IF NOT EXISTS data_query_template TEXT;
ALTER TABLE mt_ai_agents ADD COLUMN IF NOT EXISTS response_format_yesia VARCHAR(30) DEFAULT 'chat';
ALTER TABLE mt_ai_agents ADD COLUMN IF NOT EXISTS proactive_enabled BOOLEAN DEFAULT false;
ALTER TABLE mt_ai_agents ADD COLUMN IF NOT EXISTS knowledge_ids UUID[] DEFAULT '{}';
ALTER TABLE mt_ai_agents ADD COLUMN IF NOT EXISTS personality VARCHAR(30) DEFAULT 'professional';

-- Orchestration columns
ALTER TABLE mt_ai_agents ADD COLUMN IF NOT EXISTS domain VARCHAR(30);
ALTER TABLE mt_ai_agents ADD COLUMN IF NOT EXISTS routing_keywords TEXT[] DEFAULT '{}';
ALTER TABLE mt_ai_agents ADD COLUMN IF NOT EXISTS routing_priority INTEGER DEFAULT 50;
ALTER TABLE mt_ai_agents ADD COLUMN IF NOT EXISTS can_execute_actions BOOLEAN DEFAULT false;
ALTER TABLE mt_ai_agents ADD COLUMN IF NOT EXISTS available_actions JSONB DEFAULT '[]';

-- Auto-generation columns
ALTER TABLE mt_ai_agents ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false;
ALTER TABLE mt_ai_agents ADD COLUMN IF NOT EXISTS generation_reason TEXT;
ALTER TABLE mt_ai_agents ADD COLUMN IF NOT EXISTS generation_evidence JSONB DEFAULT '{}';
ALTER TABLE mt_ai_agents ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'active';
ALTER TABLE mt_ai_agents ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE mt_ai_agents ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE mt_ai_agents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;


-- ============================================================
-- TABLE 2: mt_ai_config (Config global da YESia por tenant)
-- ============================================================
CREATE TABLE IF NOT EXISTS mt_ai_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

  -- Identidade
  assistant_name VARCHAR(50) DEFAULT 'YESia',
  assistant_avatar_url TEXT,
  personality VARCHAR(30) DEFAULT 'professional',
  welcome_message TEXT DEFAULT 'Olá! Sou a YESia, sua assistente inteligente. Como posso te ajudar hoje?',

  -- Ativação
  is_active BOOLEAN DEFAULT true,
  allowed_roles TEXT[] DEFAULT '{platform_admin,tenant_admin,franchise_admin,user}',
  horario_inicio TIME DEFAULT '07:00',
  horario_fim TIME DEFAULT '22:00',
  dias_semana INTEGER[] DEFAULT '{1,2,3,4,5,6}',

  -- Provider padrão (multi-provider)
  default_provider VARCHAR(20) DEFAULT 'openai',
  default_model VARCHAR(50) DEFAULT 'gpt-4o-mini',
  default_temperature DECIMAL(3,2) DEFAULT 0.7,
  default_max_tokens INTEGER DEFAULT 1000,

  -- API Keys por provider (admin configura)
  openai_api_key_encrypted TEXT,
  anthropic_api_key_encrypted TEXT,
  google_api_key_encrypted TEXT,

  -- Modelo para orquestração (roteamento de agentes)
  router_model VARCHAR(50) DEFAULT 'gpt-4o-mini',

  -- Limites de custo
  daily_limit_usd DECIMAL(10,2) DEFAULT 5.00,
  monthly_limit_usd DECIMAL(10,2) DEFAULT 100.00,
  alert_threshold_percent INTEGER DEFAULT 80,
  cost_per_1k_tokens_override JSONB DEFAULT '{}',

  -- Flags de funcionalidade
  enable_memory BOOLEAN DEFAULT true,
  enable_proactive BOOLEAN DEFAULT true,
  enable_function_calling BOOLEAN DEFAULT true,
  enable_knowledge_rag BOOLEAN DEFAULT true,
  enable_whatsapp_learning BOOLEAN DEFAULT true,
  enable_document_processing BOOLEAN DEFAULT true,
  enable_audio_transcription BOOLEAN DEFAULT true,

  -- Aprendizado
  learning_schedule VARCHAR(20) DEFAULT 'daily',
  learning_cron VARCHAR(30) DEFAULT '0 3 * * *',
  last_learning_at TIMESTAMPTZ,
  total_knowledge_items INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT mt_ai_config_tenant_unique UNIQUE(tenant_id)
);

CREATE INDEX idx_mt_ai_config_tenant ON mt_ai_config(tenant_id);

ALTER TABLE mt_ai_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_ai_config_select" ON mt_ai_config FOR SELECT
USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);

CREATE POLICY "mt_ai_config_insert" ON mt_ai_config FOR INSERT
WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_ai_config_update" ON mt_ai_config FOR UPDATE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_ai_config_delete" ON mt_ai_config FOR DELETE
USING (is_platform_admin());


-- ============================================================
-- TABLE 3: mt_ai_memory (Memória de longo prazo)
-- ============================================================
CREATE TABLE IF NOT EXISTS mt_ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,
  user_id UUID,
  agent_id UUID REFERENCES mt_ai_agents(id) ON DELETE SET NULL,

  memory_type VARCHAR(30) NOT NULL,
  -- preference, pattern, correction, fact, context, learned_from_whatsapp

  content TEXT NOT NULL,
  embedding VECTOR(1536),
  importance FLOAT DEFAULT 0.5,
  source VARCHAR(30) DEFAULT 'interaction',
  -- interaction, feedback, admin_correction, whatsapp_learning, document, system

  metadata JSONB DEFAULT '{}',

  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_mt_ai_memory_tenant ON mt_ai_memory(tenant_id);
CREATE INDEX idx_mt_ai_memory_user ON mt_ai_memory(user_id);
CREATE INDEX idx_mt_ai_memory_type ON mt_ai_memory(memory_type);
CREATE INDEX idx_mt_ai_memory_agent ON mt_ai_memory(agent_id);
CREATE INDEX idx_mt_ai_memory_importance ON mt_ai_memory(importance DESC);
CREATE INDEX idx_mt_ai_memory_active ON mt_ai_memory(tenant_id, deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE mt_ai_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_ai_memory_select" ON mt_ai_memory FOR SELECT
USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);

CREATE POLICY "mt_ai_memory_insert" ON mt_ai_memory FOR INSERT
WITH CHECK (
  is_platform_admin() OR tenant_id = current_tenant_id()
);

CREATE POLICY "mt_ai_memory_update" ON mt_ai_memory FOR UPDATE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_ai_memory_delete" ON mt_ai_memory FOR DELETE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);


-- ============================================================
-- TABLE 4: mt_ai_token_usage (Controle de custos)
-- ============================================================
CREATE TABLE IF NOT EXISTS mt_ai_token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,
  data DATE NOT NULL,
  user_id UUID,
  agent_id UUID REFERENCES mt_ai_agents(id) ON DELETE SET NULL,
  provider VARCHAR(20) NOT NULL,
  model VARCHAR(50) NOT NULL,

  total_requests INTEGER DEFAULT 0,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  estimated_cost_usd DECIMAL(10,6) DEFAULT 0,
  estimated_cost_brl DECIMAL(10,2) DEFAULT 0,

  is_limit_reached BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT mt_ai_token_usage_unique UNIQUE(tenant_id, data, user_id, agent_id, model)
);

CREATE INDEX idx_mt_ai_token_usage_tenant ON mt_ai_token_usage(tenant_id);
CREATE INDEX idx_mt_ai_token_usage_date ON mt_ai_token_usage(data DESC);
CREATE INDEX idx_mt_ai_token_usage_user ON mt_ai_token_usage(user_id);
CREATE INDEX idx_mt_ai_token_usage_agent ON mt_ai_token_usage(agent_id);

ALTER TABLE mt_ai_token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_ai_token_usage_select" ON mt_ai_token_usage FOR SELECT
USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);

CREATE POLICY "mt_ai_token_usage_insert" ON mt_ai_token_usage FOR INSERT
WITH CHECK (
  is_platform_admin() OR tenant_id = current_tenant_id()
);

CREATE POLICY "mt_ai_token_usage_update" ON mt_ai_token_usage FOR UPDATE
USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);


-- ============================================================
-- TABLE 5: mt_ai_skill_executions (Execuções + proatividade)
-- ============================================================
CREATE TABLE IF NOT EXISTS mt_ai_skill_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,
  agent_id UUID NOT NULL REFERENCES mt_ai_agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  trigger_type VARCHAR(30) NOT NULL,
  trigger_context JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending',

  result_text TEXT,
  result_data JSONB DEFAULT '{}',

  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  estimated_cost_usd DECIMAL(10,6) DEFAULT 0,
  processing_time_ms INTEGER,
  provider VARCHAR(20),
  model VARCHAR(50),

  was_dismissed BOOLEAN DEFAULT false,
  was_acted_upon BOOLEAN DEFAULT false,
  feedback_score INTEGER,
  feedback_text TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_mt_ai_skill_executions_tenant ON mt_ai_skill_executions(tenant_id);
CREATE INDEX idx_mt_ai_skill_executions_user ON mt_ai_skill_executions(user_id);
CREATE INDEX idx_mt_ai_skill_executions_agent ON mt_ai_skill_executions(agent_id);
CREATE INDEX idx_mt_ai_skill_executions_status ON mt_ai_skill_executions(status);

ALTER TABLE mt_ai_skill_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_ai_skill_executions_select" ON mt_ai_skill_executions FOR SELECT
USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);

CREATE POLICY "mt_ai_skill_executions_insert" ON mt_ai_skill_executions FOR INSERT
WITH CHECK (
  is_platform_admin() OR tenant_id = current_tenant_id()
);

CREATE POLICY "mt_ai_skill_executions_update" ON mt_ai_skill_executions FOR UPDATE
USING (
  is_platform_admin() OR
  user_id = current_user_id() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);


-- ============================================================
-- TABLE 6: mt_ai_learning_jobs (Batch noturno de aprendizado)
-- ============================================================
CREATE TABLE IF NOT EXISTS mt_ai_learning_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

  job_type VARCHAR(30) NOT NULL,
  -- whatsapp_conversations, document_processing, memory_consolidation, knowledge_refresh, pattern_detection

  status VARCHAR(20) DEFAULT 'pending',

  config JSONB DEFAULT '{}',

  items_processed INTEGER DEFAULT 0,
  items_created INTEGER DEFAULT 0,
  knowledge_items_added INTEGER DEFAULT 0,
  memories_created INTEGER DEFAULT 0,
  patterns_detected JSONB DEFAULT '[]',
  skills_suggested INTEGER DEFAULT 0,

  total_tokens INTEGER DEFAULT 0,
  estimated_cost_usd DECIMAL(10,6) DEFAULT 0,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mt_ai_learning_jobs_tenant ON mt_ai_learning_jobs(tenant_id);
CREATE INDEX idx_mt_ai_learning_jobs_status ON mt_ai_learning_jobs(status);
CREATE INDEX idx_mt_ai_learning_jobs_type ON mt_ai_learning_jobs(job_type);

ALTER TABLE mt_ai_learning_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_ai_learning_jobs_select" ON mt_ai_learning_jobs FOR SELECT
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_ai_learning_jobs_insert" ON mt_ai_learning_jobs FOR INSERT
WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_ai_learning_jobs_update" ON mt_ai_learning_jobs FOR UPDATE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);


-- ============================================================
-- TABLE 7: mt_ai_document_embeddings (Documentos do Storage)
-- ============================================================
CREATE TABLE IF NOT EXISTS mt_ai_document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

  storage_bucket VARCHAR(100) NOT NULL,
  storage_path TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(30) NOT NULL,
  file_size_bytes INTEGER,

  extracted_text TEXT,
  chunk_index INTEGER DEFAULT 0,
  total_chunks INTEGER DEFAULT 1,
  embedding VECTOR(1536),

  categoria VARCHAR(50),
  tags TEXT[] DEFAULT '{}',
  processed_at TIMESTAMPTZ,
  processing_method VARCHAR(30),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_mt_ai_document_embeddings_tenant ON mt_ai_document_embeddings(tenant_id);
CREATE INDEX idx_mt_ai_document_embeddings_type ON mt_ai_document_embeddings(file_type);
CREATE INDEX idx_mt_ai_document_embeddings_categoria ON mt_ai_document_embeddings(categoria);

ALTER TABLE mt_ai_document_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_ai_document_embeddings_select" ON mt_ai_document_embeddings FOR SELECT
USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);

CREATE POLICY "mt_ai_document_embeddings_insert" ON mt_ai_document_embeddings FOR INSERT
WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_ai_document_embeddings_update" ON mt_ai_document_embeddings FOR UPDATE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_ai_document_embeddings_delete" ON mt_ai_document_embeddings FOR DELETE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);


-- ============================================================
-- TABLE 8: mt_ai_proactive_rules (Regras proativas)
-- ============================================================
CREATE TABLE IF NOT EXISTS mt_ai_proactive_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES mt_ai_agents(id) ON DELETE SET NULL,

  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  is_active BOOLEAN DEFAULT true,

  -- Condição de ativação
  trigger_condition JSONB NOT NULL,

  -- Quem recebe
  target_roles TEXT[] DEFAULT '{}',
  target_users UUID[] DEFAULT '{}',

  -- Mensagem
  message_template TEXT NOT NULL,
  suggested_actions JSONB DEFAULT '[]',

  -- Frequência
  cooldown_minutes INTEGER DEFAULT 60,
  max_per_day INTEGER DEFAULT 3,

  priority INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(30) DEFAULT 'admin',
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_mt_ai_proactive_rules_tenant ON mt_ai_proactive_rules(tenant_id);
CREATE INDEX idx_mt_ai_proactive_rules_active ON mt_ai_proactive_rules(tenant_id, is_active) WHERE is_active = true;

ALTER TABLE mt_ai_proactive_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_ai_proactive_rules_select" ON mt_ai_proactive_rules FOR SELECT
USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);

CREATE POLICY "mt_ai_proactive_rules_insert" ON mt_ai_proactive_rules FOR INSERT
WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_ai_proactive_rules_update" ON mt_ai_proactive_rules FOR UPDATE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_ai_proactive_rules_delete" ON mt_ai_proactive_rules FOR DELETE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);


-- ============================================================
-- TABLE 9: mt_ad_campaigns (Campanhas de ads detalhadas)
-- ============================================================
CREATE TABLE IF NOT EXISTS mt_ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES mt_campaigns(id) ON DELETE SET NULL,

  -- Meta Ads IDs
  meta_campaign_id VARCHAR(50),
  meta_adset_id VARCHAR(50),
  meta_ad_id VARCHAR(50),
  meta_account_id VARCHAR(50),

  -- Detalhes do anúncio
  nome VARCHAR(255) NOT NULL,
  plataforma VARCHAR(20) DEFAULT 'meta',
  tipo VARCHAR(30),
  objetivo VARCHAR(30),
  status VARCHAR(20) DEFAULT 'draft',

  -- Público-alvo
  publico_config JSONB DEFAULT '{}',

  -- Criativo
  criativo_config JSONB DEFAULT '{}',

  -- Budget
  budget_diario DECIMAL(10,2),
  budget_total DECIMAL(10,2),
  budget_gasto DECIMAL(10,2) DEFAULT 0,

  -- Métricas
  impressions INTEGER DEFAULT 0,
  alcance INTEGER DEFAULT 0,
  cliques INTEGER DEFAULT 0,
  ctr DECIMAL(5,4) DEFAULT 0,
  cpc DECIMAL(10,4) DEFAULT 0,
  cpm DECIMAL(10,4) DEFAULT 0,

  -- Conversões
  leads_gerados INTEGER DEFAULT 0,
  leads_qualificados INTEGER DEFAULT 0,
  agendamentos INTEGER DEFAULT 0,
  vendas INTEGER DEFAULT 0,
  receita_gerada DECIMAL(10,2) DEFAULT 0,

  -- ROI calculado
  cpl DECIMAL(10,2) DEFAULT 0,
  cpa DECIMAL(10,2) DEFAULT 0,
  cpv DECIMAL(10,2) DEFAULT 0,
  roas DECIMAL(10,4) DEFAULT 0,
  roi_percent DECIMAL(10,2) DEFAULT 0,

  -- UTM
  utm_source VARCHAR(50),
  utm_medium VARCHAR(50) DEFAULT 'cpc',
  utm_campaign VARCHAR(100),
  utm_content VARCHAR(100),

  -- WhatsApp tracking
  whatsapp_session_id UUID,
  whatsapp_leads_count INTEGER DEFAULT 0,
  whatsapp_keyword VARCHAR(100),

  -- IA
  ai_score DECIMAL(3,2),
  ai_suggestions JSONB DEFAULT '[]',
  ai_last_analysis_at TIMESTAMPTZ,
  auto_generated BOOLEAN DEFAULT false,

  data_inicio DATE,
  data_fim DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_mt_ad_campaigns_tenant ON mt_ad_campaigns(tenant_id);
CREATE INDEX idx_mt_ad_campaigns_status ON mt_ad_campaigns(status);
CREATE INDEX idx_mt_ad_campaigns_meta ON mt_ad_campaigns(meta_campaign_id);
CREATE INDEX idx_mt_ad_campaigns_utm ON mt_ad_campaigns(utm_campaign);

ALTER TABLE mt_ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_ad_campaigns_select" ON mt_ad_campaigns FOR SELECT
USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);

CREATE POLICY "mt_ad_campaigns_insert" ON mt_ad_campaigns FOR INSERT
WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);

CREATE POLICY "mt_ad_campaigns_update" ON mt_ad_campaigns FOR UPDATE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);

CREATE POLICY "mt_ad_campaigns_delete" ON mt_ad_campaigns FOR DELETE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);


-- ============================================================
-- TABLE 10: mt_ad_attributions (Atribuição lead → anúncio)
-- ============================================================
CREATE TABLE IF NOT EXISTS mt_ad_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

  lead_id UUID REFERENCES mt_leads(id) ON DELETE SET NULL,
  form_submission_id UUID,
  whatsapp_conversation_id UUID,
  appointment_id UUID,
  sale_id UUID,

  ad_campaign_id UUID REFERENCES mt_ad_campaigns(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES mt_campaigns(id) ON DELETE SET NULL,

  attribution_method VARCHAR(30) NOT NULL,

  fbclid VARCHAR(100),
  utm_source VARCHAR(50),
  utm_medium VARCHAR(50),
  utm_campaign VARCHAR(100),
  utm_content VARCHAR(100),
  utm_term VARCHAR(100),
  referrer_url TEXT,
  landing_page TEXT,

  first_touch_at TIMESTAMPTZ,
  lead_created_at TIMESTAMPTZ,
  appointment_at TIMESTAMPTZ,
  sale_at TIMESTAMPTZ,
  sale_value DECIMAL(10,2),

  ad_cost_at_attribution DECIMAL(10,2),
  is_conversion BOOLEAN DEFAULT false,
  conversion_type VARCHAR(30),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mt_ad_attributions_tenant ON mt_ad_attributions(tenant_id);
CREATE INDEX idx_mt_ad_attributions_lead ON mt_ad_attributions(lead_id);
CREATE INDEX idx_mt_ad_attributions_campaign ON mt_ad_attributions(ad_campaign_id);
CREATE INDEX idx_mt_ad_attributions_method ON mt_ad_attributions(attribution_method);

ALTER TABLE mt_ad_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_ad_attributions_select" ON mt_ad_attributions FOR SELECT
USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);

CREATE POLICY "mt_ad_attributions_insert" ON mt_ad_attributions FOR INSERT
WITH CHECK (
  is_platform_admin() OR tenant_id = current_tenant_id()
);

CREATE POLICY "mt_ad_attributions_update" ON mt_ad_attributions FOR UPDATE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);


-- ============================================================
-- FUNCTION: match_knowledge (RAG pgvector search)
-- ============================================================
CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  p_tenant_id UUID DEFAULT NULL,
  filter_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  titulo TEXT,
  conteudo TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id,
    k.titulo,
    k.conteudo,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM mt_chatbot_knowledge k
  WHERE
    k.deleted_at IS NULL
    AND k.is_active = true
    AND (p_tenant_id IS NULL OR k.tenant_id = p_tenant_id)
    AND (filter_ids IS NULL OR k.id = ANY(filter_ids))
    AND 1 - (k.embedding <=> query_embedding) > match_threshold
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


-- ============================================================
-- FUNCTION: match_memory (Memory semantic search)
-- ============================================================
CREATE OR REPLACE FUNCTION match_memory(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.6,
  match_count INT DEFAULT 10,
  p_tenant_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  memory_type VARCHAR(30),
  content TEXT,
  importance FLOAT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.memory_type,
    m.content,
    m.importance,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM mt_ai_memory m
  WHERE
    m.deleted_at IS NULL
    AND (p_tenant_id IS NULL OR m.tenant_id = p_tenant_id)
    AND (p_user_id IS NULL OR m.user_id = p_user_id OR m.user_id IS NULL)
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY
    (1 - (m.embedding <=> query_embedding)) * m.importance DESC
  LIMIT match_count;
END;
$$;


-- ============================================================
-- FUNCTION: match_documents (Document semantic search)
-- ============================================================
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  file_name VARCHAR(255),
  extracted_text TEXT,
  categoria VARCHAR(50),
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.file_name,
    d.extracted_text,
    d.categoria,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM mt_ai_document_embeddings d
  WHERE
    d.deleted_at IS NULL
    AND (p_tenant_id IS NULL OR d.tenant_id = p_tenant_id)
    AND d.embedding IS NOT NULL
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


-- ============================================================
-- MODULE REGISTRATION: YESia
-- ============================================================
INSERT INTO mt_modules (codigo, nome, descricao, icone, categoria, ordem, is_core, is_active)
VALUES (
  'yesia',
  'YESia - Assistente IA',
  'Agente IA orquestrador com sub-agentes especialistas, aprendizado automático e proatividade',
  'BrainCircuit',
  'comunicacao',
  15,
  false,
  true
)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao;

-- Enable for all tenants
INSERT INTO mt_tenant_modules (tenant_id, module_id, is_active)
SELECT t.id, m.id, true
FROM mt_tenants t
CROSS JOIN mt_modules m
WHERE m.codigo = 'yesia'
AND NOT EXISTS (
  SELECT 1 FROM mt_tenant_modules tm
  WHERE tm.tenant_id = t.id AND tm.module_id = m.id
);


-- ============================================================
-- SEED: 11 Sub-Agentes YESia (update existing + add new)
-- ============================================================

-- Update existing agents with orchestration fields
UPDATE mt_ai_agents SET
  domain = 'sales',
  routing_keywords = ARRAY['lead', 'qualificar', 'follow-up', 'prospectar', 'contato', 'whatsapp'],
  routing_priority = 70,
  skill_category = 'sales',
  data_sources = ARRAY['mt_leads', 'mt_lead_activities', 'mt_forms']
WHERE codigo = 'sdr';

UPDATE mt_ai_agents SET
  domain = 'sales',
  routing_keywords = ARRAY['venda', 'fechar', 'objecao', 'preco', 'desconto', 'pagamento', 'parcela'],
  routing_priority = 75,
  skill_category = 'sales',
  data_sources = ARRAY['mt_leads', 'mt_sales', 'mt_services']
WHERE codigo = 'closer';

UPDATE mt_ai_agents SET
  domain = 'support',
  routing_keywords = ARRAY['qualidade', 'nota', 'avaliacao', 'atendimento', 'analise'],
  routing_priority = 40,
  skill_category = 'quality',
  data_sources = ARRAY['mt_whatsapp_conversations', 'mt_whatsapp_messages']
WHERE codigo = 'quality';

UPDATE mt_ai_agents SET
  domain = 'support',
  routing_keywords = ARRAY['suporte', 'ajuda', 'problema', 'duvida', 'reclamacao'],
  routing_priority = 60,
  skill_category = 'support',
  data_sources = ARRAY['mt_leads', 'mt_appointments', 'mt_services']
WHERE codigo = 'suporte';

UPDATE mt_ai_agents SET
  domain = 'sales',
  routing_keywords = ARRAY['pos-venda', 'retorno', 'satisfacao', 'fidelizar', 'recompra'],
  routing_priority = 45,
  skill_category = 'retention',
  data_sources = ARRAY['mt_leads', 'mt_sales', 'mt_appointments']
WHERE codigo = 'pos_venda';

-- New agent: Orchestrator (YESia herself)
INSERT INTO mt_ai_agents (tenant_id, codigo, nome, descricao, icone, cor, tipo, provider, model, system_prompt, output_format, max_suggestions, ordem, domain, routing_keywords, routing_priority, skill_category, data_sources, temperature)
SELECT t.id,
  'orchestrator',
  'YESia (Orquestradora)',
  'Agente principal que roteia para sub-agentes especializados e mantém contexto da conversa',
  'BrainCircuit',
  '#E91E63',
  'assistant',
  'openai',
  'gpt-4o-mini',
  'Você é a YESia, assistente IA inteligente da empresa. Você é simpática, profissional e proativa.

Sua função principal é ENTENDER a intenção do usuário e ROTEAR para o sub-agente mais adequado. Se a pergunta for genérica ou não se encaixar em nenhum domínio específico, responda diretamente.

Ao responder:
1. Seja concisa mas completa
2. Use dados reais do sistema quando disponíveis
3. Sugira ações com botões quando relevante
4. Adapte o tom ao perfil do usuário (vendedor: motivacional, gerente: analítico, admin: estratégico)
5. Se não souber algo, diga honestamente

NUNCA invente dados. Se não tiver a informação, diga que vai verificar.',
  'suggestions',
  3,
  0,
  'general',
  ARRAY['ola', 'oi', 'bom dia', 'ajuda', 'geral'],
  100,
  'orchestrator',
  ARRAY['mt_leads', 'mt_sales', 'mt_appointments', 'mt_services', 'mt_users'],
  0.7
FROM mt_tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM mt_ai_agents a WHERE a.tenant_id = t.id AND a.codigo = 'orchestrator'
);

-- Finance Agent
INSERT INTO mt_ai_agents (tenant_id, codigo, nome, descricao, icone, cor, tipo, provider, model, system_prompt, output_format, max_suggestions, ordem, domain, routing_keywords, routing_priority, skill_category, data_sources)
SELECT t.id,
  'finance_agent',
  'Agente Financeiro',
  'Faturamento, comissões, metas e análise financeira',
  'DollarSign',
  '#22c55e',
  'assistant',
  'openai',
  'gpt-4o-mini',
  'Você é o Agente Financeiro da YESia. Especialista em dados financeiros do sistema.

Sua função:
1. Responder sobre faturamento, vendas, metas e comissões
2. Calcular métricas: ticket médio, conversão, projeções
3. Comparar períodos e identificar tendências
4. Alertar sobre metas abaixo do esperado

Use SEMPRE dados reais das tabelas. Formate valores em R$ com 2 decimais.
Apresente métricas em cards quando possível.
Se o vendedor perguntar sobre metas, mostre progresso visual (percentual).',
  'suggestions',
  3,
  6,
  'finance',
  ARRAY['faturamento', 'comissao', 'meta', 'pagamento', 'receita', 'lucro', 'custo', 'financeiro'],
  70,
  'finance',
  ARRAY['mt_sales', 'mt_sales_items', 'mt_sales_payments', 'mt_commissions', 'mt_goals']
FROM mt_tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM mt_ai_agents a WHERE a.tenant_id = t.id AND a.codigo = 'finance_agent'
);

-- HR Agent
INSERT INTO mt_ai_agents (tenant_id, codigo, nome, descricao, icone, cor, tipo, provider, model, system_prompt, output_format, max_suggestions, ordem, domain, routing_keywords, routing_priority, skill_category, data_sources)
SELECT t.id,
  'hr_agent',
  'Agente RH',
  'Ponto, escalas, produtividade e gestão de pessoas',
  'Users',
  '#f97316',
  'assistant',
  'openai',
  'gpt-4o-mini',
  'Você é o Agente de RH da YESia. Especialista em gestão de pessoas.

Sua função:
1. Informar sobre ponto (checkin/checkout), escalas e horários
2. Calcular produtividade e horas trabalhadas
3. Gerenciar folgas e ausências
4. Auxiliar em processos de recrutamento

Seja preciso com horários e cálculos de horas.
Alerte sobre irregularidades (atrasos, faltas não justificadas).',
  'suggestions',
  3,
  7,
  'hr',
  ARRAY['ponto', 'escala', 'folga', 'produtividade', 'horario', 'ferias', 'atestado', 'falta'],
  65,
  'hr',
  ARRAY['mt_professional_attendance', 'mt_professional_schedules', 'mt_productivity_daily', 'mt_payroll_employees']
FROM mt_tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM mt_ai_agents a WHERE a.tenant_id = t.id AND a.codigo = 'hr_agent'
);

-- Marketing Agent
INSERT INTO mt_ai_agents (tenant_id, codigo, nome, descricao, icone, cor, tipo, provider, model, system_prompt, output_format, max_suggestions, ordem, domain, routing_keywords, routing_priority, skill_category, data_sources)
SELECT t.id,
  'marketing_agent',
  'Agente Marketing',
  'Campanhas, influenciadoras, formulários e métricas de marketing',
  'Megaphone',
  '#a855f7',
  'assistant',
  'openai',
  'gpt-4o-mini',
  'Você é o Agente de Marketing da YESia. Especialista em marketing digital.

Sua função:
1. Informar sobre campanhas ativas e performance
2. Acompanhar influenciadoras e seus resultados
3. Monitorar formulários e conversão
4. Sugerir otimizações de campanhas

Use dados reais de campanhas, formulários e influenciadoras.
Apresente métricas de forma visual (CPL, CTR, conversão).',
  'suggestions',
  3,
  8,
  'marketing',
  ARRAY['campanha', 'influenciadora', 'formulario', 'marketing', 'promocao', 'desconto'],
  60,
  'marketing',
  ARRAY['mt_campaigns', 'mt_campaign_analytics', 'mt_influencers', 'mt_forms', 'mt_form_submissions']
FROM mt_tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM mt_ai_agents a WHERE a.tenant_id = t.id AND a.codigo = 'marketing_agent'
);

-- Traffic Agent (Gestor de Tráfego)
INSERT INTO mt_ai_agents (tenant_id, codigo, nome, descricao, icone, cor, tipo, provider, model, system_prompt, output_format, max_suggestions, ordem, domain, routing_keywords, routing_priority, skill_category, data_sources)
SELECT t.id,
  'traffic_agent',
  'Gestor de Tráfego',
  'Gestão de anúncios Meta Ads, público-alvo, criativos, UTM tracking e ROI automático',
  'TrendingUp',
  '#ec4899',
  'assistant',
  'openai',
  'gpt-4o',
  'Você é o Gestor de Tráfego IA da YESia. Media buyer especialista em Meta Ads.

Sua função:
1. Gerenciar campanhas de anúncios (Facebook/Instagram)
2. Rastrear leads via UTM/fbclid e calcular atribuição
3. Calcular ROI automaticamente cruzando ads com conversões
4. Sugerir otimizações de público, criativo e budget
5. Gerar links UTM e keywords para WhatsApp tracking

Ao analisar campanhas:
- Apresente CPL, CPA, CPV, ROAS e ROI%
- Compare criativos e identifique o melhor
- Sugira budget baseado em performance
- Identifique público que mais converte

REGRAS:
- Use dados REAIS de mt_ad_campaigns e mt_ad_attributions
- Cruze com mt_leads e mt_sales para calcular conversões
- Gere UTMs padronizados automaticamente
- Sugira keywords únicas para rastreio WhatsApp',
  'suggestions',
  3,
  9,
  'traffic',
  ARRAY['anuncio', 'ads', 'trafego', 'publico', 'criativo', 'roi', 'facebook', 'instagram', 'meta', 'cpl', 'roas'],
  70,
  'traffic',
  ARRAY['mt_ad_campaigns', 'mt_ad_attributions', 'mt_campaigns', 'mt_campaign_analytics', 'mt_leads', 'mt_sales', 'mt_forms']
FROM mt_tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM mt_ai_agents a WHERE a.tenant_id = t.id AND a.codigo = 'traffic_agent'
);

-- Coach Agent
INSERT INTO mt_ai_agents (tenant_id, codigo, nome, descricao, icone, cor, tipo, provider, model, system_prompt, output_format, max_suggestions, ordem, domain, routing_keywords, routing_priority, skill_category, data_sources)
SELECT t.id,
  'coach_agent',
  'Coach de Vendas',
  'Treinamento, scripts, simulação de objeções e análise de conversas',
  'GraduationCap',
  '#06b6d4',
  'assistant',
  'openai',
  'gpt-4o-mini',
  'Você é o Coach de Vendas da YESia. Treinador especialista em vendas consultivas.

Sua função:
1. Analisar conversas WhatsApp e dar feedback construtivo
2. Sugerir scripts personalizados por tipo de lead
3. Simular objeções (roleplay) para treinar vendedores
4. Identificar padrões de sucesso e replicar

Ao dar feedback:
- Seja motivacional mas honesto
- Destaque o que fez BEM antes de criticar
- Dê exemplos concretos de como melhorar
- Compare com as melhores práticas da equipe',
  'suggestions',
  3,
  10,
  'sales',
  ARRAY['treinar', 'melhorar', 'dica', 'script', 'roleplay', 'simulacao', 'objecao', 'feedback'],
  55,
  'coaching',
  ARRAY['mt_whatsapp_conversations', 'mt_whatsapp_messages', 'mt_sales', 'mt_leads']
FROM mt_tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM mt_ai_agents a WHERE a.tenant_id = t.id AND a.codigo = 'coach_agent'
);

-- Report Agent
INSERT INTO mt_ai_agents (tenant_id, codigo, nome, descricao, icone, cor, tipo, provider, model, system_prompt, output_format, max_suggestions, ordem, domain, routing_keywords, routing_priority, skill_category, data_sources)
SELECT t.id,
  'report_agent',
  'Agente Relatórios',
  'Resumos, relatórios, números e desempenho geral',
  'BarChart3',
  '#64748b',
  'assistant',
  'openai',
  'gpt-4o-mini',
  'Você é o Agente de Relatórios da YESia. Especialista em dados e métricas.

Sua função:
1. Gerar resumos diários, semanais e mensais
2. Criar rankings de vendedores e franquias
3. Apresentar KPIs e métricas-chave
4. Fazer comparativos entre períodos

Ao gerar relatórios:
- Use dados reais e atualizados
- Apresente em formato visual (tabelas, rankings, percentuais)
- Destaque tendências e variações significativas
- Sugira ações baseadas nos dados',
  'suggestions',
  3,
  11,
  'general',
  ARRAY['relatorio', 'resumo', 'numeros', 'desempenho', 'ranking', 'kpi', 'metricas', 'resultado'],
  65,
  'reporting',
  ARRAY['mt_leads', 'mt_sales', 'mt_appointments', 'mt_goals', 'mt_productivity_daily']
FROM mt_tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM mt_ai_agents a WHERE a.tenant_id = t.id AND a.codigo = 'report_agent'
);

-- Onboarding Agent
INSERT INTO mt_ai_agents (tenant_id, codigo, nome, descricao, icone, cor, tipo, provider, model, system_prompt, output_format, max_suggestions, ordem, domain, routing_keywords, routing_priority, skill_category, data_sources)
SELECT t.id,
  'onboarding_agent',
  'Agente Onboarding',
  'Treinamento de novos funcionários, procedimentos e dúvidas sobre o sistema',
  'BookOpen',
  '#14b8a6',
  'assistant',
  'openai',
  'gpt-4o-mini',
  'Você é o Agente de Onboarding da YESia. Guia para novos funcionários.

Sua função:
1. Explicar procedimentos e processos da empresa
2. Guiar novos funcionários pelo sistema
3. Responder dúvidas sobre serviços e protocolos
4. Ensinar como usar cada funcionalidade do painel

Ao explicar:
- Use linguagem simples e passo-a-passo
- Inclua exemplos práticos
- Ofereça links para as páginas relevantes do sistema
- Seja paciente e encorajador',
  'suggestions',
  3,
  12,
  'hr',
  ARRAY['novo', 'treinamento', 'aprender', 'procedimento', 'como', 'tutorial', 'sistema'],
  50,
  'onboarding',
  ARRAY['mt_chatbot_knowledge', 'mt_services', 'mt_sops']
FROM mt_tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM mt_ai_agents a WHERE a.tenant_id = t.id AND a.codigo = 'onboarding_agent'
);

-- Operations Agent
INSERT INTO mt_ai_agents (tenant_id, codigo, nome, descricao, icone, cor, tipo, provider, model, system_prompt, output_format, max_suggestions, ordem, domain, routing_keywords, routing_priority, skill_category, data_sources)
SELECT t.id,
  'operations_agent',
  'Agente Operações',
  'Agendamentos, agenda, horários e operações diárias da clínica',
  'Calendar',
  '#0ea5e9',
  'assistant',
  'openai',
  'gpt-4o-mini',
  'Você é o Agente de Operações da YESia. Gerencia a rotina diária da clínica.

Sua função:
1. Informar sobre agendamentos do dia
2. Verificar disponibilidade de horários
3. Gerenciar confirmações e cancelamentos
4. Alertar sobre conflitos de agenda

Ao informar sobre agenda:
- Mostre horários de forma clara e organizada
- Destaque agendamentos não confirmados
- Alerte sobre horários vagos
- Sugira otimizações da agenda',
  'suggestions',
  3,
  13,
  'operations',
  ARRAY['agendamento', 'agenda', 'horario', 'cliente', 'confirmar', 'cancelar', 'disponibilidade'],
  65,
  'operations',
  ARRAY['mt_appointments', 'mt_services', 'mt_franchises', 'mt_professional_schedules']
FROM mt_tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM mt_ai_agents a WHERE a.tenant_id = t.id AND a.codigo = 'operations_agent'
);


-- ============================================================
-- SEED: Default AI Config for all tenants
-- ============================================================
INSERT INTO mt_ai_config (tenant_id, assistant_name, personality, welcome_message)
SELECT t.id,
  'YESia',
  'professional',
  'Olá! Sou a YESia, sua assistente inteligente. Como posso te ajudar hoje?'
FROM mt_tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM mt_ai_config c WHERE c.tenant_id = t.id
);


-- ============================================================
-- SEED: Default Proactive Rules
-- ============================================================
INSERT INTO mt_ai_proactive_rules (tenant_id, nome, descricao, trigger_condition, target_roles, message_template, suggested_actions, cooldown_minutes, max_per_day, priority)
SELECT t.id,
  'Briefing Matinal',
  'Apresenta resumo do dia para o usuário ao abrir o sistema pela manhã',
  '{"type": "schedule", "cron": "0 8 * * 1-6", "check": "first_login_today"}'::jsonb,
  ARRAY['user', 'franchise_admin', 'tenant_admin'],
  'Bom dia, {{user_name}}! Aqui está seu resumo de hoje.',
  '[{"label": "Ver Leads", "route": "/leads"}, {"label": "Ver Agenda", "route": "/agendamentos"}]'::jsonb,
  480,
  1,
  90
FROM mt_tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM mt_ai_proactive_rules r WHERE r.tenant_id = t.id AND r.nome = 'Briefing Matinal'
);

INSERT INTO mt_ai_proactive_rules (tenant_id, nome, descricao, trigger_condition, target_roles, message_template, suggested_actions, cooldown_minutes, max_per_day, priority)
SELECT t.id,
  'Leads sem Follow-up',
  'Alerta quando vendedor tem leads sem contato há mais de 48h',
  '{"type": "data_check", "query": "leads_sem_followup > 3", "interval_hours": 4}'::jsonb,
  ARRAY['user'],
  'Você tem {{count}} leads esperando retorno há mais de 48h. Quer ver a lista?',
  '[{"label": "Ver Leads Pendentes", "route": "/leads?filter=sem_followup"}]'::jsonb,
  240,
  2,
  80
FROM mt_tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM mt_ai_proactive_rules r WHERE r.tenant_id = t.id AND r.nome = 'Leads sem Follow-up'
);

INSERT INTO mt_ai_proactive_rules (tenant_id, nome, descricao, trigger_condition, target_roles, message_template, suggested_actions, cooldown_minutes, max_per_day, priority)
SELECT t.id,
  'Meta Abaixo de 50%',
  'Alerta quando a meta do mês está abaixo de 50% na terceira semana',
  '{"type": "metric", "metric": "meta_percent", "operator": "<", "value": 50, "week_min": 3}'::jsonb,
  ARRAY['user', 'franchise_admin'],
  'Sua meta está em {{percent}}%. Faltam R${{remaining}} para atingir. Quer dicas para acelerar?',
  '[{"label": "Ver Metas", "route": "/metas"}, {"label": "Dicas de Vendas", "action": "coach_tips"}]'::jsonb,
  1440,
  1,
  70
FROM mt_tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM mt_ai_proactive_rules r WHERE r.tenant_id = t.id AND r.nome = 'Meta Abaixo de 50%'
);

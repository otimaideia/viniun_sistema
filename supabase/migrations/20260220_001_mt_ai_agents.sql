-- Migration: 20260220_001_mt_ai_agents.sql
-- Purpose: Sistema de Agentes IA para análise de conversas WhatsApp
-- Tables: mt_ai_agents, mt_ai_agent_analyses, mt_ai_audio_transcriptions
-- Author: Claude + Danilo
-- Date: 2026-02-20

-- ============================================================
-- TABLE 1: mt_ai_agents (Configuração de agentes IA)
-- ============================================================
CREATE TABLE IF NOT EXISTS mt_ai_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Identification
    codigo VARCHAR(50) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    icone VARCHAR(50) DEFAULT 'Bot',
    cor VARCHAR(20) DEFAULT '#6366f1',

    -- Agent Type
    tipo VARCHAR(30) NOT NULL DEFAULT 'assistant',
    -- assistant: sugere respostas | quality: analisa qualidade

    -- AI Model Config
    provider VARCHAR(30) DEFAULT 'openai',
    model VARCHAR(100) DEFAULT 'gpt-4o-mini',
    api_key_encrypted TEXT,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 1000,

    -- Prompts
    system_prompt TEXT NOT NULL,
    context_instructions TEXT,
    output_format VARCHAR(20) DEFAULT 'suggestions',
    -- suggestions | analysis | both

    -- Behavior
    max_suggestions INTEGER DEFAULT 3,
    include_reasoning BOOLEAN DEFAULT true,
    auto_transcribe_audio BOOLEAN DEFAULT true,
    max_history_messages INTEGER DEFAULT 50,

    -- Whisper Config
    whisper_model VARCHAR(50) DEFAULT 'whisper-1',
    whisper_language VARCHAR(10) DEFAULT 'pt',

    -- Access Control
    allowed_roles TEXT[] DEFAULT '{platform_admin,tenant_admin,franchise_admin}',
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    ordem INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,

    CONSTRAINT mt_ai_agents_unique UNIQUE(tenant_id, codigo)
);

CREATE INDEX idx_mt_ai_agents_tenant ON mt_ai_agents(tenant_id);
CREATE INDEX idx_mt_ai_agents_active ON mt_ai_agents(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX idx_mt_ai_agents_tipo ON mt_ai_agents(tipo);

ALTER TABLE mt_ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_ai_agents_select" ON mt_ai_agents FOR SELECT
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND (franchise_id = current_franchise_id() OR franchise_id IS NULL)) OR
    tenant_id = current_tenant_id()
);

CREATE POLICY "mt_ai_agents_insert" ON mt_ai_agents FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_ai_agents_update" ON mt_ai_agents FOR UPDATE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_ai_agents_delete" ON mt_ai_agents FOR DELETE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);


-- ============================================================
-- TABLE 2: mt_ai_agent_analyses (Resultados de análises)
-- ============================================================
CREATE TABLE IF NOT EXISTS mt_ai_agent_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- References
    agent_id UUID NOT NULL REFERENCES mt_ai_agents(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES mt_whatsapp_conversations(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL,

    -- Analysis Input
    messages_analyzed INTEGER DEFAULT 0,
    audio_messages_transcribed INTEGER DEFAULT 0,
    context_tokens INTEGER DEFAULT 0,

    -- Analysis Output
    analysis_text TEXT,
    quality_score DECIMAL(3,2),
    sentiment VARCHAR(30),
    lead_intent VARCHAR(100),
    lead_temperature VARCHAR(20),

    -- Suggested Responses (JSONB array)
    suggestions JSONB DEFAULT '[]',

    -- Execution
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    processing_time_ms INTEGER,

    -- Token Usage
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    estimated_cost DECIMAL(10,6) DEFAULT 0,

    -- Feedback
    suggestion_used_id VARCHAR(100),
    was_helpful BOOLEAN,
    feedback_text TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mt_ai_agent_analyses_tenant ON mt_ai_agent_analyses(tenant_id);
CREATE INDEX idx_mt_ai_agent_analyses_conversation ON mt_ai_agent_analyses(conversation_id);
CREATE INDEX idx_mt_ai_agent_analyses_agent ON mt_ai_agent_analyses(agent_id);
CREATE INDEX idx_mt_ai_agent_analyses_status ON mt_ai_agent_analyses(status);
CREATE INDEX idx_mt_ai_agent_analyses_created ON mt_ai_agent_analyses(created_at DESC);
CREATE INDEX idx_mt_ai_agent_analyses_user ON mt_ai_agent_analyses(requested_by);

ALTER TABLE mt_ai_agent_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_ai_agent_analyses_select" ON mt_ai_agent_analyses FOR SELECT
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    requested_by = current_user_id() OR
    tenant_id = current_tenant_id()
);

CREATE POLICY "mt_ai_agent_analyses_insert" ON mt_ai_agent_analyses FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    tenant_id = current_tenant_id()
);

CREATE POLICY "mt_ai_agent_analyses_update" ON mt_ai_agent_analyses FOR UPDATE
USING (
    is_platform_admin() OR
    requested_by = current_user_id() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);


-- ============================================================
-- TABLE 3: mt_ai_audio_transcriptions (Cache de transcrições)
-- ============================================================
CREATE TABLE IF NOT EXISTS mt_ai_audio_transcriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Source
    message_id UUID NOT NULL,
    conversation_id UUID NOT NULL,

    -- Transcription
    transcription TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'pt',
    duration_seconds INTEGER,
    confidence DECIMAL(3,2),

    -- Processing
    whisper_model VARCHAR(50),
    processing_time_ms INTEGER,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT mt_ai_audio_transcriptions_unique UNIQUE(message_id)
);

CREATE INDEX idx_mt_ai_audio_transcriptions_message ON mt_ai_audio_transcriptions(message_id);
CREATE INDEX idx_mt_ai_audio_transcriptions_conversation ON mt_ai_audio_transcriptions(conversation_id);

ALTER TABLE mt_ai_audio_transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_ai_audio_transcriptions_select" ON mt_ai_audio_transcriptions FOR SELECT
USING (
    is_platform_admin() OR tenant_id = current_tenant_id()
);

CREATE POLICY "mt_ai_audio_transcriptions_insert" ON mt_ai_audio_transcriptions FOR INSERT
WITH CHECK (
    is_platform_admin() OR tenant_id = current_tenant_id()
);


-- ============================================================
-- MODULE REGISTRATION
-- ============================================================
INSERT INTO mt_modules (codigo, nome, descricao, icone, categoria, ordem, is_core, is_active)
VALUES (
    'ai_agents',
    'Agentes IA',
    'Agentes de IA para análise de conversas e sugestões de respostas no WhatsApp',
    'BrainCircuit',
    'comunicacao',
    14,
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
WHERE m.codigo = 'ai_agents'
AND NOT EXISTS (
    SELECT 1 FROM mt_tenant_modules tm
    WHERE tm.tenant_id = t.id AND tm.module_id = m.id
);


-- ============================================================
-- SEED: Default agents for all tenants
-- ============================================================

-- SDR Agent
INSERT INTO mt_ai_agents (tenant_id, codigo, nome, descricao, icone, cor, tipo, provider, model, system_prompt, context_instructions, output_format, max_suggestions, ordem)
SELECT t.id,
    'sdr',
    'SDR - Qualificador',
    'Analisa conversas para qualificar leads, identificar intenção de compra e sugerir próximos passos',
    'UserSearch',
    '#3b82f6',
    'assistant',
    'openai',
    'gpt-4o-mini',
    'Você é um SDR (Sales Development Representative) especialista em qualificação de leads para clínicas de estética e odontologia.

Sua função é analisar a conversa do WhatsApp e:
1. Identificar a intenção do lead (procedimento desejado, dúvida, reclamação)
2. Classificar a temperatura do lead (QUENTE, MORNO, FRIO)
3. Sugerir respostas estratégicas para avançar na qualificação
4. Identificar objeções e como superá-las

REGRAS:
- Seja direto e objetivo nas sugestões
- Cada sugestão deve ter no máximo 3 linhas
- Use linguagem informal mas profissional
- Sempre inclua uma pergunta qualificadora
- Se o lead demonstrar interesse, sugira agendar procedimento
- Se o lead tiver objeção de preço, sugira promoção ou parcelamento',
    'Contexto: empresa de franquias de estética/odontologia. Serviços incluem depilação a laser, harmonização facial, limpeza de pele, clareamento dental, implantes.',
    'suggestions',
    3,
    1
FROM mt_tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM mt_ai_agents a WHERE a.tenant_id = t.id AND a.codigo = 'sdr'
);

-- Closer Agent
INSERT INTO mt_ai_agents (tenant_id, codigo, nome, descricao, icone, cor, tipo, provider, model, system_prompt, output_format, max_suggestions, ordem)
SELECT t.id,
    'closer',
    'Closer - Conversão',
    'Focado em fechar vendas, lidar com objeções e converter leads em clientes',
    'Target',
    '#ef4444',
    'assistant',
    'openai',
    'gpt-4o-mini',
    'Você é um Closer especialista em conversão para clínicas de estética e odontologia.

Sua função é analisar a conversa e sugerir respostas que FECHEM A VENDA:
1. Identifique a objeção principal do lead (preço, tempo, medo, comparação)
2. Sugira respostas focadas em superar essa objeção
3. Sempre inclua uma CTA (call-to-action) clara
4. Use técnicas de urgência quando apropriado

TÉCNICAS PERMITIDAS:
- Escassez: "Temos apenas X vagas esta semana"
- Prova social: "A maioria das nossas clientes..."
- Ancoragem de preço: Mostrar valor total vs valor da promoção
- Garantia: "Satisfação garantida ou..."

REGRAS:
- NUNCA minta sobre promoções ou disponibilidade
- Seja empático com objeções, não agressivo
- Se o lead pedir desconto, sugira parcelamento primeiro
- Se o lead disser "vou pensar", sugira agendamento sem compromisso',
    'suggestions',
    3,
    2
FROM mt_tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM mt_ai_agents a WHERE a.tenant_id = t.id AND a.codigo = 'closer'
);

-- Quality Agent
INSERT INTO mt_ai_agents (tenant_id, codigo, nome, descricao, icone, cor, tipo, provider, model, system_prompt, output_format, max_suggestions, ordem)
SELECT t.id,
    'quality',
    'Qualidade - Analista',
    'Analisa a qualidade do atendimento, identifica pontos de melhoria e sugere correções',
    'ShieldCheck',
    '#10b981',
    'assistant',
    'openai',
    'gpt-4o-mini',
    'Você é um Analista de Qualidade de atendimento ao cliente para clínicas de estética e odontologia.

Analise TODA a conversa e forneça:

1. **NOTA GERAL** (0-10): Avalie o atendimento geral
2. **PONTOS POSITIVOS**: O que o atendente fez bem
3. **PONTOS DE MELHORIA**: O que pode ser melhorado
4. **TEMPO DE RESPOSTA**: Avalie se as respostas foram rápidas
5. **EMPATIA**: O atendente demonstrou empatia?
6. **RESOLUÇÃO**: O problema/dúvida foi resolvido?
7. **SUGESTÕES**: Respostas que o atendente DEVERIA ter enviado em momentos-chave

CRITÉRIOS:
- Tempo de resposta ideal: < 5 minutos
- Toda mensagem do cliente deve ser respondida
- Uso de nome do cliente é obrigatório
- Emojis são bem-vindos mas sem exagero
- Erros de português contam negativamente
- Respostas genéricas (ctrl+c/ctrl+v) contam negativamente',
    'both',
    3,
    3
FROM mt_tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM mt_ai_agents a WHERE a.tenant_id = t.id AND a.codigo = 'quality'
);

-- Suporte Agent
INSERT INTO mt_ai_agents (tenant_id, codigo, nome, descricao, icone, cor, tipo, provider, model, system_prompt, output_format, max_suggestions, ordem)
SELECT t.id,
    'suporte',
    'Suporte - Atendimento',
    'Resolve dúvidas, identifica problemas e sugere soluções para o cliente',
    'Headphones',
    '#8b5cf6',
    'assistant',
    'openai',
    'gpt-4o-mini',
    'Você é um especialista em Suporte ao Cliente para clínicas de estética e odontologia.

Sua função é analisar a conversa e sugerir respostas que RESOLVAM o problema do cliente:
1. Identifique o problema ou dúvida principal
2. Sugira soluções claras e objetivas
3. Seja empático e acolhedor
4. Se não souber a resposta, sugira encaminhar para o setor responsável

REGRAS:
- Priorize resolver o problema na primeira resposta
- Use linguagem acessível, evite termos técnicos
- Sempre confirme se o cliente teve sua dúvida esclarecida
- Se for reclamação, demonstre empatia ANTES de sugerir solução
- Ofereça alternativas quando possível',
    'suggestions',
    3,
    4
FROM mt_tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM mt_ai_agents a WHERE a.tenant_id = t.id AND a.codigo = 'suporte'
);

-- Pós-Venda Agent
INSERT INTO mt_ai_agents (tenant_id, codigo, nome, descricao, icone, cor, tipo, provider, model, system_prompt, output_format, max_suggestions, ordem)
SELECT t.id,
    'pos_venda',
    'Pós-Venda',
    'Follow-up, satisfação do cliente, upsell e fidelização',
    'Heart',
    '#f59e0b',
    'assistant',
    'openai',
    'gpt-4o-mini',
    'Você é um especialista em Pós-Venda e Fidelização para clínicas de estética e odontologia.

Sua função é analisar a conversa e sugerir ações de pós-venda:
1. Verificar satisfação com o procedimento realizado
2. Sugerir agendamento de retorno ou manutenção
3. Identificar oportunidades de upsell (novos procedimentos)
4. Fortalecer o relacionamento com o cliente

ESTRATÉGIAS:
- Follow-up 7 dias após procedimento: perguntar como está
- Follow-up 30 dias: lembrar de manutenção
- Aniversário/datas especiais: oferecer desconto exclusivo
- Cross-sell: sugerir procedimentos complementares

REGRAS:
- Seja genuíno, não force vendas
- Priorize a satisfação do cliente
- Use o nome do cliente sempre
- Personalize com base no histórico',
    'suggestions',
    3,
    5
FROM mt_tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM mt_ai_agents a WHERE a.tenant_id = t.id AND a.codigo = 'pos_venda'
);

-- =============================================================================
-- MULTI-TENANT MIGRATION: Automations Tables
-- Data: 01/02/2026
-- Descrição: Tabelas do módulo Automações (CORE) - Workflows e Triggers
-- =============================================================================

-- -----------------------------------------------------------------------------
-- mt_workflows: Definição de workflows/automações
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Identificação
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(50), -- leads, vendas, comunicacao, atendimento, integracao

    -- Trigger (o que dispara o workflow)
    trigger_type VARCHAR(50) NOT NULL,
    -- evento: Disparado por evento no sistema
    -- agendado: Disparado por cron/schedule
    -- webhook: Disparado por chamada externa
    -- manual: Disparado manualmente

    trigger_config JSONB NOT NULL DEFAULT '{}',
    -- Para evento: {"evento": "lead.created", "condicoes": {...}}
    -- Para agendado: {"cron": "0 9 * * 1-5", "timezone": "America/Sao_Paulo"}
    -- Para webhook: {"path": "/trigger/abc123", "secret": "..."}

    -- Módulo associado
    module_id UUID REFERENCES mt_modules(id) ON DELETE SET NULL,

    -- Status
    is_active BOOLEAN DEFAULT false,
    is_draft BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,

    -- Estatísticas
    total_execucoes INTEGER DEFAULT 0,
    execucoes_sucesso INTEGER DEFAULT 0,
    execucoes_erro INTEGER DEFAULT 0,
    ultima_execucao TIMESTAMPTZ,

    -- Limites
    max_execucoes_hora INTEGER DEFAULT 100,
    max_execucoes_dia INTEGER DEFAULT 1000,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    published_at TIMESTAMPTZ,
    published_by UUID
);

COMMENT ON TABLE mt_workflows IS 'Definição de workflows e automações';

CREATE INDEX IF NOT EXISTS idx_mt_workflows_tenant ON mt_workflows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_workflows_franchise ON mt_workflows(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_workflows_trigger ON mt_workflows(trigger_type);
CREATE INDEX IF NOT EXISTS idx_mt_workflows_active ON mt_workflows(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_mt_workflows_module ON mt_workflows(module_id);

-- -----------------------------------------------------------------------------
-- mt_workflow_steps: Passos do workflow
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES mt_workflows(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Identificação
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,

    -- Posição
    ordem INTEGER NOT NULL DEFAULT 0,
    parent_step_id UUID REFERENCES mt_workflow_steps(id) ON DELETE CASCADE,
    -- Para branches/condicionais

    -- Tipo de ação
    tipo VARCHAR(50) NOT NULL,
    -- condicao: If/else
    -- loop: Repetir ações
    -- delay: Aguardar tempo
    -- enviar_email: Enviar email
    -- enviar_whatsapp: Enviar WhatsApp
    -- enviar_sms: Enviar SMS
    -- criar_tarefa: Criar tarefa
    -- atualizar_lead: Atualizar dados do lead
    -- mover_funil: Mover lead no funil
    -- atribuir_usuario: Atribuir responsável
    -- webhook: Chamar webhook externo
    -- executar_sql: Executar query
    -- chatbot: Iniciar chatbot

    -- Configuração da ação
    config JSONB NOT NULL DEFAULT '{}',

    -- Condição para executar este passo
    condicao JSONB,
    -- Exemplo: {"campo": "lead.score", "operador": ">", "valor": 50}

    -- Tratamento de erro
    on_error VARCHAR(20) DEFAULT 'continue', -- continue, stop, retry
    max_retries INTEGER DEFAULT 3,
    retry_delay_seconds INTEGER DEFAULT 60,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_workflow_steps IS 'Passos/ações de cada workflow';

CREATE INDEX IF NOT EXISTS idx_mt_workflow_steps_workflow ON mt_workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_mt_workflow_steps_ordem ON mt_workflow_steps(workflow_id, ordem);
CREATE INDEX IF NOT EXISTS idx_mt_workflow_steps_parent ON mt_workflow_steps(parent_step_id);
CREATE INDEX IF NOT EXISTS idx_mt_workflow_steps_tipo ON mt_workflow_steps(tipo);

-- -----------------------------------------------------------------------------
-- mt_workflow_conditions: Condições reutilizáveis
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_workflow_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Identificação
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,

    -- Condição
    tipo VARCHAR(20) NOT NULL, -- simples, composta
    config JSONB NOT NULL,
    -- Simples: {"campo": "lead.origem", "operador": "equals", "valor": "google"}
    -- Composta: {"operador": "AND", "condicoes": [...]}

    -- Uso
    uso_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_workflow_conditions IS 'Condições reutilizáveis para workflows';

CREATE INDEX IF NOT EXISTS idx_mt_workflow_conditions_tenant ON mt_workflow_conditions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_workflow_conditions_nome ON mt_workflow_conditions(nome);

-- -----------------------------------------------------------------------------
-- mt_workflow_executions: Execuções de workflows
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES mt_workflows(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Contexto
    trigger_data JSONB, -- Dados que dispararam o workflow
    context_type VARCHAR(50), -- lead, agendamento, usuario, etc
    context_id UUID, -- ID do registro que disparou

    -- Status
    status VARCHAR(20) DEFAULT 'running',
    -- pending, running, completed, failed, cancelled, timeout

    -- Progresso
    current_step_id UUID REFERENCES mt_workflow_steps(id) ON DELETE SET NULL,
    steps_completed INTEGER DEFAULT 0,
    steps_total INTEGER DEFAULT 0,

    -- Resultado
    resultado JSONB,
    error_message TEXT,
    error_step_id UUID,

    -- Tentativas
    attempt INTEGER DEFAULT 1,
    max_attempts INTEGER DEFAULT 3,

    -- Tempo
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_workflow_executions IS 'Histórico de execuções de workflows';

CREATE INDEX IF NOT EXISTS idx_mt_workflow_executions_workflow ON mt_workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_mt_workflow_executions_tenant ON mt_workflow_executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_workflow_executions_status ON mt_workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_mt_workflow_executions_context ON mt_workflow_executions(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_mt_workflow_executions_started ON mt_workflow_executions(started_at DESC);

-- -----------------------------------------------------------------------------
-- mt_workflow_execution_logs: Log detalhado de cada passo
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_workflow_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES mt_workflow_executions(id) ON DELETE CASCADE,
    step_id UUID REFERENCES mt_workflow_steps(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Ação executada
    action VARCHAR(100) NOT NULL,
    action_type VARCHAR(50),

    -- Dados
    input_data JSONB,
    output_data JSONB,

    -- Status
    status VARCHAR(20) NOT NULL, -- started, success, failed, skipped

    -- Erro
    error_message TEXT,
    error_stack TEXT,

    -- Tempo
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_workflow_execution_logs IS 'Log detalhado de cada passo executado';

CREATE INDEX IF NOT EXISTS idx_mt_workflow_execution_logs_execution ON mt_workflow_execution_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_mt_workflow_execution_logs_step ON mt_workflow_execution_logs(step_id);
CREATE INDEX IF NOT EXISTS idx_mt_workflow_execution_logs_status ON mt_workflow_execution_logs(status);
CREATE INDEX IF NOT EXISTS idx_mt_workflow_execution_logs_created ON mt_workflow_execution_logs(created_at DESC);

-- -----------------------------------------------------------------------------
-- mt_workflow_templates: Templates de workflows pré-configurados
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identificação
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(50),

    -- Configuração
    config JSONB NOT NULL, -- Workflow completo como JSON

    -- Ícone e visual
    icone VARCHAR(50),
    cor VARCHAR(7) DEFAULT '#3B82F6',

    -- Módulo recomendado
    module_id UUID REFERENCES mt_modules(id) ON DELETE SET NULL,

    -- Dificuldade
    complexidade VARCHAR(20) DEFAULT 'media', -- simples, media, avancada

    -- Uso
    uso_count INTEGER DEFAULT 0,

    -- Controle (template global do sistema)
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_workflow_templates IS 'Templates prontos de workflows';

CREATE INDEX IF NOT EXISTS idx_mt_workflow_templates_categoria ON mt_workflow_templates(categoria);
CREATE INDEX IF NOT EXISTS idx_mt_workflow_templates_module ON mt_workflow_templates(module_id);
CREATE INDEX IF NOT EXISTS idx_mt_workflow_templates_active ON mt_workflow_templates(is_active);

-- -----------------------------------------------------------------------------
-- mt_workflow_schedules: Agendamentos de workflows
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_workflow_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES mt_workflows(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Agendamento
    cron_expression VARCHAR(100), -- Formato cron
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',

    -- Ou agendamento único
    scheduled_at TIMESTAMPTZ,

    -- Próxima execução
    next_run_at TIMESTAMPTZ,
    last_run_at TIMESTAMPTZ,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_workflow_schedules IS 'Agendamentos de execução de workflows';

CREATE INDEX IF NOT EXISTS idx_mt_workflow_schedules_workflow ON mt_workflow_schedules(workflow_id);
CREATE INDEX IF NOT EXISTS idx_mt_workflow_schedules_next_run ON mt_workflow_schedules(next_run_at);
CREATE INDEX IF NOT EXISTS idx_mt_workflow_schedules_active ON mt_workflow_schedules(is_active, next_run_at);

-- -----------------------------------------------------------------------------
-- INSERIR TEMPLATES DE WORKFLOW
-- -----------------------------------------------------------------------------
INSERT INTO mt_workflow_templates (nome, descricao, categoria, config, icone, complexidade, is_system) VALUES
(
    'Boas-vindas ao Lead',
    'Envia mensagem de boas-vindas via WhatsApp quando um novo lead é criado',
    'leads',
    '{
        "trigger": {"type": "evento", "evento": "lead.created"},
        "steps": [
            {"tipo": "delay", "config": {"segundos": 60}},
            {"tipo": "enviar_whatsapp", "config": {"template": "boas_vindas"}}
        ]
    }',
    'MessageCircle',
    'simples',
    true
),
(
    'Follow-up Agendamento',
    'Envia lembrete de agendamento 24h e 1h antes',
    'agendamentos',
    '{
        "trigger": {"type": "evento", "evento": "agendamento.created"},
        "steps": [
            {"tipo": "delay", "config": {"ate": "agendamento.data - 24h"}},
            {"tipo": "enviar_whatsapp", "config": {"template": "lembrete_24h"}},
            {"tipo": "delay", "config": {"ate": "agendamento.data - 1h"}},
            {"tipo": "enviar_whatsapp", "config": {"template": "lembrete_1h"}}
        ]
    }',
    'Calendar',
    'media',
    true
),
(
    'Lead Scoring Automático',
    'Atualiza score do lead baseado em interações',
    'leads',
    '{
        "trigger": {"type": "evento", "evento": "lead.activity.created"},
        "steps": [
            {"tipo": "condicao", "config": {"campo": "activity.tipo", "operador": "in", "valor": ["whatsapp", "email", "ligacao"]}},
            {"tipo": "atualizar_lead", "config": {"campo": "score", "operacao": "increment", "valor": 10}}
        ]
    }',
    'Target',
    'media',
    true
),
(
    'Atribuição Automática',
    'Distribui leads entre vendedores disponíveis',
    'leads',
    '{
        "trigger": {"type": "evento", "evento": "lead.created"},
        "steps": [
            {"tipo": "atribuir_usuario", "config": {"metodo": "round_robin", "grupo": "vendedores"}}
        ]
    }',
    'Users',
    'simples',
    true
),
(
    'Recuperação de Lead Inativo',
    'Tenta reativar leads sem contato há 7 dias',
    'leads',
    '{
        "trigger": {"type": "agendado", "cron": "0 10 * * *"},
        "steps": [
            {"tipo": "condicao", "config": {"campo": "lead.ultimo_contato", "operador": "<", "valor": "now() - 7 days"}},
            {"tipo": "enviar_whatsapp", "config": {"template": "reativacao"}}
        ]
    }',
    'RefreshCw',
    'media',
    true
)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- TRIGGERS para updated_at
-- -----------------------------------------------------------------------------
CREATE TRIGGER trigger_mt_workflows_updated_at
    BEFORE UPDATE ON mt_workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_workflow_steps_updated_at
    BEFORE UPDATE ON mt_workflow_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_workflow_conditions_updated_at
    BEFORE UPDATE ON mt_workflow_conditions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_workflow_executions_updated_at
    BEFORE UPDATE ON mt_workflow_executions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_workflow_templates_updated_at
    BEFORE UPDATE ON mt_workflow_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_workflow_schedules_updated_at
    BEFORE UPDATE ON mt_workflow_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- FIM DA MIGRATION 008
-- =============================================================================

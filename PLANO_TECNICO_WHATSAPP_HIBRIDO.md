# PLANO TÉCNICO: Sistema Híbrido WAHA + Meta Cloud API

**Data:** 15 de Fevereiro de 2026
**Versão:** 1.0
**Arquiteto:** Claude (Persona Architect)
**Status:** Planejamento

---

## ÍNDICE

1. [Estado Atual do Sistema](#1-estado-atual-do-sistema)
2. [Hierarquia Multi-Tenant (4 Níveis)](#2-hierarquia-multi-tenant-4-níveis)
3. [Arquitetura da Solução Híbrida](#3-arquitetura-da-solução-híbrida)
4. [Fase 1: Banco de Dados](#4-fase-1-banco-de-dados)
5. [Fase 2: Types e Services](#5-fase-2-types-e-services)
6. [Fase 3: Hooks Multi-Tenant](#6-fase-3-hooks-multi-tenant)
7. [Fase 4: Edge Functions](#7-fase-4-edge-functions)
8. [Fase 5: Componentes UI](#8-fase-5-componentes-ui)
9. [Fase 6: Integração com Chat Existente](#9-fase-6-integração-com-chat-existente)
10. [Fase 7: Dashboard e Relatórios](#10-fase-7-dashboard-e-relatórios)
11. [Fase 8: Testes e Validação](#11-fase-8-testes-e-validação)
12. [Cronograma e Dependências](#12-cronograma-e-dependências)
13. [Riscos e Mitigações](#13-riscos-e-mitigações)

---

## 1. ESTADO ATUAL DO SISTEMA

### 1.1 Tabelas WhatsApp Existentes (16 tabelas)

```
mt_whatsapp_sessions            → 4 sessões      (32 colunas)
mt_whatsapp_conversations       → 2 conversas    (39 colunas)
mt_whatsapp_messages            → 23 mensagens   (26 colunas)
mt_whatsapp_templates           → 0 templates
mt_whatsapp_labels              → Etiquetas
mt_whatsapp_quick_replies       → Respostas rápidas
mt_whatsapp_user_sessions       → Permissões
mt_whatsapp_conversation_labels → Associação label↔conversa
mt_whatsapp_agent_metrics       → Métricas de agente
mt_whatsapp_automations         → Automações
mt_whatsapp_bot_config          → Config chatbot
mt_whatsapp_notes               → Notas internas
mt_whatsapp_queue_users         → Usuários nas filas
mt_whatsapp_queues              → Filas de atendimento
mt_whatsapp_round_robin_state   → Estado round-robin
mt_whatsapp_transfers           → Transferências
```

### 1.2 Tabelas Meta Existentes (6 tabelas)

```
mt_meta_accounts                → Contas OAuth Facebook/Instagram
mt_meta_pages                   → Páginas conectadas
mt_meta_conversations           → Conversas Messenger/Instagram DM
mt_meta_messages                → Mensagens
mt_meta_message_queue           → Fila de envio (rate limit)
mt_meta_webhook_events          → Log de eventos webhook
```

### 1.3 Edge Functions Existentes

| Função | Provider | Status | Propósito |
|--------|----------|--------|-----------|
| `waha-proxy` | WAHA | ✅ Produção | Proxy WAHA + sync banco |
| `waha-webhook` | WAHA | ✅ Produção | Webhook eventos WAHA |
| `whatsapp-chatbot-handler` | WAHA | ✅ Produção | Chatbot IA OpenAI |
| `meta-send-message` | Meta | ✅ Deployed | Envio Graph API + rate limit |
| `meta-webhook` | Meta | ✅ Deployed | Webhook incoming + auto-lead |
| `meta-sync` | Meta | ✅ Deployed | Sync conversas paginado |
| `meta-token-refresh` | Meta | ✅ Deployed | Renovação tokens 60 dias |
| `meta-oauth-callback` | Meta | ✅ Deployed | Fluxo OAuth |

### 1.4 Hooks Existentes

**WAHA (13 hooks):**
- useWhatsAppSessionsMT, useWhatsAppConversationsMT, useWhatsAppMessagesMT
- useWhatsAppPermissionsMT, useWhatsAppLabelsMT, useWhatsAppQuickRepliesMT
- useWhatsAppTemplatesMT + 6 adapters

**Meta (4 hooks):**
- useMetaAccountsMT, useMetaPagesMT, useMetaConversationsMT, useMetaMessagesMT

**Híbrido existente (1 hook):**
- `useMessagesHybrid.ts` (472 linhas) → Fallback WAHA ↔ Database (NÃO é WAHA ↔ Meta)

### 1.5 O que NÃO EXISTE (Gap)

```
❌ Abstração de providers (WAHA vs Meta Cloud API)
❌ Gestão de janela 24h do WhatsApp Cloud API
❌ Roteamento inteligente (qual provider usar)
❌ Tracking de custos por mensagem
❌ Templates Meta para WhatsApp (diferente de Facebook Messenger)
❌ Logs de decisão de roteamento
❌ Modo coexistência (mesmo número, 2 tecnologias)
❌ Fallback automático entre providers
❌ Dashboard de custos
❌ Orçamento por tenant/franquia
```

---

## 2. HIERARQUIA MULTI-TENANT (4 NÍVEIS)

### 2.1 Estrutura de Acesso

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  NÍVEL 0: PLATFORM ADMIN                                            │
│  ├── Vê TODOS os tenants, franquias, providers e custos            │
│  ├── Configura providers globais                                    │
│  └── Define regras de roteamento padrão                             │
│                                                                     │
│  NÍVEL 1: TENANT ADMIN (Proprietário da empresa)                    │
│  ├── Vê TODAS as franquias do seu tenant                           │
│  ├── Configura providers por franquia                               │
│  ├── Define orçamento por franquia                                  │
│  ├── Vê dashboard de custos consolidado                            │
│  └── Gerencia templates Meta do tenant                              │
│                                                                     │
│  NÍVEL 2: FRANQUEADO (Dono de 1+ franquias)                        │
│  ├── Vê SUAS franquias (pode ter mais de 1)                       │
│  ├── Vê custos das suas franquias                                  │
│  ├── Configura sessões WAHA das suas franquias                     │
│  └── Envia campanhas para clientes das suas franquias              │
│                                                                     │
│  NÍVEL 3: FRANCHISE ADMIN (Gerente de unidade)                      │
│  ├── Vê apenas SUA franquia                                        │
│  ├── Vê custos da sua franquia                                     │
│  ├── Gerencia sessões WAHA da sua franquia                         │
│  ├── Envia mensagens (sistema escolhe provider)                    │
│  └── Vê indicador de janela 24h                                    │
│                                                                     │
│  NÍVEL 4: USUÁRIO (Atendente, SDR, etc.)                           │
│  ├── Vê apenas conversas atribuídas ou da sua fila                 │
│  ├── Envia mensagens (NÃO escolhe provider)                       │
│  ├── Vê indicador de janela 24h                                    │
│  └── NÃO vê custos nem configurações                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Roles do Banco (Mapeamento)

| Nível | Role no BD | Código | Acesso WhatsApp Híbrido |
|-------|-----------|--------|-------------------------|
| 0 | `platform_admin` | `platform_admin` | Config global + todos custos |
| 1 | `tenant_admin` | `tenant_admin`, `tenant_owner`, `tenant_manager` | Config tenant + orçamento |
| 2 | Franqueado | `franqueado` | Config suas franquias + campanhas |
| 3 | Admin Franquia | `franchise_admin`, `franchise_manager` | Sessões + envio |
| 4 | Usuário | `user`, `atendente`, `sdr`, `consultora_vendas` | Apenas envio/chat |

### 2.3 Isolamento de Dados por Nível

```sql
-- Cada tabela nova terá estes campos:
tenant_id     UUID NOT NULL  -- Sempre obrigatório
franchise_id  UUID           -- NULL = regra global do tenant
user_id       UUID           -- NULL = regra para todos os usuários

-- RLS Policy padrão:
-- platform_admin: vê tudo
-- tenant_admin/tenant_owner/tenant_manager: WHERE tenant_id = current_tenant_id()
-- franqueado: WHERE franchise_id IN (franquias do franqueado)
-- franchise_admin/franchise_manager: WHERE franchise_id = current_franchise_id()
-- user: WHERE franchise_id = current_franchise_id() (ou assigned)
```

---

## 3. ARQUITETURA DA SOLUÇÃO HÍBRIDA

### 3.1 Diagrama de Arquitetura

```
┌───────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                               │
│                                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │  Chat        │  │  Config      │  │  Dashboard   │                │
│  │  WhatsApp    │  │  Providers   │  │  Custos      │                │
│  │  (existente) │  │  (NOVO)      │  │  (NOVO)      │                │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                │
│         │                 │                 │                         │
│  ┌──────▼─────────────────▼─────────────────▼───────────────────┐    │
│  │                                                               │    │
│  │           useWhatsAppRouterMT (NOVO - CORAÇÃO)               │    │
│  │                                                               │    │
│  │  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌──────────┐   │    │
│  │  │ Providers│  │ Windows   │  │ Routing  │  │ Costs    │   │    │
│  │  │ MT       │  │ MT        │  │ MT       │  │ MT       │   │    │
│  │  └─────┬────┘  └─────┬─────┘  └────┬─────┘  └─────┬────┘   │    │
│  │        │             │             │              │          │    │
│  └────────┼─────────────┼─────────────┼──────────────┼──────────┘    │
│           │             │             │              │                │
└───────────┼─────────────┼─────────────┼──────────────┼────────────────┘
            │             │             │              │
┌───────────▼─────────────▼─────────────▼──────────────▼────────────────┐
│                       SUPABASE BACKEND                                 │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ NOVAS TABELAS (6)                                              │   │
│  │                                                                │   │
│  │  mt_whatsapp_providers      → Config WAHA/Meta por franquia   │   │
│  │  mt_whatsapp_windows        → Janela 24h por conversa         │   │
│  │  mt_whatsapp_routing_rules  → Regras por tenant/franquia      │   │
│  │  mt_whatsapp_meta_templates → Templates aprovados pela Meta   │   │
│  │  mt_whatsapp_costs          → Custos por período              │   │
│  │  mt_whatsapp_routing_logs   → Auditoria de decisões           │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ EDGE FUNCTIONS                                                 │   │
│  │                                                                │   │
│  │  whatsapp-router (NOVO)    → Decide provider server-side      │   │
│  │  meta-api-proxy (NOVO)     → Proxy Meta Cloud API WhatsApp    │   │
│  │  waha-proxy (EXISTENTE)    → Sem alteração                    │   │
│  │  waha-webhook (EXISTENTE)  → + Atualizar janela 24h           │   │
│  │  meta-webhook (EXISTENTE)  → + Atualizar janela 24h           │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
└──────────────┬───────────────────────────────────┬────────────────────┘
               │                                   │
       ┌───────▼───────┐                   ┌───────▼──────────┐
       │  WAHA Server  │                   │ Meta Cloud API   │
       │               │                   │ (WhatsApp)       │
       │  waha.yeslaser│                   │                  │
       │  .com.br      │                   │ graph.facebook   │
       │               │                   │ .com/v21.0/      │
       │  • Grátis     │                   │ {phone-id}/      │
       │  • Sem limite │                   │ messages         │
       │  • Coexistente│                   │                  │
       └───────────────┘                   │  • Oficial       │
                                           │  • Templates     │
                                           │  • Campanhas     │
                                           └──────────────────┘
```

### 3.2 Fluxo de Decisão do Router

```
                    MENSAGEM PARA ENVIAR
                           │
                    ┌──────▼──────┐
                    │ É campanha  │
                    │ em massa?   │
                    └──────┬──────┘
                     SIM │ │ NÃO
                   ┌─────┘ └─────┐
                   ▼             ▼
            ┌──────────┐  ┌──────────────┐
            │ META API │  │ Janela 24h   │
            │ Template │  │ aberta?      │
            │ (PAGO)   │  └──────┬───────┘
            └──────────┘   SIM │ │ NÃO
                         ┌─────┘ └─────┐
                         ▼             ▼
                  ┌──────────┐  ┌──────────────┐
                  │ META API │  │ Regra force  │
                  │ Free-form│  │ provider?    │
                  │ (GRÁTIS) │  └──────┬───────┘
                  └──────────┘   SIM │ │ NÃO
                               ┌─────┘ └──────┐
                               ▼              ▼
                        ┌──────────┐   ┌──────────┐
                        │ Provider │   │ WAHA     │
                        │ forçado  │   │ (GRÁTIS) │
                        └──────────┘   │ DEFAULT  │
                                       └──────────┘
```

### 3.3 Permissões por Nível no Fluxo

| Ação | Platform | Tenant | Franqueado | Franchise | Usuário |
|------|----------|--------|------------|-----------|---------|
| Criar provider | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ativar/desativar provider | ✅ | ✅ | ✅ (suas) | ✅ | ❌ |
| Definir regras roteamento | ✅ | ✅ | ❌ | ❌ | ❌ |
| Definir orçamento | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver custos (todos) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver custos (suas franquias) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Gerenciar templates Meta | ✅ | ✅ | ❌ | ❌ | ❌ |
| Enviar mensagem (router decide) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Forçar provider manualmente | ✅ | ✅ | ✅ | ✅ | ❌ |
| Ver indicador janela 24h | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver logs de roteamento | ✅ | ✅ | ❌ | ❌ | ❌ |
| Enviar campanha em massa | ✅ | ✅ | ✅ | ✅ | ❌ |

---

## 4. FASE 1: BANCO DE DADOS

### 4.1 Nova Tabela: `mt_whatsapp_providers`

Abstrai WAHA e Meta Cloud API como "providers" configuráveis por franquia.

```sql
CREATE TABLE IF NOT EXISTS mt_whatsapp_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),        -- NULL = provider global do tenant

  -- Identificação
  provider_type VARCHAR(20) NOT NULL CHECK (provider_type IN ('waha', 'meta_cloud_api')),
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  phone_number VARCHAR(20) NOT NULL,                      -- Número WhatsApp compartilhado

  -- Config WAHA (preenchido se provider_type = 'waha')
  waha_url TEXT,
  waha_api_key TEXT,
  waha_session_name VARCHAR(100),
  waha_session_id UUID REFERENCES mt_whatsapp_sessions(id), -- Vínculo com sessão existente

  -- Config Meta Cloud API (preenchido se provider_type = 'meta_cloud_api')
  meta_phone_number_id VARCHAR(50),
  meta_waba_id VARCHAR(50),                               -- WhatsApp Business Account ID
  meta_business_account_id VARCHAR(50),                    -- Meta Business Account ID
  meta_access_token TEXT,                                  -- Token permanente
  meta_webhook_verify_token VARCHAR(100),
  meta_api_version VARCHAR(10) DEFAULT 'v21.0',

  -- Status e saúde
  status VARCHAR(20) DEFAULT 'disconnected'
    CHECK (status IN ('connected', 'disconnected', 'error', 'suspended', 'configuring')),
  last_health_check TIMESTAMPTZ,
  health_details JSONB DEFAULT '{}',
  error_count INTEGER DEFAULT 0,
  last_error_at TIMESTAMPTZ,
  last_error_message TEXT,

  -- Coexistência
  coexistence_enabled BOOLEAN DEFAULT false,              -- Mesmo número com outro provider
  coexistence_partner_id UUID REFERENCES mt_whatsapp_providers(id), -- ID do provider parceiro

  -- Prioridade e ativação
  priority INTEGER DEFAULT 10,                            -- Menor = maior prioridade
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,                       -- Provider padrão da franquia

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES mt_users(id),
  deleted_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_mt_wa_providers_tenant ON mt_whatsapp_providers(tenant_id);
CREATE INDEX idx_mt_wa_providers_franchise ON mt_whatsapp_providers(franchise_id);
CREATE INDEX idx_mt_wa_providers_type ON mt_whatsapp_providers(provider_type);
CREATE INDEX idx_mt_wa_providers_phone ON mt_whatsapp_providers(phone_number);
CREATE INDEX idx_mt_wa_providers_active ON mt_whatsapp_providers(is_active) WHERE is_active = true;
CREATE INDEX idx_mt_wa_providers_deleted ON mt_whatsapp_providers(deleted_at) WHERE deleted_at IS NULL;

-- Constraint: apenas 1 provider default por franquia
CREATE UNIQUE INDEX idx_mt_wa_providers_default
  ON mt_whatsapp_providers(franchise_id)
  WHERE is_default = true AND deleted_at IS NULL;
```

### 4.2 Nova Tabela: `mt_whatsapp_windows`

Rastreia janela de 24h/72h por conversa para saber se Meta API é grátis.

```sql
CREATE TABLE IF NOT EXISTS mt_whatsapp_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  conversation_id UUID NOT NULL REFERENCES mt_whatsapp_conversations(id),
  provider_id UUID REFERENCES mt_whatsapp_providers(id),

  -- Janela
  last_customer_message_at TIMESTAMPTZ NOT NULL,          -- Última msg do CLIENTE
  entry_point_type VARCHAR(30) DEFAULT 'user_initiated'
    CHECK (entry_point_type IN (
      'user_initiated',         -- Cliente mandou msg (24h)
      'free_entry_point',       -- Via ads Meta (72h)
      'referral'                -- Via link compartilhado
    )),
  window_type VARCHAR(10) NOT NULL DEFAULT '24h'
    CHECK (window_type IN ('24h', '72h')),
  window_expires_at TIMESTAMPTZ NOT NULL,

  -- Metadados
  entry_point_data JSONB DEFAULT '{}',                    -- Dados do entry point (ad_id, etc.)
  messages_sent_in_window INTEGER DEFAULT 0,              -- Contagem dentro da janela

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique: 1 janela ativa por conversa
  UNIQUE(conversation_id)
);

-- Índices
CREATE INDEX idx_mt_wa_windows_tenant ON mt_whatsapp_windows(tenant_id);
CREATE INDEX idx_mt_wa_windows_franchise ON mt_whatsapp_windows(franchise_id);
CREATE INDEX idx_mt_wa_windows_conv ON mt_whatsapp_windows(conversation_id);
CREATE INDEX idx_mt_wa_windows_expires ON mt_whatsapp_windows(window_expires_at);

-- NOTA: NÃO usar coluna GENERATED ALWAYS STORED para is_open
-- Motivo: colunas STORED só recalculam em INSERT/UPDATE, não em tempo real
-- Solução: usar VIEW ou função helper
CREATE OR REPLACE FUNCTION is_window_open(p_conversation_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM mt_whatsapp_windows
    WHERE conversation_id = p_conversation_id
    AND window_expires_at > NOW()
  );
$$ LANGUAGE sql STABLE;
```

### 4.3 Nova Tabela: `mt_whatsapp_routing_rules`

Regras configuráveis por tenant/franquia para decidir qual provider usar.

```sql
CREATE TABLE IF NOT EXISTS mt_whatsapp_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),       -- NULL = regra global do tenant

  -- Identificação
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,

  -- Condição
  condition_type VARCHAR(50) NOT NULL CHECK (condition_type IN (
    'window_open',              -- Janela 24h aberta
    'window_closed',            -- Janela 24h fechada
    'message_type',             -- Tipo de mensagem (texto, mídia, template)
    'bulk_campaign',            -- Campanha em massa (>10 destinatários)
    'business_hours',           -- Dentro do horário comercial
    'outside_business_hours',   -- Fora do horário comercial
    'first_contact',            -- Primeiro contato com cliente
    'follow_up',                -- Follow-up (>24h sem resposta)
    'template_required',        -- Requer template (fora da janela)
    'always'                    -- Sempre aplicar
  )),
  condition_params JSONB DEFAULT '{}',                   -- Parâmetros extras da condição

  -- Ação
  preferred_provider VARCHAR(20) NOT NULL
    CHECK (preferred_provider IN ('waha', 'meta_cloud_api', 'cheapest', 'fastest')),
  fallback_provider VARCHAR(20)
    CHECK (fallback_provider IN ('waha', 'meta_cloud_api', NULL)),

  -- Controles
  force_provider BOOLEAN DEFAULT false,                  -- Ignora lógica automática
  alert_before_cost BOOLEAN DEFAULT true,                -- Alerta antes de msg paga
  require_confirmation BOOLEAN DEFAULT false,            -- Pede confirmação do atendente
  max_cost_per_message DECIMAL(10,4),                    -- Limite de custo por msg

  -- Prioridade
  priority INTEGER DEFAULT 100,                          -- Menor = maior prioridade
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES mt_users(id),
  deleted_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_mt_wa_routing_tenant ON mt_whatsapp_routing_rules(tenant_id);
CREATE INDEX idx_mt_wa_routing_franchise ON mt_whatsapp_routing_rules(franchise_id);
CREATE INDEX idx_mt_wa_routing_priority ON mt_whatsapp_routing_rules(priority);
CREATE INDEX idx_mt_wa_routing_active ON mt_whatsapp_routing_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_mt_wa_routing_deleted ON mt_whatsapp_routing_rules(deleted_at) WHERE deleted_at IS NULL;
```

### 4.4 Nova Tabela: `mt_whatsapp_meta_templates`

Templates aprovados pela Meta para WhatsApp Cloud API (diferente dos templates WAHA em `mt_whatsapp_templates`).

```sql
CREATE TABLE IF NOT EXISTS mt_whatsapp_meta_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  provider_id UUID NOT NULL REFERENCES mt_whatsapp_providers(id),

  -- Identificação Meta
  meta_template_id VARCHAR(100) NOT NULL,                -- ID no Meta Business Manager
  meta_template_name VARCHAR(100) NOT NULL,               -- Nome no Meta
  language VARCHAR(10) NOT NULL DEFAULT 'pt_BR',

  -- Categoria (define custo)
  category VARCHAR(30) NOT NULL CHECK (category IN (
    'UTILITY',              -- Confirmações, lembretes (~R$0,10)
    'AUTHENTICATION',       -- OTPs, verificação (~R$0,10)
    'MARKETING',            -- Promoções (~R$0,25)
    'SERVICE'               -- Dentro da janela (GRÁTIS)
  )),

  -- Conteúdo
  header_type VARCHAR(20) CHECK (header_type IN ('NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT')),
  header_text TEXT,
  header_media_url TEXT,
  body_text TEXT NOT NULL,
  body_variables TEXT[],                                  -- {{1}}, {{2}}, etc.
  footer_text VARCHAR(60),
  buttons JSONB DEFAULT '[]',                             -- Array de botões

  -- Status Meta
  approval_status VARCHAR(20) DEFAULT 'PENDING'
    CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED')),
  quality_score VARCHAR(20),                              -- GREEN, YELLOW, RED
  rejection_reason TEXT,

  -- Vínculo com template interno (opcional)
  internal_template_id UUID REFERENCES mt_whatsapp_templates(id),

  -- Custo
  estimated_cost_brl DECIMAL(10,4),                       -- Custo estimado por envio

  -- Controle
  is_active BOOLEAN DEFAULT true,
  synced_at TIMESTAMPTZ,                                  -- Última sincronização com Meta
  usage_count INTEGER DEFAULT 0,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Unique: 1 template por nome+idioma+provider
  UNIQUE(provider_id, meta_template_name, language)
);

-- Índices
CREATE INDEX idx_mt_wa_meta_tpl_tenant ON mt_whatsapp_meta_templates(tenant_id);
CREATE INDEX idx_mt_wa_meta_tpl_provider ON mt_whatsapp_meta_templates(provider_id);
CREATE INDEX idx_mt_wa_meta_tpl_category ON mt_whatsapp_meta_templates(category);
CREATE INDEX idx_mt_wa_meta_tpl_status ON mt_whatsapp_meta_templates(approval_status);
CREATE INDEX idx_mt_wa_meta_tpl_deleted ON mt_whatsapp_meta_templates(deleted_at) WHERE deleted_at IS NULL;
```

### 4.5 Nova Tabela: `mt_whatsapp_costs`

Tracking de custos por período, por tenant, por franquia.

```sql
CREATE TABLE IF NOT EXISTS mt_whatsapp_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),        -- NULL = consolidado do tenant

  -- Período
  period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Orçamento
  budget_limit DECIMAL(12,2),                             -- Limite de gastos (NULL = sem limite)
  budget_alert_threshold DECIMAL(5,2) DEFAULT 0.80,       -- % para alertar (80%)
  budget_alert_sent BOOLEAN DEFAULT false,                 -- Alerta já enviado?

  -- Contadores
  total_messages INTEGER DEFAULT 0,
  messages_waha INTEGER DEFAULT 0,                        -- Via WAHA (grátis)
  messages_meta_free INTEGER DEFAULT 0,                   -- Via Meta dentro janela (grátis)
  messages_meta_paid INTEGER DEFAULT 0,                   -- Via Meta fora janela (pago)

  -- Custos por categoria Meta
  cost_total DECIMAL(12,2) DEFAULT 0,
  cost_utility DECIMAL(12,2) DEFAULT 0,                   -- Confirmações/lembretes
  cost_authentication DECIMAL(12,2) DEFAULT 0,            -- OTPs
  cost_marketing DECIMAL(12,2) DEFAULT 0,                 -- Promoções
  cost_service DECIMAL(12,2) DEFAULT 0,                   -- Dentro janela (grátis)

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique: 1 registro por tenant+franquia+período
  UNIQUE(tenant_id, franchise_id, period_type, period_start)
);

-- Índices
CREATE INDEX idx_mt_wa_costs_tenant ON mt_whatsapp_costs(tenant_id);
CREATE INDEX idx_mt_wa_costs_franchise ON mt_whatsapp_costs(franchise_id);
CREATE INDEX idx_mt_wa_costs_period ON mt_whatsapp_costs(period_start, period_end);
```

### 4.6 Nova Tabela: `mt_whatsapp_routing_logs`

Auditoria de cada decisão de roteamento.

```sql
CREATE TABLE IF NOT EXISTS mt_whatsapp_routing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),

  -- Referências
  message_id UUID REFERENCES mt_whatsapp_messages(id),
  conversation_id UUID REFERENCES mt_whatsapp_conversations(id),
  provider_id UUID REFERENCES mt_whatsapp_providers(id),
  user_id UUID REFERENCES mt_users(id),                   -- Quem enviou

  -- Decisão
  provider_selected VARCHAR(20) NOT NULL,                 -- 'waha' ou 'meta_cloud_api'
  rule_applied_id UUID REFERENCES mt_whatsapp_routing_rules(id),
  rule_applied_name VARCHAR(100),
  decision_reason TEXT,                                   -- Explicação da decisão

  -- Contexto da janela
  window_status VARCHAR(20),                              -- 'open', 'closed', 'expired'
  window_expires_at TIMESTAMPTZ,

  -- Custos
  estimated_cost DECIMAL(10,4),
  actual_cost DECIMAL(10,4),
  cost_category VARCHAR(30),                              -- UTILITY, MARKETING, etc.

  -- Resultado
  success BOOLEAN,
  error_message TEXT,
  fallback_used BOOLEAN DEFAULT false,
  fallback_provider VARCHAR(20),
  response_time_ms INTEGER,                               -- Tempo de resposta do provider

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices (otimizados para consultas de relatório)
CREATE INDEX idx_mt_wa_rlog_tenant ON mt_whatsapp_routing_logs(tenant_id);
CREATE INDEX idx_mt_wa_rlog_franchise ON mt_whatsapp_routing_logs(franchise_id);
CREATE INDEX idx_mt_wa_rlog_provider ON mt_whatsapp_routing_logs(provider_selected);
CREATE INDEX idx_mt_wa_rlog_created ON mt_whatsapp_routing_logs(created_at DESC);
CREATE INDEX idx_mt_wa_rlog_conv ON mt_whatsapp_routing_logs(conversation_id);

-- Particionamento por data (recomendado para tabelas de log com alto volume)
-- Implementar quando volume justificar
```

### 4.7 Alterações em Tabelas Existentes

```sql
-- mt_whatsapp_sessions: vincular ao provider
ALTER TABLE mt_whatsapp_sessions
  ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES mt_whatsapp_providers(id);

-- mt_whatsapp_messages: rastrear qual provider enviou
ALTER TABLE mt_whatsapp_messages
  ADD COLUMN IF NOT EXISTS provider_used VARCHAR(20),
  ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES mt_whatsapp_providers(id),
  ADD COLUMN IF NOT EXISTS meta_message_id VARCHAR(100),  -- ID da msg na Meta API
  ADD COLUMN IF NOT EXISTS cost_brl DECIMAL(10,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_category VARCHAR(30);

-- mt_whatsapp_conversations: info da janela (cache local)
ALTER TABLE mt_whatsapp_conversations
  ADD COLUMN IF NOT EXISTS window_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS window_type VARCHAR(10),
  ADD COLUMN IF NOT EXISTS preferred_provider VARCHAR(20),
  ADD COLUMN IF NOT EXISTS last_customer_message_at TIMESTAMPTZ;
```

### 4.8 RLS Policies (Todas as 6 Tabelas)

```sql
-- === RLS para mt_whatsapp_providers ===
ALTER TABLE mt_whatsapp_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_wa_providers_select" ON mt_whatsapp_providers FOR SELECT USING (
  is_platform_admin() OR
  (tenant_id = current_tenant_id() AND (
    is_tenant_admin() OR
    franchise_id IS NULL OR
    franchise_id = current_franchise_id() OR
    can_access_franchise(franchise_id)
  ))
);

CREATE POLICY "mt_wa_providers_insert" ON mt_whatsapp_providers FOR INSERT WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_wa_providers_update" ON mt_whatsapp_providers FOR UPDATE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);

CREATE POLICY "mt_wa_providers_delete" ON mt_whatsapp_providers FOR DELETE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- === RLS para mt_whatsapp_windows ===
ALTER TABLE mt_whatsapp_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_wa_windows_select" ON mt_whatsapp_windows FOR SELECT USING (
  is_platform_admin() OR
  (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_wa_windows_insert" ON mt_whatsapp_windows FOR INSERT WITH CHECK (
  is_platform_admin() OR
  (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_wa_windows_update" ON mt_whatsapp_windows FOR UPDATE USING (
  is_platform_admin() OR
  (tenant_id = current_tenant_id())
);

-- === RLS para mt_whatsapp_routing_rules ===
ALTER TABLE mt_whatsapp_routing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_wa_routing_select" ON mt_whatsapp_routing_rules FOR SELECT USING (
  is_platform_admin() OR
  (tenant_id = current_tenant_id() AND (
    is_tenant_admin() OR
    franchise_id IS NULL OR
    franchise_id = current_franchise_id()
  ))
);

CREATE POLICY "mt_wa_routing_insert" ON mt_whatsapp_routing_rules FOR INSERT WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_wa_routing_update" ON mt_whatsapp_routing_rules FOR UPDATE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_wa_routing_delete" ON mt_whatsapp_routing_rules FOR DELETE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- === RLS para mt_whatsapp_meta_templates ===
ALTER TABLE mt_whatsapp_meta_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_wa_meta_tpl_select" ON mt_whatsapp_meta_templates FOR SELECT USING (
  is_platform_admin() OR
  (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_wa_meta_tpl_insert" ON mt_whatsapp_meta_templates FOR INSERT WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_wa_meta_tpl_update" ON mt_whatsapp_meta_templates FOR UPDATE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- === RLS para mt_whatsapp_costs ===
ALTER TABLE mt_whatsapp_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_wa_costs_select" ON mt_whatsapp_costs FOR SELECT USING (
  is_platform_admin() OR
  (tenant_id = current_tenant_id() AND (
    is_tenant_admin() OR
    franchise_id = current_franchise_id() OR
    can_access_franchise(franchise_id)
  ))
);

-- Apenas sistema insere/atualiza custos (via edge function)
CREATE POLICY "mt_wa_costs_system" ON mt_whatsapp_costs FOR ALL USING (
  is_platform_admin()
);

-- === RLS para mt_whatsapp_routing_logs ===
ALTER TABLE mt_whatsapp_routing_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_wa_rlog_select" ON mt_whatsapp_routing_logs FOR SELECT USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- Apenas sistema insere logs (via edge function)
CREATE POLICY "mt_wa_rlog_system" ON mt_whatsapp_routing_logs FOR INSERT WITH CHECK (
  is_platform_admin()
);
```

### 4.9 Regras de Roteamento Padrão (Seed)

```sql
-- Regra 1: Janela aberta → Meta Cloud API (grátis)
INSERT INTO mt_whatsapp_routing_rules (tenant_id, nome, descricao, condition_type, preferred_provider, fallback_provider, priority)
SELECT t.id,
  'Janela aberta → Meta API',
  'Quando cliente enviou msg nas últimas 24h, responder via Meta Cloud API (grátis)',
  'window_open',
  'meta_cloud_api',
  'waha',
  10
FROM mt_tenants t WHERE t.is_active = true;

-- Regra 2: Janela fechada → WAHA (grátis)
INSERT INTO mt_whatsapp_routing_rules (tenant_id, nome, descricao, condition_type, preferred_provider, fallback_provider, priority)
SELECT t.id,
  'Janela fechada → WAHA',
  'Quando janela 24h expirou, enviar via WAHA (grátis, sem limite)',
  'window_closed',
  'waha',
  'meta_cloud_api',
  20
FROM mt_tenants t WHERE t.is_active = true;

-- Regra 3: Campanha em massa → Meta API + Template
INSERT INTO mt_whatsapp_routing_rules (tenant_id, nome, descricao, condition_type, preferred_provider, alert_before_cost, require_confirmation, priority)
SELECT t.id,
  'Campanha em massa → Meta API',
  'Disparos para >10 destinatários devem usar Meta Cloud API com template aprovado',
  'bulk_campaign',
  'meta_cloud_api',
  true,
  true,
  5
FROM mt_tenants t WHERE t.is_active = true;

-- Regra 4: Fallback geral → WAHA
INSERT INTO mt_whatsapp_routing_rules (tenant_id, nome, descricao, condition_type, preferred_provider, priority)
SELECT t.id,
  'Fallback geral → WAHA',
  'Se nenhuma regra se aplicar, usar WAHA como padrão',
  'always',
  'waha',
  999
FROM mt_tenants t WHERE t.is_active = true;
```

### Estimativa Fase 1: **5-7h**

---

## 5. FASE 2: TYPES E SERVICES

### 5.1 Arquivo: `src/types/whatsapp-hybrid.ts`

```typescript
// === PROVIDER ===
export type ProviderType = 'waha' | 'meta_cloud_api';
export type ProviderStatus = 'connected' | 'disconnected' | 'error' | 'suspended' | 'configuring';

export interface WhatsAppProvider {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  provider_type: ProviderType;
  nome: string;
  descricao?: string;
  phone_number: string;

  // WAHA
  waha_url?: string;
  waha_api_key?: string;
  waha_session_name?: string;
  waha_session_id?: string;

  // Meta Cloud API
  meta_phone_number_id?: string;
  meta_waba_id?: string;
  meta_business_account_id?: string;
  meta_access_token?: string;
  meta_api_version?: string;

  // Status
  status: ProviderStatus;
  last_health_check?: string;
  health_details?: Record<string, any>;
  error_count: number;

  // Coexistência
  coexistence_enabled: boolean;
  coexistence_partner_id?: string;

  priority: number;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;

  // Joins
  tenant?: { slug: string; nome_fantasia: string };
  franchise?: { nome: string; cidade: string };
  partner?: WhatsAppProvider;
}

// === WINDOW ===
export type WindowType = '24h' | '72h';
export type EntryPointType = 'user_initiated' | 'free_entry_point' | 'referral';

export interface WhatsAppWindow {
  id: string;
  tenant_id: string;
  franchise_id?: string;
  conversation_id: string;
  provider_id?: string;
  last_customer_message_at: string;
  entry_point_type: EntryPointType;
  window_type: WindowType;
  window_expires_at: string;
  messages_sent_in_window: number;
  created_at: string;
  updated_at: string;

  // Computed (frontend)
  is_open: boolean;
  time_remaining_ms: number;
  time_remaining_text: string;
}

// === ROUTING RULE ===
export type ConditionType =
  | 'window_open' | 'window_closed'
  | 'message_type' | 'bulk_campaign'
  | 'business_hours' | 'outside_business_hours'
  | 'first_contact' | 'follow_up'
  | 'template_required' | 'always';

export type ProviderPreference = 'waha' | 'meta_cloud_api' | 'cheapest' | 'fastest';

export interface WhatsAppRoutingRule {
  id: string;
  tenant_id: string;
  franchise_id?: string;
  nome: string;
  descricao?: string;
  condition_type: ConditionType;
  condition_params: Record<string, any>;
  preferred_provider: ProviderPreference;
  fallback_provider?: ProviderType;
  force_provider: boolean;
  alert_before_cost: boolean;
  require_confirmation: boolean;
  max_cost_per_message?: number;
  priority: number;
  is_active: boolean;
  created_at: string;
  deleted_at?: string;
}

// === META TEMPLATE ===
export type TemplateCategory = 'UTILITY' | 'AUTHENTICATION' | 'MARKETING' | 'SERVICE';
export type TemplateApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'DISABLED';

export interface WhatsAppMetaTemplate {
  id: string;
  tenant_id: string;
  provider_id: string;
  meta_template_id: string;
  meta_template_name: string;
  language: string;
  category: TemplateCategory;
  header_type?: string;
  header_text?: string;
  body_text: string;
  body_variables?: string[];
  footer_text?: string;
  buttons?: any[];
  approval_status: TemplateApprovalStatus;
  quality_score?: string;
  estimated_cost_brl?: number;
  is_active: boolean;
  synced_at?: string;
  usage_count: number;
  created_at: string;
  deleted_at?: string;
}

// === COST ===
export interface WhatsAppCost {
  id: string;
  tenant_id: string;
  franchise_id?: string;
  period_type: 'daily' | 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  budget_limit?: number;
  budget_alert_threshold: number;
  budget_alert_sent: boolean;
  total_messages: number;
  messages_waha: number;
  messages_meta_free: number;
  messages_meta_paid: number;
  cost_total: number;
  cost_utility: number;
  cost_authentication: number;
  cost_marketing: number;
  cost_service: number;
  created_at: string;
  updated_at: string;
}

// === ROUTING LOG ===
export interface WhatsAppRoutingLog {
  id: string;
  tenant_id: string;
  franchise_id?: string;
  message_id?: string;
  conversation_id?: string;
  provider_id?: string;
  user_id?: string;
  provider_selected: ProviderType;
  rule_applied_id?: string;
  rule_applied_name?: string;
  decision_reason?: string;
  window_status?: string;
  window_expires_at?: string;
  estimated_cost: number;
  actual_cost?: number;
  cost_category?: string;
  success?: boolean;
  error_message?: string;
  fallback_used: boolean;
  fallback_provider?: string;
  response_time_ms?: number;
  created_at: string;
}

// === ROUTING DECISION (Frontend Only) ===
export interface RoutingDecision {
  provider: ProviderType;
  provider_id: string;
  reason: string;
  rule_applied?: WhatsAppRoutingRule;
  window_open: boolean;
  window_expires_at?: string;
  estimated_cost: number;
  cost_category?: TemplateCategory;
  is_free: boolean;
  requires_template: boolean;
  requires_confirmation: boolean;
  fallback_available: boolean;
}

// === COST ESTIMATE (Frontend Only) ===
export interface CostEstimate {
  provider: ProviderType;
  category: TemplateCategory;
  cost_brl: number;
  is_free: boolean;
  reason: string;
}

// === COST REFERENCE TABLE (Brasil) ===
export const META_COST_TABLE_BRL: Record<TemplateCategory, number> = {
  UTILITY: 0.10,
  AUTHENTICATION: 0.10,
  MARKETING: 0.25,
  SERVICE: 0.00,     // Dentro da janela 24h
};
```

### 5.2 Arquivo: `src/services/meta-cloud-api.ts`

Service para comunicação com Meta Cloud API (WhatsApp Business).

```
Métodos principais:
├── sendTextMessage(phoneNumberId, token, to, text)
├── sendTemplateMessage(phoneNumberId, token, to, templateName, params)
├── sendMediaMessage(phoneNumberId, token, to, type, mediaUrl)
├── getTemplates(wabaId, token)
├── getTemplateById(wabaId, token, templateId)
├── getMessageStatus(phoneNumberId, token, messageId)
├── getBusinessProfile(phoneNumberId, token)
├── checkHealth(phoneNumberId, token) → boolean
├── estimateCost(category, quantity) → CostEstimate
└── validatePhoneNumber(phoneNumberId, token, phone) → boolean
```

### Estimativa Fase 2: **4-5h**

---

## 6. FASE 3: HOOKS MULTI-TENANT

### 6.1 Hooks a Criar

```
src/hooks/multitenant/
├── useWhatsAppProvidersMT.ts      → CRUD providers + health check
├── useWhatsAppWindowsMT.ts        → Consultar/atualizar janelas
├── useWhatsAppRoutingRulesMT.ts   → CRUD regras de roteamento
├── useWhatsAppMetaTemplatesMT.ts  → CRUD templates + sync com Meta
├── useWhatsAppCostsMT.ts          → Dashboard de custos + orçamento
├── useWhatsAppRoutingLogsMT.ts    → Consulta logs de decisão
└── useWhatsAppRouterMT.ts         → DECISOR INTELIGENTE (coração)
```

### 6.2 Hook Principal: `useWhatsAppRouterMT`

```typescript
// Interface do hook
function useWhatsAppRouterMT(conversationId: string) {
  return {
    // Decisão de roteamento
    decision: RoutingDecision | null,     // Resultado da análise
    isCalculating: boolean,

    // Estado da janela
    window: WhatsAppWindow | null,
    isWindowOpen: boolean,
    windowExpiresIn: string,              // "2h 15min"

    // Providers disponíveis
    providers: WhatsAppProvider[],
    activeProvider: WhatsAppProvider | null,

    // Ações
    getDecision: (messageType) => RoutingDecision,
    sendMessage: (text, options?) => Promise<void>,   // Envia pelo provider decidido
    sendTemplate: (templateId, params) => Promise<void>,
    forceProvider: (providerType) => void,            // Override manual

    // Custos
    estimateCost: (category) => CostEstimate,
    monthlyUsage: WhatsAppCost | null,
  };
}
```

### 6.3 Acesso por Nível nos Hooks

```typescript
// Todos os hooks seguem este padrão:
function useWhatsAppProvidersMT() {
  const { tenant, franchise, accessLevel } = useTenantContext();

  // Platform Admin → vê todos os providers
  // Tenant Admin → vê providers do seu tenant
  // Franqueado → vê providers das suas franquias
  // Franchise Admin → vê providers da sua franquia
  // User → vê apenas provider ativo (não configura)

  const query = useQuery({
    queryKey: ['mt-wa-providers', tenant?.id, franchise?.id, accessLevel],
    queryFn: async () => {
      let q = supabase.from('mt_whatsapp_providers')
        .select('*, tenant:mt_tenants(slug, nome_fantasia), franchise:mt_franchises(nome, cidade)')
        .is('deleted_at', null);

      // RLS cuida do filtro, mas filtro explícito melhora performance
      if (accessLevel === 'tenant') {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise') {
        q = q.eq('franchise_id', franchise.id);
      }

      return q.order('priority');
    },
    enabled: !!tenant || accessLevel === 'platform',
  });

  // Mutations: create, update, delete (com tenant_id obrigatório)
  // ...
}
```

### Estimativa Fase 3: **14-18h**

---

## 7. FASE 4: EDGE FUNCTIONS

### 7.1 Nova: `whatsapp-router` (Decisor Server-Side)

```
POST /functions/v1/whatsapp-router

Body: {
  action: 'decide' | 'send' | 'send-template' | 'send-bulk',
  tenant_id: string,
  franchise_id: string,
  conversation_id?: string,
  recipient_phone?: string,
  message_type?: 'text' | 'image' | 'video' | 'document' | 'audio' | 'template',
  text?: string,
  template_name?: string,
  template_params?: Record<string, string>,
  force_provider?: 'waha' | 'meta_cloud_api',
  bulk_recipients?: string[],  // Para campanhas
}

Response: {
  success: boolean,
  provider_used: 'waha' | 'meta_cloud_api',
  message_id?: string,
  cost_brl: number,
  decision: {
    reason: string,
    rule_applied: string,
    window_open: boolean,
    fallback_used: boolean,
  }
}
```

**Lógica interna:**
1. Consultar providers ativos da franquia
2. Verificar janela 24h da conversa
3. Aplicar regras de roteamento (por prioridade)
4. Enviar via provider escolhido
5. Se falhar → tentar fallback
6. Registrar no routing_logs
7. Atualizar custos

### 7.2 Nova: `meta-api-proxy` (Proxy WhatsApp Cloud API)

```
POST /functions/v1/meta-api-proxy

Diferente do meta-send-message existente (que é para Facebook Messenger/Instagram).
Este é específico para WhatsApp Cloud API.

Endpoints:
├── POST /send-text → graph.facebook.com/v21.0/{phone-id}/messages
├── POST /send-template → (com template components)
├── POST /send-media → (com media upload)
├── GET  /templates → Listar templates aprovados
├── GET  /health → Verificar status do número
└── POST /register → Registrar webhook
```

### 7.3 Alteração: `waha-webhook` (Atualizar Janela)

```diff
+ // Quando receber mensagem do CLIENTE (não from_me):
+ // 1. Atualizar ou criar registro em mt_whatsapp_windows
+ // 2. window_expires_at = NOW() + interval '24 hours'
+ // 3. Atualizar mt_whatsapp_conversations.last_customer_message_at
```

### 7.4 Alteração: `meta-webhook` (Suportar WhatsApp Cloud API)

O `meta-webhook` existente já trata Facebook Messenger e Instagram. Precisa ser estendido para:
- Reconhecer eventos do WhatsApp Cloud API (formato diferente do Messenger)
- Atualizar janela 24h quando receber mensagem de cliente
- Diferenciar plataforma: `whatsapp` vs `messenger` vs `instagram`

### Estimativa Fase 4: **10-14h**

---

## 8. FASE 5: COMPONENTES UI

### 8.1 Componentes de Provider

```
src/components/whatsapp/providers/
├── ProviderList.tsx          → Lista de providers com status
├── ProviderCard.tsx          → Card com info + toggle + health
├── ProviderConfigForm.tsx    → Formulário config WAHA ou Meta
├── ProviderStatusBadge.tsx   → Badge connected/disconnected/error
├── ProviderToggle.tsx        → Switch ativar/desativar
└── CoexistenceSetup.tsx      → Wizard para configurar coexistência
```

**Permissões nos componentes:**
- `ProviderConfigForm` → Só `tenant_admin` ou `platform_admin`
- `ProviderToggle` → `tenant_admin`, `franqueado` (suas), `franchise_admin`
- `ProviderList` → Todos (filtrado por nível)
- `ProviderStatusBadge` → Todos

### 8.2 Componentes de Janela 24h

```
src/components/whatsapp/window/
├── WindowIndicator.tsx       → Indicador inline no chat (🟢 Aberta / 🔴 Fechada)
├── WindowCountdown.tsx       → Timer regressivo "Expira em 2h 15min"
└── WindowStatusBadge.tsx     → Badge para lista de conversas
```

**Permissões:** Todos os níveis veem (é informativo).

### 8.3 Componentes de Roteamento

```
src/components/whatsapp/routing/
├── RoutingRulesList.tsx      → Lista de regras com prioridade (drag & drop)
├── RoutingRuleForm.tsx       → Criar/editar regra
├── RoutingDecisionAlert.tsx  → Alerta "Esta msg será enviada via Meta (R$0,25)"
└── ProviderSwitchButton.tsx  → Botão para forçar provider no chat
```

**Permissões:**
- `RoutingRulesList/Form` → Só `tenant_admin` ou `platform_admin`
- `RoutingDecisionAlert` → Todos (informativo)
- `ProviderSwitchButton` → `tenant_admin`, `franqueado`, `franchise_admin`

### 8.4 Componentes de Custos

```
src/components/whatsapp/costs/
├── CostDashboard.tsx         → Dashboard com gráficos por período
├── CostByFranchise.tsx       → Tabela de custos por franquia
├── CostEstimator.tsx         → "Esta campanha custará ~R$125"
├── BudgetConfig.tsx          → Configurar orçamento por franquia
└── BudgetAlert.tsx           → Alerta "80% do orçamento utilizado"
```

**Permissões:**
- `CostDashboard` → `platform_admin`, `tenant_admin`
- `CostByFranchise` → `tenant_admin` (todas), `franqueado` (suas)
- `BudgetConfig` → `tenant_admin`, `platform_admin`
- `BudgetAlert` → `tenant_admin`, `franqueado`, `franchise_admin`
- `CostEstimator` → Todos (antes de enviar campanha)

### 8.5 Componentes de Templates Meta

```
src/components/whatsapp/meta-templates/
├── MetaTemplateList.tsx      → Lista com status (aprovado/pendente/rejeitado)
├── MetaTemplateForm.tsx      → Criar template (preview em tempo real)
├── MetaTemplatePreview.tsx   → Preview visual do template
└── MetaTemplateSync.tsx      → Botão sincronizar com Meta
```

**Permissões:**
- Todos → Só `tenant_admin` ou `platform_admin`

### Estimativa Fase 5: **16-20h**

---

## 9. FASE 6: INTEGRAÇÃO COM CHAT EXISTENTE

### 9.1 Alterações no Chat WhatsApp

```
Arquivo: src/pages/WhatsAppChat.tsx

Adicionar:
1. WindowIndicator no header da conversa
2. ProviderSwitchButton no header (admin)
3. RoutingDecisionAlert antes do input de mensagem
4. CostEstimate no envio de template
5. Badge de provider usado em cada mensagem enviada
```

### 9.2 Alterações no Input de Mensagem

```
Arquivo: src/components/whatsapp/chat/ChatInput.tsx

Adicionar:
1. Verificar decisão de roteamento antes de enviar
2. Se custo > 0: mostrar alerta com valor
3. Se require_confirmation: pedir confirmação
4. Se template_required: forçar seleção de template
5. Badge mostrando "Via WAHA" ou "Via Meta API"
```

### 9.3 Alterações na Lista de Conversas

```
Arquivo: src/components/whatsapp/chat/ChatSidebar.tsx

Adicionar:
1. WindowStatusBadge em cada conversa
2. Indicador de provider preferido
3. Ícone se conversa está na janela 24h
```

### Estimativa Fase 6: **8-12h**

---

## 10. FASE 7: DASHBOARD E RELATÓRIOS

### 10.1 Página: Config WhatsApp Providers

```
Rota: /configuracoes/whatsapp-providers
Arquivo: src/pages/configuracoes/WhatsAppProviders.tsx

Conteúdo:
- Lista de providers por franquia
- Formulário de configuração
- Status de saúde
- Wizard de coexistência
- Toggle ativar/desativar
```

### 10.2 Página: Config Roteamento

```
Rota: /configuracoes/whatsapp-routing
Arquivo: src/pages/configuracoes/WhatsAppRouting.tsx

Conteúdo:
- Lista de regras ordenada por prioridade
- Drag & drop para reordenar
- Criar/editar regras
- Simulador de decisão ("Se eu enviar agora, qual provider seria usado?")
```

### 10.3 Página: Dashboard de Custos

```
Rota: /whatsapp/custos
Arquivo: src/pages/WhatsAppCustos.tsx

Conteúdo:
- Gráfico de custos por dia/semana/mês
- Tabela por franquia
- Comparativo WAHA vs Meta
- Previsão de gastos
- Config de orçamento
```

### 10.4 Página: Templates Meta WhatsApp

```
Rota: /whatsapp/meta-templates
Arquivo: src/pages/WhatsAppMetaTemplates.tsx

Conteúdo:
- Lista de templates com status
- Criar novo template (com preview)
- Sincronizar com Meta
- Métricas de uso
```

### 10.5 Página: Logs de Roteamento

```
Rota: /whatsapp/routing-logs
Arquivo: src/pages/WhatsAppRoutingLogs.tsx

Conteúdo:
- Tabela filtável com todas as decisões
- Filtros: período, provider, franquia, regra
- Detalhes de cada decisão
```

### Estimativa Fase 7: **12-16h**

---

## 11. FASE 8: TESTES E VALIDAÇÃO

### 11.1 Testes por Cenário

| # | Cenário | Resultado Esperado |
|---|---------|-------------------|
| 1 | Cliente envia msg → responder em < 24h | Meta API (grátis) |
| 2 | Cliente envia msg → responder em > 24h | WAHA (grátis) |
| 3 | Enviar msg proativa (sem msg do cliente) | WAHA (grátis) |
| 4 | Campanha para 500 clientes | Meta API + Template (pago) |
| 5 | WAHA cai → enviar msg | Fallback Meta API |
| 6 | Meta API cai → enviar msg | Fallback WAHA |
| 7 | Orçamento atingiu 80% | Alerta para tenant_admin |
| 8 | Orçamento esgotado | Bloquear Meta API pago, usar WAHA |
| 9 | Atendente força provider | Override funciona |
| 10 | Platform admin vê custos | Todos os tenants |
| 11 | Tenant admin vê custos | Apenas seu tenant |
| 12 | Franqueado vê custos | Apenas suas franquias |
| 13 | Usuário envia msg | Não vê custo, router decide |
| 14 | Template rejeitado pela Meta | Status atualizado, não aparece para envio |

### 11.2 Testes de Segurança (RLS)

| # | Teste | Resultado |
|---|-------|-----------|
| 1 | Tenant A tenta ver providers do Tenant B | Bloqueado |
| 2 | Franchise admin tenta criar provider | Bloqueado |
| 3 | Usuário tenta ver routing logs | Bloqueado |
| 4 | Usuário tenta alterar regras | Bloqueado |
| 5 | Franqueado tenta ver franquias que não são suas | Bloqueado |

### Estimativa Fase 8: **6-8h**

---

## 12. CRONOGRAMA E DEPENDÊNCIAS

### 12.1 Diagrama de Dependências

```
FASE 1 (Banco)                    FASE 2 (Types + Service)
   │                                  │
   ├──────────────────────────────────┤
   │                                  │
   ▼                                  ▼
FASE 3 (Hooks MT) ◄────────────── FASE 2
   │
   ├──────────────────────┐
   ▼                      ▼
FASE 4 (Edge Functions)  FASE 5 (Componentes UI)
   │                      │
   ├──────────────────────┤
   ▼                      ▼
FASE 6 (Integração Chat)
   │
   ▼
FASE 7 (Dashboard)
   │
   ▼
FASE 8 (Testes)
```

### 12.2 Estimativa Total

| Fase | Descrição | Estimativa | Dependência |
|------|-----------|------------|-------------|
| **1** | Banco de dados (6 tabelas + ALTER + RLS + seed) | 5-7h | Nenhuma |
| **2** | Types TypeScript + Meta Cloud API Service | 4-5h | Nenhuma |
| **3** | 7 Hooks Multi-Tenant | 14-18h | Fase 1 + 2 |
| **4** | Edge Functions (2 novas + 2 alterações) | 10-14h | Fase 1 + 2 |
| **5** | ~15 Componentes UI | 16-20h | Fase 3 |
| **6** | Integração com chat existente | 8-12h | Fase 3 + 4 + 5 |
| **7** | Dashboard e relatórios (5 páginas) | 12-16h | Fase 3 + 5 |
| **8** | Testes e validação | 6-8h | Todas |
| | **TOTAL** | **75-100h** | |

### 12.3 Paralelização Possível

```
SEMANA 1-2: Fase 1 + 2 (em paralelo)          → 7h
SEMANA 2-3: Fase 3 + 4 (em paralelo parcial)  → 18h
SEMANA 3-4: Fase 5 + 6                        → 28h
SEMANA 4-5: Fase 7                             → 16h
SEMANA 5:   Fase 8                             → 8h
                                      TOTAL:    ~77h
```

---

## 13. RISCOS E MITIGAÇÕES

### 13.1 Riscos Técnicos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Meta Cloud API requer aprovação de templates (3-6 semanas) | Alta | Alto | Iniciar registro de templates na Fase 1, paralelo ao desenvolvimento |
| WAHA em modo coexistente pode ter limitações desconhecidas | Média | Alto | Testar modo coexistente em sandbox antes de produção |
| Janela 24h depende de precisão no timestamp do webhook | Média | Médio | Usar timestamp do servidor Meta, não local |
| Volume alto de routing_logs pode impactar performance | Baixa | Médio | Índices otimizados + retention policy (90 dias) |
| Meta Cloud API tem rate limit por número | Baixa | Médio | Implementar fila de envio com exponential backoff |

### 13.2 Riscos de Negócio

| Risco | Mitigação |
|-------|-----------|
| Custo Meta API maior que esperado | Budget por franquia + alertas automáticos |
| Usuários confusos com 2 providers | UI transparente - router decide automaticamente |
| Franqueado desativa Meta por custo | WAHA como fallback - nunca fica sem comunicação |

### 13.3 Pré-Requisitos

| Requisito | Status | Ação |
|-----------|--------|------|
| Conta Meta Business verificada | ✅ Tem | - |
| WhatsApp Business API aprovado | ✅ Tem | - |
| Phone Number ID | ✅ Tem | Confirmar qual número |
| Access Token permanente | ⚠️ Verificar | Gerar System User Token |
| WAHA em modo coexistente | ❌ Configurar | Ajustar config no servidor WAHA |
| Templates aprovados pela Meta | ❌ Criar | Registrar templates básicos (boas-vindas, confirmação, lembrete) |

---

## RESUMO EXECUTIVO

### O que será construído:

```
📦 BANCO DE DADOS
   6 novas tabelas + 3 ALTER TABLE + RLS + regras padrão

📝 TIPOS
   1 arquivo com 12 interfaces/types + constantes de custo

🔌 SERVICE
   1 novo service (Meta Cloud API WhatsApp)

🪝 HOOKS
   7 novos hooks multi-tenant (com 4 níveis de acesso)

⚡ EDGE FUNCTIONS
   2 novas + 2 alterações

🎨 COMPONENTES UI
   ~15 novos componentes em 5 categorias

📄 PÁGINAS
   5 novas páginas

🔗 INTEGRAÇÕES
   Alterações no chat, input, sidebar existentes

📊 TOTAL: ~75-100h de desenvolvimento
```

### Princípio de Design:

> **O usuário NUNCA precisa pensar em providers.**
> O sistema decide automaticamente, mostra indicadores visuais,
> e só pede confirmação quando vai custar dinheiro.
> Admins configuram regras; atendentes apenas conversam.

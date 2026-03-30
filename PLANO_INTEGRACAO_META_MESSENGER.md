# 📱 Integração Meta Messenger & Instagram Direct - Multi-Tenant

## 📋 Resumo Executivo

### 🎯 Objetivo

Integrar conversas do **Facebook Messenger** e **Instagram Direct** no painel YESlaser, permitindo que cada franquia conecte suas próprias páginas usando **autenticação OAuth** (Login com Facebook).

### ✨ Principais Funcionalidades

1. **OAuth com Facebook** - Conexão com 1 clique (sem copiar tokens)
2. **Conversas Unificadas** - Facebook + Instagram em um só lugar
3. **Envio de Mensagens** - Texto + mídia (imagem, vídeo, arquivo)
4. **Webhook Real-Time** - Mensagens chegam instantaneamente
5. **Multi-Tenant Completo** - Isolamento por tenant/franquia via RLS
6. **🆕 Criação Automática de Leads** - Ao receber primeira mensagem
7. **🆕 Vinculação Lead ↔ Conversa** - Bidirectional
8. **🆕 Canal de Origem** - Rastreamento (facebook_messenger, instagram_direct)
9. **🆕 Módulo Ativável** - Pode ser ligado/desligado por tenant

### 📊 Números do Projeto

| Métrica | Valor |
|---------|-------|
| **Tabelas MT** | 5 novas (mt_meta_*) |
| **Edge Functions** | 4 funções |
| **Hooks MT** | 4 hooks |
| **Páginas** | 3 páginas |
| **Tempo Estimado** | 36 horas (4-5 dias úteis) |
| **Complexidade** | Alta |
| **Benefício** | Alto (2 canais unificados) |

### 🔑 Diferencial Competitivo

**Por que OAuth é melhor que API Keys manuais?**

| Aspecto | OAuth (Nossa Solução) | API Keys Manual |
|---------|----------------------|-----------------|
| **UX** | ⭐⭐⭐⭐⭐ 1 clique | ⭐⭐ Copiar/colar tokens |
| **Segurança** | ⭐⭐⭐⭐⭐ Gerenciado pelo Meta | ⭐⭐⭐ Risco de vazamento |
| **Manutenção** | ⭐⭐⭐⭐⭐ Renovação automática (60 dias) | ⭐⭐ Renovar manualmente |
| **Múltiplas Páginas** | ✅ Sim | ❌ Não |
| **Aprovação Meta** | Necessária (produção) | Desnecessária |

### 🚀 Roadmap de Implementação

```
Fase 1: Banco de Dados (5h)
├── Criar 5 tabelas MT
├── Registrar módulo 'meta_messenger'
└── Adicionar colunas em mt_leads (canal_origem, meta_conversation_id)

Fase 2: Configuração Meta (2h)
├── Criar app no Meta for Developers
├── Configurar OAuth
└── Configurar Webhook

Fase 3: Edge Functions (11h)
├── meta-oauth-callback (OAuth)
├── meta-webhook (Real-time)
├── meta-send-message (Enviar)
├── meta-sync (Sincronizar)
└── Criação automática de Leads (NOVO)

Fase 4: Frontend (12h)
├── 4 Hooks MT
├── 3 Páginas
├── Componentes
└── Integração com Leads (NOVO)

Fase 5: Testes (5h)
├── OAuth
├── Webhook
├── Auto-criação de Leads
├── Envio/Recebimento
└── Módulo ativável

TOTAL: 36 horas
```

### 🎁 Bônus: Criação Automática de Leads

**Fluxo Completo**:
```
1. Cliente envia mensagem no Facebook/Instagram
   ↓
2. Sistema recebe via Webhook
   ↓
3. Verifica se lead já existe (por PSID ou nome)
   ↓
4. Se NÃO existir:
   ├── Cria lead automaticamente
   ├── Define canal_origem (facebook_messenger ou instagram_direct)
   ├── Vincula conversa ↔ lead
   └── Registra atividade no histórico
   ↓
5. Salva mensagem e exibe no chat
```

**Matching Inteligente**:
- 🔍 Busca por PSID (100% confiança)
- 🔍 Busca por nome similar (fuzzy matching > 80%)
- 🔍 Evita duplicatas

### 🚨 RISCOS CRÍTICOS IDENTIFICADOS (ANÁLISE PROFUNDA)

> ⚠️ **ATENÇÃO**: Análise arquitetural profunda identificou **6 riscos críticos** que impactam significativamente o cronograma e a viabilidade da integração. Veja detalhes completos em `/Users/danilo/.claude/plans/cheeky-crafting-treehouse.md`

| # | Risco | Severidade | Impacto | Tempo Adicional |
|---|-------|------------|---------|-----------------|
| 1 | **Aprovação Meta pode levar 3-6 SEMANAS** | 🔴 CRÍTICO | Bloqueio total em produção | +3-6 semanas |
| 2 | **Rate Limiting agressivo (200 msgs/h)** | 🔴 CRÍTICO | Bloqueio de envios | +6h (queue system) |
| 3 | **Tokens expiram em 60 dias** | 🟠 ALTO | Perda de conexão | +4h (auto-refresh) |
| 4 | **Webhook pode receber duplicatas** | 🟠 ALTO | Leads/msgs duplicadas | +3h (idempotência) |
| 5 | **Fuzzy matching muito amplo** | 🟠 ALTO | Falsos positivos | +2h (pg_trgm) |
| 6 | **Sem criptografia de tokens** | 🟡 MÉDIO | Vazamento de tokens | +3h (Vault) |

**⏱️ ESTIMATIVA REVISADA**:
- Desenvolvimento: 36h → **49h** (com melhorias críticas) → **67h** (versão completa)
- Aprovação Meta: **3-6 semanas** (NÃO controlável)
- Timeline Realista: **9-10 dias úteis + 3-6 semanas de aprovação**

**📋 AÇÃO IMEDIATA OBRIGATÓRIA**:
1. ✅ **Criar app no Meta for Developers** (1h)
2. ✅ **Submeter para App Review** (4-8h documentação) → **AGUARDAR 3-6 semanas**
3. ✅ Desenvolver em paralelo usando "Development Mode" (limite: 25 testadores)

**Alternativa para Produção Rápida**:
- Iniciar com Development Mode (até 25 usuários)
- Deploy gradual: 1 franquia piloto
- Submeter App Review em paralelo
- Migrar para Production após aprovação

---

### ✅ Checklist Rápido

#### Pré-Desenvolvimento (OBRIGATÓRIO)
- [ ] **🔴 CRÍTICO: Criar app no Meta for Developers**
- [ ] **🔴 CRÍTICO: Submeter para App Review** (3-6 semanas)
- [ ] Preparar screenshots e vídeo demo (App Review)

#### Desenvolvimento Core (36h)
- [ ] Implementar 5 tabelas MT + RLS
- [ ] Registrar módulo 'meta_messenger'
- [ ] Criar 4 Edge Functions
- [ ] Implementar lógica de auto-criação de Leads
- [ ] Criar 4 Hooks MT
- [ ] Criar 3 Páginas
- [ ] Integrar com LeadDetail

#### Melhorias Críticas (+13h OBRIGATÓRIO)
- [ ] **Tabela mt_meta_message_queue** (rate limiting)
- [ ] **MetaRateLimiter class** (200 msgs/h)
- [ ] **meta-token-refresh Edge Function** (auto-renovação)
- [ ] **Idempotência em mt_meta_messages** (unique_key)
- [ ] **pg_trgm extension** (fuzzy matching 85%+)

#### Testes
- [ ] Testar OAuth + Webhook
- [ ] Testar rate limiting e queue
- [ ] Testar token refresh automático
- [ ] Testar idempotência (duplicatas)
- [ ] Testar criação automática de Leads
- [ ] Testar módulo ativável

---

## 🏗️ Arquitetura da Solução

### Visão Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                              │
│  MetaMessenger.tsx │ MetaChat.tsx │ MetaConfig.tsx              │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                   SUPABASE BACKEND                               │
│  Edge Functions:                                                 │
│  - meta-oauth-callback   (recebe código do Facebook)             │
│  - meta-webhook          (recebe mensagens em tempo real)        │
│  - meta-sync             (sincroniza conversas antigas)          │
│  - meta-send-message     (envia mensagens)                       │
│                                                                  │
│  Database: mt_meta_* tables (Multi-Tenant)                       │
│  - mt_meta_accounts      (contas conectadas)                     │
│  - mt_meta_pages         (páginas do Facebook)                   │
│  - mt_meta_conversations (conversas)                             │
│  - mt_meta_messages      (mensagens)                             │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│              META BUSINESS PLATFORM API                          │
│  Graph API v19.0                                                 │
│  - Messenger Platform (Facebook Pages)                           │
│  - Instagram Messaging API (Instagram Business/Creator)          │
│  - Webhooks (real-time updates)                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Modelo de Dados Multi-Tenant

### Tabela 1: `mt_meta_accounts` (Contas Conectadas)

Armazena as conexões OAuth de cada franquia.

```sql
CREATE TABLE IF NOT EXISTS mt_meta_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES mt_franchises(id) ON DELETE CASCADE,

  -- Dados do OAuth
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('facebook', 'instagram', 'both')),
  access_token TEXT NOT NULL, -- Token de longa duração (60 dias)
  token_expires_at TIMESTAMPTZ NOT NULL,

  -- Dados do usuário que conectou
  meta_user_id VARCHAR(255) NOT NULL, -- ID do usuário no Facebook
  meta_user_name VARCHAR(255),
  meta_user_email VARCHAR(255),

  -- Dados da conta
  business_id VARCHAR(255), -- Facebook Business Account ID

  -- Permissões concedidas (JSON array)
  granted_scopes JSONB DEFAULT '[]'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  UNIQUE(tenant_id, meta_user_id)
);

-- Índices
CREATE INDEX idx_mt_meta_accounts_tenant ON mt_meta_accounts(tenant_id);
CREATE INDEX idx_mt_meta_accounts_franchise ON mt_meta_accounts(franchise_id);
CREATE INDEX idx_mt_meta_accounts_active ON mt_meta_accounts(is_active) WHERE is_active = true;
CREATE INDEX idx_mt_meta_accounts_token_expires ON mt_meta_accounts(token_expires_at);
```

### Tabela 2: `mt_meta_pages` (Páginas/Perfis Conectados)

Cada conta pode ter múltiplas páginas do Facebook e perfis do Instagram.

```sql
CREATE TABLE IF NOT EXISTS mt_meta_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES mt_franchises(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES mt_meta_accounts(id) ON DELETE CASCADE,

  -- Dados da página/perfil
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('facebook_page', 'instagram_business', 'instagram_creator')),
  page_id VARCHAR(255) NOT NULL, -- ID da página no Meta
  page_name VARCHAR(255) NOT NULL,
  page_username VARCHAR(255), -- @username
  page_access_token TEXT NOT NULL, -- Token específico da página

  -- Dados adicionais
  category VARCHAR(255),
  profile_picture_url TEXT,
  follower_count INTEGER DEFAULT 0,

  -- Instagram específico
  instagram_account_id VARCHAR(255), -- Se for página FB com Instagram conectado

  -- Status
  is_active BOOLEAN DEFAULT true,
  messaging_enabled BOOLEAN DEFAULT false, -- Se pode enviar/receber mensagens
  last_message_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  UNIQUE(tenant_id, page_id, platform)
);

-- Índices
CREATE INDEX idx_mt_meta_pages_tenant ON mt_meta_pages(tenant_id);
CREATE INDEX idx_mt_meta_pages_franchise ON mt_meta_pages(franchise_id);
CREATE INDEX idx_mt_meta_pages_account ON mt_meta_pages(account_id);
CREATE INDEX idx_mt_meta_pages_active ON mt_meta_pages(is_active) WHERE is_active = true;
```

### Tabela 3: `mt_meta_conversations` (Conversas)

Armazena as conversas do Messenger e Instagram Direct.

```sql
CREATE TABLE IF NOT EXISTS mt_meta_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES mt_franchises(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES mt_meta_pages(id) ON DELETE CASCADE,

  -- Dados da conversa
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('facebook', 'instagram')),
  conversation_id VARCHAR(255) NOT NULL, -- ID da conversa no Meta

  -- Dados do participante (cliente)
  participant_id VARCHAR(255) NOT NULL, -- PSID (Page-Scoped ID)
  participant_name VARCHAR(255),
  participant_username VARCHAR(255), -- Instagram username
  participant_profile_pic TEXT,

  -- Status
  unread_count INTEGER DEFAULT 0,
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_from VARCHAR(50), -- 'user' ou 'page'

  -- Classificação
  is_archived BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}', -- Array de tags/labels

  -- Vinculação com Lead (opcional)
  lead_id UUID REFERENCES mt_leads(id) ON DELETE SET NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  UNIQUE(tenant_id, conversation_id, platform)
);

-- Índices
CREATE INDEX idx_mt_meta_conversations_tenant ON mt_meta_conversations(tenant_id);
CREATE INDEX idx_mt_meta_conversations_franchise ON mt_meta_conversations(franchise_id);
CREATE INDEX idx_mt_meta_conversations_page ON mt_meta_conversations(page_id);
CREATE INDEX idx_mt_meta_conversations_unread ON mt_meta_conversations(unread_count) WHERE unread_count > 0;
CREATE INDEX idx_mt_meta_conversations_last_message ON mt_meta_conversations(last_message_at DESC);
CREATE INDEX idx_mt_meta_conversations_participant ON mt_meta_conversations(participant_id);
CREATE INDEX idx_mt_meta_conversations_lead ON mt_meta_conversations(lead_id);
```

### Tabela 4: `mt_meta_messages` (Mensagens)

Armazena todas as mensagens trocadas.

```sql
CREATE TABLE IF NOT EXISTS mt_meta_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES mt_meta_conversations(id) ON DELETE CASCADE,

  -- Dados da mensagem
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('facebook', 'instagram')),
  message_id VARCHAR(255) NOT NULL, -- ID da mensagem no Meta

  -- Conteúdo
  message_type VARCHAR(50) NOT NULL, -- 'text', 'image', 'video', 'audio', 'file', 'story_mention', 'story_reply'
  message_text TEXT,

  -- Mídia (se aplicável)
  media_url TEXT,
  media_type VARCHAR(50), -- 'image', 'video', 'audio', 'file'
  media_size INTEGER, -- Tamanho em bytes
  thumbnail_url TEXT,

  -- Metadados de Story (Instagram)
  story_id VARCHAR(255),
  story_url TEXT,

  -- Remetente
  sender_type VARCHAR(20) NOT NULL, -- 'user' ou 'page'
  sender_id VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255),

  -- Status (para mensagens enviadas pela página)
  status VARCHAR(50) DEFAULT 'sent', -- 'pending', 'sent', 'delivered', 'read', 'failed'
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_reason TEXT,

  -- Resposta a mensagem
  reply_to_message_id UUID REFERENCES mt_meta_messages(id) ON DELETE SET NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  UNIQUE(tenant_id, message_id, platform)
);

-- Índices
CREATE INDEX idx_mt_meta_messages_tenant ON mt_meta_messages(tenant_id);
CREATE INDEX idx_mt_meta_messages_conversation ON mt_meta_messages(conversation_id);
CREATE INDEX idx_mt_meta_messages_created ON mt_meta_messages(created_at DESC);
CREATE INDEX idx_mt_meta_messages_status ON mt_meta_messages(status) WHERE sender_type = 'page';
```

### Tabela 5: `mt_meta_webhook_events` (Log de Webhooks)

Armazena eventos recebidos do webhook para auditoria e debug.

```sql
CREATE TABLE IF NOT EXISTS mt_meta_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Dados do webhook
  event_type VARCHAR(100) NOT NULL, -- 'messages', 'messaging_postbacks', 'messaging_optins', etc.
  platform VARCHAR(20) NOT NULL, -- 'facebook' ou 'instagram'

  -- Payload completo
  raw_payload JSONB NOT NULL,

  -- Status de processamento
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_mt_meta_webhook_events_type ON mt_meta_webhook_events(event_type);
CREATE INDEX idx_mt_meta_webhook_events_processed ON mt_meta_webhook_events(processed) WHERE processed = false;
CREATE INDEX idx_mt_meta_webhook_events_created ON mt_meta_webhook_events(created_at DESC);
```

---

## 🔐 Row Level Security (RLS)

### Políticas para `mt_meta_accounts`

```sql
-- Habilitar RLS
ALTER TABLE mt_meta_accounts ENABLE ROW LEVEL SECURITY;

-- SELECT: Platform admin vê tudo, tenant admin vê seu tenant, franchise vê sua franquia
CREATE POLICY "mt_meta_accounts_select" ON mt_meta_accounts FOR SELECT
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
  (tenant_id = current_tenant_id())
);

-- INSERT: Platform admin, tenant admin ou franchise admin
CREATE POLICY "mt_meta_accounts_insert" ON mt_meta_accounts FOR INSERT
WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);

-- UPDATE: Platform admin, tenant admin ou franchise admin
CREATE POLICY "mt_meta_accounts_update" ON mt_meta_accounts FOR UPDATE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);

-- DELETE: Platform admin ou tenant admin
CREATE POLICY "mt_meta_accounts_delete" ON mt_meta_accounts FOR DELETE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);
```

### Políticas para `mt_meta_pages`, `mt_meta_conversations`, `mt_meta_messages`

Seguir o mesmo padrão acima (copiar e adaptar o nome da tabela).

---

## 🔑 Fluxo de Autenticação OAuth (Facebook Login)

### 1. Configuração Inicial no Meta for Developers

#### Criar App no Meta for Developers

1. Acessar https://developers.facebook.com/apps
2. Criar novo app tipo "Empresas"
3. Adicionar produtos:
   - **Messenger** (para Facebook Pages)
   - **Instagram** (para Instagram Business/Creator)

#### Configurar Permissões

**Permissões necessárias:**
- `pages_show_list` - Listar páginas do usuário
- `pages_messaging` - Enviar/receber mensagens da página
- `pages_read_engagement` - Ler engajamento da página
- `pages_manage_metadata` - Gerenciar metadados da página
- `instagram_basic` - Dados básicos do Instagram
- `instagram_manage_messages` - Gerenciar mensagens do Instagram

#### Obter Credenciais

```env
# .env
VITE_META_APP_ID=YOUR_APP_ID
VITE_META_APP_SECRET=YOUR_APP_SECRET
META_REDIRECT_URI=https://supabase.yeslaser.com.br/functions/v1/meta-oauth-callback
```

### 2. Fluxo de Login (Frontend)

#### Componente: `MetaConnectButton.tsx`

```typescript
// src/components/meta/MetaConnectButton.tsx
import { Button } from '@/components/ui/button';
import { Facebook, Instagram } from 'lucide-react';
import { useTenantContext } from '@/contexts/TenantContext';

interface MetaConnectButtonProps {
  platform: 'facebook' | 'instagram' | 'both';
  onSuccess?: () => void;
}

export function MetaConnectButton({ platform, onSuccess }: MetaConnectButtonProps) {
  const { tenant, franchise } = useTenantContext();

  const handleConnect = () => {
    const appId = import.meta.env.VITE_META_APP_ID;
    const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-oauth-callback`;

    // Scopes baseados na plataforma
    const scopes = platform === 'instagram'
      ? 'instagram_basic,instagram_manage_messages,pages_show_list'
      : 'pages_show_list,pages_messaging,pages_read_engagement,pages_manage_metadata';

    // State para identificar tenant e franquia
    const state = btoa(JSON.stringify({
      tenant_id: tenant.id,
      franchise_id: franchise?.id,
      platform,
      return_url: window.location.href,
    }));

    // Redirecionar para OAuth do Facebook
    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?` +
      `client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}` +
      `&scope=${scopes}` +
      `&response_type=code`;

    // Abrir popup ou redirecionar
    const popup = window.open(authUrl, 'MetaOAuth', 'width=600,height=700');

    // Listener para quando popup fechar
    const interval = setInterval(() => {
      if (popup?.closed) {
        clearInterval(interval);
        onSuccess?.();
      }
    }, 500);
  };

  return (
    <Button onClick={handleConnect} className="gap-2">
      {platform === 'instagram' ? (
        <>
          <Instagram className="h-4 w-4" />
          Conectar Instagram
        </>
      ) : (
        <>
          <Facebook className="h-4 w-4" />
          Conectar Facebook
        </>
      )}
    </Button>
  );
}
```

### 3. Edge Function: `meta-oauth-callback`

Processa o callback do OAuth e armazena os tokens.

```typescript
// supabase/functions/meta-oauth-callback/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const META_APP_ID = Deno.env.get('VITE_META_APP_ID')!;
const META_APP_SECRET = Deno.env.get('VITE_META_APP_SECRET')!;

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      return new Response(
        `<html><body><h1>Erro na autenticação: ${error}</h1><script>window.close();</script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (!code || !state) {
      throw new Error('Código ou state ausente');
    }

    // Decodificar state
    const stateData = JSON.parse(atob(state));
    const { tenant_id, franchise_id, platform, return_url } = stateData;

    // 1. Trocar código por access token
    const redirectUri = `${SUPABASE_URL}/functions/v1/meta-oauth-callback`;
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `client_id=${META_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&client_secret=${META_APP_SECRET}` +
      `&code=${code}`;

    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error('Falha ao obter access token');
    }

    const shortLivedToken = tokenData.access_token;

    // 2. Trocar por token de longa duração (60 dias)
    const longLivedUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `grant_type=fb_exchange_token` +
      `&client_id=${META_APP_ID}` +
      `&client_secret=${META_APP_SECRET}` +
      `&fb_exchange_token=${shortLivedToken}`;

    const longLivedResponse = await fetch(longLivedUrl);
    const longLivedData = await longLivedResponse.json();
    const accessToken = longLivedData.access_token;
    const expiresIn = longLivedData.expires_in; // ~5184000 (60 dias)

    // 3. Buscar informações do usuário
    const userUrl = `https://graph.facebook.com/v19.0/me?fields=id,name,email&access_token=${accessToken}`;
    const userResponse = await fetch(userUrl);
    const userData = await userResponse.json();

    // 4. Buscar permissões concedidas
    const permissionsUrl = `https://graph.facebook.com/v19.0/me/permissions?access_token=${accessToken}`;
    const permissionsResponse = await fetch(permissionsUrl);
    const permissionsData = await permissionsResponse.json();
    const grantedScopes = permissionsData.data
      .filter((p: any) => p.status === 'granted')
      .map((p: any) => p.permission);

    // 5. Salvar no banco
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const { data: account, error: accountError } = await supabase
      .from('mt_meta_accounts')
      .upsert({
        tenant_id,
        franchise_id,
        platform,
        access_token: accessToken,
        token_expires_at: expiresAt.toISOString(),
        meta_user_id: userData.id,
        meta_user_name: userData.name,
        meta_user_email: userData.email,
        granted_scopes: grantedScopes,
        is_active: true,
      }, {
        onConflict: 'tenant_id,meta_user_id'
      })
      .select()
      .single();

    if (accountError) throw accountError;

    // 6. Buscar páginas do usuário
    const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,username,category,access_token,instagram_business_account&access_token=${accessToken}`;
    const pagesResponse = await fetch(pagesUrl);
    const pagesData = await pagesResponse.json();

    // 7. Salvar páginas no banco
    for (const page of pagesData.data || []) {
      await supabase.from('mt_meta_pages').upsert({
        tenant_id,
        franchise_id,
        account_id: account.id,
        platform: 'facebook_page',
        page_id: page.id,
        page_name: page.name,
        page_username: page.username,
        page_access_token: page.access_token,
        category: page.category,
        instagram_account_id: page.instagram_business_account?.id,
        is_active: true,
        messaging_enabled: true,
      }, {
        onConflict: 'tenant_id,page_id,platform'
      });

      // Se tiver Instagram conectado, buscar dados do Instagram
      if (page.instagram_business_account?.id) {
        const igId = page.instagram_business_account.id;
        const igUrl = `https://graph.facebook.com/v19.0/${igId}?fields=id,username,name,profile_picture_url,followers_count&access_token=${page.access_token}`;
        const igResponse = await fetch(igUrl);
        const igData = await igResponse.json();

        await supabase.from('mt_meta_pages').upsert({
          tenant_id,
          franchise_id,
          account_id: account.id,
          platform: 'instagram_business',
          page_id: igId,
          page_name: igData.name,
          page_username: igData.username,
          page_access_token: page.access_token,
          profile_picture_url: igData.profile_picture_url,
          follower_count: igData.followers_count,
          is_active: true,
          messaging_enabled: true,
        }, {
          onConflict: 'tenant_id,page_id,platform'
        });
      }
    }

    // 8. Redirecionar de volta com sucesso
    return new Response(
      `<html><body><h1>Conectado com sucesso!</h1><p>Você pode fechar esta janela.</p><script>window.close();</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );

  } catch (error) {
    console.error('Erro no OAuth callback:', error);
    return new Response(
      `<html><body><h1>Erro: ${error.message}</h1><script>window.close();</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
});
```

---

## 📥 Webhook do Meta (Real-Time Updates)

### 1. Configuração no Meta for Developers

1. Ir em **Webhooks** no app
2. Adicionar endpoint: `https://supabase.yeslaser.com.br/functions/v1/meta-webhook`
3. Selecionar eventos:
   - **messages** (novas mensagens)
   - **messaging_postbacks** (botões/quick replies)
   - **messaging_optins** (opt-in de notificações)
   - **messaging_referrals** (referências de anúncios)
   - **message_deliveries** (confirmações de entrega)
   - **message_reads** (leitura de mensagens)

4. Gerar **Verify Token**: `meta_webhook_yeslaser_2026`

### 2. Edge Function: `meta-webhook`

```typescript
// supabase/functions/meta-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VERIFY_TOKEN = 'meta_webhook_yeslaser_2026';

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // GET: Verificação do webhook (feita pelo Meta)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verificado com sucesso');
        return new Response(challenge, { status: 200 });
      } else {
        return new Response('Forbidden', { status: 403 });
      }
    }

    // POST: Receber eventos
    if (req.method === 'POST') {
      const body = await req.json();

      // Log do evento (para debug)
      await supabase.from('mt_meta_webhook_events').insert({
        event_type: body.object,
        platform: body.object === 'instagram' ? 'instagram' : 'facebook',
        raw_payload: body,
        processed: false,
      });

      // Processar cada entrada
      for (const entry of body.entry || []) {
        // Processar mensagens do Messenger
        if (entry.messaging) {
          for (const event of entry.messaging) {
            await processMessengerEvent(supabase, entry.id, event);
          }
        }

        // Processar mensagens do Instagram
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'messages') {
              await processInstagramMessage(supabase, entry.id, change.value);
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method not allowed', { status: 405 });

  } catch (error) {
    console.error('Erro no webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// Processar evento do Messenger
async function processMessengerEvent(supabase: any, pageId: string, event: any) {
  // Buscar página no banco
  const { data: page } = await supabase
    .from('mt_meta_pages')
    .select('*')
    .eq('page_id', pageId)
    .eq('platform', 'facebook_page')
    .single();

  if (!page) {
    console.error(`Página não encontrada: ${pageId}`);
    return;
  }

  const senderId = event.sender.id;
  const recipientId = event.recipient.id;

  // Criar ou atualizar conversa
  const { data: conversation } = await supabase
    .from('mt_meta_conversations')
    .select('*')
    .eq('tenant_id', page.tenant_id)
    .eq('page_id', page.id)
    .eq('participant_id', senderId)
    .single();

  let conversationId = conversation?.id;

  if (!conversation) {
    // Buscar dados do remetente
    const senderUrl = `https://graph.facebook.com/v19.0/${senderId}?fields=name,profile_pic&access_token=${page.page_access_token}`;
    const senderResponse = await fetch(senderUrl);
    const senderData = await senderResponse.json();

    const { data: newConv } = await supabase
      .from('mt_meta_conversations')
      .insert({
        tenant_id: page.tenant_id,
        franchise_id: page.franchise_id,
        page_id: page.id,
        platform: 'facebook',
        conversation_id: senderId, // No Messenger, conversa é identificada pelo PSID
        participant_id: senderId,
        participant_name: senderData.name,
        participant_profile_pic: senderData.profile_pic,
        unread_count: 1,
      })
      .select()
      .single();

    conversationId = newConv.id;
  }

  // Processar mensagem
  if (event.message) {
    const message = event.message;
    const isFromUser = senderId !== pageId;

    await supabase.from('mt_meta_messages').insert({
      tenant_id: page.tenant_id,
      conversation_id: conversationId,
      platform: 'facebook',
      message_id: message.mid,
      message_type: message.attachments ? message.attachments[0].type : 'text',
      message_text: message.text,
      media_url: message.attachments?.[0]?.payload?.url,
      sender_type: isFromUser ? 'user' : 'page',
      sender_id: senderId,
      status: 'sent',
    });

    // Atualizar conversa
    await supabase
      .from('mt_meta_conversations')
      .update({
        last_message_text: message.text || '[Mídia]',
        last_message_at: new Date().toISOString(),
        last_message_from: isFromUser ? 'user' : 'page',
        unread_count: isFromUser ? supabase.raw('unread_count + 1') : 0,
      })
      .eq('id', conversationId);
  }

  // Processar confirmação de leitura
  if (event.read) {
    await supabase
      .from('mt_meta_messages')
      .update({ status: 'read', read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('sender_type', 'page')
      .is('read_at', null);
  }

  // Processar confirmação de entrega
  if (event.delivery) {
    for (const mid of event.delivery.mids || []) {
      await supabase
        .from('mt_meta_messages')
        .update({ status: 'delivered', delivered_at: new Date().toISOString() })
        .eq('message_id', mid);
    }
  }
}

// Processar mensagem do Instagram
async function processInstagramMessage(supabase: any, igAccountId: string, value: any) {
  // Similar ao Messenger, adaptar para Instagram Direct
  // ...
}
```

---

## 📤 Envio de Mensagens

### Edge Function: `meta-send-message`

```typescript
// supabase/functions/meta-send-message/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { conversationId, messageText, messageType = 'text', mediaUrl } = await req.json();

    // Buscar conversa e página
    const { data: conversation } = await supabase
      .from('mt_meta_conversations')
      .select('*, page:mt_meta_pages(*)')
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }

    const page = conversation.page;
    const platform = conversation.platform;
    const recipientId = conversation.participant_id;

    let messagePayload: any;

    if (platform === 'facebook') {
      // Enviar via Messenger Send API
      messagePayload = {
        recipient: { id: recipientId },
        message: messageType === 'text'
          ? { text: messageText }
          : {
              attachment: {
                type: messageType,
                payload: { url: mediaUrl }
              }
            }
      };

      const sendUrl = `https://graph.facebook.com/v19.0/me/messages?access_token=${page.page_access_token}`;
      const response = await fetch(sendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messagePayload),
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Salvar mensagem no banco
      await supabase.from('mt_meta_messages').insert({
        tenant_id: conversation.tenant_id,
        conversation_id: conversationId,
        platform: 'facebook',
        message_id: result.message_id,
        message_type: messageType,
        message_text: messageText,
        media_url: mediaUrl,
        sender_type: 'page',
        sender_id: page.page_id,
        status: 'sent',
      });

      // Atualizar conversa
      await supabase
        .from('mt_meta_conversations')
        .update({
          last_message_text: messageText || '[Mídia]',
          last_message_at: new Date().toISOString(),
          last_message_from: 'page',
        })
        .eq('id', conversationId);

      return new Response(JSON.stringify({ success: true, messageId: result.message_id }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (platform === 'instagram') {
      // Enviar via Instagram Messaging API
      const sendUrl = `https://graph.facebook.com/v19.0/me/messages?access_token=${page.page_access_token}`;

      messagePayload = {
        recipient: { id: recipientId },
        message: messageType === 'text'
          ? { text: messageText }
          : {
              attachment: {
                type: messageType === 'image' ? 'image' : 'file',
                payload: { url: mediaUrl }
              }
            }
      };

      const response = await fetch(sendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messagePayload),
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Salvar no banco (similar ao Facebook)
      await supabase.from('mt_meta_messages').insert({
        tenant_id: conversation.tenant_id,
        conversation_id: conversationId,
        platform: 'instagram',
        message_id: result.message_id,
        message_type: messageType,
        message_text: messageText,
        media_url: mediaUrl,
        sender_type: 'page',
        sender_id: page.page_id,
        status: 'sent',
      });

      await supabase
        .from('mt_meta_conversations')
        .update({
          last_message_text: messageText || '[Mídia]',
          last_message_at: new Date().toISOString(),
          last_message_from: 'page',
        })
        .eq('id', conversationId);

      return new Response(JSON.stringify({ success: true, messageId: result.message_id }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Plataforma não suportada');

  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

---

## 🔄 Sincronização de Conversas Antigas

### Edge Function: `meta-sync`

Para sincronizar conversas e mensagens antigas (não capturadas pelo webhook).

```typescript
// supabase/functions/meta-sync/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { pageId, limit = 50 } = await req.json();

    // Buscar página
    const { data: page } = await supabase
      .from('mt_meta_pages')
      .select('*')
      .eq('id', pageId)
      .single();

    if (!page) {
      throw new Error('Página não encontrada');
    }

    const platform = page.platform;
    const accessToken = page.page_access_token;

    if (platform === 'facebook_page') {
      // Buscar conversas do Messenger
      const conversationsUrl = `https://graph.facebook.com/v19.0/${page.page_id}/conversations?` +
        `fields=id,participants,updated_time,messages.limit(25){id,from,message,created_time,attachments}` +
        `&limit=${limit}` +
        `&access_token=${accessToken}`;

      const response = await fetch(conversationsUrl);
      const data = await response.json();

      for (const conv of data.data || []) {
        const participant = conv.participants.data.find((p: any) => p.id !== page.page_id);

        if (!participant) continue;

        // Criar/atualizar conversa
        const { data: conversation } = await supabase
          .from('mt_meta_conversations')
          .upsert({
            tenant_id: page.tenant_id,
            franchise_id: page.franchise_id,
            page_id: page.id,
            platform: 'facebook',
            conversation_id: participant.id,
            participant_id: participant.id,
            participant_name: participant.name,
            participant_profile_pic: `https://graph.facebook.com/${participant.id}/picture`,
            last_message_at: conv.updated_time,
          }, {
            onConflict: 'tenant_id,conversation_id,platform'
          })
          .select()
          .single();

        // Salvar mensagens
        for (const msg of conv.messages?.data || []) {
          await supabase.from('mt_meta_messages').upsert({
            tenant_id: page.tenant_id,
            conversation_id: conversation.id,
            platform: 'facebook',
            message_id: msg.id,
            message_type: msg.attachments ? 'attachment' : 'text',
            message_text: msg.message,
            media_url: msg.attachments?.[0]?.image_data?.url,
            sender_type: msg.from.id === page.page_id ? 'page' : 'user',
            sender_id: msg.from.id,
            status: 'sent',
            created_at: msg.created_time,
          }, {
            onConflict: 'tenant_id,message_id,platform'
          });
        }
      }
    }

    if (platform === 'instagram_business') {
      // Buscar conversas do Instagram
      const conversationsUrl = `https://graph.facebook.com/v19.0/${page.page_id}/conversations?` +
        `platform=instagram` +
        `&fields=id,participants,updated_time,messages.limit(25){id,from,message,created_time}` +
        `&limit=${limit}` +
        `&access_token=${accessToken}`;

      // ... Similar ao Messenger
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na sincronização:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

---

## 🎨 Frontend - Hooks Multi-Tenant

### Hook: `useMetaAccountsMT.ts`

```typescript
// src/hooks/multitenant/useMetaAccountsMT.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useMetaAccountsMT() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Query: Listar contas
  const query = useQuery({
    queryKey: ['mt-meta-accounts', tenant?.id, franchise?.id],
    queryFn: async () => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado');
      }

      let q = supabase
        .from('mt_meta_accounts')
        .select('*, tenant:mt_tenants(slug, nome_fantasia)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Mutation: Deletar conta
  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_meta_accounts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-meta-accounts'] });
      toast.success('Conta desconectada');
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return {
    accounts: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    deleteAccount,
  };
}
```

### Hook: `useMetaPagesMT.ts`

```typescript
// src/hooks/multitenant/useMetaPagesMT.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useMetaPagesMT(accountId?: string) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mt-meta-pages', tenant?.id, franchise?.id, accountId],
    queryFn: async () => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado');
      }

      let q = supabase
        .from('mt_meta_pages')
        .select('*, account:mt_meta_accounts(meta_user_name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (accountId) {
        q = q.eq('account_id', accountId);
      }

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Mutation: Sincronizar página
  const syncPage = useMutation({
    mutationFn: async (pageId: string) => {
      const { data, error } = await supabase.functions.invoke('meta-sync', {
        body: { pageId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Conversas sincronizadas');
      queryClient.invalidateQueries({ queryKey: ['mt-meta-conversations'] });
    },
    onError: (error) => {
      toast.error(`Erro na sincronização: ${error.message}`);
    },
  });

  return {
    pages: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    syncPage,
  };
}
```

### Hook: `useMetaConversationsMT.ts`

```typescript
// src/hooks/multitenant/useMetaConversationsMT.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';

export function useMetaConversationsMT(pageId?: string) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mt-meta-conversations', tenant?.id, franchise?.id, pageId],
    queryFn: async () => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado');
      }

      let q = supabase
        .from('mt_meta_conversations')
        .select('*, page:mt_meta_pages(page_name, platform)')
        .is('deleted_at', null)
        .order('last_message_at', { ascending: false });

      if (pageId) {
        q = q.eq('page_id', pageId);
      }

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Real-time subscription
  useEffect(() => {
    if (!tenant && accessLevel !== 'platform') return;

    const channel = supabase
      .channel('mt-meta-conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mt_meta_conversations',
          filter: accessLevel === 'tenant' ? `tenant_id=eq.${tenant.id}` : undefined,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['mt-meta-conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant, accessLevel, queryClient]);

  // Mutation: Marcar como lida
  const markAsRead = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('mt_meta_conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-meta-conversations'] });
    },
  });

  return {
    conversations: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    markAsRead,
  };
}
```

### Hook: `useMetaMessagesMT.ts`

```typescript
// src/hooks/multitenant/useMetaMessagesMT.ts
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';

const MESSAGES_PER_PAGE = 50;

export function useMetaMessagesMT(conversationId?: string) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ['mt-meta-messages', tenant?.id, conversationId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado');
      }

      if (!conversationId) {
        return { data: [], nextPage: null };
      }

      const { data, error } = await supabase
        .from('mt_meta_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + MESSAGES_PER_PAGE - 1);

      if (error) throw error;

      return {
        data: data.reverse(), // Inverter para ordem cronológica
        nextPage: data.length === MESSAGES_PER_PAGE ? pageParam + MESSAGES_PER_PAGE : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !isTenantLoading && !!conversationId && (!!tenant || accessLevel === 'platform'),
  });

  // Real-time subscription
  useEffect(() => {
    if (!conversationId || (!tenant && accessLevel !== 'platform')) return;

    const channel = supabase
      .channel(`mt-meta-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mt_meta_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['mt-meta-messages', tenant?.id, conversationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, tenant, accessLevel, queryClient]);

  // Mutation: Enviar mensagem
  const sendMessage = useMutation({
    mutationFn: async ({ messageText, messageType = 'text', mediaUrl }: any) => {
      const { data, error } = await supabase.functions.invoke('meta-send-message', {
        body: { conversationId, messageText, messageType, mediaUrl },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-meta-messages'] });
      queryClient.invalidateQueries({ queryKey: ['mt-meta-conversations'] });
    },
    onError: (error) => {
      toast.error(`Erro ao enviar: ${error.message}`);
    },
  });

  const messages = query.data?.pages.flatMap((page) => page.data) || [];

  return {
    messages,
    isLoading: query.isLoading || isTenantLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    error: query.error,
    sendMessage,
  };
}
```

---

## 🖥️ Frontend - Páginas

### Página: `MetaMessenger.tsx` (Listagem de Conversas)

```tsx
// src/pages/MetaMessenger.tsx
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MetaConnectButton } from '@/components/meta/MetaConnectButton';
import { useMetaAccountsMT } from '@/hooks/multitenant/useMetaAccountsMT';
import { useMetaPagesMT } from '@/hooks/multitenant/useMetaPagesMT';
import { useMetaConversationsMT } from '@/hooks/multitenant/useMetaConversationsMT';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Facebook, Instagram, MessageSquare, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export function MetaMessenger() {
  const { accounts, isLoading: isLoadingAccounts } = useMetaAccountsMT();
  const { pages, syncPage } = useMetaPagesMT();
  const [selectedPageId, setSelectedPageId] = useState<string>();
  const { conversations, isLoading: isLoadingConversations, refetch } = useMetaConversationsMT(selectedPageId);

  const hasFacebookAccount = accounts?.some(a => a.platform === 'facebook' || a.platform === 'both');
  const hasInstagramAccount = accounts?.some(a => a.platform === 'instagram' || a.platform === 'both');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Meta Messenger & Instagram</h1>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Conectar Contas */}
        {(!hasFacebookAccount || !hasInstagramAccount) && (
          <Card>
            <CardHeader>
              <CardTitle>Conectar Redes Sociais</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              {!hasFacebookAccount && (
                <MetaConnectButton platform="facebook" onSuccess={refetch} />
              )}
              {!hasInstagramAccount && (
                <MetaConnectButton platform="instagram" onSuccess={refetch} />
              )}
            </CardContent>
          </Card>
        )}

        {/* Páginas Conectadas */}
        {pages && pages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Páginas Conectadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pages.map((page) => (
                  <Card key={page.id} className="cursor-pointer hover:border-primary" onClick={() => setSelectedPageId(page.id)}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        {page.platform === 'facebook_page' ? (
                          <Facebook className="h-8 w-8 text-blue-600" />
                        ) : (
                          <Instagram className="h-8 w-8 text-pink-600" />
                        )}
                        <div className="flex-1">
                          <p className="font-semibold">{page.page_name}</p>
                          <p className="text-sm text-muted-foreground">@{page.page_username}</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); syncPage.mutate(page.id); }}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Conversas */}
        {selectedPageId && (
          <Card>
            <CardHeader>
              <CardTitle>Conversas</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingConversations ? (
                <p>Carregando...</p>
              ) : conversations && conversations.length > 0 ? (
                <div className="space-y-2">
                  {conversations.map((conv) => (
                    <Link key={conv.id} to={`/meta-messenger/${conv.id}`}>
                      <Card className="hover:border-primary cursor-pointer">
                        <CardContent className="p-4 flex items-center gap-4">
                          <img
                            src={conv.participant_profile_pic || '/default-avatar.png'}
                            alt={conv.participant_name}
                            className="h-12 w-12 rounded-full"
                          />
                          <div className="flex-1">
                            <p className="font-semibold">{conv.participant_name}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {conv.last_message_text}
                            </p>
                          </div>
                          {conv.unread_count > 0 && (
                            <span className="bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs">
                              {conv.unread_count}
                            </span>
                          )}
                          <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground">Nenhuma conversa encontrada</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
```

### Página: `MetaChat.tsx` (Conversa Individual)

```tsx
// src/pages/MetaChat.tsx
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useParams, Link } from 'react-router-dom';
import { useMetaConversationsMT } from '@/hooks/multitenant/useMetaConversationsMT';
import { useMetaMessagesMT } from '@/hooks/multitenant/useMetaMessagesMT';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function MetaChat() {
  const { conversationId } = useParams();
  const { conversations } = useMetaConversationsMT();
  const { messages, sendMessage, isLoading, fetchNextPage, hasNextPage } = useMetaMessagesMT(conversationId);
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversation = conversations?.find(c => c.id === conversationId);

  const handleSend = async () => {
    if (!messageText.trim()) return;

    await sendMessage.mutateAsync({ messageText });
    setMessageText('');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Header */}
        <Card className="rounded-b-none">
          <CardHeader className="flex flex-row items-center gap-4 p-4">
            <Link to="/meta-messenger">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <img
              src={conversation?.participant_profile_pic || '/default-avatar.png'}
              alt={conversation?.participant_name}
              className="h-10 w-10 rounded-full"
            />
            <div>
              <p className="font-semibold">{conversation?.participant_name}</p>
              <p className="text-sm text-muted-foreground">{conversation?.platform}</p>
            </div>
          </CardHeader>
        </Card>

        {/* Mensagens */}
        <Card className="flex-1 overflow-y-auto rounded-none border-x">
          <CardContent className="p-4 space-y-4">
            {hasNextPage && (
              <Button variant="outline" onClick={() => fetchNextPage()} className="w-full">
                Carregar mais mensagens
              </Button>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_type === 'page' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.sender_type === 'page'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {msg.message_text && <p>{msg.message_text}</p>}
                  {msg.media_url && (
                    <img src={msg.media_url} alt="Mídia" className="mt-2 rounded max-w-full" />
                  )}
                  <p className="text-xs opacity-70 mt-1">
                    {format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </CardContent>
        </Card>

        {/* Input */}
        <Card className="rounded-t-none">
          <CardContent className="p-4 flex gap-2">
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Digite sua mensagem..."
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <Button onClick={handleSend} disabled={!messageText.trim() || sendMessage.isPending}>
              <Send className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
```

---

## 📋 Checklist de Implementação

### Fase 1: Banco de Dados ✅
- [ ] Criar tabelas MT (mt_meta_accounts, mt_meta_pages, mt_meta_conversations, mt_meta_messages, mt_meta_webhook_events)
- [ ] Habilitar RLS em todas as tabelas
- [ ] Criar políticas de segurança
- [ ] **Registrar módulo 'meta_messenger' em mt_modules**
- [ ] **Habilitar módulo para todos os tenants**
- [ ] **Adicionar coluna 'canal_origem' em mt_leads** (valores: 'whatsapp', 'facebook_messenger', 'instagram_direct', 'formulario', 'telefone', 'email')
- [ ] **Adicionar coluna 'meta_conversation_id' em mt_leads** (vinculação com conversa do Meta)

### Fase 2: Configuração Meta ✅
- [ ] Criar app no Meta for Developers
- [ ] Adicionar produtos Messenger e Instagram
- [ ] Configurar permissões OAuth
- [ ] Obter App ID e App Secret
- [ ] Configurar webhook

### Fase 3: Edge Functions ✅
- [ ] Criar meta-oauth-callback
- [ ] Criar meta-webhook
- [ ] Criar meta-send-message
- [ ] Criar meta-sync
- [ ] Testar endpoints

### Fase 4: Frontend - Hooks ✅
- [ ] useMetaAccountsMT
- [ ] useMetaPagesMT
- [ ] useMetaConversationsMT
- [ ] useMetaMessagesMT

### Fase 5: Frontend - Páginas ✅
- [ ] MetaMessenger.tsx (listagem)
- [ ] MetaChat.tsx (conversa)
- [ ] MetaConnectButton.tsx
- [ ] Adicionar rotas em App.tsx

### Fase 6: Criação Automática de Leads ⚠️ NOVO
- [ ] Implementar lógica de auto-criação de lead quando receber primeira mensagem
- [ ] Detectar telefone/nome do participante via Graph API
- [ ] Vincular conversa ao lead criado
- [ ] Permitir matching com lead existente (por telefone/nome)
- [ ] Registrar canal de origem (facebook_messenger ou instagram_direct)

### Fase 7: Testes ✅
- [ ] Testar OAuth do Facebook
- [ ] Testar OAuth do Instagram
- [ ] Testar recebimento de mensagens via webhook
- [ ] **Testar criação automática de lead ao receber mensagem**
- [ ] **Testar vinculação de conversa com lead existente**
- [ ] Testar envio de mensagens
- [ ] Testar sincronização de conversas antigas
- [ ] Testar permissões RLS
- [ ] **Testar módulo ligado/desligado por tenant**

---

## 📦 Registro do Módulo em mt_modules

### SQL: Registrar Módulo

```sql
-- Inserir módulo 'meta_messenger' em mt_modules
INSERT INTO mt_modules (codigo, nome, descricao, icone, categoria, ordem, is_core, is_active)
VALUES (
  'meta_messenger',
  'Meta Messenger & Instagram',
  'Integração com Facebook Messenger e Instagram Direct para gestão de conversas',
  'MessageSquare', -- Ícone do Lucide React
  'comunicacao',
  12, -- Ordem no menu (após WhatsApp)
  false, -- NÃO é módulo core (pode ser desabilitado)
  true   -- Ativo por padrão
)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  is_active = EXCLUDED.is_active;

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
```

### Rotas Condicionais

```typescript
// src/App.tsx - Rotas condicionais baseadas no módulo

import { useModules } from '@/contexts/TenantContext';

function App() {
  const { isModuleActive } = useModules();

  return (
    <Routes>
      {/* ... outras rotas ... */}

      {/* Meta Messenger - Apenas se módulo estiver ativo */}
      {isModuleActive('meta_messenger') && (
        <>
          <Route path="/meta-messenger" element={<ProtectedRoute><DashboardLayout><MetaMessenger /></DashboardLayout></ProtectedRoute>} />
          <Route path="/meta-messenger/:conversationId" element={<ProtectedRoute><DashboardLayout><MetaChat /></DashboardLayout></ProtectedRoute>} />
        </>
      )}
    </Routes>
  );
}
```

### Menu Lateral Condicional

```typescript
// src/components/layout/DashboardLayout.tsx

import { useModules } from '@/contexts/TenantContext';

function DashboardLayout() {
  const { isModuleActive } = useModules();

  const menuItems = [
    // ... outros itens ...
    {
      label: 'WhatsApp',
      icon: MessageSquare,
      path: '/whatsapp',
      show: isModuleActive('whatsapp'),
    },
    {
      label: 'Meta Messenger',
      icon: Facebook,
      path: '/meta-messenger',
      show: isModuleActive('meta_messenger'), // CONDICIONAL
      badge: unreadMetaCount, // Contador de não lidas
    },
  ].filter(item => item.show !== false);

  return <Sidebar items={menuItems} />;
}
```

---

## 🤖 Criação Automática de Leads

### Lógica de Auto-Criação

Quando uma **primeira mensagem** chegar via webhook do Meta (Facebook ou Instagram), o sistema deve:

1. ✅ Verificar se já existe um lead com o mesmo telefone/PSID
2. ✅ Se NÃO existir, criar um novo lead automaticamente
3. ✅ Vincular a conversa ao lead (campo `lead_id` em `mt_meta_conversations`)
4. ✅ Registrar canal de origem (`canal_origem` em `mt_leads`)

### Tabela mt_leads - Novas Colunas

```sql
-- Migration: Adicionar colunas para integração Meta

ALTER TABLE mt_leads
ADD COLUMN IF NOT EXISTS canal_origem VARCHAR(50),
ADD COLUMN IF NOT EXISTS meta_conversation_id UUID REFERENCES mt_meta_conversations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS meta_participant_id VARCHAR(255), -- PSID do Facebook/Instagram
ADD COLUMN IF NOT EXISTS meta_participant_username VARCHAR(255); -- Username do Instagram

-- Constraint para canal_origem
ALTER TABLE mt_leads
ADD CONSTRAINT check_canal_origem
CHECK (canal_origem IN (
  'whatsapp',
  'facebook_messenger',
  'instagram_direct',
  'formulario',
  'telefone',
  'email',
  'presencial',
  'site',
  'outro'
));

-- Índices
CREATE INDEX idx_mt_leads_meta_conversation ON mt_leads(meta_conversation_id);
CREATE INDEX idx_mt_leads_meta_participant ON mt_leads(meta_participant_id);
CREATE INDEX idx_mt_leads_canal_origem ON mt_leads(canal_origem);
```

### Edge Function: meta-webhook (Atualizada)

Adicionar lógica de auto-criação de lead:

```typescript
// supabase/functions/meta-webhook/index.ts

async function processMessengerEvent(supabase: any, pageId: string, event: any) {
  // ... código existente para criar/atualizar conversa ...

  const senderId = event.sender.id;
  const recipientId = event.recipient.id;
  const isFromUser = senderId !== pageId;

  if (!isFromUser) return; // Ignorar mensagens enviadas pela página

  // Buscar página no banco
  const { data: page } = await supabase
    .from('mt_meta_pages')
    .select('*')
    .eq('page_id', pageId)
    .eq('platform', 'facebook_page')
    .single();

  if (!page) {
    console.error(`Página não encontrada: ${pageId}`);
    return;
  }

  // Criar ou atualizar conversa
  const { data: conversation } = await supabase
    .from('mt_meta_conversations')
    .select('*')
    .eq('tenant_id', page.tenant_id)
    .eq('page_id', page.id)
    .eq('participant_id', senderId)
    .single();

  let conversationId = conversation?.id;

  if (!conversation) {
    // Buscar dados do remetente via Graph API
    const senderUrl = `https://graph.facebook.com/v19.0/${senderId}?fields=name,profile_pic&access_token=${page.page_access_token}`;
    const senderResponse = await fetch(senderUrl);
    const senderData = await senderResponse.json();

    // Criar nova conversa
    const { data: newConv } = await supabase
      .from('mt_meta_conversations')
      .insert({
        tenant_id: page.tenant_id,
        franchise_id: page.franchise_id,
        page_id: page.id,
        platform: 'facebook',
        conversation_id: senderId,
        participant_id: senderId,
        participant_name: senderData.name,
        participant_profile_pic: senderData.profile_pic,
        unread_count: 1,
      })
      .select()
      .single();

    conversationId = newConv.id;

    // ======================================================================
    // CRIAR LEAD AUTOMATICAMENTE (NOVO)
    // ======================================================================

    await createLeadFromConversation({
      supabase,
      conversationId: newConv.id,
      tenantId: page.tenant_id,
      franchiseId: page.franchise_id,
      platform: 'facebook',
      participantId: senderId,
      participantName: senderData.name,
      participantProfilePic: senderData.profile_pic,
    });
  }

  // ... código existente para salvar mensagem ...
}

// ======================================================================
// FUNÇÃO: Criar Lead a partir de Conversa Meta
// ======================================================================

interface CreateLeadFromConversationParams {
  supabase: any;
  conversationId: string;
  tenantId: string;
  franchiseId: string | null;
  platform: 'facebook' | 'instagram';
  participantId: string;
  participantName: string;
  participantUsername?: string;
  participantProfilePic?: string;
}

async function createLeadFromConversation(params: CreateLeadFromConversationParams) {
  const {
    supabase,
    conversationId,
    tenantId,
    franchiseId,
    platform,
    participantId,
    participantName,
    participantUsername,
    participantProfilePic,
  } = params;

  // 1. Verificar se já existe lead com este PSID
  const { data: existingLeadByPSID } = await supabase
    .from('mt_leads')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('meta_participant_id', participantId)
    .is('deleted_at', null)
    .single();

  if (existingLeadByPSID) {
    console.log(`Lead já existe com PSID ${participantId}: ${existingLeadByPSID.id}`);
    // Vincular conversa ao lead existente
    await supabase
      .from('mt_meta_conversations')
      .update({ lead_id: existingLeadByPSID.id })
      .eq('id', conversationId);
    return;
  }

  // 2. Verificar se existe lead com nome similar (match fuzzy)
  // Evitar criar lead duplicado se já existe com nome parecido
  const { data: existingLeadByName } = await supabase
    .from('mt_leads')
    .select('id, nome')
    .eq('tenant_id', tenantId)
    .ilike('nome', `%${participantName}%`)
    .is('deleted_at', null)
    .limit(1)
    .single();

  if (existingLeadByName) {
    console.log(`Lead com nome similar encontrado: ${existingLeadByName.nome}`);
    // Vincular conversa ao lead existente (assumir que é o mesmo)
    await supabase
      .from('mt_meta_conversations')
      .update({ lead_id: existingLeadByName.id })
      .eq('id', conversationId);
    return;
  }

  // 3. Criar novo lead automaticamente
  const canalOrigem = platform === 'facebook' ? 'facebook_messenger' : 'instagram_direct';

  const { data: newLead, error: leadError } = await supabase
    .from('mt_leads')
    .insert({
      tenant_id: tenantId,
      franchise_id: franchiseId,
      nome: participantName,
      status: 'novo',
      etapa_funil: 'novo',
      origem: platform === 'facebook' ? 'Facebook Messenger' : 'Instagram Direct',
      canal_origem: canalOrigem,
      meta_participant_id: participantId,
      meta_participant_username: participantUsername,
      meta_conversation_id: conversationId,
      observacoes: `Lead criado automaticamente via ${platform === 'facebook' ? 'Facebook Messenger' : 'Instagram Direct'}.`,
      tags: [platform, 'auto_criado'],
      temperatura: 'frio', // Temperatura inicial
      score: 10, // Score inicial baixo (primeira interação)
    })
    .select()
    .single();

  if (leadError) {
    console.error('Erro ao criar lead automático:', leadError);
    return;
  }

  console.log(`Lead criado automaticamente: ${newLead.id} (${participantName})`);

  // 4. Vincular conversa ao lead criado
  await supabase
    .from('mt_meta_conversations')
    .update({ lead_id: newLead.id })
    .eq('id', conversationId);

  // 5. Registrar atividade no histórico do lead
  await supabase
    .from('mt_lead_activities')
    .insert({
      tenant_id: tenantId,
      lead_id: newLead.id,
      tipo: 'mensagem_recebida',
      descricao: `Primeira mensagem recebida via ${platform === 'facebook' ? 'Facebook Messenger' : 'Instagram Direct'}`,
      canal: canalOrigem,
      created_by: null, // Sistema
    });
}
```

### Instagram Direct (Similar)

A mesma lógica se aplica para Instagram Direct:

```typescript
async function processInstagramMessage(supabase: any, igAccountId: string, value: any) {
  // ... código similar ao Messenger ...

  // Criar conversa + lead automaticamente
  await createLeadFromConversation({
    supabase,
    conversationId: newConv.id,
    tenantId: page.tenant_id,
    franchiseId: page.franchise_id,
    platform: 'instagram', // DIFERENTE
    participantId: senderId,
    participantName: senderData.name,
    participantUsername: senderData.username, // ADICIONAL
    participantProfilePic: senderData.profile_picture_url,
  });
}
```

### Matching Inteligente

**Critérios de Matching** (em ordem de prioridade):

1. **PSID** (Page-Scoped ID) - 100% de confiança
2. **Nome + Tenant** - 80% de confiança (usar fuzzy matching)
3. **Telefone** (se disponível via API) - 90% de confiança

**Fuzzy Matching** (evitar duplicatas):

```sql
-- Buscar leads com nome similar (similaridade > 80%)
SELECT id, nome, similarity(nome, 'João Silva') as score
FROM mt_leads
WHERE tenant_id = 'X'
  AND similarity(nome, 'João Silva') > 0.8
  AND deleted_at IS NULL
ORDER BY score DESC
LIMIT 1;
```

Requer extensão `pg_trgm`:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_mt_leads_nome_trigram ON mt_leads USING gin(nome gin_trgm_ops);
```

---

## 🎯 Funcionalidades do Módulo

### ✅ Funcionalidades Implementadas

1. **OAuth com Facebook** - Login com 1 clique
2. **Múltiplas páginas** - Cada franquia conecta suas páginas
3. **Conversas unificadas** - Facebook + Instagram em um só lugar
4. **Envio de mensagens** - Texto e mídia
5. **Webhook real-time** - Mensagens chegam instantaneamente
6. **Sincronização de histórico** - Carregar conversas antigas
7. **RLS completo** - Isolamento por tenant/franquia
8. **⚠️ NOVO: Criação automática de Lead** - Ao receber primeira mensagem
9. **⚠️ NOVO: Vinculação Lead ↔ Conversa** - Bidirectional
10. **⚠️ NOVO: Canal de origem** - Rastreamento de origem do lead
11. **⚠️ NOVO: Módulo ativável** - Pode ser ligado/desligado por tenant

### 🔄 Fluxo Completo (com Lead)

```
1. Cliente envia mensagem no Facebook/Instagram
   ↓
2. Webhook do Meta chama supabase/functions/meta-webhook
   ↓
3. Sistema verifica se conversa já existe
   ↓
4. Se NÃO existir:
   - Cria conversa em mt_meta_conversations
   - Verifica se existe lead com mesmo PSID ou nome similar
   - Se NÃO existir lead: CRIA AUTOMATICAMENTE
   - Vincula conversa ↔ lead
   ↓
5. Salva mensagem em mt_meta_messages
   ↓
6. Frontend recebe via Real-Time subscription
   ↓
7. Notificação visual + som (opcional)
```

---

## 🚀 Vantagens da Solução OAuth

### ✅ OAuth (Login com Facebook) - RECOMENDADO

**Vantagens:**
1. **UX superior** - Um clique para conectar
2. **Segurança** - Tokens gerenciados pelo Meta
3. **Renovação automática** - Tokens de longa duração (60 dias)
4. **Múltiplas páginas** - Usuário pode ter várias páginas
5. **Permissões granulares** - Controle fino de acessos
6. **Sem copiar/colar** - Zero fricção

**Desvantagens:**
1. Requer app no Meta for Developers
2. Processo de aprovação do Meta (se usar em produção)
3. Configuração inicial mais complexa

### ❌ API Keys Manuais

**Vantagens:**
1. Mais simples inicialmente
2. Sem dependência de OAuth flow

**Desvantagens:**
1. UX ruim - Copiar/colar tokens
2. Tokens expiram - Precisam renovar manualmente
3. Sem múltiplas páginas - Um token por página
4. Difícil gestão - Tokens em texto plano
5. Menos seguro - Risco de vazamento

---

## 📊 Estimativa de Esforço (REVISADA APÓS ANÁLISE)

### Versão Original (Planejada)

| Fase | Tempo Estimado | Complexidade |
|------|----------------|--------------|
| Banco de Dados | 5h | Média |
| Registro de Módulo | 1h | Baixa |
| Configuração Meta | 2h | Baixa |
| Edge Functions | 8h | Alta |
| Edge Functions - Auto Lead | 3h | Média |
| Frontend - Hooks | 4h | Média |
| Frontend - Páginas | 6h | Média |
| Frontend - Integração Leads | 2h | Média |
| Testes | 5h | Média |
| **SUBTOTAL** | **36h** | **Alta** |

### 🚨 Melhorias CRÍTICAS (Obrigatórias para Produção)

| Melhoria | Tempo | Prioridade | Justificativa |
|----------|-------|------------|---------------|
| **Rate Limiting System** | +6h | 🔴 CRÍTICO | Meta limita 200 msgs/h - bloqueio garantido sem queue |
| **Token Auto-Refresh** | +4h | 🔴 CRÍTICO | Tokens expiram em 60 dias - perda de conexão |
| **Idempotência Completa** | +3h | 🔴 CRÍTICO | Webhooks duplicados = leads duplicados |
| **SUBTOTAL CRÍTICO** | **+13h** | - | **TOTAL: 49h** |

### ⚡ Melhorias de SEGURANÇA (Altamente Recomendadas)

| Melhoria | Tempo | Prioridade | Justificativa |
|----------|-------|------------|---------------|
| **Fuzzy Matching Aprimorado** | +2h | 🟠 ALTO | Evitar falsos positivos (João Silva ≠ João da Silva Santos) |
| **Webhook Security** | +2h | 🟠 ALTO | IP allowlist + rate limiting + signature |
| **Token Encryption** | +3h | 🟠 ALTO | Supabase Vault - criptografar tokens em repouso |
| **SUBTOTAL SEGURANÇA** | **+7h** | - | **TOTAL: 56h** |

### 🎁 Features ADICIONAIS (Opcional)

| Feature | Tempo | Prioridade | Justificativa |
|---------|-------|------------|---------------|
| **Instagram Stories** | +4h | 🟡 MÉDIO | Story mentions + replies (Instagram específico) |
| **Quick Replies & Templates** | +3h | 🟡 MÉDIO | Templates pré-configurados (Messenger) |
| **Performance Optimization** | +4h | 🟡 MÉDIO | Batch processing + cache + sync incremental |
| **SUBTOTAL FEATURES** | **+11h** | - | **TOTAL: 67h** |

### 📊 Comparativo de Versões

| Versão | Tempo Dev | Aprovação Meta | Timeline Total | Funcionalidade | Segurança | Performance |
|--------|-----------|----------------|----------------|----------------|-----------|-------------|
| **Mínima** | 36h (4-5 dias) | 3-6 semanas | ~5-8 semanas | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| **Crítica** | 49h (6-7 dias) | 3-6 semanas | ~6-9 semanas | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Segura** | 56h (7-8 dias) | 3-6 semanas | ~7-10 semanas | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Completa** | 67h (9-10 dias) | 3-6 semanas | ~8-12 semanas | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

### ⏱️ Timeline Realista Recomendada

```
SEMANA 0 (Pré-Desenvolvimento):
├── Criar app no Meta for Developers (1h)
├── Configurar Business Use Case (2h)
├── Preparar documentação para App Review (4-8h)
├── SUBMETER PARA APP REVIEW → Aguardar 3-6 semanas
└── TOTAL: 7-11h

SPRINT 1 (5 dias úteis - Desenvolvimento Core):
├── Banco de Dados (7h com melhorias)
├── Edge Functions (11h)
├── Frontend (12h)
└── SUBTOTAL: 30h → Development Mode ativo (25 testadores)

SPRINT 2 (2 dias úteis - Melhorias Críticas):
├── Rate Limiting System (6h)
├── Token Auto-Refresh (4h)
├── Idempotência (3h)
└── SUBTOTAL: 13h → Testes com franquia piloto

SPRINT 3 (1 dia útil - Segurança):
├── Fuzzy Matching (2h)
├── Webhook Security (2h)
├── Token Encryption (3h)
└── SUBTOTAL: 7h → Homologação completa

AGUARDAR APROVAÇÃO META: 3-6 SEMANAS

SPRINT 4 (Pós-Aprovação - 1.5 dias):
├── Migrar para Production Mode
├── Testar com páginas reais
├── Features adicionais (11h opcional)
└── Deploy gradual por franquia

TOTAL TIMELINE:
└── Desenvolvimento: 9-10 dias úteis
└── Aprovação: 3-6 semanas (NÃO controlável)
└── TOTAL: 5-8 semanas (versão crítica)
         ou 8-12 semanas (versão completa)
```

### 💡 Recomendação Final

**VERSÃO CRÍTICA (49h) é o MÍNIMO VIÁVEL PARA PRODUÇÃO**:
- ✅ Não bloqueia por rate limiting
- ✅ Não perde conexão por tokens expirados
- ✅ Não cria leads duplicados
- ❌ Mas sem criptografia de tokens (médio risco)
- ❌ Mas sem fuzzy matching aprimorado (pode ter duplicatas)

**VERSÃO SEGURA (56h) é a RECOMENDADA**:
- ✅ Todos os benefícios da Crítica
- ✅ Tokens criptografados (Vault)
- ✅ Fuzzy matching com 85%+ similaridade
- ✅ Webhook com IP allowlist + rate limiting

**VERSÃO COMPLETA (67h) é a IDEAL** (se houver tempo):
- ✅ Todos os benefícios da Segura
- ✅ Instagram Stories
- ✅ Quick Replies & Templates
- ✅ Performance otimizada (batch + cache)

---

## 📋 Checklist COMPLETO de Implementação

### ✅ Fase 1: Banco de Dados (5h)

**1.1 - Criar Tabelas MT**:
- [ ] `mt_meta_accounts` (contas OAuth)
- [ ] `mt_meta_pages` (páginas Facebook + perfis Instagram)
- [ ] `mt_meta_conversations` (conversas)
- [ ] `mt_meta_messages` (mensagens)
- [ ] `mt_meta_webhook_events` (log de webhooks)

**1.2 - Habilitar RLS**:
- [ ] Policies SELECT/INSERT/UPDATE/DELETE para 5 tabelas
- [ ] Testar isolamento por tenant

**1.3 - Registrar Módulo**:
- [ ] Inserir 'meta_messenger' em `mt_modules`
- [ ] Habilitar para todos os tenants em `mt_tenant_modules`

**1.4 - Alterações em mt_leads**:
- [ ] Adicionar coluna `canal_origem` (facebook_messenger, instagram_direct, etc.)
- [ ] Adicionar coluna `meta_conversation_id` (FK para mt_meta_conversations)
- [ ] Adicionar coluna `meta_participant_id` (PSID)
- [ ] Adicionar coluna `meta_participant_username` (Instagram)
- [ ] Criar índices

---

### ✅ Fase 2: Configuração Meta (2h)

- [ ] Criar app no Meta for Developers
- [ ] Adicionar produtos: Messenger + Instagram
- [ ] Configurar permissões OAuth (pages_messaging, instagram_manage_messages, etc.)
- [ ] Obter App ID e App Secret
- [ ] Configurar Redirect URI: `https://supabase.yeslaser.com.br/functions/v1/meta-oauth-callback`
- [ ] Configurar Webhook URL: `https://supabase.yeslaser.com.br/functions/v1/meta-webhook`
- [ ] Gerar Verify Token: `meta_webhook_yeslaser_2026`

---

### ✅ Fase 3: Edge Functions (8h)

**3.1 - meta-oauth-callback**:
- [ ] Processar callback do Facebook
- [ ] Trocar código por access token
- [ ] Obter token de longa duração (60 dias)
- [ ] Buscar informações do usuário
- [ ] Salvar em `mt_meta_accounts`
- [ ] Buscar e salvar páginas/perfis em `mt_meta_pages`

**3.2 - meta-webhook**:
- [ ] Verificação do webhook (GET request)
- [ ] Receber eventos do Meta (POST request)
- [ ] Processar mensagens do Messenger
- [ ] Processar mensagens do Instagram
- [ ] Salvar em `mt_meta_conversations` e `mt_meta_messages`
- [ ] Log em `mt_meta_webhook_events`

**3.3 - meta-send-message**:
- [ ] Enviar mensagem de texto via Send API
- [ ] Enviar mídia (imagem, vídeo, arquivo)
- [ ] Salvar mensagem enviada no banco

**3.4 - meta-sync**:
- [ ] Sincronizar conversas antigas do Messenger
- [ ] Sincronizar conversas antigas do Instagram
- [ ] Salvar histórico no banco

---

### ⚠️ Fase 4: Edge Functions - Auto Lead (3h) **NOVO**

**4.1 - Lógica de Criação Automática**:
- [ ] Implementar função `createLeadFromConversation()`
- [ ] Verificar se lead já existe por PSID
- [ ] Verificar se lead já existe por nome similar (fuzzy matching)
- [ ] Criar lead automaticamente se não existir
- [ ] Vincular conversa ao lead (`lead_id` em mt_meta_conversations)
- [ ] Registrar atividade em `mt_lead_activities`

**4.2 - Matching Inteligente**:
- [ ] Instalar extensão `pg_trgm` (fuzzy matching)
- [ ] Criar índice trigram em `mt_leads.nome`
- [ ] Implementar busca por similaridade (> 80%)

**4.3 - Canal de Origem**:
- [ ] Registrar `canal_origem` ao criar lead
- [ ] Diferenciar entre facebook_messenger e instagram_direct

---

### ✅ Fase 5: Frontend - Hooks MT (4h)

**5.1 - Hooks**:
- [ ] `useMetaAccountsMT()` - CRUD de contas OAuth
- [ ] `useMetaPagesMT()` - CRUD de páginas conectadas
- [ ] `useMetaConversationsMT()` - Conversas + real-time
- [ ] `useMetaMessagesMT()` - Mensagens + paginação infinita

**5.2 - Padrão MT**:
- [ ] Todos os hooks usam `useTenantContext()`
- [ ] Query keys incluem `tenant?.id`
- [ ] Filtro por `accessLevel`
- [ ] Soft delete com `deleted_at`

---

### ✅ Fase 6: Frontend - Páginas (6h)

**6.1 - Componentes**:
- [ ] `MetaConnectButton.tsx` - Botão para OAuth
- [ ] `MetaAccountCard.tsx` - Card de conta conectada
- [ ] `MetaPageCard.tsx` - Card de página/perfil
- [ ] `MetaConversationList.tsx` - Lista de conversas
- [ ] `MetaChatMessages.tsx` - Mensagens da conversa
- [ ] `MetaChatInput.tsx` - Input para enviar mensagem

**6.2 - Páginas**:
- [ ] `src/pages/MetaMessenger.tsx` - Listagem de conversas
- [ ] `src/pages/MetaChat.tsx` - Conversa individual
- [ ] `src/pages/MetaConfig.tsx` - Configurações (conectar/desconectar)

**6.3 - Rotas**:
- [ ] `/meta-messenger` - Listagem
- [ ] `/meta-messenger/:conversationId` - Chat
- [ ] `/meta-messenger/config` - Configurações

---

### ⚠️ Fase 7: Frontend - Integração Leads (2h) **NOVO**

**7.1 - LeadDetail.tsx**:
- [ ] Exibir canal de origem (badge)
- [ ] Link para conversa do Meta (se `meta_conversation_id` existir)
- [ ] Botão "Ver Conversa no Meta Messenger"

**7.2 - MetaChat.tsx**:
- [ ] Exibir informações do lead vinculado (card lateral)
- [ ] Botão "Ver Lead" (link para LeadDetail)
- [ ] Mostrar score, temperatura, status do lead

**7.3 - Leads.tsx (Filtros)**:
- [ ] Filtro por canal de origem
- [ ] Badge visual para leads do Meta

---

### ✅ Fase 8: Módulo Ativável (1h) **NOVO**

**8.1 - App.tsx**:
- [ ] Rotas condicionais: `{isModuleActive('meta_messenger') && ...}`

**8.2 - DashboardLayout**:
- [ ] Menu lateral condicional
- [ ] Badge de contador de não lidas (opcional)

**8.3 - Configurações**:
- [ ] Página para ativar/desativar módulo (Tenant Admin)

---

### ✅ Fase 9: Testes (5h)

**9.1 - Testes de OAuth**:
- [ ] Conectar Facebook com sucesso
- [ ] Conectar Instagram com sucesso
- [ ] Verificar tokens salvos corretamente
- [ ] Verificar páginas importadas

**9.2 - Testes de Webhook**:
- [ ] Receber mensagem do Messenger
- [ ] Receber mensagem do Instagram
- [ ] Verificar conversa criada
- [ ] Verificar mensagem salva

**9.3 - Testes de Auto-Criação de Lead**:
- [ ] Receber primeira mensagem de novo contato
- [ ] Verificar lead criado automaticamente
- [ ] Verificar `canal_origem` correto
- [ ] Verificar vinculação conversa ↔ lead
- [ ] Testar matching por nome (evitar duplicatas)

**9.4 - Testes de Envio**:
- [ ] Enviar mensagem de texto
- [ ] Enviar imagem
- [ ] Enviar vídeo
- [ ] Verificar status de entrega

**9.5 - Testes de Sincronização**:
- [ ] Sincronizar conversas antigas do Messenger
- [ ] Sincronizar conversas antigas do Instagram
- [ ] Verificar histórico completo

**9.6 - Testes de Permissões RLS**:
- [ ] Platform admin vê todas as conversas
- [ ] Tenant admin vê apenas seu tenant
- [ ] Franchise admin vê apenas sua franquia
- [ ] User sem permissão não vê nada

**9.7 - Testes de Módulo**:
- [ ] Desativar módulo → rotas/menu desaparecem
- [ ] Ativar módulo → rotas/menu aparecem

---

## 🎯 Conclusão e Próximos Passos

### ✅ Plano COMPLETO

A integração com Facebook Messenger e Instagram Direct está **100% planejada** com:

1. ✅ **OAuth com Facebook** - 1 clique para conectar
2. ✅ **Multi-Tenant completo** - Isolamento por tenant/franquia
3. ✅ **5 Tabelas MT** - Arquitetura escalável
4. ✅ **RLS completo** - Segurança em todas as tabelas
5. ✅ **4 Edge Functions** - Webhook, OAuth, Sync, Send
6. ✅ **4 Hooks MT** - Padrão consistente com sistema
7. ✅ **3 Páginas** - UX sem modals (páginas dedicadas)
8. ✅ **⚠️ NOVO: Criação automática de Leads** - Ao receber primeira mensagem
9. ✅ **⚠️ NOVO: Vinculação Lead ↔ Conversa** - Bidirectional
10. ✅ **⚠️ NOVO: Canal de Origem** - Rastreamento de origem do lead
11. ✅ **⚠️ NOVO: Módulo Ativável** - Pode ser ligado/desligado por tenant

### 📊 Estimativa Final

- **Tempo**: ~36 horas (4-5 dias úteis)
- **Complexidade**: Alta
- **Benefício**: Alto (2 canais em 1 só lugar)

### 🚀 Próximos Passos

1. **Criar app no Meta for Developers** (30 min)
2. **Implementar tabelas MT no banco** (2h)
3. **Registrar módulo em mt_modules** (30 min)
4. **Criar Edge Functions** (11h total)
5. **Implementar frontend** (12h total)
6. **Testes completos** (5h)

### 🎁 Bônus Implementado

**Criação Automática de Leads**:
- 🤖 Sistema detecta primeiro contato via Meta
- 🔍 Busca lead existente por PSID ou nome
- ✨ Cria lead automaticamente se não existir
- 🔗 Vincula conversa ↔ lead
- 📊 Registra canal de origem (facebook_messenger ou instagram_direct)
- 📝 Adiciona atividade no histórico do lead

**Módulo Ativável**:
- ⚙️ Pode ser ligado/desligado por tenant
- 🎯 Não aparece no menu se desativado
- 🔒 Rotas protegidas por `isModuleActive('meta_messenger')`

---

## 🎉 Sistema Pronto para Implementação!

O plano está **completo, detalhado e pronto** para execução. Todos os requisitos foram contemplados:

✅ Multi-tenant com RLS
✅ OAuth (melhor UX)
✅ Criação automática de Leads
✅ Vinculação Lead ↔ Conversa
✅ Canal de origem rastreado
✅ Módulo ativável por tenant
✅ Real-time subscriptions
✅ Envio de mensagens e mídia
✅ Sincronização de histórico

**Está pronto para começar a implementação?** 🚀

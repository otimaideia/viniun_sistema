# ✅ Configuração de Webhooks Meta (Facebook Messenger + Instagram Direct)

**Data**: 06/02/2026 - 02:30
**Status**: ✅ Edge Function atualizada com secrets do banco

---

## 🎯 Visão Geral

Este guia explica como configurar webhooks do Meta para receber mensagens do Facebook Messenger e Instagram Direct em tempo real.

### Arquitetura

```
Facebook/Instagram → Meta Webhook → Edge Function → Banco de Dados MT
                                   ↓
                          mt_meta_conversations
                          mt_meta_messages
                          mt_meta_webhook_events
```

---

## 📋 Pré-Requisitos

- [x] App criado no Meta for Developers
- [x] Você é Admin do app
- [x] Edge Functions `meta-oauth-callback` e `meta-webhook` atualizadas
- [x] Secrets salvos na tabela `edge_function_secrets`
- [x] Domínio HTTPS configurado (webhook requer HTTPS)

---

## 🛠️ Passo 1: Configurar Caso de Uso "Login do Facebook"

### No Meta for Developers:

1. Ir para: **Casos de uso** (Use Cases)
2. Encontrar: **"Autenticar e solicitar dados de usuários com o Login do Facebook"**
3. Clicar: **"Personalizar"**
4. Configurar:

#### **Permissões OAuth** (Permissions):

Adicionar/solicitar as seguintes permissões:

- ✅ `email` - Acesso ao email do usuário
- ✅ `public_profile` - Perfil público
- ✅ `pages_show_list` - Listar páginas gerenciadas
- ✅ `pages_manage_metadata` - Gerenciar metadados das páginas
- ✅ `pages_messaging` - Enviar/receber mensagens (Messenger)
- ✅ `instagram_basic` - Acesso básico ao Instagram
- ✅ `instagram_manage_messages` - Gerenciar mensagens do Instagram

#### **OAuth Redirect URIs**:

Adicionar a URL do callback:

```
https://supabase.yeslaser.com.br/functions/v1/meta-oauth-callback
```

#### **Configurações de Segurança**:

- ✅ **Enforce HTTPS**: Habilitado
- ✅ **Use Strict Mode**: Habilitado

---

## 🛠️ Passo 2: Adicionar Webhooks

### 2.1 - Configurar Webhook

No Meta for Developers:

1. Menu lateral → **"Configurações do app"** (App Settings) → **"Webhooks"**
2. OU: Menu lateral → **"Funções do app"** (App Functions) → **"Webhooks"**
3. Clicar: **"Add Webhook"** ou **"Configure Webhooks"**

### 2.2 - Configuração do Webhook

| Campo | Valor |
|-------|-------|
| **Callback URL** | `https://supabase.yeslaser.com.br/functions/v1/meta-webhook` |
| **Verify Token** | `yeslaser_meta_webhook_2025` |

**IMPORTANTE**: O Verify Token DEVE ser exatamente este valor, pois está salvo no banco em `edge_function_secrets`.

### 2.3 - Verificação Automática

Ao clicar "Verify and Save", o Meta fará:

```
GET https://supabase.yeslaser.com.br/functions/v1/meta-webhook
    ?hub.mode=subscribe
    &hub.verify_token=yeslaser_meta_webhook_2025
    &hub.challenge=RANDOM_STRING
```

A Edge Function responderá com o `challenge` se o token estiver correto.

✅ **Sucesso**: "Webhook verified successfully"
❌ **Erro**: "Invalid verify token" → Verificar token no banco

---

## 🛠️ Passo 3: Subscrever Campos (Subscription Fields)

### Para Messenger (Facebook Pages):

Inscrever-se nos seguintes eventos:

| Campo | Descrição |
|-------|-----------|
| ✅ `messages` | Nova mensagem recebida |
| ✅ `message_deliveries` | Mensagem entregue |
| ✅ `message_reads` | Mensagem lida |
| ✅ `messaging_postbacks` | Cliques em botões |
| ✅ `messaging_optins` | Usuário aceitou receber mensagens |

### Para Instagram:

Inscrever-se nos seguintes eventos:

| Campo | Descrição |
|-------|-----------|
| ✅ `messages` | Nova mensagem Direct recebida |
| ✅ `messaging_postbacks` | Respostas de Stories |

---

## 🛠️ Passo 4: Subscrever Páginas Individuais

**CRÍTICO**: Depois de configurar o webhook, você precisa **subscrever cada página** aos eventos.

### Via Graph API Explorer (Recomendado)

1. Ir para: [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Selecionar seu app no dropdown
3. Gerar Access Token com permissões `pages_manage_metadata`
4. Fazer POST:

```
POST /{page-id}/subscribed_apps
    ?subscribed_fields=messages,message_deliveries,message_reads,messaging_postbacks
    &access_token=PAGE_ACCESS_TOKEN
```

### Via cURL

```bash
# Substituir:
# - PAGE_ID: ID da página do Facebook
# - PAGE_ACCESS_TOKEN: Token de acesso da página

curl -X POST "https://graph.facebook.com/v24.0/{PAGE_ID}/subscribed_apps" \
  -d "subscribed_fields=messages,message_deliveries,message_reads,messaging_postbacks" \
  -d "access_token={PAGE_ACCESS_TOKEN}"
```

### Via Frontend (Automático)

Após OAuth conectar, o frontend pode chamar a mutation `subscribeWebhook` do hook `useMetaPagesMT`:

```typescript
const { subscribeWebhook } = useMetaPagesMT();

// Para cada página ativa
subscribeWebhook.mutate(pageId);
```

---

## 🧪 Passo 5: Testar Webhook

### Teste Manual

1. Enviar mensagem para uma página conectada via Messenger ou Instagram
2. Verificar logs na Edge Function (Coolify/Supabase)
3. Verificar banco de dados:

```sql
-- Verificar eventos recebidos
SELECT * FROM mt_meta_webhook_events
ORDER BY created_at DESC
LIMIT 10;

-- Verificar mensagens salvas
SELECT * FROM mt_meta_messages
ORDER BY created_at DESC
LIMIT 10;

-- Verificar conversas criadas
SELECT * FROM mt_meta_conversations
ORDER BY created_at DESC
LIMIT 10;
```

### Teste via Meta Test Tool

No Meta for Developers:

1. Menu → **"Webhooks"** → **"Test"**
2. Selecionar evento: `messages`
3. Clicar **"Send Test"**
4. Verificar resposta: `{"success": true}`

---

## 🔐 Segurança do Webhook

A Edge Function `meta-webhook` implementa várias camadas de segurança:

### 1. Validação de Assinatura HMAC SHA256

```typescript
x-hub-signature-256: sha256=HMAC_HASH
```

A Edge Function:
1. Recebe o body raw
2. Calcula HMAC SHA256 usando `META_APP_SECRET`
3. Compara com o header `x-hub-signature-256`
4. Rejeita se não coincidir (403 Forbidden)

### 2. Verify Token

No desafio de verificação (GET), valida o token:

```typescript
if (token === VERIFY_TOKEN) {
  return challenge
}
```

### 3. Idempotência

Cada mensagem tem um `unique_key`:

```typescript
unique_key: `${platform}_${message_id}`
```

Se receber evento duplicado, ignora:

```typescript
const { data: existing } = await supabase
  .from('mt_meta_messages')
  .select('id')
  .eq('unique_key', uniqueKey)
  .single()

if (existing) {
  console.log('Mensagem duplicada ignorada')
  return
}
```

### 4. Log de Eventos

Todos os eventos são salvos em `mt_meta_webhook_events`:

```sql
CREATE TABLE mt_meta_webhook_events (
  id UUID PRIMARY KEY,
  event_type VARCHAR(100),
  platform VARCHAR(20),
  page_id VARCHAR(255),
  payload JSONB,
  processed BOOLEAN DEFAULT FALSE,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📊 Estrutura de Dados

### Fluxo de Dados

```
Webhook Event (POST) →
  ├── Salvar em mt_meta_webhook_events
  ├── Processar entry
  │   ├── Buscar página em mt_meta_pages
  │   ├── Buscar/criar conversa em mt_meta_conversations
  │   │   └── Auto-criar lead em mt_leads (se incoming)
  │   └── Salvar mensagem em mt_meta_messages
  └── Retornar {success: true}
```

### Tabelas Afetadas

| Tabela | O Que É Salvo |
|--------|---------------|
| `mt_meta_webhook_events` | Log completo do evento recebido |
| `mt_meta_conversations` | Conversas criadas/atualizadas |
| `mt_meta_messages` | Mensagens recebidas/enviadas |
| `mt_leads` | Leads criados automaticamente |
| `mt_lead_activities` | Atividade "Nova mensagem recebida" |

---

## 🐛 Troubleshooting

### Erro: "Invalid verify token"

**Causa**: Token configurado no Meta não bate com o do banco.

**Solução**:
```sql
-- Verificar token no banco
SELECT * FROM edge_function_secrets WHERE key = 'META_WEBHOOK_VERIFY_TOKEN';

-- Deve retornar: yeslaser_meta_webhook_2025
```

### Erro: "Invalid signature"

**Causa**: `META_APP_SECRET` incorreto.

**Solução**:
```sql
-- Verificar secret no banco
SELECT * FROM edge_function_secrets WHERE key = 'META_APP_SECRET';

-- Copiar APP_SECRET do Meta for Developers → App Settings → Basic
```

### Mensagens não chegam

**Checklist**:
- [ ] Webhook configurado no Meta?
- [ ] Página subscrita aos eventos?
- [ ] App em Development Mode permite sua página?
- [ ] Edge Function está rodando?
- [ ] Verificar logs da Edge Function

```bash
# Logs no Coolify/Supabase
# Procurar por: [Meta Webhook]
```

### Duplicatas de mensagens

**Normal**: Meta pode reenviar eventos.

**Solução**: Idempotência já implementada via `unique_key`.

---

## ✅ Checklist Final

- [ ] **Caso de uso "Login do Facebook" personalizado** com permissões
- [ ] **Webhook configurado** (callback URL + verify token)
- [ ] **Eventos subscritos** (messages, deliveries, reads, postbacks)
- [ ] **Páginas subscritas** via Graph API ou frontend
- [ ] **Teste realizado** enviando mensagem real
- [ ] **Banco de dados verificado** (eventos, mensagens, conversas)
- [ ] **Logs verificados** na Edge Function

---

## 📚 Referências

- [Meta Graph API - Webhooks](https://developers.facebook.com/docs/graph-api/webhooks/)
- [Messenger Platform - Webhooks](https://developers.facebook.com/docs/messenger-platform/webhooks)
- [Instagram Messaging - Webhooks](https://developers.facebook.com/docs/instagram-api/guides/webhooks)
- [App Subscriptions Reference](https://developers.facebook.com/docs/graph-api/reference/app/subscriptions/)

---

**Próximo passo**: Configurar webhooks no Meta for Developers! 🚀

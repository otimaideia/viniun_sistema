# Deploy Meta Messenger & Instagram - Edge Functions

Instruções para configurar e deployar as 5 Edge Functions da integração Meta.

---

## 📋 Pré-requisitos

### 1. Criar App no Meta for Developers

1. Acesse https://developers.facebook.com/apps/
2. Clique em "Criar App"
3. Selecione tipo: **"Empresa"**
4. Nome do app: `YESlaser Meta Integration`
5. Email de contato: seu email
6. Criar App

### 2. Configurar Produtos

**Adicionar produtos ao app:**
- ✅ Messenger
- ✅ Instagram

### 3. Obter Credenciais

Em **Configurações Básicas**:
- `App ID` (META_APP_ID)
- `App Secret` (META_APP_SECRET)

---

## 🔐 Variáveis de Ambiente

Adicionar no Supabase (Settings → Edge Functions → Secrets):

```bash
# Meta App Credentials
META_APP_ID=your_app_id_here
META_APP_SECRET=your_app_secret_here

# Webhook
META_WEBHOOK_VERIFY_TOKEN=yeslaser_meta_webhook_2025

# Redirect URI
META_REDIRECT_URI=https://supabase.yeslaser.com.br/functions/v1/meta-oauth-callback
```

**Como adicionar:**
```bash
# Supabase CLI
supabase secrets set META_APP_ID=12345678
supabase secrets set META_APP_SECRET=abcdef123456
supabase secrets set META_WEBHOOK_VERIFY_TOKEN=yeslaser_meta_webhook_2025
supabase secrets set META_REDIRECT_URI=https://supabase.yeslaser.com.br/functions/v1/meta-oauth-callback

# Ou via Dashboard:
# Settings → Edge Functions → Add new secret
```

---

## 🚀 Deploy das Functions

### Opção 1: Deploy Individual

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/sites/yeslaserpainel

# 1. meta-oauth-callback
supabase functions deploy meta-oauth-callback

# 2. meta-webhook
supabase functions deploy meta-webhook

# 3. meta-send-message
supabase functions deploy meta-send-message

# 4. meta-sync
supabase functions deploy meta-sync

# 5. meta-token-refresh
supabase functions deploy meta-token-refresh
```

### Opção 2: Deploy de Todas (Recomendado)

```bash
# Deploy de todas as functions Meta
supabase functions deploy meta-oauth-callback && \
supabase functions deploy meta-webhook && \
supabase functions deploy meta-send-message && \
supabase functions deploy meta-sync && \
supabase functions deploy meta-token-refresh

echo "✅ Todas as 5 Edge Functions Meta foram deployadas!"
```

---

## 🔗 Configurar App no Meta

### 1. Configurar OAuth Redirect

Em **Meta for Developers → Seu App → Configurações do produto → Messenger**:

**URIs de Redirecionamento OAuth Válidos**:
```
https://supabase.yeslaser.com.br/functions/v1/meta-oauth-callback
```

### 2. Configurar Webhook

Em **Meta for Developers → Seu App → Produtos → Messenger → Configurações**:

**URL de Callback do Webhook**:
```
https://supabase.yeslaser.com.br/functions/v1/meta-webhook
```

**Token de Verificação**:
```
yeslaser_meta_webhook_2025
```

**Campos de Assinatura** (subscription fields):
- [x] messages
- [x] message_deliveries
- [x] message_reads
- [x] messaging_postbacks
- [x] messaging_referrals

Clicar em **"Verificar e Salvar"**.

### 3. Repetir para Instagram

Em **Produtos → Instagram → Configurações**:

Mesma URL de webhook e token de verificação.

**Campos de Assinatura** (subscription fields):
- [x] messages
- [x] message_reactions
- [x] messaging_seen

---

## 🔑 Permissões Necessárias (App Review)

### Permissões do App

Em **Meta for Developers → Seu App → Permissões do App**:

**Messenger Platform:**
- ✅ `pages_show_list` (Aprovação Padrão)
- ⚠️ `pages_messaging` (REQUER App Review)
- ⚠️ `pages_manage_metadata` (REQUER App Review)

**Instagram Platform:**
- ⚠️ `instagram_manage_messages` (REQUER App Review)
- ⚠️ `instagram_basic` (REQUER App Review)

### Submeter para App Review

1. **Preparar Documentação**:
   - Screenshots do sistema recebendo mensagens
   - Vídeo demo (max 3 minutos) mostrando uso
   - Descrição detalhada de como as permissões são usadas

2. **Submeter**:
   - Vá em "App Review" → "Permissões e Recursos"
   - Clique em "Request" para cada permissão necessária
   - Preencher formulário com detalhes
   - Anexar screenshots/vídeo
   - Submeter

3. **Aguardar Aprovação**:
   - Tempo médio: **3-6 semanas**
   - Status: Development Mode → Production Mode

**IMPORTANTE**: Enquanto aguarda aprovação, o app funciona em **Development Mode** (limite de 25 testadores).

---

## 🧪 Testar Functions

### 1. Testar meta-oauth-callback

**URL de teste (browser)**:
```
https://www.facebook.com/v19.0/dialog/oauth?
  client_id=YOUR_APP_ID&
  redirect_uri=https://supabase.yeslaser.com.br/functions/v1/meta-oauth-callback&
  scope=pages_show_list,pages_messaging,pages_manage_metadata&
  state=BASE64_ENCODED_STATE
```

Onde `state` é: `base64(tenantId|franchiseId|userId)`

**Exemplo:**
```bash
# State: "d9f8e7c6-b5a4-3210-9876-543210fedcba|abc123||user456"
echo -n "d9f8e7c6-b5a4-3210-9876-543210fedcba||user456" | base64
# Resultado: ZDlmOGU3YzYtYjVhNC0zMjEwLTk4NzYtNTQzMjEwZmVkY2JhfHx1c2VyNDU2
```

### 2. Testar meta-webhook (Verificação)

```bash
curl "https://supabase.yeslaser.com.br/functions/v1/meta-webhook?hub.mode=subscribe&hub.verify_token=yeslaser_meta_webhook_2025&hub.challenge=test123"

# Deve retornar: test123
```

### 3. Testar meta-send-message

```bash
SERVICE_KEY="your_service_role_key"

curl -X POST "https://supabase.yeslaser.com.br/functions/v1/meta-send-message" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{
    "page_id": "uuid_da_pagina",
    "recipient_id": "PSID_do_destinatario",
    "message_type": "text",
    "content": "Olá! Esta é uma mensagem de teste."
  }'
```

### 4. Testar meta-sync

```bash
curl -X POST "https://supabase.yeslaser.com.br/functions/v1/meta-sync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{
    "page_id": "uuid_da_pagina",
    "limit": 10
  }'
```

### 5. Testar meta-token-refresh (Dry Run)

```bash
curl -X POST "https://supabase.yeslaser.com.br/functions/v1/meta-token-refresh" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{
    "dry_run": true
  }'
```

---

## 🔄 Background Job (Token Refresh)

### Opção 1: pg_cron (Supabase nativo)

```sql
-- Criar cron job para executar diariamente às 3h da manhã
SELECT cron.schedule(
  'meta-token-refresh-daily',
  '0 3 * * *', -- Todo dia às 3h
  $$
  SELECT net.http_post(
    url := 'https://supabase.yeslaser.com.br/functions/v1/meta-token-refresh',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := jsonb_build_object('dry_run', false)
  );
  $$
);

-- Verificar jobs
SELECT * FROM cron.job;

-- Remover job (se necessário)
SELECT cron.unschedule('meta-token-refresh-daily');
```

### Opção 2: GitHub Actions

Criar `.github/workflows/meta-token-refresh.yml`:
```yaml
name: Meta Token Refresh

on:
  schedule:
    - cron: '0 3 * * *' # Todo dia às 3h UTC

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: |
          curl -X POST "https://supabase.yeslaser.com.br/functions/v1/meta-token-refresh" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -d '{"dry_run": false}'
```

---

## 📊 Monitoramento

### Logs das Functions

```bash
# Ver logs em tempo real
supabase functions logs meta-oauth-callback --tail

# Ver logs de todas as functions Meta
supabase functions logs meta-oauth-callback meta-webhook meta-send-message meta-sync meta-token-refresh
```

### Métricas no Banco

```sql
-- Verificar webhook events processados
SELECT
  event_type,
  platform,
  processed,
  COUNT(*) as total
FROM mt_meta_webhook_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type, platform, processed
ORDER BY total DESC;

-- Verificar mensagens enviadas (rate limiting)
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  platform,
  COUNT(*) as total_messages
FROM mt_meta_messages
WHERE direction = 'outgoing'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour, platform
ORDER BY hour DESC;

-- Verificar fila de mensagens
SELECT
  status,
  COUNT(*) as total
FROM mt_meta_message_queue
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

---

## 🐛 Troubleshooting

### Erro: "Invalid signature" no webhook

**Causa**: `META_APP_SECRET` incorreto ou body da request alterado.

**Solução**:
1. Verificar se `META_APP_SECRET` está correto
2. Conferir configuração no Meta for Developers
3. Ver logs: `supabase functions logs meta-webhook`

### Erro: "Rate limit exceeded"

**Causa**: Excedeu 200 msgs/h (FB) ou 100 msgs/h (IG).

**Solução**:
- Mensagens são automaticamente enfileiradas
- Verificar fila: `SELECT * FROM mt_meta_message_queue WHERE status = 'pending'`
- Aguardar 1 hora para reset do limite

### Erro: "Token expired"

**Causa**: Access token expirou (60 dias).

**Solução**:
1. Executar `meta-token-refresh` manualmente
2. Se falhar, reconectar conta via OAuth
3. Configurar background job para executar diariamente

---

## ✅ Checklist de Deploy

- [ ] Criar App no Meta for Developers
- [ ] Adicionar produtos (Messenger + Instagram)
- [ ] Obter App ID e App Secret
- [ ] Configurar variáveis de ambiente no Supabase
- [ ] Deploy das 5 Edge Functions
- [ ] Configurar OAuth Redirect URI
- [ ] Configurar Webhook URL e Token
- [ ] Subscrever campos de webhook
- [ ] Testar OAuth callback
- [ ] Testar webhook verification
- [ ] Configurar background job (token refresh)
- [ ] Submeter para App Review (permissões)
- [ ] Aguardar aprovação (3-6 semanas)
- [ ] Testar em Production Mode

---

## 📚 Referências

- [Facebook Messenger Platform Docs](https://developers.facebook.com/docs/messenger-platform/)
- [Instagram Messaging API Docs](https://developers.facebook.com/docs/messenger-platform/instagram/)
- [Graph API v19.0](https://developers.facebook.com/docs/graph-api/)
- [App Review Process](https://developers.facebook.com/docs/app-review/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

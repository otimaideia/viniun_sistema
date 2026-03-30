# Deploy Edge Functions Meta Messenger - Guia Completo

> **Status**: Migration SQL ✅ CONCLUÍDA | Edge Functions ⏳ PENDENTE

---

## ✅ Pré-Requisitos CONCLUÍDOS

- [x] ✅ 6 tabelas `mt_meta_*` criadas no banco
- [x] ✅ RLS habilitado em todas as tabelas
- [x] ✅ Módulo `meta_messenger` registrado
- [x] ✅ Credenciais Meta salvas em `.env.meta`
- [x] ✅ Função `find_similar_leads` criada

---

## 📦 5 Edge Functions a Deploy

| Função | Arquivo | Descrição |
|--------|---------|-----------|
| `meta-oauth-callback` | `supabase/functions/meta-oauth-callback/index.ts` | OAuth 2.0 callback |
| `meta-webhook` | `supabase/functions/meta-webhook/index.ts` | Webhook do Meta |
| `meta-send-message` | `supabase/functions/meta-send-message/index.ts` | Envio de mensagens |
| `meta-sync` | `supabase/functions/meta-sync/index.ts` | Sincronização |
| `meta-token-refresh` | `supabase/functions/meta-token-refresh/index.ts` | Auto-refresh de tokens |

---

## 🚀 Método 1: Deploy via Dashboard (RECOMENDADO)

### Passo 1: Acessar Dashboard Supabase

```
URL: https://supabase.yeslaser.com.br/project/default
Usuário: sbFBdwCjXIsU16jE
Senha: 4A5o9Rm8wXBVIdb9dFElLoxM09kUngTR
```

### Passo 2: Navegar para Edge Functions

1. Menu lateral → **Edge Functions**
2. Ou acesse diretamente: https://supabase.yeslaser.com.br/project/default/functions

### Passo 3: Criar Cada Função Manualmente

#### A) meta-oauth-callback

1. Clicar em **"Create a new function"**
2. **Nome**: `meta-oauth-callback`
3. **Código**: Copiar COMPLETO de `supabase/functions/meta-oauth-callback/index.ts`
4. **Environment Variables**:
   ```
   META_APP_ID=1310930263039278
   META_APP_SECRET=80d81025f778ee58cfc87bf71b819164
   META_REDIRECT_URI=https://supabase.yeslaser.com.br/functions/v1/meta-oauth-callback
   ```
5. Clicar em **"Deploy"**

#### B) meta-webhook

1. Clicar em **"Create a new function"**
2. **Nome**: `meta-webhook`
3. **Código**: Copiar COMPLETO de `supabase/functions/meta-webhook/index.ts`
4. **Environment Variables**:
   ```
   META_APP_SECRET=80d81025f778ee58cfc87bf71b819164
   META_WEBHOOK_VERIFY_TOKEN=yeslaser_meta_webhook_2025
   ```
5. Clicar em **"Deploy"**

#### C) meta-send-message

1. Clicar em **"Create a new function"**
2. **Nome**: `meta-send-message`
3. **Código**: Copiar COMPLETO de `supabase/functions/meta-send-message/index.ts`
4. **Environment Variables**: (mesmas do oauth-callback)
   ```
   META_APP_ID=1310930263039278
   META_APP_SECRET=80d81025f778ee58cfc87bf71b819164
   META_REDIRECT_URI=https://supabase.yeslaser.com.br/functions/v1/meta-oauth-callback
   ```
5. Clicar em **"Deploy"**

#### D) meta-sync

1. Clicar em **"Create a new function"**
2. **Nome**: `meta-sync`
3. **Código**: Copiar COMPLETO de `supabase/functions/meta-sync/index.ts`
4. **Environment Variables**: (mesmas do oauth-callback)
5. Clicar em **"Deploy"**

#### E) meta-token-refresh

1. Clicar em **"Create a new function"**
2. **Nome**: `meta-token-refresh`
3. **Código**: Copiar COMPLETO de `supabase/functions/meta-token-refresh/index.ts`
4. **Environment Variables**: (mesmas do oauth-callback)
5. Clicar em **"Deploy"**

---

## 🧪 Passo 4: Testar Edge Functions

Após deploy, testar cada função:

### A) Testar meta-oauth-callback

```bash
# Verificar se a função responde (deve retornar erro porque não tem code)
curl -i "https://supabase.yeslaser.com.br/functions/v1/meta-oauth-callback"
```

### B) Testar meta-webhook (Verificação)

```bash
# Simular verificação do webhook
curl -i "https://supabase.yeslaser.com.br/functions/v1/meta-webhook?hub.mode=subscribe&hub.verify_token=yeslaser_meta_webhook_2025&hub.challenge=test123"
# Deve retornar: test123
```

### C) Testar meta-send-message

```bash
SERVICE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MzA2MTM2MCwiZXhwIjo0OTE4NzM0OTYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.xKjCIHG1qqMkTOgjI_rl9UuAmoCoq-cOAErjcEgRp9s"

curl -i "https://supabase.yeslaser.com.br/functions/v1/meta-send-message" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"pageId": "test", "recipientId": "test"}'
# Deve retornar erro de autenticação (esperado sem conta conectada)
```

---

## 📝 Passo 5: Configurar no Meta for Developers

Após deploy das funções, configurar no Meta:

### A) URL do OAuth Redirect

1. Acessar: https://developers.facebook.com/apps/1310930263039278/settings/basic/
2. Ir para **"OAuth Redirect URIs"**
3. Adicionar:
   ```
   https://supabase.yeslaser.com.br/functions/v1/meta-oauth-callback
   ```
4. Salvar

### B) URL do Webhook

1. Acessar: https://developers.facebook.com/apps/1310930263039278/webhooks/
2. Para **Messenger** e **Instagram**:
   - **Callback URL**: `https://supabase.yeslaser.com.br/functions/v1/meta-webhook`
   - **Verify Token**: `yeslaser_meta_webhook_2025`
3. Inscrever nos eventos:
   - `messages`
   - `message_deliveries`
   - `message_reads`
   - `messaging_postbacks`

---

## 🎯 Passo 6: Testar OAuth no Frontend

1. Acessar: http://localhost:8080/meta-messenger/config
2. Clicar em **"Conectar Facebook"**
3. Autorizar app no popup do Facebook
4. Verificar se conta foi salva na tabela `mt_meta_accounts`

---

## ✅ Checklist de Deploy

### Database ✅ CONCLUÍDO
- [x] 6 tabelas `mt_meta_*` criadas
- [x] RLS habilitado em todas
- [x] Módulo `meta_messenger` registrado
- [x] Colunas Meta em `mt_leads`
- [x] Função `find_similar_leads` criada

### Edge Functions ⏳ PENDENTE
- [ ] `meta-oauth-callback` deployada
- [ ] `meta-webhook` deployada
- [ ] `meta-send-message` deployada
- [ ] `meta-sync` deployada
- [ ] `meta-token-refresh` deployada
- [ ] Variáveis de ambiente configuradas em cada função
- [ ] Testes de conectividade executados

### Meta for Developers ⏳ PENDENTE
- [ ] Redirect URI configurado
- [ ] Webhook URL configurado
- [ ] Webhook Verify Token configurado
- [ ] Eventos subscritos (messages, deliveries, reads)
- [ ] App Review submetido (opcional para Development Mode)

### Frontend ✅ CONCLUÍDO
- [x] 4 hooks MT criados
- [x] 3 páginas criadas
- [x] Rotas configuradas
- [x] Menu atualizado

---

## 🔗 URLs Após Deploy

```
OAuth:   https://supabase.yeslaser.com.br/functions/v1/meta-oauth-callback
Webhook: https://supabase.yeslaser.com.br/functions/v1/meta-webhook
Send:    https://supabase.yeslaser.com.br/functions/v1/meta-send-message
Sync:    https://supabase.yeslaser.com.br/functions/v1/meta-sync
Refresh: https://supabase.yeslaser.com.br/functions/v1/meta-token-refresh
```

---

## 📊 Status Atual

| Componente | Status | Próximo Passo |
|------------|--------|---------------|
| **Database** | ✅ 100% | - |
| **Edge Functions** | ⏳ 0% | Deploy manual via Dashboard |
| **Frontend** | ✅ 100% | - |
| **Meta Config** | ⏳ 0% | Configurar URLs após deploy |
| **Testes** | ⏳ 0% | Testar OAuth flow |

---

## ⚠️ Notas Importantes

1. **Development Mode**: App funciona com até 25 testadores sem App Review
2. **Production Mode**: Requer App Review (3-6 semanas de espera)
3. **Tokens**: Expiram em 60 dias, auto-renovados via `meta-token-refresh`
4. **Rate Limiting**: 200 msgs/h (Facebook), 100 msgs/h (Instagram)
5. **Webhooks**: Assinatura HMAC SHA256 obrigatória

---

**Data**: 05/02/2026 - 23:40
**Status**: Migration ✅ | Edge Functions ⏳ | Meta Config ⏳

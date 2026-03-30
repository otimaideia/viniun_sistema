# Deploy Meta Messenger - Supabase Self-Hosted

> **Ambiente**: Supabase Self-Hosted em `https://supabase.yeslaser.com.br`

## ✅ Credenciais Configuradas

```
META_APP_ID: 1310930263039278
META_APP_SECRET: 80d81025f778ee58cfc87bf71b819164
```

---

## 📋 Opções de Deploy para Self-Hosted

### Opção 1: Via Dashboard do Supabase (RECOMENDADO)

1. **Acessar Dashboard do Supabase**
   ```
   URL: https://supabase.yeslaser.com.br/project/default
   Usuário: sbFBdwCjXIsU16jE
   Senha: 4A5o9Rm8wXBVIdb9dFElLoxM09kUngTR
   ```

2. **Navegar para Edge Functions**
   - Menu lateral → **Edge Functions**
   - Ou: https://supabase.yeslaser.com.br/project/default/functions

3. **Criar cada função manualmente**:

   a) **meta-oauth-callback**
   - Clicar em "Create a new function"
   - Nome: `meta-oauth-callback`
   - Copiar código de: `supabase/functions/meta-oauth-callback/index.ts`
   - Environment Variables:
     ```
     META_APP_ID=1310930263039278
     META_APP_SECRET=80d81025f778ee58cfc87bf71b819164
     META_REDIRECT_URI=https://supabase.yeslaser.com.br/functions/v1/meta-oauth-callback
     ```
   - Deploy

   b) **meta-webhook**
   - Nome: `meta-webhook`
   - Copiar código de: `supabase/functions/meta-webhook/index.ts`
   - Environment Variables:
     ```
     META_APP_SECRET=80d81025f778ee58cfc87bf71b819164
     META_WEBHOOK_VERIFY_TOKEN=yeslaser_meta_webhook_2025
     ```
   - Deploy

   c) **meta-send-message**
   - Nome: `meta-send-message`
   - Copiar código de: `supabase/functions/meta-send-message/index.ts`
   - Environment Variables: (mesmas do oauth-callback)
   - Deploy

   d) **meta-sync**
   - Nome: `meta-sync`
   - Copiar código de: `supabase/functions/meta-sync/index.ts`
   - Environment Variables: (mesmas do oauth-callback)
   - Deploy

   e) **meta-token-refresh**
   - Nome: `meta-token-refresh`
   - Copiar código de: `supabase/functions/meta-token-refresh/index.ts`
   - Environment Variables: (mesmas do oauth-callback)
   - Deploy

---

### Opção 2: Via Docker (Se aplicável)

Se o Supabase está rodando via Docker Compose:

1. **Localizar arquivo docker-compose.yml**
   ```bash
   # Geralmente em:
   # /var/lib/supabase/docker-compose.yml
   # ou
   # ~/supabase/docker-compose.yml
   ```

2. **Adicionar variáveis de ambiente no serviço de Edge Functions**
   ```yaml
   functions:
     environment:
       META_APP_ID: "1310930263039278"
       META_APP_SECRET: "80d81025f778ee58cfc87bf71b819164"
       META_WEBHOOK_VERIFY_TOKEN: "yeslaser_meta_webhook_2025"
       META_REDIRECT_URI: "https://supabase.yeslaser.com.br/functions/v1/meta-oauth-callback"
   ```

3. **Copiar funções para volume do Docker**
   ```bash
   # Copiar para diretório de functions do Docker
   cp -r supabase/functions/meta-* /path/to/supabase/volumes/functions/
   ```

4. **Reiniciar serviço**
   ```bash
   docker-compose restart functions
   ```

---

### Opção 3: Via API REST (Programático)

```bash
SERVICE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MzA2MTM2MCwiZXhwIjo0OTE4NzM0OTYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.xKjCIHG1qqMkTOgjI_rl9UuAmoCoq-cOAErjcEgRp9s"

# Criar função via API (exemplo para meta-oauth-callback)
curl -X POST "https://supabase.yeslaser.com.br/rest/v1/functions" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "meta-oauth-callback",
    "body": "... código da função ...",
    "env_vars": {
      "META_APP_ID": "1310930263039278",
      "META_APP_SECRET": "80d81025f778ee58cfc87bf71b819164"
    }
  }'
```

---

## 🔧 Configuração Manual Simplificada

### Passo 1: Criar arquivo com as 5 funções

Crie um arquivo `functions-bundle.json`:

```json
{
  "functions": [
    {
      "name": "meta-oauth-callback",
      "path": "supabase/functions/meta-oauth-callback/index.ts"
    },
    {
      "name": "meta-webhook",
      "path": "supabase/functions/meta-webhook/index.ts"
    },
    {
      "name": "meta-send-message",
      "path": "supabase/functions/meta-send-message/index.ts"
    },
    {
      "name": "meta-sync",
      "path": "supabase/functions/meta-sync/index.ts"
    },
    {
      "name": "meta-token-refresh",
      "path": "supabase/functions/meta-token-refresh/index.ts"
    }
  ],
  "env_vars": {
    "META_APP_ID": "1310930263039278",
    "META_APP_SECRET": "80d81025f778ee58cfc87bf71b819164",
    "META_WEBHOOK_VERIFY_TOKEN": "yeslaser_meta_webhook_2025",
    "META_REDIRECT_URI": "https://supabase.yeslaser.com.br/functions/v1/meta-oauth-callback"
  }
}
```

### Passo 2: Acessar Dashboard e criar manualmente

O método mais confiável para self-hosted é:

1. ✅ **Login no Dashboard** (https://supabase.yeslaser.com.br)
2. ✅ **Edge Functions** → Create function
3. ✅ **Copiar/Colar código** de cada arquivo .ts
4. ✅ **Adicionar env vars** na UI
5. ✅ **Deploy**

---

## 📝 Checklist de Deploy

- [ ] Acessar Dashboard Supabase
- [ ] Criar função `meta-oauth-callback`
  - [ ] Copiar código de `supabase/functions/meta-oauth-callback/index.ts`
  - [ ] Adicionar env vars
  - [ ] Deploy
- [ ] Criar função `meta-webhook`
  - [ ] Copiar código de `supabase/functions/meta-webhook/index.ts`
  - [ ] Adicionar env vars
  - [ ] Deploy
- [ ] Criar função `meta-send-message`
  - [ ] Copiar código de `supabase/functions/meta-send-message/index.ts`
  - [ ] Adicionar env vars
  - [ ] Deploy
- [ ] Criar função `meta-sync`
  - [ ] Copiar código de `supabase/functions/meta-sync/index.ts`
  - [ ] Adicionar env vars
  - [ ] Deploy
- [ ] Criar função `meta-token-refresh`
  - [ ] Copiar código de `supabase/functions/meta-token-refresh/index.ts`
  - [ ] Adicionar env vars
  - [ ] Deploy
- [ ] Testar URLs das funções
- [ ] Configurar no Meta for Developers

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

## 🎯 Próximos Passos

1. **Deploy das 5 funções** (via Dashboard - 15 min)

2. **Configurar no Meta for Developers**:
   - URL: https://developers.facebook.com/apps/1310930263039278/settings/basic/
   - Adicionar Redirect URI:
     ```
     https://supabase.yeslaser.com.br/functions/v1/meta-oauth-callback
     ```
   - Configurar Webhook (Messenger/Instagram):
     ```
     URL: https://supabase.yeslaser.com.br/functions/v1/meta-webhook
     Verify Token: yeslaser_meta_webhook_2025
     ```

3. **Testar no frontend**:
   - http://localhost:8080/meta-messenger/config
   - Clicar "Conectar Facebook"
   - Autorizar app
   - Verificar se account foi salva no banco

---

## ⚠️ Notas Importantes

- **Self-Hosted**: CLI do Supabase pode não funcionar com instâncias self-hosted
- **Dashboard**: Método mais confiável é via Dashboard Web
- **Env Vars**: SEMPRE configurar as 4 env vars em cada função
- **Teste**: Sempre testar URLs das funções após deploy

---

**Última atualização**: 05/02/2026
**Credenciais salvas em**: `.env.meta`

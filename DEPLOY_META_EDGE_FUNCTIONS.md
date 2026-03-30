# Deploy das Meta Edge Functions - Guia Completo

**Data**: 06/02/2026 - 00:29
**Status**: ✅ Código pronto | ⏳ Aguardando deploy

---

## ✅ O que foi feito

### 1. Arquivo `.env` Criado
**Localização**: `supabase/functions/.env`

Contém todas as variáveis de ambiente necessárias:
```env
META_APP_ID=1310930263039278
META_APP_SECRET=80d81025f778ee58cfc87bf71b819164
META_REDIRECT_URI=https://supabase.yeslaser.com.br/functions/v1/meta-oauth-callback
META_WEBHOOK_VERIFY_TOKEN=yeslaser_meta_webhook_2025
SUPABASE_URL=https://supabase.yeslaser.com.br
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MzA2MTM2MCwiZXhwIjo0OTE4NzM0OTYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.xKjCIHG1qqMkTOgjI_rl9UuAmoCoq-cOAErjcEgRp9s
```

### 2. API Version Atualizada
**Arquivo**: `supabase/functions/meta-oauth-callback/index.ts`

**Mudanças**:
- ✅ Versão atualizada de `v19.0` → `v24.0` (linha 22)
- ✅ Validação de variáveis de ambiente adicionada (linhas 29-40)

---

## 🚀 Como fazer o deploy (PRÓXIMO PASSO)

### Opção 1: Via Coolify (Recomendado)

#### Passo 1: Acessar o container das Edge Functions
```bash
# Conectar via SSH ao servidor
ssh usuario@servidor

# Entrar no container das Edge Functions
docker exec -it <container-id> bash
```

#### Passo 2: Configurar variáveis de ambiente no Coolify
1. Abrir dashboard do Coolify
2. Ir para o serviço "Supabase Edge Functions"
3. Clicar em "Environment Variables"
4. Adicionar cada variável:
   - `META_APP_ID`
   - `META_APP_SECRET`
   - `META_REDIRECT_URI`
   - `META_WEBHOOK_VERIFY_TOKEN`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Salvar e reiniciar o container

#### Passo 3: Fazer deploy das functions
```bash
# No servidor, executar o script de instalação
cd /caminho/do/projeto/supabase/functions
chmod +x install-meta-functions-coolify-final.sh
./install-meta-functions-coolify-final.sh
```

#### Passo 4: Reiniciar container
```bash
# Via Coolify dashboard ou CLI
docker restart <container-id-edge-functions>
```

---

### Opção 2: Via Supabase CLI (Alternativa)

Se você usar Supabase CLI para deploy:

#### Passo 1: Instalar Supabase CLI
```bash
npm install -g supabase
```

#### Passo 2: Login
```bash
supabase login
```

#### Passo 3: Link do projeto
```bash
supabase link --project-ref <seu-project-ref>
```

#### Passo 4: Configurar secrets
```bash
supabase secrets set META_APP_ID=1310930263039278
supabase secrets set META_APP_SECRET=80d81025f778ee58cfc87bf71b819164
supabase secrets set META_REDIRECT_URI=https://supabase.yeslaser.com.br/functions/v1/meta-oauth-callback
supabase secrets set META_WEBHOOK_VERIFY_TOKEN=yeslaser_meta_webhook_2025
```

#### Passo 5: Deploy das functions
```bash
cd supabase
supabase functions deploy meta-oauth-callback
supabase functions deploy meta-webhook
supabase functions deploy meta-send-message
supabase functions deploy meta-sync
supabase functions deploy meta-token-refresh
```

---

## 🧪 Como testar após o deploy

### Teste 1: Verificar se as variáveis foram carregadas
```bash
# Chamar a function sem parâmetros (vai dar erro mas mostra se as vars estão OK)
curl -I https://supabase.yeslaser.com.br/functions/v1/meta-oauth-callback
```

Se retornar erro `400 Bad Request` = variáveis OK
Se retornar erro `500 Internal Server Error` com "Missing META_APP_ID" = variáveis NÃO configuradas

### Teste 2: Testar OAuth flow no frontend
1. Abrir: `http://localhost:8080/meta-messenger/config`
2. Clicar em "Conectar Facebook"
3. Autorizar no popup do Facebook
4. Verificar se retorna sucesso (não mais o erro "Missing client_id parameter")

### Teste 3: Verificar no banco
```sql
-- Verificar se account foi criado
SELECT id, user_name, user_email, platform, is_active, token_expires_at
FROM mt_meta_accounts
ORDER BY created_at DESC
LIMIT 5;

-- Verificar se pages foram criadas
SELECT id, page_name, page_username, platform, is_active
FROM mt_meta_pages
ORDER BY created_at DESC
LIMIT 10;
```

---

## ❌ Troubleshooting

### Erro: "Missing client_id parameter"
**Causa**: Variáveis de ambiente não estão configuradas no container

**Solução**:
1. Verificar se `.env` existe em `supabase/functions/`
2. Verificar se variáveis estão no Coolify
3. Reiniciar o container das Edge Functions

### Erro: "Invalid OAuth scopes"
**Causa**: Scopes usados requerem App Review ou foram depreciados

**Solução**: Já foi ajustado! Agora usa scopes básicos `public_profile,email`

### Erro: "Invalid redirect_uri"
**Causa**: URL não está cadastrada no Meta App

**Solução**: Já foi adicionada! Verificar em:
https://developers.facebook.com/apps/1310930263039278/settings/basic/

---

## 📊 Status Final

| Item | Status |
|------|--------|
| `.env` criado | ✅ |
| API v24.0 | ✅ |
| Validação de vars | ✅ |
| OAuth Redirect URI | ✅ (configurado no Meta) |
| Webhook Page | ✅ (configurado no Meta) |
| Webhook Instagram | ✅ (configurado no Meta) |
| **Deploy pendente** | ⏳ |

---

## 🎯 Próximos Passos (EM ORDEM)

1. ⏳ **Configurar variáveis no Coolify** (5 min)
2. ⏳ **Fazer deploy das functions** (via script ou CLI) (10 min)
3. ⏳ **Reiniciar container Edge Functions** (1 min)
4. ⏳ **Testar OAuth flow no frontend** (2 min)
5. ⏳ **Verificar dados no banco** (1 min)

**Tempo total estimado**: ~20 minutos

---

**Próximo comando para o usuário**:
```bash
# Opção 1: Via Coolify (mais fácil)
# 1. Acessar dashboard do Coolify
# 2. Configurar env vars no serviço Edge Functions
# 3. Reiniciar container

# Opção 2: Via Supabase CLI
supabase secrets set META_APP_ID=1310930263039278
supabase secrets set META_APP_SECRET=80d81025f778ee58cfc87bf71b819164
# ... (restante das variáveis)
```

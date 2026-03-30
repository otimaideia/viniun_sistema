# Configuração Meta for Developers - Guia Final

**Data**: 05/02/2026 - 23:50
**Status**: Edge Functions ✅ DEPLOYADAS | Meta Config ⏳ PENDENTE

---

## ✅ PRÉ-REQUISITOS CONCLUÍDOS

- [x] 6 tabelas `mt_meta_*` criadas no banco
- [x] 5 Edge Functions deployadas no Supabase
- [x] Webhook verification testada e funcionando
- [x] Credenciais Meta salvas em `.env.meta`

---

## 🔗 URLs das Edge Functions (PRONTAS)

```
OAuth Callback: https://supabase.yeslaser.com.br/functions/v1/meta-oauth-callback
Webhook URL:    https://supabase.yeslaser.com.br/functions/v1/meta-webhook
Send Message:   https://supabase.yeslaser.com.br/functions/v1/meta-send-message
Sync:           https://supabase.yeslaser.com.br/functions/v1/meta-sync
Token Refresh:  https://supabase.yeslaser.com.br/functions/v1/meta-token-refresh
```

---

## 📋 PASSO 1: Configurar OAuth Redirect URI

### 1.1. Acessar Configurações Básicas

1. Abrir: https://developers.facebook.com/apps/1310930263039278/settings/basic/
2. Fazer login com conta Meta (se necessário)

### 1.2. Adicionar Redirect URI

1. Rolar até seção **"OAuth Redirect URIs"**
2. Clicar em **"+ Adicionar URI de redirecionamento OAuth"**
3. Colar:
   ```
   https://supabase.yeslaser.com.br/functions/v1/meta-oauth-callback
   ```
4. Clicar em **"Salvar alterações"**

**✅ Verificação**: URI deve aparecer na lista de URIs válidas

---

## 📋 PASSO 2: Configurar Webhook do Facebook Messenger

### 2.1. Acessar Configurações do Messenger

1. Abrir: https://developers.facebook.com/apps/1310930263039278/messenger/settings/
2. Ou: Dashboard → Produtos → Messenger → Configurações

### 2.2. Adicionar Webhook

1. Na seção **"Webhooks"**, clicar em **"Adicionar URL de retorno de chamada"**
2. Preencher:
   - **URL de retorno de chamada**:
     ```
     https://supabase.yeslaser.com.br/functions/v1/meta-webhook
     ```
   - **Token de verificação**:
     ```
     yeslaser_meta_webhook_2025
     ```
3. Clicar em **"Verificar e salvar"**

**✅ Verificação**: Meta vai chamar o webhook com `hub.challenge` e deve receber a resposta correta

### 2.3. Subscrever Eventos

Após verificar o webhook, subscrever aos seguintes eventos:

- [x] `messages` - Novas mensagens
- [x] `message_deliveries` - Status de entrega
- [x] `message_reads` - Mensagens lidas
- [x] `messaging_postbacks` - Postbacks de botões (opcional)

Clicar em **"Salvar"**

---

## 📋 PASSO 3: Configurar Webhook do Instagram

### 3.1. Acessar Configurações do Instagram

1. Abrir: https://developers.facebook.com/apps/1310930263039278/instagram-basic-display/settings/
2. Ou: Dashboard → Produtos → Instagram → Configurações

### 3.2. Adicionar Webhook (mesmo processo do Messenger)

1. Na seção **"Webhooks"**, adicionar:
   - **URL**: `https://supabase.yeslaser.com.br/functions/v1/meta-webhook`
   - **Token**: `yeslaser_meta_webhook_2025`

2. Subscrever eventos:
   - [x] `messages` - Novas mensagens
   - [x] `message_deliveries` - Status de entrega
   - [x] `message_reads` - Mensagens lidas
   - [x] `story_mentions` - Menções em stories (opcional)

---

## 📋 PASSO 4: Configurar Permissões do App

### 4.1. Permissões Necessárias

Ir para: https://developers.facebook.com/apps/1310930263039278/permissions/

Garantir que as seguintes permissões estejam habilitadas:

**Facebook:**
- [x] `pages_show_list` - Listar páginas
- [x] `pages_messaging` - Enviar/receber mensagens
- [x] `pages_manage_metadata` - Gerenciar metadados

**Instagram:**
- [x] `instagram_basic` - Informações básicas
- [x] `instagram_manage_messages` - Gerenciar mensagens

**⚠️ Nota**: Algumas permissões podem requerer **App Review** para uso em produção

---

## 📋 PASSO 5: Testar OAuth no Frontend

### 5.1. Acessar Página de Configuração

1. Abrir: http://localhost:8080/meta-messenger/config
2. Fazer login no painel (se necessário)

### 5.2. Conectar Conta Facebook

1. Clicar no botão **"Conectar Facebook"**
2. Popup do Facebook abre
3. Fazer login na conta Facebook (se necessário)
4. Autorizar o app a acessar as páginas
5. Selecionar páginas que deseja gerenciar
6. Clicar em **"Continuar"**

**✅ Verificação**:
- Popup fecha
- Conta aparece na lista de contas conectadas
- Registro criado na tabela `mt_meta_accounts`

### 5.3. Conectar Conta Instagram

1. Clicar no botão **"Conectar Instagram"**
2. Mesmo fluxo do Facebook
3. Autorizar acesso ao Instagram Business Account

**✅ Verificação**:
- Conta Instagram aparece na lista
- Registro criado na tabela `mt_meta_accounts`

---

## 📋 PASSO 6: Testar Webhook em Tempo Real

### 6.1. Enviar Mensagem de Teste

1. Abrir Facebook Messenger ou Instagram Direct
2. Enviar mensagem para uma das páginas conectadas
3. Exemplo: "Olá, teste de integração"

### 6.2. Verificar Recebimento

**No Banco de Dados:**
```sql
-- Verificar webhook recebido
SELECT * FROM mt_meta_webhook_events
ORDER BY created_at DESC
LIMIT 5;

-- Verificar mensagem criada
SELECT * FROM mt_meta_messages
ORDER BY created_at DESC
LIMIT 5;

-- Verificar conversa criada
SELECT * FROM mt_meta_conversations
ORDER BY created_at DESC
LIMIT 5;
```

**No Frontend:**
1. Ir para: http://localhost:8080/meta-messenger/conversations
2. Deve aparecer a conversa com a mensagem recebida

---

## 📋 PASSO 7: Testar Envio de Mensagem

### 7.1. Via Frontend

1. Acessar: http://localhost:8080/meta-messenger/conversations
2. Clicar em uma conversa
3. Digitar mensagem de teste
4. Clicar em "Enviar"

**✅ Verificação**:
- Mensagem aparece no chat
- Mensagem chega no Facebook Messenger/Instagram Direct
- Registro criado em `mt_meta_messages` com `direction = 'outgoing'`

### 7.2. Testar Mídia

1. Clicar no ícone de anexo
2. Selecionar imagem, vídeo ou documento
3. Enviar

**✅ Verificação**:
- Mídia aparece no chat
- URL da mídia salva em `mt_meta_messages.media_url`

---

## 📋 PASSO 8: Testar Auto-Criação de Lead

### 8.1. Nova Conversa de Cliente Novo

1. Usar conta Facebook/Instagram pessoal
2. Enviar mensagem para página conectada
3. Cliente NÃO deve existir em `mt_leads`

### 8.2. Verificar Lead Criado

```sql
-- Buscar lead criado pelo participant_id
SELECT * FROM mt_leads
WHERE meta_participant_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

**✅ Verificação**:
- Lead criado automaticamente
- `meta_participant_id` preenchido
- `meta_conversation_id` vinculado
- Nome extraído do perfil do Meta

### 8.3. Testar Fuzzy Matching

1. Criar lead manualmente com nome similar
   - Exemplo: Lead "João Silva" já existe
   - Cliente "Joao da Silva" envia mensagem

2. Verificar se vinculou ao lead existente:
```sql
SELECT nome, meta_participant_id
FROM mt_leads
WHERE nome ILIKE '%silva%'
ORDER BY created_at DESC;
```

**✅ Verificação**:
- Se similaridade > 85%: vincula ao lead existente
- Se < 85%: cria novo lead

---

## 📋 PASSO 9: Verificar Rate Limiting

### 9.1. Enviar Várias Mensagens

1. Enviar 5-10 mensagens seguidas
2. Verificar fila de mensagens:

```sql
SELECT status, COUNT(*)
FROM mt_meta_message_queue
GROUP BY status;
```

**✅ Verificação**:
- Mensagens com status `pending`, `sending`, `sent`
- Rate limiter está controlando o envio
- Mensagens enviadas gradualmente

---

## ⚠️ TROUBLESHOOTING

### Problema 1: OAuth Redirect Inválido

**Erro**: "URL de redirecionamento OAuth inválida"

**Solução**:
1. Verificar se URL está EXATAMENTE igual no Meta App:
   ```
   https://supabase.yeslaser.com.br/functions/v1/meta-oauth-callback
   ```
2. Sem barra final `/`
3. HTTPS obrigatório

### Problema 2: Webhook Não Verifica

**Erro**: "Erro ao verificar webhook"

**Solução**:
1. Verificar token EXATAMENTE igual:
   ```
   yeslaser_meta_webhook_2025
   ```
2. Testar manualmente:
   ```bash
   curl "https://supabase.yeslaser.com.br/functions/v1/meta-webhook?hub.mode=subscribe&hub.verify_token=yeslaser_meta_webhook_2025&hub.challenge=test"
   ```
3. Deve retornar: `test`

### Problema 3: Mensagens Não Chegam

**Possíveis Causas**:
1. Webhook não inscrito nos eventos corretos
2. Página não tem permissão de mensagens
3. App em modo de desenvolvimento (testar com conta de teste)

**Solução**:
1. Verificar eventos subscritos em Messenger/Instagram
2. Verificar logs de webhook:
   ```sql
   SELECT * FROM mt_meta_webhook_events
   WHERE processed = false
   ORDER BY created_at DESC;
   ```

### Problema 4: Token Expirado

**Erro**: "Invalid OAuth access token"

**Solução**:
1. Reconectar conta no frontend
2. Verificar data de expiração:
   ```sql
   SELECT user_name, token_expires_at
   FROM mt_meta_accounts
   WHERE is_active = true;
   ```
3. Executar refresh manual:
   ```bash
   curl -X POST "https://supabase.yeslaser.com.br/functions/v1/meta-token-refresh"
   ```

---

## ✅ CHECKLIST FINAL

### Configuração Meta App
- [ ] OAuth Redirect URI configurado
- [ ] Webhook URL do Messenger configurado
- [ ] Webhook URL do Instagram configurado
- [ ] Token de verificação correto
- [ ] Eventos subscritos (messages, deliveries, reads)
- [ ] Permissões habilitadas

### Testes
- [ ] OAuth Facebook funcionando
- [ ] OAuth Instagram funcionando
- [ ] Webhook recebendo mensagens
- [ ] Mensagens sendo salvas no banco
- [ ] Envio de mensagem funcionando
- [ ] Envio de mídia funcionando
- [ ] Auto-criação de lead funcionando
- [ ] Fuzzy matching testado
- [ ] Rate limiting verificado

### Produção (Opcional)
- [ ] App Review submetido
- [ ] App aprovado pelo Meta
- [ ] Modo Production habilitado
- [ ] Testado com usuários reais

---

## 🎯 CONCLUSÃO

Após seguir este guia:

1. ✅ Meta App configurado com URLs corretas
2. ✅ OAuth funcionando para Facebook e Instagram
3. ✅ Webhook recebendo mensagens em tempo real
4. ✅ Auto-criação de leads funcionando
5. ✅ Sistema 100% operacional

**Tempo estimado**: 30-45 minutos

---

**Última atualização**: 05/02/2026 - 23:50
**Próximo passo**: Configurar Meta for Developers

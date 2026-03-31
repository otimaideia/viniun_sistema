# Lógica de Extração de Telefone do WhatsApp

## Visão Geral

O sistema Viniun já implementa a **mesma lógica robusta** do Guia de Praia Grande para extrair números de telefone de conversas do WhatsApp, especialmente para lidar com o formato `@lid` do WAHA NOWEB engine.

## Implementação

### Arquivo: `src/services/waha-api.ts`

Método: `extractPhoneNumber(sessionName, chatId, chatData)`

## Fontes de Extração (em ordem de prioridade)

O método tenta extrair o telefone de **8 fontes diferentes**, na seguinte ordem:

### 1. ✅ Campos Diretos do Chat
```typescript
chatData.phone || chatData.phoneNumber || chatData.number || chatData.contact?.phone
```

### 2. ✅ lastMessage._data.key.remoteJidAlt
```typescript
const remoteJidAlt = chatData.lastMessage?._data?.key?.remoteJidAlt;
// Exemplo: "5513991888100@s.whatsapp.net" → "5513991888100"
```

### 3. ✅ lastMessage._data.from
```typescript
const from = chatData.lastMessage?._data?.from;
// Para mensagens RECEBIDAS
// Exemplo: "5513991888100@s.whatsapp.net" → "5513991888100"
```

### 4. ✅ lastMessage._data.to
```typescript
const to = chatData.lastMessage?._data?.to;
// Para mensagens ENVIADAS
// Exemplo: "5513991888100@s.whatsapp.net" → "5513991888100"
```

### 5. ✅ contact.jid ou jid
```typescript
const contactJid = chatData.contact?.jid || chatData.jid;
// Exemplo: "5513991888100@s.whatsapp.net" → "5513991888100"
```

### 6. ✅ participant
```typescript
const participant = chatData.lastMessage?.participant || chatData.participant;
// Usado em algumas versões do WAHA
```

### 7. ✅ chat.name (se parecer telefone)
```typescript
const possiblePhone = chatData.name.replace(/\D/g, '');
if (possiblePhone.length >= 10 && possiblePhone.length <= 15) {
  return possiblePhone;
}
```

### 8. ✅ API de Contatos WAHA (último recurso)
```typescript
// Tenta API de LIDs
const lidPhone = await this.resolveLidToPhone(sessionName, chatId);

// Fallback para API de contatos
const contact = await this.getContact(sessionName, chatId);
```

## Validação de Telefone

O método `cleanPhoneNumber()` valida o número extraído:

```typescript
private cleanPhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;

  // Remove tudo que não é dígito
  const digits = phone.replace(/\D/g, '');

  // Valida tamanho (telefones têm 10-15 dígitos)
  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }

  return null;
}
```

## Formatos Suportados

### Chat ID Padrão
```
5511999999999@c.us → 5511999999999
```

### Chat ID com @lid (NOWEB)
```
12345678-abcd-efgh-ijkl-1234567890ab@lid → navega pelo JSON para encontrar telefone
```

### Grupos (não extraem telefone)
```
12345678@g.us → null
```

## Onde é Usado

### Hook: `src/hooks/useWhatsAppChat.ts`

Usado em múltiplos pontos:

1. **syncChatsFromWaha** (linha 1424):
```typescript
const phone = await wahaApi.extractPhoneNumber(sessionName!, chatId, chat);
```

2. **refreshChats** (linha 1789):
```typescript
const phone = await wahaApi.extractPhoneNumber(sessionName, chatId, chat);
```

3. **loadMessages** (linha 2023):
```typescript
const phone = await wahaApi.extractPhoneNumber(sessionName!, chatId, chat);
```

4. **selectChat** (linha 2063):
```typescript
const phone = await wahaApi.extractPhoneNumber(sessionName!, chatId, chat);
```

## Banco de Dados

O telefone extraído é salvo em:

### Tabela: `mt_whatsapp_conversations`
```sql
contact_phone VARCHAR(20) -- Telefone limpo (apenas dígitos)
```

## Logs de Debug

O método gera logs console para rastreamento:

```
[WAHA] Telefone extraído de remoteJidAlt: 5513991888100
[WAHA] Telefone extraído de _data.from: 5513991888100
[WAHA] Telefone extraído de _data.to: 5513991888100
[WAHA] Telefone resolvido via API LID: 5513991888100
```

## Comparação com Guia de Praia Grande

| Feature | Guia de Praia Grande | Viniun | Status |
|---------|---------------------|----------|--------|
| Extração de @c.us | ✅ | ✅ | ✅ Implementado |
| Extração de @lid | ✅ | ✅ | ✅ Implementado |
| remoteJidAlt | ✅ | ✅ | ✅ Implementado |
| lastMessage.from | ✅ | ✅ | ✅ Implementado |
| lastMessage.to | ✅ | ✅ | ✅ Implementado |
| contact.jid | ✅ | ✅ | ✅ Implementado |
| participant | ✅ | ✅ | ✅ Implementado |
| API de Contatos | ✅ | ✅ | ✅ Implementado |
| Validação de número | ✅ | ✅ | ✅ Implementado |

## Troubleshooting

### Telefone não aparece na conversa

1. **Verificar logs do console**:
   - Abrir DevTools (F12)
   - Procurar por `[WAHA] Telefone extraído`

2. **Verificar formato do chatId**:
```javascript
// Console do navegador
console.log('Chat ID:', selectedChatId);
```

3. **Verificar dados brutos do chat**:
```javascript
// Em useWhatsAppChat.ts, adicionar log temporário
console.log('[DEBUG] Chat data completo:', chat);
```

4. **Verificar banco de dados**:
```sql
SELECT id, chat_id, contact_phone, contact_name
FROM mt_whatsapp_conversations
WHERE id = 'c4836130-b621-48d6-b355-9d9ce942a8d8';
```

## Próximos Passos

Se o telefone ainda não aparece:

1. ✅ Verificar estrutura do JSON retornado pelo WAHA
2. ✅ Adicionar log detalhado no extractPhoneNumber
3. ✅ Verificar se o WAHA está retornando lastMessage._data
4. ✅ Testar chamada direta à API de contatos WAHA

## Conclusão

✅ A lógica de extração de telefone **ESTÁ IMPLEMENTADA** e é **IDÊNTICA** à do Guia de Praia Grande.

✅ Suporta **8 fontes diferentes** de extração.

✅ Compatível com **@c.us**, **@lid** e outros formatos.

✅ Valida e limpa números automaticamente.

Se ainda há problemas em uma conversa específica, é necessário:
1. Verificar os dados brutos retornados pelo WAHA
2. Adicionar logs mais detalhados
3. Testar chamada direta à API

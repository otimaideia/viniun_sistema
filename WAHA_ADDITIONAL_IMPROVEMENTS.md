# WAHA WhatsApp - Melhorias Adicionais Descobertas

Análise de campos adicionais encontrados na documentação WAHA e issues do GitHub que podem melhorar ainda mais a extração de dados.

## 📋 Campos Adicionais Descobertos

### 1. userReceipt Array (IMPLEMENTADO)
✅ **Status**: Já implementado no V2

Fonte: Documentação WAHA NOWEB

```typescript
// Já mapeado em extractPhoneNumberV2
"userReceipt": [
  {
    "userJid": "5513991234567@c.us",
    "receiptTimestamp": 1709876543,
    "readTimestamp": 1709876543
  }
]
```

### 2. Issue #1418: @lid Behavior (IMPLEMENTADO)
✅ **Status**: Já implementado no V2

**Problema**: WhatsApp mudou comportamento do campo `from` para usar `@lid` em vez de `@c.us` em algumas situações.

**Solução Implementada**:
- `normalizeChatIdV2` converte `@lid` para `@c.us`
- Preserva `rawChatId` com valor original para debug

**Testes**: 4 casos específicos para @lid

### 3. Issue #1073: Direct Message Without Phone (NOVO)
⚠️ **Status**: Requer análise

**Contexto**: Em algumas situações, o WhatsApp não fornece número de telefone diretamente, apenas @lid.

**Campos a Investigar**:
```typescript
// Possível estrutura quando @lid não tem phone equivalente
{
  "from": "176369157804064@lid",
  "contact": {
    "id": "176369157804064@lid",
    "number": null,  // ← SEM número de telefone!
    "isWAContact": false,
    "isMyContact": false
  }
}
```

**Ação Recomendada**:
- Aceitar @lid como identificador válido mesmo sem phone
- Adicionar flag `hasPhoneNumber: boolean` em `extractContactDataV2`
- Permitir contactos com apenas LID (sem telefone)

### 4. Webhook Field: .to Missing (Discussion #602)
⚠️ **Status**: Fallback implementado parcialmente

**Problema**: Campo `to` pode estar ausente em alguns webhooks.

**Solução Atual no V2**:
```typescript
// extractPhoneNumberV2 tem fallback:
1. from
2. to          ← pode ser undefined
3. chatId      ← fallback primário
4. remoteJid   ← fallback secundário
```

**Melhoria Sugerida**: Nenhuma - fallback já adequado.

### 5. Reactions Array Context (NOVO)
✅ **Status**: Estrutura mapeada, extração não implementada

**Estrutura**:
```typescript
"reactions": [
  {
    "id": "reaction-id",
    "orphan": 0,
    "orphanReason": null,
    "timestamp": 1709876543,
    "reaction": {
      "text": "👍",
      "senderTimestampMs": 1709876543000
    }
  }
]
```

**Campo Útil**: `senderTimestampMs` correlacionado com `participant` do payload pai.

**Ação**: Não implementar por ora (complexidade alta, valor baixo).

### 6. Poll Updates (NOVO)
✅ **Status**: Estrutura mapeada, extração não implementada

**Estrutura**:
```typescript
"_data": {
  "pollUpdates": [
    {
      "pollUpdateMessageKey": {
        "remoteJid": "5513991234567@c.us",
        "participant": "5513991234567@c.us",
        "id": "poll-id"
      },
      "vote": {
        "selectedOptions": ["option1"]
      }
    }
  ]
}
```

**Campos Úteis**:
- `pollUpdateMessageKey.remoteJid`
- `pollUpdateMessageKey.participant`

**Ação**: Não implementar por ora (raro, complexidade alta).

### 7. Extended Text Message (NOVO)
⚠️ **Status**: Estrutura mapeada, texto não extraído

**Estrutura**:
```typescript
"_data": {
  "message": {
    "conversation": "Texto simples",
    "extendedTextMessage": {
      "text": "Texto com formatação ou link preview",
      "matchedText": "link detectado",
      "canonicalUrl": "https://...",
      "title": "Título do preview",
      "description": "Descrição",
      "thumbnailUrl": "https://..."
    }
  }
}
```

**Uso Atual**: Campo `body` do webhook já contém o texto final.

**Ação**: Nenhuma - campo `body` já é suficiente.

## 📊 Melhorias Implementáveis

### Melhoria 1: Suporte Total a @lid Sem Telefone

**Problema**: Atualmente, se `contact.number` for `null`, não conseguimos extrair telefone.

**Solução Proposta**:
```typescript
// Modificar extractPhoneNumberV2 para aceitar @lid como "telefone"
export function extractPhoneNumberV2(
  data: WAHAWebhookPayload,
  preferFrom = true,
  allowLidAsFallback = false  // ← NOVO parâmetro
): string {
  // ... código existente ...

  // Fallback final: se não encontrou telefone mas tem @lid
  if (allowLidAsFallback && data.from && data.from.includes('@lid')) {
    const lidId = data.from.replace('@lid', '');
    return lidId; // Retorna o LID como "telefone"
  }

  return '';
}
```

**Impacto**:
- Permite criar conversas para contatos sem número de telefone
- Requer ajuste no banco de dados (campo `contact_phone` pode ser LID)

**Testes Novos**:
```typescript
// Cenário: Contato apenas com @lid, sem número
const data = {
  from: '176369157804064@lid',
  contact: { id: '176369157804064@lid', number: null }
};

const phone = extractPhoneNumberV2(data, true, true);
// Esperado: "176369157804064"
```

### Melhoria 2: Flag `hasPhoneNumber` em extractContactDataV2

**Implementação**:
```typescript
interface ContactDataV2 {
  // ... campos existentes ...
  hasPhoneNumber: boolean;  // ← NOVO
  identifierType: 'phone' | 'lid' | 'unknown';  // ← NOVO
}

export function extractContactDataV2(data: WAHAWebhookPayload): ContactDataV2 {
  const phoneNumber = extractPhoneNumberV2(data);
  const lidNumber = extractPhoneNumberV2(data, true, true);

  return {
    // ... dados existentes ...
    phoneNumber: phoneNumber || lidNumber,
    hasPhoneNumber: !!phoneNumber,
    identifierType: phoneNumber ? 'phone' : (lidNumber ? 'lid' : 'unknown'),
  };
}
```

**Benefícios**:
- Transparência sobre tipo de identificador
- Permite lógica condicional no frontend/backend
- Facilita debugging

### Melhoria 3: Extração de Informações de Link Preview

**Contexto**: Quando usuário envia link, WhatsApp gera preview automático.

**Uso**:
```typescript
// NOVO: extractLinkPreview
export function extractLinkPreview(data: WAHAWebhookPayload): {
  url: string | null;
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
} {
  const extMsg = data._data?.message?.extendedTextMessage;

  if (!extMsg) {
    return { url: null, title: null, description: null, thumbnailUrl: null };
  }

  return {
    url: extMsg.canonicalUrl || null,
    title: extMsg.title || null,
    description: extMsg.description || null,
    thumbnailUrl: extMsg.thumbnailUrl || null,
  };
}
```

**Benefícios**:
- Enriquecer mensagens com metadados de links
- Útil para analytics (quais links são mais compartilhados)
- Preview melhor no chat

## 🎯 Recomendações de Implementação

### Prioridade Alta
1. ✅ **Melhoria 1**: Suporte @lid sem telefone
   - **Impacto**: Aumenta cobertura de contatos em 5-10%
   - **Esforço**: Médio (ajustar banco + testes)

2. ✅ **Melhoria 2**: Flag `hasPhoneNumber` e `identifierType`
   - **Impacto**: Transparência e debugging
   - **Esforço**: Baixo (apenas adicionar campos)

### Prioridade Média
3. ⚠️ **Melhoria 3**: Extração de link preview
   - **Impacto**: Enriquecimento de dados
   - **Esforço**: Baixo
   - **Uso**: Analytics e UX

### Prioridade Baixa
4. ⚠️ Reactions e Polls
   - **Impacto**: Baixo (casos raros)
   - **Esforço**: Alto (estrutura complexa)
   - **Uso**: Futuro (quando necessário)

## 📝 Próximos Passos

### Fase 1: Implementar Suporte @lid Completo
1. Criar `extractors-v3.ts` com as melhorias 1 e 2
2. Adicionar testes para cenários @lid sem telefone
3. Atualizar documentação

### Fase 2: Enriquecer Dados de Mensagens
1. Implementar `extractLinkPreview`
2. Adicionar ao `extractContactDataV2` como campo opcional
3. Testes de integração

### Fase 3: Validação em Produção
1. Deploy em ambiente de teste
2. Monitorar casos @lid sem telefone
3. Ajustar RLS policies se necessário
4. Documentar casos extremos encontrados

## 📚 Referências

### Issues GitHub
- [#1418: @lid vs @c.us](https://github.com/devlikeapro/waha/issues/1418)
- [#1073: Direct message without phone number](https://github.com/devlikeapro/waha/issues/1073)
- [Discussion #602: .to field missing](https://github.com/devlikeapro/waha/discussions/602)

### Documentação
- [WAHA Events](https://waha.devlike.pro/docs/how-to/events/)
- [WAHA NOWEB Engine](https://waha.devlike.pro/docs/engines/noweb/)

---

**Versão**: 3.0.0-draft
**Data**: Fevereiro 2026
**Status**: 🚧 Em Planejamento

# Plano de Migração: Módulo WhatsApp para Multi-Tenant

**Data de Criação:** 2026-02-03
**Última Atualização:** 2026-02-03
**Status:** ✅ Migração Completa (Fases 1-7 Concluídas)
**Prioridade:** Alta

---

## 📊 Resumo Executivo

Migração do módulo WhatsApp/WAHA das tabelas legacy (`viniun_whatsapp_*`) para as tabelas multi-tenant (`mt_whatsapp_*`), implementando isolamento por tenant e franchise via adapters e feature flags.

### Status Atual

| Aspecto | Legacy | MT | Status |
|---------|--------|-----|--------|
| **Tabelas** | 8 tabelas `viniun_whatsapp_*` | 8 tabelas `mt_whatsapp_*` | ✅ Migradas |
| **Dados** | 1 sessão, 0 conversas | **2 sessões, 6.666 conversas, 225.772 mensagens** | ✅ Migrados |
| **Hooks MT** | - | 7 hooks criados | ✅ Criados |
| **Adapters** | - | 7 adapters criados | ✅ Criados |
| **Páginas** | 10 páginas usando legacy | **Todas migradas para adapters** | ✅ Migradas |

### Benefícios da Migração

1. **Isolamento de Dados**: Cada tenant vê apenas suas sessões/conversas
2. **Escalabilidade**: Suporte a múltiplas empresas (Viniun, PopDents, etc.)
3. **Segurança**: RLS impede vazamento de dados entre tenants
4. **Configuração por Tenant**: WAHA URL/API Key diferentes por empresa
5. **Permissões Granulares**: Controle por franchise e usuário

---

## ✅ Checklist de Migração (CONCLUÍDO)

### Fase 1: Preparação ✅ CONCLUÍDA

- [x] **1.1.1** Verificar se todas as 8 tabelas MT existem
- [x] **1.1.2** Verificar RLS habilitado em todas as tabelas
- [x] **1.1.3** Verificar políticas RLS existem
- [x] **1.1.4** Verificar FK para mt_tenants e mt_franchises

### Fase 2: Tipos TypeScript ✅ CONCLUÍDA

- [x] **1.2.1** Criar `src/types/whatsapp-mt.ts` com interfaces:
  - `MTWhatsAppSession`
  - `MTWhatsAppConversation`
  - `MTWhatsAppMessage`
  - `MTWhatsAppLabel`
  - `MTWhatsAppQuickReply`
  - `MTWhatsAppTemplate`
  - `MTWhatsAppUserSession`

- [x] **1.2.2** Tipos de input para mutations:
  - `CreateSessionInput`, `UpdateSessionInput`
  - `UpdateConversationInput`
  - `SendMessageInput`
  - `CreateLabelInput`, `UpdateLabelInput`
  - `CreateTemplateInput`, `UpdateTemplateInput`
  - `CreateQuickReplyInput`, `UpdateQuickReplyInput`
  - `GrantPermissionInput`

### Fase 3: Hooks MT Core ✅ CONCLUÍDA

- [x] **2.1** `useWhatsAppSessionsMT.ts` - CRUD + ações WAHA
- [x] **2.2** `useWhatsAppConversationsMT.ts` - Conversas + real-time subscriptions
- [x] **2.3** `useWhatsAppMessagesMT.ts` - Mensagens + envio + paginação infinita
- [x] **2.4** `useWhatsAppPermissionsMT.ts` - Permissões granulares

### Fase 4: Hooks MT Secundários ✅ CONCLUÍDA

- [x] **3.1** `useWhatsAppLabelsMT.ts` - Labels/etiquetas + cores pré-definidas
- [x] **3.2** `useWhatsAppQuickRepliesMT.ts` - Respostas rápidas + atalhos
- [x] **3.3** `useWhatsAppTemplatesMT.ts` - Templates + variáveis

### Fase 5: Adapters ✅ CONCLUÍDA

- [x] **4.1.1** `useWhatsAppSessionsAdapter.ts`
- [x] **4.1.2** `useWhatsAppConversationsAdapter.ts`
- [x] **4.1.3** `useWhatsAppMessagesAdapter.ts`
- [x] **4.1.4** `useWhatsAppLabelsAdapter.ts`
- [x] **4.1.5** `useWhatsAppQuickRepliesAdapter.ts`
- [x] **4.1.6** `useWhatsAppTemplatesAdapter.ts`
- [x] **4.1.7** `useWhatsAppPermissionsAdapter.ts`
- [x] **4.2** Index file com exports

### Fase 6: Migração de Dados ✅ CONCLUÍDA

Os dados já foram migrados para as tabelas MT:

| Tabela MT | Registros |
|-----------|-----------|
| `mt_whatsapp_sessions` | 2 |
| `mt_whatsapp_conversations` | 6.666 |
| `mt_whatsapp_messages` | 225.772 |
| `mt_whatsapp_templates` | 3 |
| `mt_whatsapp_user_sessions` | 3 |
| `mt_whatsapp_quick_replies` | 0 |
| `mt_whatsapp_labels` | 0 |
| `mt_whatsapp_conversation_labels` | 0 |

### Fase 7: Migração de Páginas para Adapters ✅ CONCLUÍDA

**Todas as páginas e componentes foram migrados para usar adapters:**

- [x] **7.1** `WhatsAppTemplates.tsx` → useWhatsAppSessionsAdapter
- [x] **7.2** `WhatsAppRespostasRapidas.tsx` → useWhatsAppSessionsAdapter
- [x] **7.3** `WhatsAppDashboard.tsx` → useWhatsAppSessionsAdapter
- [x] **7.4** `WhatsAppChat.tsx` → useWhatsAppSessionsAdapter + useWhatsAppPermissionsAdapter
- [x] **7.5** `WhatsAppSessoes.tsx` → useWhatsAppSessionsAdapter
- [x] **7.6** `WhatsAppAutomacoes.tsx` → useWhatsAppSessionsAdapter
- [x] **7.7** `WhatsAppRelatorios.tsx` → useWhatsAppSessionsAdapter
- [x] **7.8** `WhatsAppStatus.tsx` → useWhatsAppSessionsAdapter
- [x] **7.9** `FranquiaWhatsApp.tsx` → useWhatsAppSessionsAdapter
- [x] **7.10** `SendTemplateModal.tsx` → useWhatsAppSessionsAdapter
- [x] **7.11** `ScheduleMessageModal.tsx` → useWhatsAppSessionsAdapter
- [x] **7.12** `ForwardMessageDialog.tsx` → Removido import não utilizado

---

## 📁 Arquivos Criados

### Tipos (`src/types/`)

```
src/types/
└── whatsapp-mt.ts   # ✅ Interfaces MT para WhatsApp
```

### Hooks MT (`src/hooks/multitenant/`)

```
src/hooks/multitenant/
├── useWhatsAppSessionsMT.ts      # ✅ CRUD + ações WAHA
├── useWhatsAppConversationsMT.ts # ✅ Conversas + real-time
├── useWhatsAppMessagesMT.ts      # ✅ Mensagens + envio + paginação
├── useWhatsAppLabelsMT.ts        # ✅ Labels/etiquetas
├── useWhatsAppQuickRepliesMT.ts  # ✅ Respostas rápidas
├── useWhatsAppTemplatesMT.ts     # ✅ Templates
├── useWhatsAppPermissionsMT.ts   # ✅ Permissões
└── index.ts                      # ✅ Exportações
```

### Adapters (`src/hooks/`)

```
src/hooks/
├── useWhatsAppSessionsAdapter.ts       # ✅
├── useWhatsAppConversationsAdapter.ts  # ✅
├── useWhatsAppMessagesAdapter.ts       # ✅
├── useWhatsAppLabelsAdapter.ts         # ✅
├── useWhatsAppQuickRepliesAdapter.ts   # ✅
├── useWhatsAppTemplatesAdapter.ts      # ✅
└── useWhatsAppPermissionsAdapter.ts    # ✅
```

---

## 🔧 Como Ativar o Modo Multi-Tenant

### Via Console do Navegador

```javascript
// Para ATIVAR modo MT:
localStorage.setItem('USE_MT_WHATSAPP', 'true');
location.reload();

// Para DESATIVAR (voltar ao legacy):
localStorage.removeItem('USE_MT_WHATSAPP');
location.reload();

// Para VERIFICAR status atual:
console.log('MT Mode:', localStorage.getItem('USE_MT_WHATSAPP') === 'true');
```

### Requisitos para MT Mode

1. Usuário deve existir em `mt_users` com `auth_user_id` correto
2. Usuário deve estar vinculado a um tenant ativo
3. Tenant deve ter módulo 'whatsapp' habilitado
4. TenantContext deve estar carregado corretamente

### Como os Adapters Funcionam

```typescript
// Exemplo: useWhatsAppSessionsAdapter.ts
function useWhatsAppMTEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('USE_MT_WHATSAPP') === 'true';
}

export function useWhatsAppSessionsAdapter(filters?: SessionFilters) {
  const useMT = useWhatsAppMTEnabled();

  // Hook MT
  const mtHook = useWhatsAppSessionsMT(filters);

  // Hook Legacy
  const legacyHook = useWhatsAppSessoes(filters);

  if (useMT) {
    return {
      sessions: mtHook.sessions as MTWhatsAppSession[],
      isLoading: mtHook.isLoading,
      error: mtHook.error,
      // ... demais propriedades MT
    };
  }

  // Fallback: adaptar interface legacy para MT
  return {
    sessions: legacyHook.sessoes.map(adaptLegacyToMT),
    isLoading: legacyHook.isLoading,
    // ... demais propriedades adaptadas
  };
}
```

---

## 📊 Hooks MT - Funcionalidades

### useWhatsAppSessionsMT

```typescript
const {
  sessions,         // Lista de sessões do tenant
  isLoading,
  error,
  refetch,
  createSession,    // Criar nova sessão
  updateSession,    // Atualizar dados
  updateStatus,     // Atualizar status/QR
  deleteSession,    // Soft delete
  updateStats,      // Atualizar contadores
} = useWhatsAppSessionsMT(filters);

// Hook para sessão individual
const { session, isLoading } = useWhatsAppSessionMT(sessionId);
```

### useWhatsAppConversationsMT

```typescript
const {
  conversations,      // Lista de conversas
  isLoading,
  error,
  refetch,
  updateConversation, // Atualizar dados
  markAsRead,         // Marcar como lida
  archiveConversation,// Arquivar
  restoreConversation,// Restaurar
  assignConversation, // Atribuir a usuário
  linkLead,           // Vincular a lead
} = useWhatsAppConversationsMT(sessionId, filters);
```

### useWhatsAppMessagesMT

```typescript
const {
  messages,            // Lista paginada (infinite query)
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,       // Carregar mais mensagens
  sendMessage,         // Enviar via WAHA
  updateMessageStatus, // Atualizar status
  retryMessage,        // Reenviar falhada
  deleteMessage,       // Deletar
  isSending,
} = useWhatsAppMessagesMT(conversationId, filters);

// Hook simplificado para envio
const { sendText, sendMedia, isSending } = useSendMessageMT(sessionId);
```

### useWhatsAppPermissionsMT

```typescript
const {
  myPermissions,       // Permissões do usuário atual
  canView,             // Pode visualizar
  canSend,             // Pode enviar mensagens
  canManage,           // Pode gerenciar sessão
  canDeleteMessages,   // Pode deletar mensagens
  canExport,           // Pode exportar
  canAssign,           // Pode atribuir conversas
  sessionPermissions,  // Lista de permissões (admin)
  grantPermission,     // Conceder permissão
  revokePermission,    // Revogar permissão
  updatePermission,    // Atualizar permissão
  setDefaultSession,   // Definir sessão padrão
} = useWhatsAppPermissionsMT(sessionId);
```

### useWhatsAppLabelsMT

```typescript
const {
  labels,        // Lista de labels
  isLoading,
  createLabel,   // Criar label
  updateLabel,   // Atualizar
  deleteLabel,   // Deletar
  LABEL_COLORS,  // Cores pré-definidas
} = useWhatsAppLabelsMT();

// Labels de uma conversa específica
const { labels, addLabel, removeLabel, setLabels } = useConversationLabelsMT(conversationId);
```

### useWhatsAppTemplatesMT

```typescript
const {
  templates,           // Lista de templates
  templatesByCategory, // Agrupados por categoria
  createTemplate,
  updateTemplate,
  deleteTemplate,
  useTemplate,         // Incrementar uso
  duplicateTemplate,   // Duplicar
  renderTemplate,      // Substituir variáveis
  TEMPLATE_CATEGORIES, // Categorias disponíveis
} = useWhatsAppTemplatesMT(filters);
```

### useWhatsAppQuickRepliesMT

```typescript
const {
  quickReplies,           // Lista de respostas rápidas
  quickRepliesByCategory, // Agrupadas por categoria
  categories,             // Lista de categorias
  createQuickReply,
  updateQuickReply,
  deleteQuickReply,
  useQuickReply,          // Incrementar uso
  getByShortcut,          // Buscar por atalho
  renderContent,          // Substituir variáveis
} = useWhatsAppQuickRepliesMT(filters);
```

---

## 🔒 Níveis de Acesso

| Nível | Descrição | Acesso WhatsApp |
|-------|-----------|-----------------|
| `platform` | Admin da plataforma | Todas as sessões de todos os tenants |
| `tenant` | Admin do tenant | Todas as sessões do seu tenant |
| `franchise` | Admin da franquia | Sessões da sua franquia |
| `user` | Usuário comum | Sessões com permissão explícita |

---

## 🔄 Real-time Subscriptions

Os hooks MT implementam subscriptions do Supabase com filtro por tenant:

```typescript
// Em useWhatsAppMessagesMT.ts
useEffect(() => {
  if (!conversationId || !tenant) return;

  const channel = supabase
    .channel(`mt-messages-${conversationId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'mt_whatsapp_messages',
      filter: `conversation_id=eq.${conversationId}`,
    }, (payload) => {
      queryClient.setQueryData(
        ['mt-whatsapp-messages', conversationId],
        (old) => addNewMessage(old, payload.new)
      );
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [conversationId, tenant?.id]);
```

---

## ⚠️ Pontos de Atenção

### 1. Páginas Complexas ✅ MIGRADAS

As páginas `WhatsAppSessoes.tsx` e `WhatsAppChat.tsx` foram migradas com sucesso:

1. ✅ Todas as páginas usam adapters
2. ✅ Adapters permitem transição gradual via feature flag
3. ✅ Feature flag `USE_MT_WHATSAPP` controla qual versão usar
4. ✅ Código legacy mantido para rollback se necessário

### 2. Integração WAHA

Os hooks MT mantêm compatibilidade com a API WAHA existente:

```typescript
// useWhatsAppMessagesMT.ts
const sendMessage = useMutation({
  mutationFn: async (input: SendMessageInput) => {
    // 1. Enviar para WAHA
    const wahaResponse = await wahaApi.sendText(
      session.session_name,
      input.to,
      input.content
    );

    // 2. Salvar no banco MT
    const { data } = await supabase
      .from('mt_whatsapp_messages')
      .insert({
        tenant_id: tenant.id,
        conversation_id: input.conversation_id,
        message_id: wahaResponse.id,
        content: input.content,
        // ...
      })
      .select()
      .single();

    return data;
  },
});
```

### 3. Webhook

O webhook WAHA continua funcionando pois identifica o tenant pela sessão:

```typescript
// supabase/functions/waha-webhook/index.ts
const session = await supabase
  .from('mt_whatsapp_sessions')
  .select('tenant_id, franchise_id')
  .eq('session_name', payload.session)
  .single();

// Usa tenant_id do session para inserir mensagens
```

---

## 📚 Referências

- [CLAUDE.md](./CLAUDE.md) - Documentação técnica principal
- [PLANO_MIGRACAO_LEADS_MT.md](./PLANO_MIGRACAO_LEADS_MT.md) - Exemplo de migração anterior
- [src/types/whatsapp-mt.ts](./src/types/whatsapp-mt.ts) - Tipos TypeScript MT
- [src/hooks/multitenant/](./src/hooks/multitenant/) - Hooks MT

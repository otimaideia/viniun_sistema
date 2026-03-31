# Plano de Migração: Módulo Formulários para Multi-Tenant

**Data de Criação:** 2026-02-03
**Última Atualização:** 2026-02-03
**Status:** ✅ Migração Completa (Fases 1-4 Concluídas)
**Prioridade:** Alta

---

## Resumo Executivo

Migração do módulo Formulários das tabelas legacy (`viniun_formularios`) para as tabelas multi-tenant (`mt_forms`), implementando isolamento por tenant e franchise via adapters e feature flags.

### Status Atual

| Aspecto | Legacy | MT | Status |
|---------|--------|-----|--------|
| **Tabelas** | 2 tabelas `viniun_formularios*` | 3 tabelas `mt_forms*` | ✅ Criadas |
| **Dados** | 7 formulários | 16 formulários (migrados) | ✅ Migrados |
| **Hooks MT** | - | 3 hooks criados | ✅ Criados |
| **Adapters** | - | 3 adapters criados | ✅ Criados |
| **Páginas** | 4 páginas usando legacy | **Todas migradas para adapters** | ✅ Migradas |

### Benefícios da Migração

1. **Isolamento de Dados**: Cada tenant vê apenas seus formulários
2. **Escalabilidade**: Suporte a múltiplas empresas
3. **Segurança**: RLS impede vazamento de dados entre tenants
4. **Formulários Globais**: Suporte a formulários compartilhados por tenant
5. **Permissões Granulares**: Controle por franchise

---

## ✅ Checklist de Migração (CONCLUÍDO)

### Fase 1: Preparação ✅ CONCLUÍDA

- [x] **1.1.1** Verificar se todas as tabelas MT existem (`mt_forms`, `mt_form_fields`, `mt_form_submissions`)
- [x] **1.1.2** Verificar RLS habilitado em todas as tabelas
- [x] **1.1.3** Verificar políticas RLS existem
- [x] **1.1.4** Verificar FK para mt_tenants e mt_franchises

### Fase 2: Tipos TypeScript ✅ JÁ EXISTIAM

Os tipos MT já estavam definidos nos hooks existentes:
- `Form` - Formulário MT
- `FormField` - Campo do formulário
- `FormSubmission` - Submissão

### Fase 3: Hooks MT Core ✅ JÁ EXISTIAM

- [x] **3.1** `useFormulariosMT.ts` - CRUD + listagem
- [x] **3.2** `useFormularioMT.ts` - Formulário individual
- [x] **3.3** `useFormFieldsMT.ts` - Campos do formulário

### Fase 4: Adapters ✅ JÁ EXISTIAM

- [x] **4.1** `useFormulariosAdapter.ts` - Lista e CRUD
- [x] **4.2** `useFormularioAdapter.ts` - Individual
- [x] **4.3** `useFormFieldsAdapter.ts` - Campos

### Fase 5: Migração de Páginas para Adapters ✅ CONCLUÍDA

**Todos os arquivos foram migrados para usar adapters:**

- [x] **5.1** `Formularios.tsx` → useFormulariosAdapter
- [x] **5.2** `FormularioEdit.tsx` → useFormulariosAdapter
- [x] **5.3** `FormularioNovo.tsx` → useFormulariosAdapter
- [x] **5.4** `FormularioABTestManager.tsx` → useFormulariosAdapter

---

## Arquivos Criados/Modificados

### Hooks MT (`src/hooks/multitenant/`)

```
src/hooks/multitenant/
└── useFormulariosMT.ts   # CRUD + listagem de formulários MT
```

### Adapters (`src/hooks/`)

```
src/hooks/
└── useFormulariosAdapter.ts  # Adapter com 3 exports:
    ├── useFormulariosAdapter()   # Lista e CRUD
    ├── useFormularioAdapter()    # Individual
    └── useFormFieldsAdapter()    # Campos
```

### Páginas Migradas

```
src/pages/
├── Formularios.tsx       # Listagem
├── FormularioEdit.tsx    # Criar/Editar
└── FormularioNovo.tsx    # Criar com template

src/components/formularios/
└── FormularioABTestManager.tsx  # Testes A/B
```

---

## Como Ativar o Modo Multi-Tenant

### Via Console do Navegador

```javascript
// Para ATIVAR modo MT:
localStorage.setItem('USE_MT_FORMS', 'true');
location.reload();

// Para DESATIVAR (voltar ao legacy):
localStorage.removeItem('USE_MT_FORMS');
location.reload();

// Para VERIFICAR status atual:
console.log('MT Mode:', localStorage.getItem('USE_MT_FORMS') === 'true');
```

### Requisitos para MT Mode

1. Usuário deve existir em `mt_users` com `auth_user_id` correto
2. Usuário deve estar vinculado a um tenant ativo
3. Tenant deve ter módulo 'formularios' habilitado
4. TenantContext deve estar carregado corretamente

---

## Como os Adapters Funcionam

```typescript
// Exemplo: useFormulariosAdapter.ts
const USE_MT_FORMS = typeof window !== 'undefined'
  ? localStorage.getItem('USE_MT_FORMS') === 'true'
  : false;

export function useFormulariosAdapter(options: Options = {}) {
  const { tenant, isLoading: isTenantLoading } = useTenantContext();

  // Usar MT se a flag estiver ativa E tiver um tenant carregado
  const shouldUseMT = USE_MT_FORMS && tenant?.id && !isTenantLoading;

  // Hook MT
  const mt = useFormulariosMT(options);

  // Hook Legacy
  const legacy = useFormularios(options);

  if (shouldUseMT) {
    return {
      formularios: mt.forms.map(adaptMTToLegacy),
      isLoading: mt.isLoading,
      createFormulario: mt.createForm,
      updateFormulario: mt.updateForm,
      deleteFormulario: mt.deleteForm,
      duplicateFormulario: mt.duplicateForm,
      // ...
      _mode: 'mt' as const,
    };
  }

  return {
    ...legacy,
    _mode: 'legacy' as const,
  };
}
```

---

## Hooks MT - Funcionalidades

### useFormulariosMT

```typescript
const {
  forms,              // Lista de formulários do tenant
  isLoading,
  error,
  refetch,
  stats,              // Estatísticas agregadas
  createForm,         // Criar novo formulário
  updateForm,         // Atualizar dados
  deleteForm,         // Soft delete
  duplicateForm,      // Duplicar
  togglePublish,      // Publicar/despublicar
} = useFormulariosMT(options);
```

### useFormularioMT

```typescript
const {
  form,               // Formulário individual
  isLoading,
  error,
  refetch,
  incrementView,      // Incrementar visualizações
} = useFormularioMT(formId);
```

### useFormFieldsMT

```typescript
const {
  fields,             // Lista de campos
  isLoading,
  createField,        // Criar campo
  updateField,        // Atualizar campo
  deleteField,        // Deletar campo
  reorderFields,      // Reordenar campos
  refetch,
} = useFormFieldsMT(formId);
```

---

## Níveis de Acesso

| Nível | Descrição | Acesso Formulários |
|-------|-----------|--------------------|
| `platform` | Admin da plataforma | Todos os formulários de todos os tenants |
| `tenant` | Admin do tenant | Todos os formulários do seu tenant |
| `franchise` | Admin da franquia | Formulários da franquia + globais do tenant |
| `user` | Usuário comum | Formulários com permissão explícita |

---

## Tabelas Multi-Tenant

### mt_forms (Formulários)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único |
| tenant_id | UUID | FK para mt_tenants |
| franchise_id | UUID | FK para mt_franchises (NULL = global) |
| slug | VARCHAR | URL amigável |
| nome | VARCHAR | Nome do formulário |
| titulo | VARCHAR | Título exibido |
| subtitulo | VARCHAR | Subtítulo |
| descricao | TEXT | Descrição interna |
| publicado | BOOLEAN | Se está publicado |
| is_active | BOOLEAN | Se está ativo |
| modo | VARCHAR | simples ou wizard |
| config | JSONB | Configurações visuais e comportamento |
| created_at | TIMESTAMPTZ | Data de criação |
| updated_at | TIMESTAMPTZ | Última atualização |
| deleted_at | TIMESTAMPTZ | Soft delete |

### mt_form_fields (Campos)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único |
| form_id | UUID | FK para mt_forms |
| nome | VARCHAR | Nome do campo (ID) |
| tipo | VARCHAR | Tipo (text, email, tel, etc.) |
| label | VARCHAR | Label exibido |
| placeholder | VARCHAR | Placeholder |
| obrigatorio | BOOLEAN | Se é obrigatório |
| ordem | INT | Ordem de exibição |
| largura | VARCHAR | full, half, third |
| opcoes | TEXT[] | Opções para select/radio |
| config | JSONB | Configurações extras |

### mt_form_submissions (Submissões)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único |
| form_id | UUID | FK para mt_forms |
| tenant_id | UUID | FK para mt_tenants |
| franchise_id | UUID | FK para mt_franchises |
| dados | JSONB | Dados submetidos |
| lead_id | UUID | FK para mt_leads (se convertido) |
| ip | INET | IP do visitante |
| user_agent | TEXT | User agent |
| utms | JSONB | Parâmetros UTM |
| created_at | TIMESTAMPTZ | Data da submissão |

---

## Pontos de Atenção

### 1. Compatibilidade com FormularioPublico

O componente `FormularioPublico.tsx` que renderiza formulários públicos continua usando a tabela legacy `viniun_formularios` por enquanto. Quando ativar o modo MT, será necessário atualizar também a lógica de renderização pública.

### 2. Templates de Formulário

Os templates (`useFormularioTemplates`) ainda usam tabelas legacy. A migração de templates será feita em fase posterior.

### 3. Campos Legacy

O hook `useFormularioCampos` ainda é usado em `FormularioEdit.tsx`. Ele funciona com a tabela legacy `viniun_formulario_campos`. No modo MT, o adapter `useFormFieldsAdapter` assume.

---

## Referências

- [CLAUDE.md](./CLAUDE.md) - Documentação técnica principal
- [PLANO_MIGRACAO_WHATSAPP_MT.md](./PLANO_MIGRACAO_WHATSAPP_MT.md) - Migração WhatsApp
- [PLANO_MIGRACAO_LEADS_MT.md](./PLANO_MIGRACAO_LEADS_MT.md) - Migração Leads
- [src/hooks/useFormulariosAdapter.ts](./src/hooks/useFormulariosAdapter.ts) - Adapter
- [src/hooks/multitenant/useFormulariosMT.ts](./src/hooks/multitenant/useFormulariosMT.ts) - Hook MT

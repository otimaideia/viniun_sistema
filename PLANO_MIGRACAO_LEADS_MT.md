# Plano de Migração: Módulo de Leads para Multi-Tenant

> **Versão**: 1.0
> **Data**: 2026-02-03
> **Status**: 📋 Planejamento
> **Responsável**: Equipe de Desenvolvimento
> **Estimativa Total**: 8-12 semanas

---

## Sumário Executivo

O módulo de leads é o **componente mais crítico** do sistema YESlaser, responsável por toda a gestão comercial. Atualmente está 100% acoplado às tabelas legacy (`sistema_leads_yeslaser`) e precisa ser migrado para a arquitetura multi-tenant (`mt_leads`).

### Métricas do Projeto

| Métrica | Valor |
|---------|-------|
| Arquivos a modificar | 33 |
| Hooks a refatorar | 15 |
| Componentes afetados | 11 |
| Campos na tabela leads | 80+ |
| Tenants a suportar | 9 |
| Estimativa de leads existentes | ~50.000+ |

---

## Índice

1. [Estado Atual](#1-estado-atual)
2. [Arquitetura Alvo](#2-arquitetura-alvo)
3. [Fase 1: Preparação e Análise](#fase-1-preparação-e-análise)
4. [Fase 2: Infraestrutura Backend](#fase-2-infraestrutura-backend)
5. [Fase 3: Migração de Dados](#fase-3-migração-de-dados)
6. [Fase 4: Refatoração de Hooks](#fase-4-refatoração-de-hooks)
7. [Fase 5: Atualização de Componentes](#fase-5-atualização-de-componentes)
8. [Fase 6: Testes e Validação](#fase-6-testes-e-validação)
9. [Fase 7: Rollout e Monitoramento](#fase-7-rollout-e-monitoramento)
10. [Mapeamento de Campos](#mapeamento-de-campos)
11. [Riscos e Mitigações](#riscos-e-mitigações)
12. [Cronograma](#cronograma)

---

## 1. Estado Atual

### 1.1 Tabelas Legacy em Uso

```
┌─────────────────────────────────────────────────────────────┐
│                    TABELAS LEGACY                            │
├─────────────────────────────────────────────────────────────┤
│ sistema_leads_yeslaser          │ Principal (80+ campos)    │
│ yeslaser_promocao_cadastros     │ Leads de promoção         │
│ yeslaser_lead_activities        │ Histórico de atividades   │
│ yeslaser_indicacoes_historico   │ Indicações                │
│ yeslaser_funil_leads            │ Posição no funil          │
│ yeslaser_funil_etapas           │ Etapas do funil           │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Arquivos do Módulo

#### Hooks (15 arquivos)
| Arquivo | Linhas | Complexidade | Prioridade |
|---------|--------|--------------|------------|
| `useLeads.ts` | ~810 | 🔴 Muito Alta | P0 |
| `useLeadActivities.ts` | ~200 | 🟡 Média | P1 |
| `useFunilLeads.ts` | ~300 | 🔴 Alta | P1 |
| `useLeadHistory.ts` | ~150 | 🟡 Média | P2 |
| `useLeadMetrics.ts` | ~180 | 🟡 Média | P2 |
| `useLeadAppointments.ts` | ~120 | 🟢 Baixa | P2 |
| `useLeadConversations.ts` | ~100 | 🟢 Baixa | P2 |
| `useLeadFunnelHistory.ts` | ~80 | 🟢 Baixa | P3 |
| `useLeadWhatsAppMatch.ts` | ~90 | 🟢 Baixa | P3 |
| `useLinkLead.ts` | ~60 | 🟢 Baixa | P3 |
| `useLeadCRM.ts` | ~100 | 🟡 Média | P2 |
| `useIndicacoes.ts` | ~150 | 🟡 Média | P2 |
| `useInfluenciadoraIndicacoes.ts` | ~120 | 🟡 Média | P3 |
| `useClienteAuth.ts` | ~80 | 🟢 Baixa | P3 |
| `useFormularioSubmissoes.ts` | ~200 | 🟡 Média | P2 |

#### Páginas (4 arquivos)
| Arquivo | Prioridade |
|---------|------------|
| `Leads.tsx` | P0 |
| `LeadDetail.tsx` | P0 |
| `LeadEdit.tsx` | P0 |
| `franquia/FranquiaLeads.tsx` | P1 |

#### Componentes (11 arquivos)
| Componente | Localização | Prioridade |
|------------|-------------|------------|
| `LeadsTable.tsx` | dashboard/ | P0 |
| `LeadFilters.tsx` | dashboard/ | P1 |
| `LeadStatusBadge.tsx` | dashboard/ | P2 |
| `RecentLeads.tsx` | dashboard/ | P2 |
| `LeadAnalyticsDashboard.tsx` | dashboard/ | P2 |
| `LeadHistoryDrawer.tsx` | dashboard/ | P2 |
| `LeadMiniCRM.tsx` | leads/ | P1 |
| `LeadActivityTimeline.tsx` | leads/ | P1 |
| `LeadAppointments.tsx` | leads/ | P2 |
| `LeadConversations.tsx` | leads/ | P2 |
| `LeadQuickActions.tsx` | funil/ | P2 |

### 1.3 Problemas Identificados

- [ ] ❌ Nenhum `tenant_id` nas queries
- [ ] ❌ Nenhum uso de `TenantContext`
- [ ] ❌ RLS não aplicado (tabelas legacy)
- [ ] ❌ Campo `unidade` é texto, não UUID
- [ ] ❌ Duas fontes de dados misturadas em memória
- [ ] ❌ Sem validação de acesso por nível (platform/tenant/franchise/user)

---

## 2. Arquitetura Alvo

### 2.1 Tabelas Multi-Tenant

```
┌─────────────────────────────────────────────────────────────┐
│                    TABELAS MT (Alvo)                         │
├─────────────────────────────────────────────────────────────┤
│ mt_leads                        │ Leads (com tenant_id)     │
│ mt_lead_activities              │ Histórico de atividades   │
│ mt_lead_scoring_rules           │ Regras de pontuação       │
│ mt_lead_scores                  │ Scores calculados         │
│ mt_lead_score_history           │ Histórico de scores       │
│ mt_funnels                      │ Funis de venda            │
│ mt_funnel_stages                │ Etapas do funil           │
│ mt_funnel_leads                 │ Leads no funil            │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Fluxo de Dados Multi-Tenant

```
┌──────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │   Leads.tsx │    │LeadDetail   │    │  LeadEdit   │          │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘          │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            ▼                                     │
│                   ┌─────────────────┐                            │
│                   │  useLeads.ts    │◄──── useTenantContext()    │
│                   │  (MT Version)   │                            │
│                   └────────┬────────┘                            │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┐
│                        SUPABASE                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     RLS POLICIES                          │  │
│  │  - Platform Admin: ALL tenants                            │  │
│  │  - Tenant Admin: tenant_id = current_tenant_id()          │  │
│  │  - Franchise Admin: + franchise_id = current_franchise()  │  │
│  │  - User: + created_by = auth.uid()                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│                      ┌────────────┐                             │
│                      │  mt_leads  │                             │
│                      └────────────┘                             │
└────────────────────────────────────────────────────────────────┘
```

### 2.3 Exemplo de Query Alvo

```typescript
// ANTES (Legacy)
const { data } = await supabase
  .from("sistema_leads_yeslaser")
  .select("*");

// DEPOIS (Multi-Tenant)
const { tenant, franchise, accessLevel } = useTenantContext();

const { data } = await supabase
  .from("mt_leads")
  .select("*")
  // RLS cuida do filtro automaticamente via current_tenant_id()
  // Mas podemos adicionar filtros explícitos para performance:
  .eq("tenant_id", tenant?.id)
  .eq("franchise_id", franchise?.id);
```

---

## Fase 1: Preparação e Análise

**Duração**: 1 semana
**Responsável**: Tech Lead + 1 Dev

### Checklist

#### 1.1 Documentação do Estado Atual
- [ ] Mapear todos os 80+ campos de `sistema_leads_yeslaser`
- [ ] Documentar relacionamentos entre tabelas
- [ ] Identificar campos deprecated/não utilizados
- [ ] Mapear todas as fontes de leads (formulários, API, manual)
- [ ] Documentar regras de negócio existentes

#### 1.2 Análise de Dependências
- [ ] Listar todos os webhooks que criam leads
- [ ] Identificar Edge Functions que manipulam leads
- [ ] Mapear integrações externas (Yeslaser Office API)
- [ ] Documentar fluxo de formulários → leads
- [ ] Verificar jobs/crons que processam leads

#### 1.3 Validação de Infraestrutura MT
- [ ] Confirmar que `mt_leads` existe e tem schema correto
- [ ] Verificar RLS policies em `mt_leads`
- [ ] Testar funções auxiliares (`current_tenant_id()`, etc.)
- [ ] Validar TenantContext está funcional
- [ ] Confirmar mapeamento de usuários → tenants

#### 1.4 Preparação do Ambiente
- [ ] Criar branch `feature/leads-multitenant`
- [ ] Configurar ambiente de teste isolado
- [ ] Criar backup do banco de produção
- [ ] Preparar scripts de rollback
- [ ] Definir feature flags

### Entregáveis Fase 1
- [ ] Documento de mapeamento de campos (Excel/CSV)
- [ ] Diagrama de dependências
- [ ] Checklist de validação de infraestrutura
- [ ] Branch criada e ambiente preparado

---

## Fase 2: Infraestrutura Backend

**Duração**: 1-2 semanas
**Responsável**: 1-2 Devs Backend

### Checklist

#### 2.1 Validar/Ajustar Schema `mt_leads`
- [ ] Comparar schema `mt_leads` vs `sistema_leads_yeslaser`
- [ ] Adicionar campos faltantes em `mt_leads`
- [ ] Criar índices para performance
- [ ] Adicionar constraints e foreign keys
- [ ] Documentar diferenças de schema

```sql
-- Exemplo: Verificar campos faltantes
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'sistema_leads_yeslaser'
  AND column_name NOT IN (
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'mt_leads'
  );
```

#### 2.2 Criar/Atualizar Tabelas Relacionadas
- [ ] Verificar `mt_lead_activities` tem todos os campos necessários
- [ ] Verificar `mt_funnel_leads` e `mt_funnel_stages`
- [ ] Criar tabela de migração auxiliar (tracking)
- [ ] Adicionar campo `legacy_id` para rastreabilidade

```sql
-- Adicionar campo para rastrear origem legacy
ALTER TABLE mt_leads
ADD COLUMN IF NOT EXISTS legacy_id uuid REFERENCES sistema_leads_yeslaser(id);

ALTER TABLE mt_leads
ADD COLUMN IF NOT EXISTS legacy_source text; -- 'sistema_leads' ou 'promocao_cadastros'
```

#### 2.3 Validar/Ajustar RLS Policies
- [ ] Testar policy de SELECT para cada nível de acesso
- [ ] Testar policy de INSERT para cada nível de acesso
- [ ] Testar policy de UPDATE para cada nível de acesso
- [ ] Testar policy de DELETE para cada nível de acesso
- [ ] Documentar matriz de permissões

```sql
-- Testar RLS como tenant admin
SET LOCAL app.current_user_id = 'uuid-do-tenant-admin';
SELECT * FROM mt_leads; -- Deve retornar apenas leads do tenant
```

#### 2.4 Criar Edge Functions Auxiliares
- [ ] Criar/atualizar `lead-create` para multi-tenant
- [ ] Criar/atualizar `lead-update` para multi-tenant
- [ ] Criar função de migração de lead individual
- [ ] Criar função de validação de tenant

#### 2.5 Atualizar Webhooks
- [ ] Atualizar `webhook-leads` para usar `mt_leads`
- [ ] Adicionar lógica de detecção de tenant
- [ ] Implementar fallback para leads sem tenant
- [ ] Testar fluxo completo de webhook

### Entregáveis Fase 2
- [ ] Schema `mt_leads` completo e documentado
- [ ] Migration SQL com todas as alterações
- [ ] RLS policies testadas e documentadas
- [ ] Edge Functions atualizadas
- [ ] Webhooks funcionando com MT

---

## Fase 3: Migração de Dados

**Duração**: 1-2 semanas
**Responsável**: 1 Dev + DBA

### Checklist

#### 3.1 Preparação da Migração
- [ ] Criar snapshot do banco atual
- [ ] Criar tabela de controle de migração
- [ ] Definir mapeamento tenant por lead (regras de negócio)
- [ ] Criar script de validação pré-migração
- [ ] Definir janela de manutenção (se necessário)

```sql
-- Tabela de controle de migração
CREATE TABLE IF NOT EXISTS migration_leads_control (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_table text NOT NULL,
  legacy_id uuid NOT NULL,
  mt_lead_id uuid,
  tenant_id uuid,
  franchise_id uuid,
  status text DEFAULT 'pending', -- pending, migrated, failed, skipped
  error_message text,
  migrated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(legacy_table, legacy_id)
);
```

#### 3.2 Mapeamento de Tenant por Lead
- [ ] Identificar regra: `franqueado_id` → `franchise` → `tenant`
- [ ] Tratar leads sem `franqueado_id` (leads gerais)
- [ ] Definir tenant padrão para leads órfãos
- [ ] Criar função de resolução de tenant

```sql
-- Função para resolver tenant_id a partir do franqueado_id
CREATE OR REPLACE FUNCTION resolve_tenant_for_lead(p_franqueado_id uuid)
RETURNS uuid AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Buscar tenant via franchise
  SELECT f.tenant_id INTO v_tenant_id
  FROM mt_franchises f
  JOIN yeslaser_franqueados yf ON yf.id = p_franqueado_id
  WHERE f.legacy_id = p_franqueado_id
     OR f.nome = yf.nome_fantasia;

  -- Se não encontrou, usar tenant padrão (yeslaser)
  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM mt_tenants WHERE slug = 'yeslaser';
  END IF;

  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql;
```

#### 3.3 Script de Migração Principal
- [ ] Migrar `sistema_leads_yeslaser` → `mt_leads`
- [ ] Migrar `yeslaser_promocao_cadastros` → `mt_leads`
- [ ] Deduplicar leads (mesmo telefone/email)
- [ ] Preservar `legacy_id` para rastreabilidade
- [ ] Log de cada migração na tabela de controle

```sql
-- Migração em batches de 1000
DO $$
DECLARE
  batch_size int := 1000;
  offset_val int := 0;
  rows_migrated int;
BEGIN
  LOOP
    WITH leads_to_migrate AS (
      SELECT
        sl.*,
        resolve_tenant_for_lead(sl.franqueado_id) as resolved_tenant_id
      FROM sistema_leads_yeslaser sl
      LEFT JOIN migration_leads_control mlc
        ON mlc.legacy_table = 'sistema_leads_yeslaser'
        AND mlc.legacy_id = sl.id
      WHERE mlc.id IS NULL -- Ainda não migrado
      ORDER BY sl.created_at
      LIMIT batch_size
    )
    INSERT INTO mt_leads (
      tenant_id,
      franchise_id,
      legacy_id,
      legacy_source,
      nome,
      email,
      telefone,
      -- ... demais campos
      created_at,
      updated_at
    )
    SELECT
      resolved_tenant_id,
      franqueado_id, -- será substituído por franchise_id correto
      id,
      'sistema_leads',
      nome,
      email,
      telefone,
      -- ... demais campos
      created_at,
      updated_at
    FROM leads_to_migrate;

    GET DIAGNOSTICS rows_migrated = ROW_COUNT;

    -- Registrar migração
    INSERT INTO migration_leads_control (legacy_table, legacy_id, mt_lead_id, status)
    SELECT 'sistema_leads_yeslaser', id,
      (SELECT id FROM mt_leads WHERE legacy_id = sistema_leads_yeslaser.id),
      'migrated'
    FROM leads_to_migrate;

    EXIT WHEN rows_migrated < batch_size;
    offset_val := offset_val + batch_size;

    -- Log progress
    RAISE NOTICE 'Migrated % leads (total: %)', rows_migrated, offset_val;
  END LOOP;
END $$;
```

#### 3.4 Migração de Dados Relacionados
- [ ] Migrar `yeslaser_lead_activities` → `mt_lead_activities`
- [ ] Migrar `yeslaser_funil_leads` → `mt_funnel_leads`
- [ ] Atualizar referências (lead_id → mt_lead_id)
- [ ] Migrar indicações e histórico

#### 3.5 Validação Pós-Migração
- [ ] Comparar contagem de registros (legacy vs MT)
- [ ] Verificar integridade referencial
- [ ] Validar distribuição por tenant
- [ ] Testar queries de exemplo
- [ ] Gerar relatório de migração

```sql
-- Validação: Contagem por tenant
SELECT
  t.slug as tenant,
  COUNT(l.id) as leads_count
FROM mt_leads l
JOIN mt_tenants t ON t.id = l.tenant_id
GROUP BY t.slug
ORDER BY leads_count DESC;

-- Validação: Leads órfãos (sem tenant)
SELECT COUNT(*) as orphan_leads
FROM mt_leads
WHERE tenant_id IS NULL;

-- Validação: Comparar com legacy
SELECT
  (SELECT COUNT(*) FROM sistema_leads_yeslaser) as legacy_count,
  (SELECT COUNT(*) FROM mt_leads WHERE legacy_source = 'sistema_leads') as migrated_count;
```

### Entregáveis Fase 3
- [ ] Script de migração completo e testado
- [ ] Tabela de controle com status de cada lead
- [ ] Relatório de validação pós-migração
- [ ] Documentação de mapeamento tenant
- [ ] Plano de rollback testado

---

## Fase 4: Refatoração de Hooks

**Duração**: 4-5 semanas
**Responsável**: 2-3 Devs Frontend

### Checklist

#### 4.1 Criar Tipos TypeScript Atualizados
- [ ] Criar `src/types/lead-mt.ts` com novos tipos
- [ ] Adicionar `tenant_id` e `franchise_id` aos tipos
- [ ] Criar tipos para atividades MT
- [ ] Criar tipos para funil MT
- [ ] Manter tipos legacy para compatibilidade

```typescript
// src/types/lead-mt.ts

export interface MTLead {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  legacy_id?: string | null;
  legacy_source?: 'sistema_leads' | 'promocao_cadastros' | null;

  // Dados básicos
  nome: string;
  email: string | null;
  telefone: string;
  telefone_secundario?: string | null;
  cpf?: string | null;

  // Endereço
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;

  // Status e classificação
  status: LeadStatus;
  origem: string | null;
  canal: string | null;
  campanha?: string | null;
  midia?: string | null;

  // Comercial
  valor_estimado?: number | null;
  servico_interesse?: string | null;
  observacoes?: string | null;

  // Atribuição
  responsavel_id?: string | null;
  responsavel?: MTUser | null;

  // Relacionamentos
  tenant?: MTTenant;
  franchise?: MTFranchise;
  activities?: MTLeadActivity[];

  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface MTLeadActivity {
  id: string;
  tenant_id: string;
  lead_id: string;
  tipo: 'nota' | 'ligacao' | 'email' | 'whatsapp' | 'reuniao' | 'tarefa' | 'status_change';
  descricao: string;
  metadata?: Record<string, any>;
  created_by: string;
  created_at: string;
}

export interface MTLeadFilters {
  tenant_id?: string;
  franchise_id?: string;
  status?: LeadStatus[];
  origem?: string[];
  responsavel_id?: string;
  data_inicio?: string;
  data_fim?: string;
  search?: string;
}
```

#### 4.2 Refatorar `useLeads.ts` (P0 - Crítico)
- [ ] Criar cópia: `useLeadsMT.ts`
- [ ] Integrar `useTenantContext()`
- [ ] Atualizar queries para `mt_leads`
- [ ] Implementar filtros por tenant/franchise
- [ ] Remover merge de duas tabelas
- [ ] Atualizar mutations (create, update, delete)
- [ ] Adicionar tratamento de erros MT-specific
- [ ] Implementar feature flag para switch

```typescript
// src/hooks/useLeadsMT.ts

import { useTenantContext } from '@/contexts/TenantContext';

export function useLeadsMT(filters?: MTLeadFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Query principal
  const {
    data: leads,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['mt-leads', tenant?.id, franchise?.id, filters],
    queryFn: async () => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado');
      }

      let query = supabase
        .from('mt_leads')
        .select(`
          *,
          tenant:mt_tenants(id, slug, nome_fantasia),
          franchise:mt_franchises(id, nome),
          responsavel:mt_users(id, nome, avatar_url),
          activities:mt_lead_activities(
            id, tipo, descricao, created_at, created_by
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Filtros baseados no nível de acesso
      // RLS cuida do básico, mas filtros explícitos melhoram performance
      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        query = query.eq('franchise_id', franchise.id);
      }

      // Filtros adicionais
      if (filters?.status?.length) {
        query = query.in('status', filters.status);
      }
      if (filters?.search) {
        query = query.or(`nome.ilike.%${filters.search}%,telefone.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }
      // ... outros filtros

      const { data, error } = await query;

      if (error) throw error;
      return data as MTLead[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Mutation: Criar lead
  const createLead = useMutation({
    mutationFn: async (newLead: Partial<MTLead>) => {
      if (!tenant) throw new Error('Tenant não definido');

      const { data, error } = await supabase
        .from('mt_leads')
        .insert({
          ...newLead,
          tenant_id: tenant.id,
          franchise_id: franchise?.id || newLead.franchise_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-leads'] });
      toast.success('Lead criado com sucesso');
    },
  });

  // Mutation: Atualizar lead
  const updateLead = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MTLead> & { id: string }) => {
      const { data, error } = await supabase
        .from('mt_leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-leads'] });
      toast.success('Lead atualizado');
    },
  });

  // Mutation: Deletar lead (soft delete)
  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_leads')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-leads'] });
      toast.success('Lead removido');
    },
  });

  return {
    leads,
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,
    createLead,
    updateLead,
    deleteLead,
  };
}
```

#### 4.3 Refatorar Hooks Secundários (P1)
- [ ] `useLeadActivitiesMT.ts` - Histórico de atividades
- [ ] `useFunilLeadsMT.ts` - Funil de vendas
- [ ] `useLeadMetricsMT.ts` - Métricas e KPIs
- [ ] `useLeadCRMMT.ts` - CRM features

#### 4.4 Refatorar Hooks Terciários (P2-P3)
- [ ] `useLeadHistoryMT.ts`
- [ ] `useLeadAppointmentsMT.ts`
- [ ] `useLeadConversationsMT.ts`
- [ ] `useIndicacoesMT.ts`
- [ ] `useFormularioSubmissoesMT.ts`

#### 4.5 Implementar Feature Flag
- [ ] Criar flag `USE_MT_LEADS` em configurações
- [ ] Criar hook wrapper `useLeadsAdapter.ts`
- [ ] Permitir switch entre legacy e MT
- [ ] Implementar logging de uso

```typescript
// src/hooks/useLeadsAdapter.ts

import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useLeads } from './useLeads'; // Legacy
import { useLeadsMT } from './useLeadsMT'; // Multi-tenant

export function useLeadsAdapter(filters?: any) {
  const { isEnabled } = useFeatureFlags();

  if (isEnabled('USE_MT_LEADS')) {
    return useLeadsMT(filters);
  }

  return useLeads(filters);
}
```

### Entregáveis Fase 4
- [ ] `useLeadsMT.ts` completo e testado
- [ ] Todos os 15 hooks refatorados
- [ ] Tipos TypeScript atualizados
- [ ] Feature flag implementado
- [ ] Documentação de cada hook

---

## Fase 5: Atualização de Componentes

**Duração**: 1-2 semanas
**Responsável**: 1-2 Devs Frontend

### Checklist

#### 5.1 Atualizar Páginas Principais
- [ ] `Leads.tsx` - Usar `useLeadsAdapter`
- [ ] `LeadDetail.tsx` - Exibir tenant/franchise info
- [ ] `LeadEdit.tsx` - Incluir campos MT
- [ ] `FranquiaLeads.tsx` - Filtro automático por franchise

#### 5.2 Atualizar Componentes de Listagem
- [ ] `LeadsTable.tsx` - Coluna de tenant (para platform admin)
- [ ] `LeadFilters.tsx` - Filtro por tenant/franchise
- [ ] `LeadStatusBadge.tsx` - Sem alterações necessárias
- [ ] `RecentLeads.tsx` - Usar adapter

#### 5.3 Atualizar Componentes de Detalhes
- [ ] `LeadMiniCRM.tsx` - Usar hooks MT
- [ ] `LeadActivityTimeline.tsx` - Usar `useLeadActivitiesMT`
- [ ] `LeadHistoryDrawer.tsx` - Usar hooks MT
- [ ] `LeadAppointments.tsx` - Ajustar para MT
- [ ] `LeadConversations.tsx` - Ajustar para MT

#### 5.4 Atualizar Rotas
- [ ] Avaliar necessidade de incluir tenant slug na URL
- [ ] Atualizar `App.tsx` se necessário
- [ ] Manter compatibilidade com URLs existentes
- [ ] Implementar redirects se URLs mudarem

### Entregáveis Fase 5
- [ ] Todas as páginas atualizadas
- [ ] Componentes funcionando com hooks MT
- [ ] Rotas atualizadas (se aplicável)
- [ ] Testes de UI passando

---

## Fase 6: Testes e Validação

**Duração**: 2-3 semanas
**Responsável**: QA + 1 Dev

### Checklist

#### 6.1 Testes Unitários
- [ ] Testes para `useLeadsMT.ts`
- [ ] Testes para cada hook MT
- [ ] Testes de tipos TypeScript
- [ ] Cobertura mínima: 80%

#### 6.2 Testes de Integração
- [ ] Fluxo completo: criar lead
- [ ] Fluxo completo: editar lead
- [ ] Fluxo completo: deletar lead
- [ ] Fluxo de atividades
- [ ] Fluxo de funil

#### 6.3 Testes de RLS/Segurança
- [ ] Platform admin vê todos os tenants
- [ ] Tenant admin vê apenas seu tenant
- [ ] Franchise admin vê apenas sua franchise
- [ ] User vê apenas seus leads
- [ ] Cross-tenant access bloqueado

```typescript
// Exemplo de teste de RLS
describe('RLS Tests', () => {
  test('tenant admin cannot access other tenant leads', async () => {
    // Login como admin do tenant YESlaser
    await loginAs('admin@yeslaser.com.br');

    // Tentar acessar lead do PopDents
    const { data, error } = await supabase
      .from('mt_leads')
      .select()
      .eq('tenant_id', POPDENTS_TENANT_ID);

    // Deve retornar vazio (RLS bloqueia)
    expect(data).toHaveLength(0);
  });
});
```

#### 6.4 Testes de Regressão
- [ ] Funcionalidades existentes funcionam
- [ ] Webhooks continuam funcionando
- [ ] Formulários públicos criam leads corretamente
- [ ] Dashboard exibe métricas corretas
- [ ] Funil de vendas funciona

#### 6.5 Testes de Performance
- [ ] Query de listagem < 500ms
- [ ] Query de detalhes < 200ms
- [ ] Mutations < 300ms
- [ ] Load test com 10.000 leads
- [ ] Comparar performance legacy vs MT

#### 6.6 Testes com Usuários Reais
- [ ] Teste com 1 franquia piloto
- [ ] Coletar feedback de usabilidade
- [ ] Monitorar erros em tempo real
- [ ] Ajustar conforme necessário

### Entregáveis Fase 6
- [ ] Relatório de cobertura de testes
- [ ] Relatório de testes de segurança
- [ ] Relatório de performance
- [ ] Feedback de usuários piloto
- [ ] Lista de bugs encontrados e corrigidos

---

## Fase 7: Rollout e Monitoramento

**Duração**: 2 semanas
**Responsável**: DevOps + Tech Lead

### Checklist

#### 7.1 Preparação do Rollout
- [ ] Feature flag pronto para ativação
- [ ] Documentação de rollback pronta
- [ ] Equipe de suporte informada
- [ ] Comunicação aos usuários preparada
- [ ] Horário de rollout definido (baixo tráfego)

#### 7.2 Rollout Gradual
- [ ] **Dia 1-3**: Ativar para 1 tenant piloto (10% dos usuários)
- [ ] **Dia 4-7**: Expandir para 3 tenants (30% dos usuários)
- [ ] **Dia 8-10**: Expandir para 6 tenants (70% dos usuários)
- [ ] **Dia 11-14**: Ativar para 100% dos usuários
- [ ] Monitorar métricas em cada etapa

#### 7.3 Monitoramento
- [ ] Dashboard de erros (Sentry ou similar)
- [ ] Métricas de performance (tempo de resposta)
- [ ] Logs de acesso cross-tenant (alertas)
- [ ] Feedback de usuários
- [ ] Contagem de rollbacks necessários

#### 7.4 Pós-Rollout
- [ ] Documentar lições aprendidas
- [ ] Atualizar CLAUDE.md com novas instruções
- [ ] Planejar deprecation das tabelas legacy
- [ ] Agendar remoção do feature flag
- [ ] Celebrar o sucesso! 🎉

### Entregáveis Fase 7
- [ ] Rollout 100% concluído
- [ ] Zero incidentes de segurança
- [ ] Documentação atualizada
- [ ] Plano de deprecation legacy
- [ ] Retrospectiva documentada

---

## Mapeamento de Campos

### Tabela Principal: `sistema_leads_yeslaser` → `mt_leads`

| Campo Legacy | Campo MT | Tipo | Notas |
|--------------|----------|------|-------|
| `id` | `id` | uuid | Manter ou gerar novo |
| - | `tenant_id` | uuid | **NOVO** - Obrigatório |
| `franqueado_id` | `franchise_id` | uuid | Renomear |
| `nome` | `nome` | varchar | Manter |
| `email` | `email` | varchar | Manter |
| `telefone` | `telefone` | varchar | Manter |
| `telefone_secundario` | `telefone_secundario` | varchar | Manter |
| `cpf` | `cpf` | varchar | Manter |
| `cep` | `cep` | varchar | Manter |
| `endereco` | `endereco` | text | Manter |
| `numero` | `numero` | varchar | Manter |
| `complemento` | `complemento` | varchar | Manter |
| `bairro` | `bairro` | varchar | Manter |
| `cidade` | `cidade` | varchar | Manter |
| `estado` | `estado` | varchar | Manter |
| `status` | `status` | enum | Manter |
| `origem` | `origem` | varchar | Manter |
| `canal` | `canal` | varchar | Manter |
| `campanha` | `campanha` | varchar | Manter |
| `midia` | `midia` | varchar | Manter |
| `valor_estimado` | `valor_estimado` | numeric | Manter |
| `servico_interesse` | `servico_interesse` | text | Manter |
| `observacoes` | `observacoes` | text | Manter |
| `responsavel_id` | `responsavel_id` | uuid | Manter |
| `created_at` | `created_at` | timestamptz | Manter |
| `updated_at` | `updated_at` | timestamptz | Manter |
| - | `deleted_at` | timestamptz | **NOVO** - Soft delete |
| - | `legacy_id` | uuid | **NOVO** - Rastreabilidade |
| - | `legacy_source` | text | **NOVO** - Origem |

### Campos Específicos de Promoção (`yeslaser_promocao_cadastros`)

| Campo Promoção | Campo MT | Notas |
|----------------|----------|-------|
| `unidade` (texto) | `franchise_id` (uuid) | Converter nome → ID |
| `promocao_id` | `metadata.promocao_id` | JSON field |
| `codigo_indicacao` | `metadata.codigo_indicacao` | JSON field |

---

## Riscos e Mitigações

### Risco 1: Perda de Dados na Migração
| Aspecto | Detalhes |
|---------|----------|
| **Probabilidade** | Média |
| **Impacto** | Crítico |
| **Mitigação** | Backup completo antes da migração, tabela de controle, validação pós-migração |
| **Plano B** | Restaurar backup, reverter feature flag |

### Risco 2: Performance Degradada
| Aspecto | Detalhes |
|---------|----------|
| **Probabilidade** | Média |
| **Impacto** | Alto |
| **Mitigação** | Índices otimizados, queries testadas, cache em queries críticas |
| **Plano B** | Reverter para tabelas legacy via feature flag |

### Risco 3: Cross-Tenant Data Leak
| Aspecto | Detalhes |
|---------|----------|
| **Probabilidade** | Baixa |
| **Impacto** | Crítico |
| **Mitigação** | RLS policies rigorosas, testes de segurança, auditoria de acesso |
| **Plano B** | Desativar acesso, investigar, corrigir RLS |

### Risco 4: Quebra de Integrações
| Aspecto | Detalhes |
|---------|----------|
| **Probabilidade** | Alta |
| **Impacto** | Alto |
| **Mitigação** | Mapear todas as integrações, testar cada uma, manter compatibilidade |
| **Plano B** | Reverter webhook para tabela legacy |

### Risco 5: Resistência dos Usuários
| Aspecto | Detalhes |
|---------|----------|
| **Probabilidade** | Média |
| **Impacto** | Médio |
| **Mitigação** | Comunicação clara, treinamento, período de transição gradual |
| **Plano B** | Manter modo legacy disponível por mais tempo |

---

## Cronograma

```
Semana 1        │ Fase 1: Preparação e Análise
                │ ████████████████████████████████
                │
Semana 2-3      │ Fase 2: Infraestrutura Backend
                │ ████████████████████████████████████████████████
                │
Semana 4-5      │ Fase 3: Migração de Dados
                │ ████████████████████████████████████████████████
                │
Semana 6-10     │ Fase 4: Refatoração de Hooks
                │ ████████████████████████████████████████████████████████████████████████████████████████████████
                │
Semana 11-12    │ Fase 5: Atualização de Componentes
                │ ████████████████████████████████████████████████
                │
Semana 13-15    │ Fase 6: Testes e Validação
                │ ████████████████████████████████████████████████████████████████████████
                │
Semana 16-17    │ Fase 7: Rollout e Monitoramento
                │ ████████████████████████████████████████████████
```

### Marcos Principais

| Marco | Data Estimada | Critério de Sucesso |
|-------|---------------|---------------------|
| **M1: Infraestrutura Pronta** | Fim Semana 3 | Schema MT completo, RLS testado |
| **M2: Dados Migrados** | Fim Semana 5 | 100% leads migrados, validação OK |
| **M3: Hooks Prontos** | Fim Semana 10 | useLeadsMT funcional, feature flag OK |
| **M4: UI Atualizada** | Fim Semana 12 | Todas as páginas funcionando |
| **M5: Testes Aprovados** | Fim Semana 15 | Cobertura 80%, segurança OK |
| **M6: Rollout 100%** | Fim Semana 17 | Todos os tenants usando MT |

---

## Checklist Final de Go-Live

### Pré-Requisitos
- [ ] Todos os testes passando
- [ ] RLS validado para todos os níveis de acesso
- [ ] Performance dentro dos limites aceitáveis
- [ ] Backup recente disponível
- [ ] Equipe de suporte preparada
- [ ] Comunicação enviada aos usuários
- [ ] Janela de manutenção agendada (se necessário)
- [ ] Plano de rollback documentado e testado

### Durante o Go-Live
- [ ] Ativar feature flag gradualmente
- [ ] Monitorar logs de erro
- [ ] Verificar métricas de performance
- [ ] Responder feedback de usuários
- [ ] Documentar quaisquer problemas

### Pós Go-Live
- [ ] Confirmar 100% dos usuários no MT
- [ ] Monitorar por 1 semana sem incidentes
- [ ] Documentar lições aprendidas
- [ ] Agendar remoção de código legacy
- [ ] Atualizar documentação final

---

## Anexos

### A1: Script de Backup

```bash
#!/bin/bash
# backup-leads-before-migration.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/leads_migration"

mkdir -p $BACKUP_DIR

# Backup tabela principal
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -t sistema_leads_yeslaser \
  -t yeslaser_promocao_cadastros \
  -t yeslaser_lead_activities \
  -t yeslaser_funil_leads \
  > "$BACKUP_DIR/leads_backup_$DATE.sql"

echo "Backup criado: $BACKUP_DIR/leads_backup_$DATE.sql"
```

### A2: Script de Rollback

```sql
-- rollback-leads-migration.sql

BEGIN;

-- Desativar triggers temporariamente
ALTER TABLE mt_leads DISABLE TRIGGER ALL;

-- Remover dados migrados
DELETE FROM mt_lead_activities WHERE legacy_id IS NOT NULL;
DELETE FROM mt_leads WHERE legacy_id IS NOT NULL;

-- Limpar tabela de controle
TRUNCATE migration_leads_control;

-- Reativar triggers
ALTER TABLE mt_leads ENABLE TRIGGER ALL;

COMMIT;

-- Verificar
SELECT COUNT(*) as remaining_mt_leads FROM mt_leads;
SELECT COUNT(*) as legacy_leads FROM sistema_leads_yeslaser;
```

### A3: Queries de Validação

```sql
-- validation-queries.sql

-- 1. Comparar contagens
SELECT
  'Legacy' as source,
  COUNT(*) as total
FROM sistema_leads_yeslaser
UNION ALL
SELECT
  'MT Migrated' as source,
  COUNT(*) as total
FROM mt_leads
WHERE legacy_id IS NOT NULL;

-- 2. Verificar distribuição por tenant
SELECT
  t.slug,
  COUNT(l.id) as leads
FROM mt_leads l
JOIN mt_tenants t ON t.id = l.tenant_id
GROUP BY t.slug
ORDER BY leads DESC;

-- 3. Verificar leads órfãos
SELECT COUNT(*) as orphans
FROM mt_leads
WHERE tenant_id IS NULL;

-- 4. Verificar integridade de atividades
SELECT
  COUNT(DISTINCT la.lead_id) as leads_with_activities,
  COUNT(la.id) as total_activities
FROM mt_lead_activities la
JOIN mt_leads l ON l.id = la.lead_id;

-- 5. Verificar duplicatas por telefone
SELECT
  telefone,
  tenant_id,
  COUNT(*) as duplicates
FROM mt_leads
WHERE telefone IS NOT NULL
GROUP BY telefone, tenant_id
HAVING COUNT(*) > 1;
```

---

## Histórico de Versões

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0 | 2026-02-03 | Claude | Versão inicial do plano |

---

**Última atualização**: 2026-02-03
**Próxima revisão**: Após aprovação do plano

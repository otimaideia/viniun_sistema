# Plano de Migração Frontend Multi-Tenant

**Data:** 2026-02-03
**Status:** Em Andamento
**Prioridade:** CRÍTICA (segurança + compliance)

---

## Resumo Executivo

### Objetivo
Migrar todos os hooks e páginas do frontend para usar as tabelas multi-tenant (`mt_*`) em vez das tabelas legacy (`yeslaser_*`, `popdents_*`, `sistema_leads_*`).

### Escopo Total
- **87 Hooks** a migrar
- **30 Páginas** a atualizar
- **3 Services** a refatorar
- **Estimativa:** 190 horas (4-5 semanas)

### Já Migrado ✅
- `useLeadsAdapter` → Usa `mt_leads`
- `useAgendamentosAdapter` → Usa `mt_appointments`
- `useFormulariosAdapter` → Usa `mt_forms`
- `useFranqueadosAdapter` → Usa `mt_franchises`
- `useServicosAdapter` → Usa `mt_services`
- 7 Adapters WhatsApp → Usam `mt_whatsapp_*`
- 5 Páginas principais (Index, Leads, Franqueados, Servicos, Agendamentos)

---

## Fase 1: CRÍTICOS (Semana 1-2)

### 1.1 Hooks de Dados Core

| # | Hook Legacy | Adapter MT | Tabela Legacy | Tabela MT | Status |
|---|-------------|------------|---------------|-----------|--------|
| 1 | `useLeads.ts` | `useLeadsAdapter.ts` | sistema_leads_yeslaser | mt_leads | ✅ |
| 2 | `useFranqueados.ts` | `useFranqueadosAdapter.ts` | yeslaser_franqueados | mt_franchises | ✅ |
| 3 | `useServicos.ts` | `useServicosAdapter.ts` | yeslaser_servicos | mt_services | ✅ |
| 4 | `useAgendamentos.ts` | `useAgendamentosAdapter.ts` | yeslaser_agendamentos | mt_appointments | ✅ |
| 5 | `useFormularios.ts` | `useFormulariosAdapter.ts` | yeslaser_formularios | mt_forms | ✅ |
| 6 | `useInfluenciadoras.ts` | `useInfluenciadorasAdapter.ts` | yeslaser_influenciadoras | mt_influencers | ⏳ PENDENTE |
| 7 | `useParcerias.ts` | `useParceriasAdapter.ts` | yeslaser_parcerias | mt_partnerships | ⏳ PENDENTE |
| 8 | `useCampanhas.ts` | `useCampanhasAdapter.ts` | yeslaser_marketing_campanhas | mt_campaigns | ⏳ PENDENTE |

### 1.2 Hooks WhatsApp (Críticos)

| # | Hook Legacy | Adapter MT | Status |
|---|-------------|------------|--------|
| 1 | `useWhatsAppSessoes.ts` | `useWhatsAppSessionsAdapter.ts` | ✅ |
| 2 | `useWhatsAppChat.ts` | `useWhatsAppMessagesAdapter.ts` | ✅ |
| 3 | `useWhatsAppConversas.ts` | `useWhatsAppConversationsAdapter.ts` | ✅ |
| 4 | `useWhatsAppTemplates.ts` | `useWhatsAppTemplatesAdapter.ts` | ✅ |
| 5 | `useWhatsAppPermissions.ts` | `useWhatsAppPermissionsAdapter.ts` | ✅ |
| 6 | `useWhatsAppLabels.ts` | `useWhatsAppLabelsAdapter.ts` | ✅ |
| 7 | `useWhatsAppQuickReplies.ts` | `useWhatsAppQuickRepliesAdapter.ts` | ✅ |

### 1.3 Hooks RH

| # | Hook Legacy | Hook MT | Tabela Legacy | Tabela MT | Status |
|---|-------------|---------|---------------|-----------|--------|
| 1 | `useVagas.ts` | `useVagasMT.ts` | yeslaser_vagas | mt_job_positions | ⏳ PENDENTE |
| 2 | `useCandidatos.ts` | `useCandidatosMT.ts` | yeslaser_candidatos | mt_candidates | ⏳ PENDENTE |
| 3 | `useEntrevistas.ts` | `useEntrevistasMT.ts` | yeslaser_entrevistas | mt_interviews | ⏳ PENDENTE |

---

## Fase 2: DERIVADOS (Semana 3-4)

### 2.1 Hooks Leads Relacionados

| # | Hook | Adapter | Tabela MT | Status |
|---|------|---------|-----------|--------|
| 1 | `useLeadActivities.ts` | `useLeadActivitiesAdapter.ts` | mt_lead_activities | ⏳ |
| 2 | `useLeadScoring.ts` | `useLeadScoringAdapter.ts` | mt_lead_scores | ⏳ |
| 3 | `useLeadMetrics.ts` | (usar dados do adapter) | - | ⏳ |
| 4 | `useResponsibleUsers.ts` | `useResponsibleUsersAdapter.ts` | mt_users | ⏳ |

### 2.2 Hooks Influenciadoras (8 tabelas)

| # | Hook | Tabela Legacy | Tabela MT | Status |
|---|------|---------------|-----------|--------|
| 1 | `useInfluenciadoraRedesSociais.ts` | yeslaser_influenciadora_redes_sociais | mt_influencer_social_media | ⏳ |
| 2 | `useInfluenciadoraValores.ts` | yeslaser_influenciadora_valores | mt_influencer_rates | ⏳ |
| 3 | `useInfluenciadoraIndicacoes.ts` | yeslaser_influenciadora_indicacoes | mt_influencer_referrals | ⏳ |
| 4 | `useInfluenciadoraContratos.ts` | yeslaser_influenciadora_contratos | mt_influencer_contracts | ⏳ |
| 5 | `useInfluenciadoraPagamentos.ts` | yeslaser_influenciadora_pagamentos | mt_influencer_payments | ⏳ |
| 6 | `useInfluenciadoraPermutas.ts` | yeslaser_influenciadora_permutas | mt_influencer_exchanges | ⏳ |
| 7 | `useInfluenciadoraPosts.ts` | yeslaser_influenciadora_posts | mt_influencer_posts | ⏳ |
| 8 | `useInfluenciadoraPromocoes.ts` | yeslaser_influenciadora_promocoes | mt_influencer_promotions | ⏳ |

### 2.3 Hooks Formulários Relacionados

| # | Hook | Tabela Legacy | Tabela MT | Status |
|---|------|---------------|-----------|--------|
| 1 | `useFormularioCampos.ts` | yeslaser_formulario_campos | mt_form_fields | ⏳ |
| 2 | `useFormularioSubmissoes.ts` | yeslaser_formulario_submissoes | mt_form_submissions | ⏳ |
| 3 | `useFormularioAnalytics.ts` | (novo) | mt_form_analytics | ⏳ |

### 2.4 Hooks Funil de Vendas

| # | Hook | Tabela Legacy | Tabela MT | Status |
|---|------|---------------|-----------|--------|
| 1 | `useFunis.ts` | yeslaser_funis | mt_funnels | ⏳ |
| 2 | `useFunilEtapas.ts` | yeslaser_funil_etapas | mt_funnel_stages | ⏳ |
| 3 | `useFunilLeads.ts` | yeslaser_funil_leads | mt_funnel_leads | ⏳ |

---

## Fase 3: SUPORTE (Semana 5-6)

### 3.1 Hooks de Usuários e Permissões

| # | Hook | Tabela MT | Status |
|---|------|-----------|--------|
| 1 | `useUserProfile.ts` | mt_users | ⏳ |
| 2 | `useUserPermissions.ts` | mt_user_permissions | ⏳ |
| 3 | `useUserRoles.ts` | mt_user_roles | ⏳ |
| 4 | `useModulos.ts` | mt_modules | ⏳ |
| 5 | `useModuloPermissoes.ts` | mt_user_module_access | ⏳ |

### 3.2 Hooks de Configuração

| # | Hook | Tabela Legacy | Tabela MT | Status |
|---|------|---------------|-----------|--------|
| 1 | `useWahaConfig.ts` | yeslaser_waha_config | mt_tenant_integrations | ⏳ |
| 2 | `useTenantSettings.ts` | (novo) | mt_tenant_settings | ⏳ |
| 3 | `useFranchiseSettings.ts` | (novo) | mt_franchise_settings | ⏳ |

### 3.3 Hooks Promocionais (Baixa Prioridade)

| # | Hook | Tabela Legacy | Tabela MT | Status |
|---|------|---------------|-----------|--------|
| 1 | `usePromocaoCadastros.ts` | yeslaser_promocao_cadastros | (migrar para mt_leads) | ⏳ |
| 2 | `usePromocaoIndicacoes.ts` | yeslaser_promocao_indicacoes | (migrar para mt_leads) | ⏳ |

---

## Fase 4: PÁGINAS

### 4.1 Páginas Já Migradas ✅

| Página | Hooks Usados | Status |
|--------|--------------|--------|
| `Index.tsx` | useLeadsAdapter, useFranqueadosAdapter, useAgendamentosAdapter | ✅ |
| `Leads.tsx` | useLeadsAdapter, useFranqueadosAdapter, useAgendamentosAdapter | ✅ |
| `Franqueados.tsx` | useFranqueadosAdapter | ✅ |
| `Servicos.tsx` | useServicosAdapter, useFranqueadosAdapter | ✅ |
| `Agendamentos.tsx` | useAgendamentosAdapter, useFranqueadosAdapter | ✅ |

### 4.2 Páginas Pendentes - Alta Prioridade

| Página | Hooks Legacy | Ação |
|--------|--------------|------|
| `LeadDetail.tsx` | useLeads | Atualizar para useLeadsAdapter |
| `LeadEdit.tsx` | useLeads | Atualizar para useLeadsAdapter |
| `FranqueadoDetail.tsx` | useFranqueados | Atualizar para useFranqueadosAdapter |
| `FranqueadoEdit.tsx` | useFranqueados | Atualizar para useFranqueadosAdapter |
| `WhatsAppChat.tsx` | useWhatsAppChat | Verificar uso de adapter |
| `WhatsAppSessoes.tsx` | useWhatsAppSessoes | Verificar uso de adapter |

### 4.3 Páginas Pendentes - Média Prioridade

| Página | Hooks Legacy | Ação |
|--------|--------------|------|
| `Influenciadoras.tsx` | useInfluenciadoras | Criar adapter e atualizar |
| `InfluenciadoraDetail.tsx` | useInfluenciadoras | Criar adapter e atualizar |
| `InfluenciadoraEdit.tsx` | useInfluenciadoras | Criar adapter e atualizar |
| `Parcerias.tsx` | useParcerias | Criar adapter e atualizar |
| `ParceriaDetail.tsx` | useParcerias | Criar adapter e atualizar |
| `ParceriaEdit.tsx` | useParcerias | Criar adapter e atualizar |
| `Campanhas.tsx` | useCampanhas | Criar adapter e atualizar |
| `Recrutamento.tsx` | useVagas, useCandidatos | Criar adapters e atualizar |
| `Formularios.tsx` | useFormularios | Verificar uso de adapter |
| `FormularioDetail.tsx` | useFormularios | Verificar uso de adapter |

### 4.4 Portal Influenciadora (Separado)

| Página | Status |
|--------|--------|
| `/influenciadora/cadastro` | ⏳ |
| `/influenciadora/login` | ⏳ |
| `/influenciadora/portal` | ⏳ |
| `/influenciadora/perfil` | ⏳ |
| `/influenciadora/valores` | ⏳ |
| `/influenciadora/indicacoes` | ⏳ |
| `/influenciadora/ganhos` | ⏳ |
| `/influenciadora/permutas` | ⏳ |
| `/influenciadora/posts` | ⏳ |

---

## Fase 5: SERVICES

### 5.1 Services a Migrar

| Service | Tabelas Legacy | Ação | Status |
|---------|----------------|------|--------|
| `marketing-service.ts` | yeslaser_marketing_* | Refatorar queries | ⏳ |
| `waha/wahaDirectClient.ts` | yeslaser_waha_* | Refatorar queries | ⏳ |
| `whatsapp/backgroundSync.ts` | yeslaser_whatsapp_* | Usar hooks MT | ⏳ |

---

## Padrão de Migração

### Estrutura de Adapter

```typescript
// src/hooks/use[Entidade]Adapter.ts

// 1. Feature flag
const USE_MT_[ENTIDADE] = true;

// 2. Interface adaptada (compatibilidade com código existente)
export interface [Entidade]Adaptada { ... }

// 3. Funções de mapeamento
function mapMTToAdaptado(mt: MT[Entidade]): [Entidade]Adaptada { ... }
function mapLegacyToAdaptado(legacy: [Entidade]): [Entidade]Adaptada { ... }

// 4. Hook adapter principal
export function use[Entidade]Adapter(filters?) {
  const { tenant, isLoading: isTenantLoading } = useTenantContext();
  const shouldUseMT = USE_MT_[ENTIDADE] && tenant?.id && !isTenantLoading;

  const legacy = use[Entidade](); // Hook legacy
  const mt = use[Entidade]MT(filters); // Hook MT

  if (shouldUseMT) {
    return { /* retorno MT adaptado */ };
  }

  return { /* fallback legacy */ };
}

// 5. Helper para verificar modo
export function get[Entidade]Mode(): 'legacy' | 'mt' { ... }
```

### Checklist por Hook

- [ ] Criar interface `MT[Entidade]` em `src/hooks/multitenant/use[Entidade]MT.ts`
- [ ] Implementar query principal com filtro por `tenant_id`
- [ ] Implementar mutations (create, update, delete)
- [ ] Criar adapter em `src/hooks/use[Entidade]Adapter.ts`
- [ ] Definir `USE_MT_[ENTIDADE] = true`
- [ ] Mapear campos MT → campos legacy (compatibilidade)
- [ ] Exportar no `src/hooks/multitenant/index.ts`
- [ ] Atualizar páginas para usar adapter
- [ ] Testar isolamento de dados entre tenants
- [ ] Validar RLS policies funcionando

---

## Mapeamento de Tabelas Completo

### Core Business

| Legacy | Multi-Tenant | Campos Principais |
|--------|--------------|-------------------|
| sistema_leads_yeslaser | mt_leads | tenant_id, franchise_id, 80+ campos |
| yeslaser_franqueados | mt_franchises | tenant_id, nome, cidade, estado |
| yeslaser_servicos | mt_services | tenant_id, nome, preco, duracao |
| yeslaser_agendamentos | mt_appointments | tenant_id, franchise_id, data, status |

### Marketing

| Legacy | Multi-Tenant | Campos Principais |
|--------|--------------|-------------------|
| yeslaser_influenciadoras | mt_influencers | tenant_id, nome, codigo |
| yeslaser_parcerias | mt_partnerships | tenant_id, nome, tipo |
| yeslaser_marketing_campanhas | mt_campaigns | tenant_id, nome, status |
| yeslaser_formularios | mt_forms | tenant_id, franchise_id, titulo |

### RH

| Legacy | Multi-Tenant | Campos Principais |
|--------|--------------|-------------------|
| yeslaser_vagas | mt_job_positions | tenant_id, titulo, status |
| yeslaser_candidatos | mt_candidates | tenant_id, position_id, nome |
| yeslaser_entrevistas | mt_interviews | tenant_id, candidate_id, data |

### WhatsApp

| Legacy | Multi-Tenant | Campos Principais |
|--------|--------------|-------------------|
| yeslaser_waha_config | mt_tenant_integrations | tenant_id, type='whatsapp' |
| yeslaser_whatsapp_sessoes | mt_whatsapp_sessions | tenant_id, franchise_id |
| yeslaser_whatsapp_conversas | mt_whatsapp_conversations | session_id, phone |
| yeslaser_whatsapp_mensagens | mt_whatsapp_messages | conversation_id, content |

---

## Riscos e Mitigações

### Risco 1: Data Leakage (CRÍTICO)
- **Causa:** Queries sem filtro `tenant_id`
- **Mitigação:** RLS obrigatório + validação em todos os hooks
- **Verificação:** Testes automatizados de isolamento

### Risco 2: Quebra de Funcionalidade
- **Causa:** Interface incompatível entre MT e legacy
- **Mitigação:** Adapters mantêm interface original
- **Verificação:** Testes de regressão antes do merge

### Risco 3: Performance
- **Causa:** Queries complexas com muitos joins
- **Mitigação:** Índices em tenant_id/franchise_id
- **Verificação:** Monitoramento de query time

### Risco 4: Migração Incompleta
- **Causa:** Código legacy esquecido
- **Mitigação:** Grep/análise automática por tabelas legacy
- **Verificação:** CI/CD falha se detectar `yeslaser_` em novos commits

---

## Métricas de Progresso

### Dashboard de Migração

```
Total Hooks:      87
Migrados:         12 (14%)
Pendentes:        75 (86%)

Total Páginas:    30
Migradas:          5 (17%)
Pendentes:        25 (83%)

Total Services:    3
Migrados:          0 (0%)
Pendentes:         3 (100%)
```

### Próximos Milestones

1. **Milestone 1 (Semana 1):** 100% hooks críticos migrados
2. **Milestone 2 (Semana 2):** 100% páginas principais atualizadas
3. **Milestone 3 (Semana 3):** Influenciadoras + Parcerias migradas
4. **Milestone 4 (Semana 4):** RH + Campanhas migradas
5. **Milestone 5 (Semana 5):** Services refatorados
6. **Milestone 6 (Semana 6):** Testes + Documentação final

---

## Comandos Úteis

### Verificar uso de tabelas legacy
```bash
# Buscar referências a tabelas yeslaser_*
grep -r "yeslaser_" src/ --include="*.ts" --include="*.tsx" | grep -v ".d.ts"

# Buscar referências a tabelas sistema_leads
grep -r "sistema_leads" src/ --include="*.ts" --include="*.tsx"

# Contar arquivos por categoria
grep -rl "yeslaser_" src/hooks/ | wc -l
grep -rl "yeslaser_" src/pages/ | wc -l
```

### Verificar hooks não migrados
```bash
# Listar hooks que não têm Adapter
ls src/hooks/use*.ts | xargs -I {} basename {} .ts | while read hook; do
  if ! grep -q "${hook}Adapter" src/hooks/; then
    echo "PENDENTE: $hook"
  fi
done
```

---

## Conclusão

A migração para multi-tenant é **crítica para segurança e compliance**. Com 14% dos hooks já migrados, o foco agora deve ser:

1. **Completar hooks críticos** (Influenciadoras, Parcerias, Campanhas, RH)
2. **Atualizar páginas derivadas** (Detail, Edit)
3. **Refatorar services** que fazem queries diretas
4. **Implementar testes** de isolamento de dados
5. **Monitorar** uso de tabelas legacy em novos commits

**Estimativa Total:** 190 horas (~5 semanas)
**Prioridade:** ALTA (segurança + LGPD compliance)

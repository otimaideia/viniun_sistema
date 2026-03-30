# CHECKLIST DE MIGRAÇÃO MULTI-TENANT

**Data de Criação:** 03/02/2026
**Objetivo:** Migrar 100% dos arquivos para usar adapters multi-tenant
**Status:** 🔄 Em Progresso

---

## 📊 RESUMO DO PROGRESSO

| Fase | Total | Concluído | Pendente | % |
|------|-------|-----------|----------|---|
| **Fase 1: Adapters** | 20 | 20 | 0 | ✅ 100% |
| **Fase 2: Páginas CRUD** | 24 | 4 | 20 | 🔄 17% |
| **Fase 3: Páginas Listagem** | 15 | 8 | 7 | 🔄 53% |
| **Fase 4: Componentes Modais** | 12 | 1 | 11 | 🔄 8% |
| **Fase 5: Componentes Tabs/Lists** | 10 | 2 | 8 | 🔄 20% |
| **Fase 6: Sub-páginas Franquia** | 5 | 1 | 4 | 🔄 20% |
| **Fase 7: Configurações** | 4 | 0 | 4 | ❌ 0% |
| **Fase 8: Outros** | 10 | 3 | 7 | 🔄 30% |

**TOTAL:** 100 itens | **Concluído:** 39 | **Pendente:** 61

---

## ✅ FASE 1: ADAPTERS (CONCLUÍDA)

Todos os 20 adapters foram criados:

- [x] `useLeadsAdapter.ts`
- [x] `useFranqueadosAdapter.ts`
- [x] `useServicosAdapter.ts`
- [x] `useAgendamentosAdapter.ts`
- [x] `useCampanhasAdapter.ts`
- [x] `useInfluenciadorasAdapter.ts`
- [x] `useParceriasAdapter.ts`
- [x] `useFormulariosAdapter.ts`
- [x] `useIndicacoesAdapter.ts`
- [x] `useUsersAdapter.ts`
- [x] `useFunilLeadsAdapter.ts`
- [x] `useLeadActivitiesAdapter.ts`
- [x] `useVagasAdapter.ts` (criar se não existir)
- [x] `useCandidatosAdapter.ts` (criar se não existir)
- [x] `useEntrevistasAdapter.ts` (criar se não existir)
- [x] `useMetasAdapter.ts` (criar se não existir)
- [x] `useModulosAdapter.ts` (criar se não existir)
- [x] `useMarketingTemplatesAdapter.ts` (criar se não existir)
- [x] `useFunisAdapter.ts` (criar se não existir)
- [x] `useFunilEtapasAdapter.ts` (criar se não existir)

---

## 🔄 FASE 2: PÁGINAS CRUD (Detail/Edit)

### 2.1 Agendamentos
- [x] `AgendamentoDetail.tsx` - useAgendamentos → useAgendamentosAdapter
- [x] `AgendamentoEdit.tsx` - useAgendamentos → useAgendamentosAdapter

### 2.2 Franqueados
- [ ] `FranqueadoDetail.tsx` - useFranqueados → useFranqueadosAdapter
- [ ] `FranqueadoEdit.tsx` - useFranqueados → useFranqueadosAdapter

### 2.3 Influenciadoras
- [ ] `InfluenciadoraDetail.tsx` - useInfluenciadoras → useInfluenciadorasAdapter
- [ ] `InfluenciadoraEdit.tsx` - useInfluenciadoras → useInfluenciadorasAdapter

### 2.4 Parcerias
- [ ] `ParceriaDetail.tsx` - useParcerias → useParceriasAdapter
- [ ] `ParceriaEdit.tsx` - useParcerias → useParceriasAdapter

### 2.5 Serviços
- [ ] `ServicoDetail.tsx` - useServicos → useServicosAdapter
- [ ] `ServicoEdit.tsx` - useServicos → useServicosAdapter

### 2.6 Formulários
- [ ] `FormularioDetail.tsx` - useFormularios → useFormulariosAdapter

### 2.7 Recrutamento
- [ ] `VagaDetail.tsx` - useVagas → useVagasAdapter
- [ ] `VagaEdit.tsx` - useVagas → useVagasAdapter
- [ ] `CandidatoDetail.tsx` - useCandidatos → useCandidatosAdapter
- [ ] `EntrevistaDetail.tsx` - useEntrevistas → useEntrevistasAdapter
- [ ] `EntrevistaEdit.tsx` - useEntrevistas → useEntrevistasAdapter

### 2.8 Usuários
- [ ] `UsuarioDetail.tsx` - useUsers → useUsersAdapter
- [ ] `UsuarioEdit.tsx` - useUsers → useUsersAdapter

### 2.9 Metas
- [ ] `MetaDetail.tsx` - useMetas → useMetasAdapter (se existir)
- [ ] `MetaEdit.tsx` - useMetas → useMetasAdapter (se existir)

### 2.10 Cadastro LP
- [ ] `CadastroLPEdit.tsx` - verificar hooks usados

---

## 🔄 FASE 3: PÁGINAS DE LISTAGEM

### 3.1 Já Migradas
- [x] `Leads.tsx`
- [x] `Franqueados.tsx`
- [x] `Servicos.tsx`
- [x] `Agendamentos.tsx`
- [x] `Influenciadoras.tsx`
- [x] `Parcerias.tsx`
- [x] `Formularios.tsx`
- [x] `campanhas/CampanhasIndex.tsx`

### 3.2 Pendentes
- [ ] `Recrutamento.tsx` - useVagas, useCandidatos, useEntrevistas → adapters
- [ ] `Metas.tsx` - useMetas → useMetasAdapter
- [ ] `Aprovacoes.tsx` - verificar hooks usados
- [ ] `MarketingCampanhas.tsx` - useCampanhas → useCampanhasAdapter
- [ ] `MarketingTemplates.tsx` - useMarketingTemplates → adapter
- [ ] `FunilRelatorios.tsx` - useFunilLeads → useFunilLeadsAdapter
- [ ] `FunilConfig.tsx` - useFunis → useFunisAdapter

---

## 🔄 FASE 4: COMPONENTES MODAIS

### 4.1 Já Migrados
- [x] `agendamentos/AgendamentoFormModal.tsx`

### 4.2 Pendentes
- [ ] `franqueados/FranqueadoFormModal.tsx` - useFranqueados → useFranqueadosAdapter
- [ ] `influenciadoras/InfluenciadoraFormModal.tsx` - useInfluenciadoras → useInfluenciadorasAdapter
- [ ] `marketing/campanhas/CampanhaFormModal.tsx` - useCampanhas → useCampanhasAdapter
- [ ] `marketing/templates/TemplateFormModal.tsx` - useMarketingTemplates → adapter
- [ ] `marketing/assets/AssetFormModal.tsx` - verificar hooks
- [ ] `recrutamento/CandidatoFormModal.tsx` - useCandidatos → useCandidatosAdapter
- [ ] `recrutamento/VagaFormModal.tsx` - useVagas → useVagasAdapter
- [ ] `servicos/ServicoFormModal.tsx` - useServicos → useServicosAdapter (se existir)
- [ ] `parcerias/ParceriaFormModal.tsx` - useParcerias → useParceriasAdapter (se existir)
- [ ] `whatsapp/SessaoFormModal.tsx` - verificar hooks
- [ ] `whatsapp/ImportSessoesModal.tsx` - verificar hooks

---

## 🔄 FASE 5: COMPONENTES TABS/LISTS

### 5.1 Já Migrados
- [x] `dashboard/LeadsTable.tsx`
- [x] `leads/LeadMiniCRM.tsx`

### 5.2 Pendentes
- [ ] `recrutamento/CandidatosTab.tsx` - useCandidatos → useCandidatosAdapter
- [ ] `recrutamento/EntrevistasTab.tsx` - useEntrevistas → useEntrevistasAdapter
- [ ] `recrutamento/VagasTab.tsx` - useVagas → useVagasAdapter
- [ ] `funil/KanbanBoard.tsx` - useFunilLeads → useFunilLeadsAdapter
- [ ] `dashboard/LeadHistoryDrawer.tsx` - verificar hooks
- [ ] `leads/LeadActivityTimeline.tsx` - useLeadActivities → useLeadActivitiesAdapter
- [ ] `formularios/FormularioSubmissoes.tsx` - verificar hooks (se existir)
- [ ] `influenciadoras/InfluenciadoraIndicacoes.tsx` - verificar hooks (se existir)

---

## 🔄 FASE 6: SUB-PÁGINAS FRANQUIA

### 6.1 Já Migradas
- [x] `franquia/FranquiaLeads.tsx`

### 6.2 Pendentes
- [ ] `franquia/FranquiaCampanhas.tsx` - useCampanhas → useCampanhasAdapter
- [ ] `franquia/FranquiaServicos.tsx` - useServicos → useServicosAdapter
- [ ] `franquia/FranquiaConfiguracoes.tsx` - verificar hooks
- [ ] `franquia/FranquiaDashboard.tsx` - useFunilLeads → useFunilLeadsAdapter

---

## 🔄 FASE 7: PÁGINAS DE CONFIGURAÇÕES

- [ ] `configuracoes/Modulos.tsx` - useModulos → useModulosAdapter
- [ ] `configuracoes/Permissoes.tsx` - useUsers → useUsersAdapter
- [ ] `configuracoes/Integracoes.tsx` - verificar hooks
- [ ] `configuracoes/Webhooks.tsx` - verificar hooks (se existir)

---

## 🔄 FASE 8: OUTROS ARQUIVOS

### 8.1 Já Migrados
- [x] `Index.tsx` (Dashboard)
- [x] `Funil.tsx`
- [x] `FunilVendas.tsx`

### 8.2 Pendentes
- [ ] `FormularioPublico.tsx` - useFormularios → useFormulariosAdapter
- [ ] `Totem.tsx` - verificar hooks
- [ ] `WhatsAppConfiguracoes.tsx` - verificar hooks
- [ ] `WhatsAppSessoes2.tsx` - unificar com WhatsAppSessoes.tsx
- [ ] `layout/DashboardLayout.tsx` - verificar hooks
- [ ] `Indicacoes.tsx` - usar SOMENTE useIndicacoesAdapter (remover legacy)
- [ ] `InfluenciadoraPromocoes.tsx` - verificar hooks (se existir)

---

## 📋 INSTRUÇÕES DE MIGRAÇÃO

### Para cada arquivo, seguir estes passos:

1. **Abrir o arquivo** e identificar imports de hooks legacy
2. **Substituir import**:
   ```typescript
   // ANTES (Legacy)
   import { useNomeHook } from "@/hooks/useNomeHook";

   // DEPOIS (Adapter)
   import { useNomeHookAdapter } from "@/hooks/useNomeHookAdapter";
   ```
3. **Substituir chamada do hook**:
   ```typescript
   // ANTES
   const { data, isLoading } = useNomeHook();

   // DEPOIS
   const { data, isLoading } = useNomeHookAdapter();
   ```
4. **Verificar tipos** - adapters retornam tipos normalizados
5. **Testar funcionalidade** no navegador
6. **Marcar como concluído** neste checklist

### Hooks Legacy → Adapter (Mapeamento)

| Hook Legacy | Adapter |
|-------------|---------|
| `useFranqueados` | `useFranqueadosAdapter` |
| `useLeads` | `useLeadsAdapter` |
| `useServicos` | `useServicosAdapter` |
| `useAgendamentos` | `useAgendamentosAdapter` |
| `useCampanhas` | `useCampanhasAdapter` |
| `useInfluenciadoras` | `useInfluenciadorasAdapter` |
| `useParcerias` | `useParceriasAdapter` |
| `useFormularios` | `useFormulariosAdapter` |
| `useIndicacoes` | `useIndicacoesAdapter` |
| `useUsers` | `useUsersAdapter` |
| `useFunilLeads` | `useFunilLeadsAdapter` |
| `useLeadActivities` | `useLeadActivitiesAdapter` |
| `useVagas` | `useVagasAdapter` |
| `useCandidatos` | `useCandidatosAdapter` |
| `useEntrevistas` | `useEntrevistasAdapter` |
| `useMetas` | `useMetasAdapter` |

---

## 🔍 VERIFICAÇÃO FINAL

Após completar todas as fases:

- [ ] Executar `npm run build` sem erros
- [ ] Testar todas as páginas no navegador
- [ ] Verificar console para erros
- [ ] Grep por hooks legacy restantes:
  ```bash
  grep -r "useFranqueados\|useLeads\|useServicos" src/pages src/components --include="*.tsx" | grep -v "Adapter"
  ```
- [ ] Atualizar CLAUDE.md com status de migração

---

## 📅 HISTÓRICO DE ATUALIZAÇÕES

| Data | Fase | Itens Migrados | Responsável |
|------|------|----------------|-------------|
| 03/02/2026 | Fase 1 | 20 adapters | Claude |
| 03/02/2026 | Fase 2-3 | 8 páginas | Claude |
| 03/02/2026 | Início | Checklist criado | Claude |

---

**Última Atualização:** 03/02/2026

# Módulo de Integração ClickUp

## Sistema de Importação de Leads

**Versão:** 2.0
**Data:** 03 de Fevereiro de 2026
**Módulo:** `clickup_integracao`

---

## 1. Visão Geral

Sistema **genérico e flexível** de integração com o ClickUp, permitindo que **qualquer tenant** configure sua própria conexão e mapeamento de campos para importar leads.

### Características

- ✅ **Multi-Tenant**: Cada empresa configura sua própria integração
- ✅ **Mapeamento Dinâmico**: Campos mapeados via interface (não hardcoded)
- ✅ **Validação Visual**: Preview dos dados antes de importar
- ✅ **Importação Controlada**: Progresso em tempo real com pause/resume
- ✅ **Logs Completos**: Histórico de todas as importações
- ✅ **Deduplicação**: Evita leads duplicados por telefone/email

---

## 2. Fluxo do Usuário

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   ETAPA 1          ETAPA 2          ETAPA 3          ETAPA 4           │
│   ─────────        ─────────        ─────────        ─────────         │
│                                                                         │
│   ┌───────┐        ┌───────┐        ┌───────┐        ┌───────┐         │
│   │ 🔑    │   →    │ 📂    │   →    │ 🔗    │   →    │ ▶️    │         │
│   │Conectar│        │Selecionar│      │Mapear │        │Importar│        │
│   └───────┘        └───────┘        └───────┘        └───────┘         │
│                                                                         │
│   - API Key        - Workspace      - Campos         - Preview          │
│   - Validar        - Space          - Valores        - Executar         │
│   - Usuário        - Listas         - Status         - Progresso        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Etapa 1: Conectar

### 3.1 Tela de Conexão

```
┌─────────────────────────────────────────────────────────────────┐
│  Integração ClickUp                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🔑 Chave de API do ClickUp                                      │
│                                                                  │
│  Para obter sua chave:                                           │
│  1. Acesse clickup.com → Configurações → Apps                    │
│  2. Role até "API Token" e clique em "Generate"                  │
│  3. Copie a chave que começa com "pk_"                          │
│                                                                  │
│  ┌─────────────────────────────────────────────┐                │
│  │ pk_                                         │                │
│  └─────────────────────────────────────────────┘                │
│                                                                  │
│  ┌────────────────┐                                             │
│  │ 🔍 Testar      │                                             │
│  └────────────────┘                                             │
│                                                                  │
│  ───────────────────────────────────────────────                │
│                                                                  │
│  ❌ Não conectado                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Após Conexão Bem-Sucedida

```
┌─────────────────────────────────────────────────────────────────┐
│  ✅ Conectado ao ClickUp                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  👤 Usuário: Supervisora Yeslaser                                │
│  📧 Email: yeslasersupervisora@gmail.com                         │
│  🕐 Fuso: America/Sao_Paulo                                      │
│                                                                  │
│  📊 Workspaces Disponíveis: 2                                    │
│                                                                  │
│  ┌───────────────────────────┐ ┌──────────────────────────┐     │
│  │ 🔄 Reconectar            │ │ ➡️ Próximo: Selecionar  │     │
│  └───────────────────────────┘ └──────────────────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Etapa 2: Selecionar Origem

### 4.1 Tela de Seleção

```
┌─────────────────────────────────────────────────────────────────┐
│  Selecionar Origem dos Dados                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📁 Workspace                                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Central Yeslaser (13 membros)                      ▼    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  📂 Space                                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ CRM YES LASER (13 status)                          ▼    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  📋 Listas para Importar                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │ ☑ CRM - NÍTILA                           3.736 tarefas │    │
│  │ ☑ CRM - YASMIN                           2.363 tarefas │    │
│  │ ☑ CRM - BRUNA KAUANY                     1.816 tarefas │    │
│  │ ☑ CRM - CLAUDENICE                       1.598 tarefas │    │
│  │ ☑ CRM - MARIA EDUARDA                    1.591 tarefas │    │
│  │ ☑ CRM - ELIZABETH                        1.170 tarefas │    │
│  │ ☑ CRM - HEVELYN                            923 tarefas │    │
│  │ ☐ CRM - BRUNA MARIA                        851 tarefas │    │
│  │ ☐ CRM - PAULA                              314 tarefas │    │
│  │ ☐ INDIQUE                                    0 tarefas │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  📊 Total selecionado: 13.197 tarefas em 7 listas                │
│                                                                  │
│  ┌────────────────┐ ┌──────────────────────────────────────┐    │
│  │ ⬅️ Voltar      │ │ ➡️ Próximo: Mapear Campos           │    │
│  └────────────────┘ └──────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Etapa 3: Mapear Campos

### 5.1 Detecção Automática de Campos

O sistema detecta automaticamente:
- Campos base da tarefa (nome, status, data, etc.)
- Custom Fields configurados no Space
- Opções de dropdowns e labels

### 5.2 Tela de Mapeamento

```
┌─────────────────────────────────────────────────────────────────┐
│  Mapear Campos                                    40 campos      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🔍 Buscar campo...                                              │
│                                                                  │
│  ═══════════════════════════════════════════════════════════    │
│  CAMPOS OBRIGATÓRIOS                                             │
│  ═══════════════════════════════════════════════════════════    │
│                                                                  │
│  Campo ClickUp            Tipo       Campo Sistema      Ação     │
│  ─────────────────────────────────────────────────────────────   │
│  📱 task.name             texto      ┌─────────────┐   ✅       │
│     (telefone do lead)               │ telefone  ▼ │            │
│                                      └─────────────┘            │
│                                                                  │
│  👤 ⏩ Nome               texto      ┌─────────────┐   ✅       │
│     (nome do cliente)                │ nome      ▼ │            │
│                                      └─────────────┘            │
│                                                                  │
│  ═══════════════════════════════════════════════════════════    │
│  CAMPOS OPCIONAIS                                                │
│  ═══════════════════════════════════════════════════════════    │
│                                                                  │
│  🎂 Data Nascimento       texto      ┌─────────────┐   ✅       │
│     ex: "05/07/1988"                 │ data_nasc ▼ │            │
│                                      └─────────────┘            │
│                                                                  │
│  👫 Sexo                  dropdown   ┌─────────────┐   🔗       │
│     HOMEM, MULHER                    │ genero    ▼ │  mapear   │
│                                      └─────────────┘            │
│                                                                  │
│  📍 Unidade               labels     ┌─────────────┐   🔗       │
│     29 opções                        │ franchise ▼ │  mapear   │
│                                      └─────────────┘            │
│                                                                  │
│  📊 Fonte                 dropdown   ┌─────────────┐   🔗       │
│     13 opções                        │ origem    ▼ │  mapear   │
│                                      └─────────────┘            │
│                                                                  │
│  📢 Campanha              dropdown   ┌─────────────┐   ✅       │
│     6 opções                         │ campanha  ▼ │            │
│                                      └─────────────┘            │
│                                                                  │
│  📅 Data agendamento      data       ┌─────────────┐   ✅       │
│     timestamp                        │ data_agen ▼ │            │
│                                      └─────────────┘            │
│                                                                  │
│  💰 Venda                 moeda      ┌─────────────┐   ✅       │
│     R$ 0,00                          │ valor_con ▼ │            │
│                                      └─────────────┘            │
│                                                                  │
│  📋 status                status     ┌─────────────┐   🔗       │
│     13 etapas                        │ etapa_fun ▼ │  mapear   │
│                                      └─────────────┘            │
│                                                                  │
│  ☐ Incluir campos não mapeados em "dados_extras" (JSON)          │
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  ✅ 8 campos mapeados   🔗 4 pendentes   ⬜ 28 ignorados         │
│                                                                  │
│  ┌────────────────┐ ┌──────────────────────────────────────┐    │
│  │ ⬅️ Voltar      │ │ ➡️ Próximo: Validar                 │    │
│  └────────────────┘ └──────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Modal de Mapeamento de Valores

Quando o usuário clica em "🔗 mapear", abre um modal para mapear os valores:

```
┌─────────────────────────────────────────────────────────────────┐
│  Mapear Valores: Unidade → franchise_id                    ✕    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Configure como cada valor do ClickUp será convertido            │
│                                                                  │
│  🔍 Buscar...                                                    │
│                                                                  │
│  Valor no ClickUp              Valor no Sistema                  │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  ALTAMIRA - PA                 ┌─────────────────────────────┐  │
│                                │ YESlaser Altamira        ▼  │  │
│                                └─────────────────────────────┘  │
│                                                                  │
│  CANINDÉ                       ┌─────────────────────────────┐  │
│                                │ YESlaser Canindé          ▼  │  │
│                                └─────────────────────────────┘  │
│                                                                  │
│  CASTANHAL-PA                  ┌─────────────────────────────┐  │
│                                │ YESlaser Castanhal        ▼  │  │
│                                └─────────────────────────────┘  │
│                                                                  │
│  PARANGABA                     ┌─────────────────────────────┐  │
│                                │ YESlaser Shopping Parang..▼  │  │
│                                └─────────────────────────────┘  │
│                                                                  │
│  ... (mais 25 opções)                                            │
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  ☑ Auto-mapear por similaridade de nome                          │
│  ☑ Criar valor padrão para não mapeados: [Selecione ▼]          │
│                                                                  │
│  ┌────────────────────┐ ┌────────────────────────────────────┐  │
│  │ Cancelar           │ │ ✅ Salvar Mapeamento               │  │
│  └────────────────────┘ └────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Mapeamento de Status do Funil

```
┌─────────────────────────────────────────────────────────────────┐
│  Mapear Valores: status → etapa_funil                      ✕    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Status no ClickUp             Etapa no Funil                    │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  ⬜ novo lead                  ┌─────────────────────────────┐  │
│                                │ Novo                      ▼  │  │
│                                └─────────────────────────────┘  │
│                                                                  │
│  🟧 não responsivo             ┌─────────────────────────────┐  │
│                                │ Não Responsivo            ▼  │  │
│                                └─────────────────────────────┘  │
│                                                                  │
│  🟪 acompanhamento             ┌─────────────────────────────┐  │
│                                │ Em Acompanhamento         ▼  │  │
│                                └─────────────────────────────┘  │
│                                                                  │
│  🩵 agendado                   ┌─────────────────────────────┐  │
│                                │ Agendado                  ▼  │  │
│                                └─────────────────────────────┘  │
│                                                                  │
│  🟨 remarcação                 ┌─────────────────────────────┐  │
│                                │ Remarcação                ▼  │  │
│                                └─────────────────────────────┘  │
│                                                                  │
│  🔴 recuperação                ┌─────────────────────────────┐  │
│                                │ Recuperação               ▼  │  │
│                                └─────────────────────────────┘  │
│                                                                  │
│  ✅ concluído                  ┌─────────────────────────────┐  │
│                                │ Convertido                ▼  │  │
│                                └─────────────────────────────┘  │
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  ☑ Marcar como "convertido" quando status = "concluído"          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Etapa 4: Validar e Importar

### 6.1 Preview dos Dados

```
┌─────────────────────────────────────────────────────────────────┐
│  Preview da Importação                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📊 Resumo da Importação                                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  Total de tarefas: 13.197                                 │  │
│  │  Listas selecionadas: 7                                   │  │
│  │  Campos mapeados: 12                                      │  │
│  │  Valores mapeados: 67                                     │  │
│  │                                                           │  │
│  │  Estimativa de tempo: ~15 minutos                         │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  📋 Amostra de Dados (5 primeiros)                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │ Telefone      Nome                  Unidade     Status    │  │
│  │ ───────────────────────────────────────────────────────── │  │
│  │ +5585996164602 Maria Saionara      Parangaba   recuperação│  │
│  │ +5588984511598 Maria Jeane Pires   Itapipoca   agendado  │  │
│  │ +5588969933312 Susana Rodrigues    Crateús     agendado  │  │
│  │ +5588992017833 Joselma Carneiro    Itapipoca   agendado  │  │
│  │ +5585991234567 Ana Paula Silva     Messejana   novo lead │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ⚙️ Configurações                                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │ ☑ Verificar duplicatas por telefone antes de importar     │  │
│  │ ☑ Verificar duplicatas por email                          │  │
│  │ ☐ Atualizar leads existentes (em vez de pular)            │  │
│  │ ☑ Salvar dados brutos em "dados_extras"                   │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────┐ ┌──────────────────────────────────────┐    │
│  │ ⬅️ Voltar      │ │ ▶️ Iniciar Importação               │    │
│  └────────────────┘ └──────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Tela de Progresso

```
┌─────────────────────────────────────────────────────────────────┐
│  Importação em Andamento                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  ████████████████████░░░░░░░░░░░░░░░░░░░░░  45%          │  │
│  │                                                           │  │
│  │  6.463 / 13.197 tarefas processadas                       │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  📊 Estatísticas em Tempo Real                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  ✅ Criados:     5.892  leads novos                       │  │
│  │  🔄 Atualizados:   312  leads existentes                  │  │
│  │  ⏭️ Pulados:       259  duplicatas encontradas            │  │
│  │  ❌ Erros:           0  falhas na importação              │  │
│  │                                                           │  │
│  │  ⏱️ Tempo decorrido: 6min 42s                             │  │
│  │  📈 Velocidade: ~16 leads/segundo                         │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  📋 Lista Atual                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  CRM - YASMIN                                             │  │
│  │  Página 12 de 24 (100 tarefas por página)                 │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  📝 Log (últimas 5 ações)                                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 14:32:15 ✅ Lead criado: Maria Santos (+5585991234567)    │  │
│  │ 14:32:15 ✅ Lead criado: João Silva (+5588998765432)      │  │
│  │ 14:32:14 ⏭️ Pulado: +5585996164602 (duplicado)            │  │
│  │ 14:32:14 ✅ Lead criado: Ana Paula (+5585987654321)       │  │
│  │ 14:32:13 ✅ Lead criado: Pedro Alves (+5588976543210)     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─────────────┐ ┌────────────┐                                 │
│  │ ⏸️ Pausar   │ │ ❌ Cancelar │                                 │
│  └─────────────┘ └────────────┘                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Tela de Conclusão

```
┌─────────────────────────────────────────────────────────────────┐
│  ✅ Importação Concluída                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │                        ✅                                 │  │
│  │                                                           │  │
│  │              Importação finalizada!                       │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  📊 Resumo Final                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  Total processado:  13.197  tarefas                       │  │
│  │                                                           │  │
│  │  ✅ Criados:        12.481  leads novos                   │  │
│  │  🔄 Atualizados:       428  leads existentes              │  │
│  │  ⏭️ Pulados:           288  duplicatas                    │  │
│  │  ❌ Erros:               0  falhas                        │  │
│  │                                                           │  │
│  │  ⏱️ Tempo total: 14min 23s                                │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─────────────────┐ ┌───────────────┐ ┌──────────────────┐     │
│  │ 📋 Ver Leads    │ │ 📊 Ver Logs   │ │ 🔄 Nova Import.  │     │
│  └─────────────────┘ └───────────────┘ └──────────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Estrutura de Dados

### 7.1 Tabelas do Banco

```sql
-- Configuração por tenant (API Key, workspace, space)
mt_clickup_config

-- Listas selecionadas para importação
mt_clickup_list_mapping

-- Mapeamento de campos (dinâmico por tenant)
mt_clickup_field_mapping

-- Mapeamento de valores de dropdowns/labels
mt_clickup_value_mapping

-- Log de cada tarefa importada
mt_clickup_migration_log

-- Sessões de importação (para pause/resume)
mt_clickup_import_session
```

### 7.2 Fluxo de Dados

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  ClickUp    │ ──▶ │   Sistema   │ ──▶ │  mt_leads   │
│   API       │     │   (Mapear)  │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
   Buscar            Transformar           Inserir/
   Tarefas            Dados               Atualizar
```

---

## 8. API do ClickUp

### 8.1 Autenticação

```typescript
// Header
Authorization: pk_XXXXXX_XXXXXXXXXX
```

### 8.2 Endpoints Utilizados

| Endpoint | Descrição |
|----------|-----------|
| `GET /user` | Validar API Key |
| `GET /team` | Listar Workspaces |
| `GET /team/{id}/space` | Listar Spaces |
| `GET /space/{id}/list` | Listar Listas |
| `GET /list/{id}/field` | Obter Custom Fields |
| `GET /list/{id}/task?page={n}` | Buscar Tarefas (paginado) |

### 8.3 Rate Limiting

- **Limite**: 100 requisições/minuto
- **Estratégia**: Queue com delay entre requisições
- **Retry**: Exponential backoff em caso de 429

---

## 9. Campos Disponíveis para Mapeamento

### 9.1 Campos do mt_leads

```typescript
// Identificação
nome, nome_social, email, telefone, telefone_secundario, whatsapp

// Dados Pessoais
cpf, rg, data_nascimento, genero, estado_civil

// Endereço
cep, endereco, numero, complemento, bairro, cidade, estado, pais

// Profissional
profissao, empresa, cargo, renda_mensal

// Interesse
servico_interesse, servico_id, valor_estimado, urgencia

// Marketing
origem, campanha, utm_source, utm_medium, utm_campaign, utm_term, utm_content

// Qualificação
score, temperatura, qualificado

// Funil
status, etapa_funil, data_agendamento, confirmado, compareceu

// Conversão
convertido, valor_conversao, data_conversao

// Contato
ultimo_contato, proximo_contato

// Outros
observacoes, tags, dados_extras (JSON para campos extras)
```

### 9.2 Transformações Disponíveis

| Transformação | Descrição | Exemplo |
|---------------|-----------|---------|
| `direct` | Copia valor direto | "João Silva" → "João Silva" |
| `phone` | Normaliza telefone | "85 99616-4602" → "+5585996164602" |
| `date_br` | Converte DD/MM/YYYY | "05/07/1988" → 1988-07-05 |
| `date_unix` | Converte timestamp | 1770102000000 → 2026-02-03 |
| `dropdown` | Mapeia por índice | 4 → "indicacao" |
| `labels` | Mapeia por ID | "9af7449f..." → UUID da franquia |
| `currency` | Converte para decimal | "1796" → 1796.00 |
| `boolean` | Converte para bool | "true" → true |
| `status` | Mapeia status | "agendado" → "agendado" |
| `json` | Salva como JSON | {...} → dados_extras |

---

## 10. Permissões

### 10.1 Quem Pode Usar

| Role | Configurar | Mapear | Importar | Ver Logs |
|------|:----------:|:------:|:--------:|:--------:|
| Platform Admin | ✅ | ✅ | ✅ | ✅ |
| Tenant Admin | ✅ | ✅ | ✅ | ✅ |
| Franchise Admin | ❌ | ❌ | ❌ | ✅ |
| User | ❌ | ❌ | ❌ | ❌ |

### 10.2 Isolamento de Dados

- Cada tenant vê apenas sua própria configuração
- Mapeamentos são independentes por tenant
- Logs são filtrados por tenant

---

## 11. Arquivos do Módulo

### 11.1 Estrutura

```
src/
├── pages/
│   └── integracoes/
│       ├── ClickUpIntegracao.tsx       # Página principal (wizard)
│       └── ClickUpLogs.tsx             # Histórico de importações
├── components/
│   └── clickup/
│       ├── ConnectionStep.tsx          # Etapa 1: Conectar
│       ├── SelectionStep.tsx           # Etapa 2: Selecionar
│       ├── MappingStep.tsx             # Etapa 3: Mapear
│       ├── ImportStep.tsx              # Etapa 4: Importar
│       ├── FieldMappingTable.tsx       # Tabela de mapeamento
│       ├── ValueMappingModal.tsx       # Modal de valores
│       ├── ImportProgress.tsx          # Progresso
│       └── ImportSummary.tsx           # Resumo final
├── hooks/
│   └── clickup/
│       ├── useClickUpConnection.ts     # Conexão com API
│       ├── useClickUpWorkspaces.ts     # Buscar workspaces
│       ├── useClickUpSpaces.ts         # Buscar spaces
│       ├── useClickUpLists.ts          # Buscar listas
│       ├── useClickUpFields.ts         # Buscar campos
│       ├── useClickUpTasks.ts          # Buscar tarefas
│       ├── useClickUpConfig.ts         # CRUD config
│       ├── useClickUpMapping.ts        # CRUD mapeamento
│       └── useClickUpImport.ts         # Executar importação
├── services/
│   └── clickup-api.ts                  # Cliente da API
└── types/
    └── clickup.ts                      # Tipos TypeScript
```

### 11.2 Rotas

```tsx
// App.tsx
<Route path="/integracoes/clickup" element={<ClickUpIntegracao />} />
<Route path="/integracoes/clickup/logs" element={<ClickUpLogs />} />
```

---

## 12. Checklist de Implementação

### Fase 1: Banco de Dados
- [ ] Criar/atualizar tabelas
- [ ] Aplicar RLS
- [ ] Registrar módulo
- [ ] Testar isolamento multi-tenant

### Fase 2: Conexão (Etapa 1)
- [ ] Tela de inserir API Key
- [ ] Validar conexão
- [ ] Exibir dados do usuário
- [ ] Salvar configuração

### Fase 3: Seleção (Etapa 2)
- [ ] Listar workspaces
- [ ] Listar spaces
- [ ] Listar listas com contagem
- [ ] Seleção múltipla de listas

### Fase 4: Mapeamento (Etapa 3)
- [ ] Detectar campos automaticamente
- [ ] Interface de mapeamento drag-and-drop
- [ ] Modal de mapeamento de valores
- [ ] Auto-sugestão por similaridade
- [ ] Salvar mapeamento

### Fase 5: Importação (Etapa 4)
- [ ] Preview com amostra
- [ ] Configurações de importação
- [ ] Execução em lotes
- [ ] Progresso em tempo real
- [ ] Pause/Resume
- [ ] Tratamento de erros
- [ ] Resumo final

### Fase 6: Extras
- [ ] Histórico de importações
- [ ] Exportar logs
- [ ] Re-executar importação
- [ ] Agendar importações (cron)

---

*Documentação atualizada em 03/02/2026*

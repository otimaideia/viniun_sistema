# Analise Comparativa: Kommo CRM vs YESlaser Painel

> **Data**: 15/02/2026
> **Objetivo**: Identificar gaps e oportunidades de melhoria comparando nosso sistema com o Kommo CRM
> **Referencia**: https://www.kommo.com/br/recursos/crm/

---

## Resumo Executivo

O Kommo e um CRM focado em **comunicacao multicanal** e **automacao de vendas** com forte presenca em messaging. Nosso sistema ja possui **muitas funcionalidades equivalentes ou superiores**, especialmente no contexto multi-tenant e gestao de franquias. Porem, existem **gaps importantes** que podem ser preenchidos para elevar o sistema ao nivel de mercado.

### Numeros do Nosso Sistema

| Metrica | Valor |
|---------|-------|
| Arquivos TypeScript | 171 |
| Componentes | 95+ |
| Paginas | 127 |
| Hooks | 180+ |
| Tabelas MT | 88 |
| Tenants Ativos | 9 empresas |
| Franquias | 111 unidades |
| Mensagens WhatsApp | 225.772 |
| Conversas | 6.666 |
| Leads | 303 |

---

## 1. Comparativo Feature-by-Feature

### Legenda

| Icone | Significado |
|-------|-------------|
| OK | Temos implementado |
| PARCIAL | Temos parcialmente |
| NAO TEM | Nao temos (oportunidade) |
| SUPERIOR | Superior ao Kommo |

---

### A) Pipeline / Funil de Vendas

| Feature Kommo | Nosso Sistema | Status |
|---------------|---------------|--------|
| Kanban visual drag-and-drop | Sim, FunilColumn/FunilCard | OK |
| Ate 50 funis simultaneos | Sim, multi-funil | OK |
| Alternancia lista/kanban | Apenas Kanban | PARCIAL |
| Filtros salvos reutilizaveis | Filtros basicos, sem salvar | PARCIAL |
| Gatilhos automaticos por etapa | Sim, 4 tipos de automacao | OK |
| Edicao em massa de leads | Nao implementado | NAO TEM |
| Ate 50 pipelines conectaveis | Funis independentes | PARCIAL |
| Multi-tenant com isolamento | Sim, RLS completo | SUPERIOR |
| Automacao por timeout | Sim, auto-move apos N dias | OK |

**Melhorias identificadas:**
1. Adicionar visao de lista (tabela) como alternativa ao Kanban
2. Implementar filtros salvos/favoritos
3. Implementar edicao em massa de leads no funil

---

### B) Inbox / Secao de Bate-Papo

| Feature Kommo | Nosso Sistema | Status |
|---------------|---------------|--------|
| Inbox unificado multicanal | Apenas WhatsApp | PARCIAL |
| Ordenacao: recentes/espera/marcados | Ordenacao basica por data | PARCIAL |
| Filtros dinamicos complexos | Busca por nome/telefone | PARCIAL |
| Mencoes @equipe no chat | Nao implementado | NAO TEM |
| Chat interno entre equipe | Nao implementado | NAO TEM |
| Notas internas (invisiveis ao cliente) | Sim, useWhatsAppNotesMT | OK |
| Atalho "/" para bots e templates | Nao implementado | NAO TEM |
| Campos dinamicos "[" em mensagens | Nao implementado | NAO TEM |
| Acoes em lote (bulk actions) | Nao implementado | NAO TEM |
| Silenciar notificacoes por chat | Nao implementado | NAO TEM |
| Perfil do lead no painel lateral | Parcial (link para lead) | PARCIAL |
| Converter filtro em widget dashboard | Nao implementado | NAO TEM |
| Criar tarefa sem sair do chat | Nao implementado | NAO TEM |
| Labels/tags em conversas | Sim, useWhatsAppLabelsMT | OK |
| Quick replies/Respostas rapidas | Sim, useWhatsAppQuickRepliesMT | OK |
| Sistema de filas com algoritmos | Sim, 4 algoritmos | SUPERIOR |
| Transferencia entre filas | Sim, useWhatsAppTransfersMT | SUPERIOR |

**Melhorias identificadas:**
1. **Painel lateral do lead no chat** - Ao abrir conversa, mostrar dados do lead ao lado
2. **Atalho "/" no campo de mensagem** - Menu rapido de templates, quick replies e acoes
3. **Campos dinamicos "[" em mensagens** - Inserir nome do lead, proximo agendamento, etc.
4. **Mencoes @usuario** - Notificar colegas dentro da conversa
5. **Chat interno da equipe** - Mensagens invisiveis ao cliente
6. **Acoes em lote** - Marcar como lido, arquivar, atribuir multiplas conversas
7. **Criar tarefa direto do chat** - Sem sair da conversa
8. **Ordenacao avancada** - Por tempo de espera, marcados, nao lidos

---

### C) Automacao / Salesbot

| Feature Kommo | Nosso Sistema | Status |
|---------------|---------------|--------|
| Bot builder sem codigo (visual) | Nao tem builder visual | NAO TEM |
| Templates pre-fabricados de bots | Framework sem templates visuais | PARCIAL |
| Gatilhos por comportamento do cliente | Automacoes de funil basicas | PARCIAL |
| Deteccao de intencoes (NLU) | Chatbot IA com OpenAI (framework pronto) | PARCIAL |
| Bot multicanal (WhatsApp, Insta, etc.) | Apenas WhatsApp | PARCIAL |
| Auto-resposta configuravel | Sim, auto_respond por sessao | OK |
| Follow-up automatico | Parcial, via automacao de funil | PARCIAL |
| Coleta de dados via bot | Nao implementado | NAO TEM |
| Mover lead no funil via bot | Nao implementado | NAO TEM |
| Round-robin de distribuicao | Sim, 4 algoritmos | SUPERIOR |
| Webhooks de saida | Sim, mt_webhooks | OK |

**Melhorias identificadas:**
1. **Bot builder visual (drag-and-drop)** - Interface para criar fluxos sem codigo
2. **Coleta de dados via bot** - Bot pergunta nome, telefone, interesse e salva no lead
3. **Acoes automaticas no funil** - Bot move lead de etapa, cria tarefa, envia alerta
4. **Templates de fluxo prontos** - Qualificacao, agendamento, pos-venda, reativacao
5. **Gatilhos por comportamento** - Inatividade, palavras-chave, horario

---

### D) Gestao de Leads

| Feature Kommo | Nosso Sistema | Status |
|---------------|---------------|--------|
| Perfil completo do lead | Sim, 80+ campos | SUPERIOR |
| Timeline de atividades | Sim, useLeadHistoryMT | OK |
| Lead scoring automatico | Sim, regras customizaveis | OK |
| Tags e categorizacao | Parcial | PARCIAL |
| Deteccao de duplicatas | Nao implementado | NAO TEM |
| Mesclagem de duplicatas | Nao implementado | NAO TEM |
| Importacao de dados (CSV/Excel) | Nao implementado | NAO TEM |
| Exportacao de dados | Sim, CSV | OK |
| Campos customizaveis por tenant | Campos fixos (80+), sem custom fields | PARCIAL |
| Vinculacao lead <-> conversa WhatsApp | Sim, automatica | OK |

**Melhorias identificadas:**
1. **Deteccao de duplicatas** - Verificar telefone/email ao criar lead
2. **Mesclagem de duplicatas** - Tela para revisar e unificar registros
3. **Importacao CSV/Excel** - Upload com mapeamento de colunas e validacao
4. **Campos customizaveis** - Permitir cada tenant criar campos personalizados
5. **Tags mais robustas** - Sistema de tags com cores, agrupamento e filtros

---

### E) Relatorios e Analytics

| Feature Kommo | Nosso Sistema | Status |
|---------------|---------------|--------|
| Dashboard principal | Sim, LeadsDashboard | OK |
| Analise de pipeline/funil | Sim, FunilRelatorios | OK |
| Metricas por vendedor | Sim, Ranking | OK |
| NPS (Net Promoter Score) | Nao implementado | NAO TEM |
| Relatorio de ROI de campanhas | Parcial, CPL tracking | PARCIAL |
| Widgets personalizaveis no dashboard | Nao implementado | NAO TEM |
| Conversao de filtro em widget | Nao implementado | NAO TEM |
| Estatisticas de bot/automacao | Nao implementado | NAO TEM |
| Relatorios agendados | Framework pronto (mt_reports_scheduled) | PARCIAL |
| Analytics de WhatsApp | Sim, useWhatsAppMetrics | OK |

**Melhorias identificadas:**
1. **Widgets customizaveis** - Cada usuario monta seu dashboard (ja temos mt_dashboard_widgets)
2. **NPS pos-atendimento** - Pesquisa via WhatsApp apos consulta
3. **Relatorios agendados funcionais** - Enviar por email semanalmente
4. **Estatisticas de automacao** - Quantas mensagens o bot enviou, taxa de resposta

---

### F) IA e Inteligencia

| Feature Kommo | Nosso Sistema | Status |
|---------------|---------------|--------|
| IA para reescrever mensagens | Nao implementado | NAO TEM |
| IA para resumir conversas | Nao implementado | NAO TEM |
| IA para sugerir respostas | Nao implementado | NAO TEM |
| Agente IA conversacional | Framework pronto (chatbot-handler) | PARCIAL |
| Copilot para gerenciar info | Nao implementado | NAO TEM |
| Knowledge base com embeddings | Sim, pgvector habilitado | OK |

**Melhorias identificadas:**
1. **IA Copilot no chat** - Botao para: reescrever, sugerir resposta, resumir conversa
2. **Sugestao automatica de resposta** - IA analisa contexto e sugere texto
3. **Resumo de conversa** - Clicar e ver resumo dos ultimos dias
4. **Ativar chatbot IA** - Conectar OpenAI ao chatbot-handler (framework pronto)

---

### G) Comunicacao Multicanal

| Feature Kommo | Nosso Sistema | Status |
|---------------|---------------|--------|
| WhatsApp Business | Sim, WAHA integrado | OK |
| Instagram DM | Nao implementado | NAO TEM |
| Facebook Messenger | Framework (useMetaConversationsMT) | PARCIAL |
| TikTok DM | Nao implementado | NAO TEM |
| Email integrado | Nao implementado | NAO TEM |
| SMS | Nao implementado | NAO TEM |
| Telegram | Nao implementado | NAO TEM |
| Transmissoes em massa | Nao implementado | NAO TEM |

**Melhorias identificadas:**
1. **Broadcasts/Transmissoes** - Enviar template para lista segmentada de contatos
2. **Email integrado** - Enviar/receber emails dentro do sistema
3. **Instagram DM** - Integrar via Meta Graph API
4. **Facebook Messenger** - Completar integracao existente

---

## 2. Funcionalidades Exclusivas Nossas (Kommo NAO tem)

Estas sao vantagens competitivas que o Kommo nao oferece:

| Feature | Descricao | Impacto |
|---------|-----------|---------|
| **Multi-Tenant 9 empresas** | Isolamento completo via RLS, 88 tabelas | Altissimo |
| **Gestao de 111 franquias** | Hierarquia tenant -> franquia -> usuario | Altissimo |
| **Branding dinamico** | 80+ campos de personalizacao por tenant | Alto |
| **Sistema de influenciadoras** | CRUD + portal self-service + permutas + indicacoes | Alto |
| **Parcerias B2B** | Portal de parceiros com indicacoes | Medio |
| **Recrutamento completo** | Vagas, candidatos, entrevistas | Medio |
| **Form builder avancado** | 13+ tipos de campo, A/B test, landing pages | Alto |
| **Totem de check-in** | Self-service para clinicas | Medio |
| **Portal do cliente** | Agendamentos, perfil, historico | Medio |
| **4 algoritmos de fila** | Round-robin, least-busy, manual, skill-based | Alto |
| **Extracao de telefone 15 fontes** | Compativel NOWEB e Web engines | Alto |
| **Onboarding wizard** | 10 passos de configuracao para novos tenants | Medio |

---

## 3. Top 15 Melhorias Priorizadas

### Prioridade ALTA (Alto impacto, maior retorno)

#### Melhoria #1: Inbox com Painel Lateral do Lead

**Descricao**: Ao clicar numa conversa no WhatsApp, mostrar painel lateral direito com dados completos do lead (nome, telefone, score, ultimo agendamento, posicao no funil, historico de atividades).

**Justificativa**: Kommo faz isso nativamente. Nosso chat mostra apenas mensagens, obrigando o vendedor a navegar para outra pagina para ver dados do lead.

**Esforco estimado**: 3-5 dias
**Impacto**: Alto - vendedor ve tudo sem trocar de tela

**Arquivos envolvidos**:
- `src/pages/WhatsAppChat.tsx` - Layout principal
- `src/components/whatsapp/chat/ChatSidebar.tsx` - Sidebar de conversas
- Novo: `src/components/whatsapp/chat/LeadPanel.tsx` - Painel do lead
- `src/hooks/useLeadConversations.ts` - Vincular lead a conversa

**Implementacao sugerida**:
```
WhatsAppChat.tsx
├── ChatSidebar (lista de conversas) [esquerda]
├── ChatMessages + ChatInput (centro)
└── LeadPanel (NOVO) [direita, colapsavel]
    ├── Foto + Nome + Score
    ├── Telefone, Email, Cidade
    ├── Posicao no Funil (etapa atual)
    ├── Ultimo agendamento
    ├── Historico resumido (3 ultimas atividades)
    └── Botoes: Ver Lead, Agendar, Mover no Funil
```

---

#### Melhoria #2: Atalhos no Chat ("/" e "[")

**Descricao**: Digitar "/" no campo de mensagem abre menu dropdown com templates, quick replies e acoes rapidas. Digitar "[" insere campos dinamicos (nome do lead, proximo agendamento, etc).

**Justificativa**: Kommo tem isso e aumenta muito a produtividade do vendedor.

**Esforco estimado**: 2-3 dias
**Impacto**: Alto - velocidade de resposta

**Arquivos envolvidos**:
- `src/components/whatsapp/chat/ChatInput.tsx` - Campo de entrada
- `src/hooks/multitenant/useWhatsAppQuickRepliesMT.ts` - Quick replies
- `src/hooks/multitenant/useWhatsAppTemplatesMT.ts` - Templates
- Novo: `src/components/whatsapp/chat/SlashCommandMenu.tsx`
- Novo: `src/components/whatsapp/chat/DynamicFieldMenu.tsx`

**Comandos "/" sugeridos**:
```
/template  → Abre lista de templates de mensagem
/rapida    → Abre respostas rapidas
/agendar   → Cria agendamento para o lead
/tarefa    → Cria tarefa vinculada ao lead
/funil     → Move lead de etapa no funil
/nota      → Adiciona nota interna
/transferir → Transfere conversa para outra fila
```

**Campos "[" sugeridos**:
```
[nome]        → Nome do lead
[telefone]    → Telefone do lead
[email]       → Email do lead
[franquia]    → Nome da franquia
[agendamento] → Data do proximo agendamento
[etapa]       → Etapa atual do funil
```

---

#### Melhoria #3: Edicao em Massa de Leads

**Descricao**: Selecionar multiplos leads na listagem e aplicar acoes em lote: mover etapa do funil, atribuir responsavel, adicionar tag, enviar mensagem WhatsApp, exportar selecionados.

**Justificativa**: Kommo oferece, essencial para operacao em escala.

**Esforco estimado**: 3-4 dias
**Impacto**: Alto - produtividade operacional

**Arquivos envolvidos**:
- `src/pages/Leads.tsx` - Pagina de listagem
- `src/components/dashboard/LeadsTable.tsx` - Tabela de leads
- Novo: `src/components/leads/BulkActionsBar.tsx` - Barra de acoes em massa
- `src/hooks/multitenant/useLeadsMT.ts` - Adicionar mutations em massa

**Acoes em massa sugeridas**:
```
- Mover para etapa do funil
- Atribuir responsavel
- Adicionar/remover tag
- Enviar mensagem WhatsApp (template)
- Exportar selecionados (CSV)
- Excluir selecionados (soft delete)
- Alterar status
- Alterar origem
```

---

#### Melhoria #4: IA Copilot no Chat

**Descricao**: Botao "IA" no campo de mensagem do WhatsApp para: reescrever mensagem (mais formal/informal), sugerir resposta baseada no contexto da conversa, resumir conversa dos ultimos dias, traduzir mensagem.

**Justificativa**: Kommo IA e diferencial competitivo forte. Ja temos o framework (chatbot-handler + pgvector + edge function deployada).

**Esforco estimado**: 5-7 dias
**Impacto**: Muito alto - diferencial de mercado

**Arquivos envolvidos**:
- `src/components/whatsapp/chat/ChatInput.tsx` - Botao IA
- Novo: `src/components/whatsapp/chat/AICopilotMenu.tsx` - Menu de opcoes IA
- Novo: `src/hooks/useAICopilot.ts` - Hook para chamadas IA
- `supabase/functions/whatsapp-chatbot-handler/index.ts` - Edge function existente
- `mt_chatbot_config` - Configuracao (API key, modelo, etc.)

**Funcoes IA sugeridas**:
```
1. Sugerir resposta  → IA le ultimas mensagens e sugere texto
2. Reescrever        → Pega texto digitado e reescreve (formal/informal/resumido)
3. Resumir conversa  → Resume ultimas N mensagens em bullet points
4. Traduzir          → Traduz mensagem para PT/EN/ES
5. Completar         → Autocomplete baseado no contexto
```

**Dependencias**:
- Chave OpenAI ou Anthropic configurada em mt_chatbot_config
- Edge function whatsapp-chatbot-handler ja deployada

---

#### Melhoria #5: Deteccao e Mesclagem de Duplicatas

**Descricao**: Ao criar lead, verificar automaticamente se ja existe lead com mesmo telefone ou email. Tela dedicada para revisar duplicatas e mesclar registros (escolhendo quais dados manter de cada um).

**Justificativa**: Kommo tem nativamente. Com 303+ leads e WhatsApp criando leads automaticamente, duplicatas sao inevitaveis.

**Esforco estimado**: 3-4 dias
**Impacto**: Alto - qualidade dos dados

**Arquivos envolvidos**:
- `src/hooks/multitenant/useLeadsMT.ts` - Adicionar verificacao de duplicata
- Novo: `src/pages/LeadsDuplicatas.tsx` - Pagina de revisao
- Novo: `src/hooks/useLeadDuplicatas.ts` - Hook de deteccao
- Novo: `src/components/leads/MergeLeadsDialog.tsx` - Dialog de mesclagem

**Logica de deteccao**:
```
Duplicata = mesmo telefone OU mesmo email (dentro do mesmo tenant)

Ao criar lead:
1. Buscar leads existentes com mesmo telefone
2. Buscar leads existentes com mesmo email
3. Se encontrar, mostrar aviso com opcoes:
   a) Mesclar com existente
   b) Criar mesmo assim
   c) Abrir lead existente

Pagina de revisao:
1. Listar pares de duplicatas detectadas
2. Para cada par, mostrar dados lado a lado
3. Permitir escolher qual dado manter
4. Mesclar historico, atividades e conversas
```

---

### Prioridade MEDIA (Bom impacto, diferencial competitivo)

#### Melhoria #6: Bot Builder Visual (Sem Codigo)

**Descricao**: Interface drag-and-drop para criar fluxos de chatbot. Blocos de: mensagem, condicao, acao (mover lead, criar tarefa, enviar template), delay, coleta de dados.

**Justificativa**: Salesbot do Kommo e o recurso mais popular. Ja temos mt_workflows + mt_workflow_steps + mt_workflow_conditions no banco.

**Esforco estimado**: 7-10 dias
**Impacto**: Muito alto - automacao acessivel para nao-programadores

**Tabelas existentes no banco**:
```
mt_workflows           → Definicao do workflow
mt_workflow_steps      → Passos do fluxo
mt_workflow_conditions → Condicoes de ramificacao
mt_workflow_executions → Historico de execucoes
mt_workflow_execution_logs → Log detalhado
mt_workflow_templates  → Templates prontos
mt_workflow_schedules  → Agendamentos
```

**Tipos de blocos sugeridos**:
```
TRIGGER     → Inicio: nova mensagem, lead criado, mudanca de etapa
MENSAGEM    → Enviar texto/template no WhatsApp
CONDICAO    → Se/Senao baseado em dados do lead
DELAY       → Aguardar X minutos/horas/dias
ACAO_LEAD   → Mover etapa, atribuir, adicionar tag
ACAO_TAREFA → Criar tarefa para a equipe
COLETA      → Perguntar dados e salvar no lead
WEBHOOK     → Chamar URL externa
FIM         → Encerrar fluxo
```

**Biblioteca sugerida**: React Flow (reactflow.dev) para canvas drag-and-drop

---

#### Melhoria #7: Transmissoes em Massa (Broadcasts)

**Descricao**: Enviar mensagem/template para multiplos contatos segmentados por filtros (etapa do funil, tag, franquia, data, etc). Com agendamento, metricas de abertura e compliance com regras do WhatsApp.

**Justificativa**: Kommo oferece, essencial para campanhas de reativacao e comunicados.

**Esforco estimado**: 4-5 dias
**Impacto**: Alto - marketing direto via WhatsApp

**Implementacao sugerida**:
```
Nova pagina: /whatsapp/transmissoes
1. Criar transmissao
   - Selecionar template de mensagem
   - Selecionar segmento de leads (filtros)
   - Preview da lista de destinatarios
   - Agendar ou enviar agora
2. Monitorar transmissao
   - Enviados / Entregues / Lidos / Respondidos
   - Taxa de opt-out
3. Historico de transmissoes
   - Todas as transmissoes enviadas
   - Metricas agregadas
```

**Tabelas sugeridas**:
```sql
mt_whatsapp_broadcasts (
  id, tenant_id, franchise_id,
  nome, template_id, filtros_json,
  status, -- draft, scheduled, sending, completed, cancelled
  agendado_para, enviado_em,
  total_destinatarios, total_enviados, total_entregues, total_lidos,
  created_by, created_at
)

mt_whatsapp_broadcast_recipients (
  id, broadcast_id, lead_id, conversation_id,
  telefone, status, -- pending, sent, delivered, read, failed
  enviado_em, entregue_em, lido_em, erro
)
```

---

#### Melhoria #8: Importacao de Dados (CSV/Excel)

**Descricao**: Upload de arquivo CSV ou Excel com mapeamento visual de colunas, validacao de dados, preview antes de importar, e importacao para mt_leads.

**Justificativa**: Kommo tem, essencial para onboarding de novos tenants e migracao de dados.

**Esforco estimado**: 3-4 dias
**Impacto**: Medio-alto - onboarding e migracao

**Implementacao sugerida**:
```
Nova pagina: /leads/importar
Passo 1: Upload do arquivo (CSV, XLSX)
Passo 2: Mapeamento de colunas
   - Coluna do arquivo → Campo do sistema
   - Auto-detectar colunas comuns (nome, telefone, email)
Passo 3: Validacao
   - Verificar dados invalidos
   - Detectar duplicatas
   - Preview das primeiras 10 linhas
Passo 4: Importar
   - Progress bar
   - Relatorio final (importados, erros, duplicatas)
```

**Biblioteca sugerida**: Papa Parse (papaparse.com) para CSV, SheetJS para Excel

---

#### Melhoria #9: Chat Interno da Equipe

**Descricao**: Mencoes @usuario no chat do WhatsApp (mensagem interna, invisivel ao cliente), conversas entre membros da equipe, notificacoes de mencao.

**Justificativa**: Kommo tem, melhora colaboracao da equipe de vendas.

**Esforco estimado**: 4-5 dias
**Impacto**: Medio - colaboracao

**Implementacao sugerida**:
```
No ChatInput:
- Digitar "@" abre lista de usuarios da equipe
- Mensagem com @ e marcada como "internal_note" (nao enviada ao WhatsApp)
- Aparece com fundo diferente no chat (ex: amarelo claro)
- Usuario mencionado recebe notificacao

Tipos de mensagem:
- message     → Mensagem normal (enviada ao WhatsApp)
- internal    → Nota interna (visivel apenas para equipe)
- mention     → Mencao a colega (gera notificacao)
- system      → Mensagem do sistema (transferencia, atribuicao)
```

---

#### Melhoria #10: Widgets Customizaveis no Dashboard

**Descricao**: Dashboard com widgets arrastáveis e configuraveis. Cada usuario monta seu proprio painel com os KPIs que mais importam.

**Justificativa**: Kommo oferece, ja temos mt_dashboard_widgets no banco.

**Esforco estimado**: 5-7 dias
**Impacto**: Medio-alto - personalizacao

**Tabela existente**:
```
mt_dashboard_widgets (ja criada na migration)
```

**Widgets sugeridos**:
```
- Leads por status (pizza)
- Leads por origem (barras)
- Funil de conversao (funil)
- Agendamentos do dia (lista)
- Mensagens nao respondidas (contador)
- Tempo medio de resposta (gauge)
- Meta do mes vs realizado (progress bar)
- Ranking de vendedores (tabela)
- Leads por franquia (mapa/tabela)
- Ultimas atividades (timeline)
```

**Biblioteca sugerida**: react-grid-layout para drag-and-drop de widgets

---

### Prioridade BAIXA (Nice-to-have, implementar quando possivel)

#### Melhoria #11: Alternancia Lista/Kanban no Funil

**Descricao**: Botao para alternar entre visualizacao Kanban (cards) e tabela/lista no funil de vendas.

**Esforco estimado**: 1-2 dias
**Impacto**: Baixo-medio

---

#### Melhoria #12: Filtros Salvos/Favoritos

**Descricao**: Salvar combinacoes de filtros com nome para reutilizar. Exemplo: "Leads quentes SP" = status ativo + score > 80 + cidade Sao Paulo.

**Esforco estimado**: 1-2 dias
**Impacto**: Baixo-medio

---

#### Melhoria #13: NPS (Net Promoter Score)

**Descricao**: Pesquisa de satisfacao pos-atendimento enviada automaticamente via WhatsApp. "De 0 a 10, quanto voce recomendaria nosso servico?"

**Esforco estimado**: 3-4 dias
**Impacto**: Medio

---

#### Melhoria #14: Integracao Instagram DM

**Descricao**: Receber e enviar mensagens do Instagram Direct no inbox unificado do sistema.

**Esforco estimado**: 7-10 dias (depende de aprovacao Meta)
**Impacto**: Medio-alto

---

#### Melhoria #15: App Mobile / PWA

**Descricao**: Versao mobile do sistema, preferencialmente como PWA (Progressive Web App) para evitar custos de desenvolvimento nativo.

**Esforco estimado**: PWA 5-7 dias | Nativo 30+ dias
**Impacto**: Alto

---

## 4. Matriz Impacto vs Esforco

```
IMPACTO ALTO
  |
  |  [#4 IA Copilot]          [#6 Bot Builder]
  |  [#1 Inbox+Lead]
  |  [#2 Atalhos Chat]        [#7 Broadcasts]
  |  [#3 Edicao Massa]        [#9 Chat Interno]
  |  [#5 Duplicatas]          [#10 Widgets Dash]
  |  [#8 Import CSV]
  |  [#11 Lista/Kanban]       [#14 Instagram]
  |  [#12 Filtros Salvos]     [#13 NPS]
  |                            [#15 App Mobile]
  |
IMPACTO BAIXO
  +---------------------------------------------->
       BAIXO      MEDIO       ALTO     MUITO ALTO
                  ESFORCO
```

**Quick Wins** (alto impacto, baixo esforco): #1, #2, #11, #12

**Strategic Bets** (alto impacto, alto esforco): #4, #6

**Must-Haves** (medio impacto, medio esforco): #3, #5, #7, #8

---

## 5. Roadmap Sugerido de Implementacao

### Sprint 1: Quick Wins no Chat (1-2 semanas)

| # | Feature | Dias | Prioridade |
|---|---------|------|------------|
| 1 | Painel lateral do lead no chat | 3-5 | ALTA |
| 2 | Atalhos "/" e "[" no ChatInput | 2-3 | ALTA |
| 11 | Alternancia lista/kanban no funil | 1-2 | BAIXA |
| 12 | Filtros salvos/favoritos | 1-2 | BAIXA |

**Resultado**: Chat muito mais produtivo, funil mais flexivel

---

### Sprint 2: Gestao de Leads (2-3 semanas)

| # | Feature | Dias | Prioridade |
|---|---------|------|------------|
| 3 | Edicao em massa de leads | 3-4 | ALTA |
| 5 | Deteccao e mesclagem de duplicatas | 3-4 | ALTA |
| 8 | Importacao CSV/Excel | 3-4 | MEDIA |

**Resultado**: Gestao de leads mais robusta e eficiente

---

### Sprint 3: IA e Comunicacao (2-3 semanas)

| # | Feature | Dias | Prioridade |
|---|---------|------|------------|
| 4 | IA Copilot no chat | 5-7 | ALTA |
| 7 | Transmissoes em massa | 4-5 | MEDIA |

**Resultado**: Diferencial competitivo com IA, marketing direto

---

### Sprint 4: Automacao e Colaboracao (3-4 semanas)

| # | Feature | Dias | Prioridade |
|---|---------|------|------------|
| 6 | Bot builder visual | 7-10 | MEDIA |
| 9 | Chat interno da equipe | 4-5 | MEDIA |

**Resultado**: Automacao acessivel, melhor colaboracao

---

### Sprint 5: Dashboard e Metricas (2-3 semanas)

| # | Feature | Dias | Prioridade |
|---|---------|------|------------|
| 10 | Widgets customizaveis | 5-7 | MEDIA |
| 13 | NPS pos-atendimento | 3-4 | BAIXA |

**Resultado**: Dashboard personalizado, feedback do cliente

---

### Sprint 6: Multicanal (futuro)

| # | Feature | Dias | Prioridade |
|---|---------|------|------------|
| 14 | Instagram DM | 7-10 | BAIXA |
| 15 | PWA Mobile | 5-7 | BAIXA |

**Resultado**: Presenca multicanal, acesso mobile

---

## 6. Conclusao

### Onde ja somos SUPERIORES ao Kommo

1. **Multi-tenant** com 9 empresas e 111 franquias (Kommo nao tem)
2. **Gestao de franquias** com hierarquia 4 niveis
3. **Filas WhatsApp** com 4 algoritmos de distribuicao
4. **Form builder** com 13+ tipos e A/B testing
5. **Portal de influenciadoras** completo com permutas
6. **Recrutamento** integrado ao CRM
7. **Branding dinamico** por tenant (80+ campos)
8. **Totem de check-in** para clinicas
9. **3 portais self-service** (cliente, influenciadora, parceiro)

### Onde o Kommo nos supera (e devemos melhorar)

1. **UX do Chat** - Painel lateral do lead, atalhos, acoes rapidas
2. **IA integrada** - Copilot, sugestoes, resumos de conversa
3. **Automacao visual** - Bot builder drag-and-drop sem codigo
4. **Comunicacao multicanal** - Instagram, TikTok, Email, SMS
5. **Gestao de leads** - Duplicatas, importacao, edicao em massa
6. **Broadcasts** - Transmissoes segmentadas em massa
7. **Dashboard flexivel** - Widgets customizaveis por usuario

### Investimento Total Estimado

| Prioridade | Features | Dias Estimados |
|------------|----------|----------------|
| ALTA | #1, #2, #3, #4, #5 | 16-23 dias |
| MEDIA | #6, #7, #8, #9, #10 | 23-31 dias |
| BAIXA | #11, #12, #13, #14, #15 | 17-25 dias |
| **TOTAL** | **15 features** | **56-79 dias** |

> **Recomendacao**: Comecar pelo Sprint 1 (Quick Wins no Chat) por ter o maior retorno com menor esforco. As melhorias #1 e #2 sozinhas ja transformam a experiencia do vendedor.

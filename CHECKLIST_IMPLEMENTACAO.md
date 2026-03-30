# Checklist de Implementação - YESlaser Painel

> Recursos completos do POPdents para implementar no YESlaser.
> Análise detalhada realizada em 28/01/2025.

---

## 📊 Resumo Executivo

| Categoria | Total | Alta | Média | Baixa |
|-----------|-------|------|-------|-------|
| Diretorias (Gestão Regional) | 8 | 8 | 0 | 0 |
| Metas (Goals) | 12 | 12 | 0 | 0 |
| Aprovações (Workflow) | 10 | 10 | 0 | 0 |
| Campanhas de Marketing | 8 | 8 | 0 | 0 |
| Ranking de Franquias | 6 | 0 | 6 | 0 |
| Hub de Relatórios | 8 | 0 | 8 | 0 |
| Hub de Configurações | 10 | 0 | 10 | 0 |
| Portal Franquia (13 páginas) | 15 | 15 | 0 | 0 |
| Lead Mini CRM | 14 | 14 | 0 | 0 |
| WhatsApp Avançado | 35 | 25 | 10 | 0 |
| Formulários Personalização | 12 | 0 | 12 | 0 |
| **TOTAL** | **138** | **92** | **46** | **0** |

---

## 🔴 FASE 1: Infraestrutura Base (Prioridade Alta)

### 1.1 Diretorias (Gestão Regional) ⬜ 0/8

**Migration SQL:**
- [ ] Criar tabela `yeslaser_diretorias`
  ```sql
  id, nome, regiao, descricao, responsavel_id, is_active, created_at, updated_at
  ```
- [ ] Adicionar coluna `diretoria_id` em `yeslaser_franqueados`

**Hook:**
- [ ] Criar `src/hooks/useDiretorias.ts`
  - [ ] fetchDiretorias() com contagem de franquias vinculadas
  - [ ] createDiretoria()
  - [ ] updateDiretoria()
  - [ ] deleteDiretoria() (desvincula franquias automaticamente)
  - [ ] vincularFranquia()

**Página:**
- [ ] Criar `src/pages/configuracoes/Diretorias.tsx`
  - [ ] Stats Cards: Total, Ativas, Inativas
  - [ ] Tabela: Nome, Região, Status, Data Criação, Ações
  - [ ] Dialog criar/editar com campos: Nome*, Região, Descrição, Ativo toggle
  - [ ] Confirmação de exclusão

**Tipos:**
- [ ] Criar `src/types/diretoria.ts`

---

### 1.2 Sistema de Metas (Goals) ⬜ 0/12

**Migration SQL:**
- [ ] Criar tabela `yeslaser_metas`
  ```sql
  id, titulo, tipo (leads|conversoes|receita|agendamentos), valor_meta, valor_atual,
  data_inicio, data_fim, franqueado_id, usuario_id, created_at, updated_at
  ```
- [ ] Criar tabela `yeslaser_metas_historico`
  ```sql
  id, meta_id, valor_anterior, valor_novo, usuario_id, created_at
  ```

**Hook:**
- [ ] Criar `src/hooks/useMetas.ts`
  - [ ] fetchMetas() com cálculo de percentual automático
  - [ ] createMeta()
  - [ ] updateMeta()
  - [ ] deleteMeta()
  - [ ] atualizarProgresso() + log no histórico
  - [ ] getHistorico()
  - [ ] getMetaStats() (total, atingidas, em andamento, progresso médio)

**Página:**
- [ ] Criar `src/pages/Metas.tsx`
  - [ ] Filtro por franquia (super admin apenas)
  - [ ] Botão "Nova Meta"
  - [ ] Stats: Total de Metas, Atingidas, Em Andamento, Progresso Médio %
  - [ ] Grid de cards (1/2/3 colunas responsivo)

**Componentes:**
- [ ] Criar `src/components/metas/MetaFormModal.tsx`
  - [ ] Campos: Título*, Tipo*, Valor Meta*, Data Início*, Data Fim*, Franquia
- [ ] Criar `src/components/metas/MetaProgressCard.tsx`
  - [ ] Título, franquia badge, status badge (Atingida/Expirada/Próxima/Em andamento)
  - [ ] Tipo (Leads/Conversões/Receita/Agendamentos)
  - [ ] Data fim
  - [ ] Progress bar com valor atual/meta
  - [ ] Percentual (min 100% para atingidas)

**Tipos:**
- [ ] Criar `src/types/meta.ts`

---

### 1.3 Sistema de Aprovações (Workflow) ⬜ 0/10

**Hook:**
- [ ] Criar `src/hooks/useAprovacoes.ts`
  - [ ] fetchUsuarios() separados por status (pendente, ativo, rejeitado)
  - [ ] aprovarUsuario() + atribuir role e franquia
  - [ ] rejeitarUsuario() + motivo opcional
  - [ ] reativarUsuario() (rejeitado → pendente)

**Página:**
- [ ] Criar `src/pages/Aprovacoes.tsx`
  - [ ] Stats: Pendentes (amarelo), Aprovados (verde), Rejeitados (vermelho)
  - [ ] 3 Tabs:
    - **Pendentes**: Avatar, nome, telefone, data cadastro + botões Aprovar/Rejeitar
    - **Aprovados**: Avatar, nome, role badge, franquia, data aprovação, status "Ativo"
    - **Rejeitados**: Avatar, nome, telefone, botão "Reativar"

**Componentes:**
- [ ] Criar `src/components/aprovacoes/AprovacaoCard.tsx`
- [ ] Criar `src/components/aprovacoes/AprovarDialog.tsx`
  - [ ] Seletor de Papel do Usuário (Admin, Diretoria, SDR, Avaliador, Atendente)
  - [ ] Seletor de Franquia (super admin vê todas, admin só a sua)
- [ ] Criar `src/components/aprovacoes/RejeitarDialog.tsx`
  - [ ] Textarea para motivo (opcional)

---

### 1.4 Campanhas de Marketing ⬜ 0/8

**Migration SQL:**
- [ ] Criar tabela `yeslaser_campanhas`
  ```sql
  id, nome, tipo (google_ads|meta_ads|tiktok_ads|linkedin_ads|organico|indicacao),
  status (ativa|pausada|finalizada), orcamento_mensal, franqueado_id,
  data_inicio, data_fim, descricao, created_at, updated_at
  ```

**Hook:**
- [ ] Criar `src/hooks/useCampanhas.ts`
  - [ ] fetchCampanhas() com contagem de leads por campanha
  - [ ] createCampanha()
  - [ ] updateCampanha()
  - [ ] deleteCampanha()
  - [ ] getCampanhaStats() (total, ativas, leads total, orçamento total)

**Páginas:**
- [ ] Criar `src/pages/campanhas/CampanhasIndex.tsx`
  - [ ] Stats: Total, Ativas, Leads, Orçamento Total
  - [ ] Lista de campanhas:
    - Nome + ícone
    - Tipo badge (Google Ads azul, Meta Ads azul escuro, TikTok preto, etc.)
    - Status badge (Ativa verde, Pausada amarelo, Finalizada cinza)
    - Orçamento Mensal, Leads, CPL (calculado: orçamento/leads)
- [ ] Criar `src/pages/campanhas/CampanhaCreate.tsx`
- [ ] Criar `src/pages/campanhas/CampanhaDetail.tsx`
- [ ] Criar `src/pages/campanhas/CampanhaEdit.tsx`

**Componentes:**
- [ ] Criar `src/components/campanhas/CampanhaForm.tsx`

**Tipos:**
- [ ] Criar `src/types/campanha.ts`

---

## 🟡 FASE 2: Gestão e Relatórios (Prioridade Média)

### 2.1 Ranking de Franquias ⬜ 0/6

**Página:**
- [ ] Criar `src/pages/relatorios/Ranking.tsx`
  - [ ] Seletor de período: "Esta Semana" / "Este Mês"
  - [ ] Stats: Total Leads, Convertidos, Taxa de Conversão %, Franquias Ativas
  - [ ] Pódio visual (Top 3):
    - 1º lugar: Ouro, destacado, maior
    - 2º lugar: Prata
    - 3º lugar: Bronze
    - Cada um mostra: posição, nome franquia, leads, convertidos, taxa %
  - [ ] Tabela completa:
    - Posição (medalha para top 3, número para outros)
    - Franquia (avatar + nome)
    - Leads
    - Convertidos
    - Taxa % (badge colorido por faixa)

---

### 2.2 Hub de Relatórios ⬜ 0/8

**Página:**
- [ ] Criar `src/pages/relatorios/RelatoriosIndex.tsx`
  - [ ] 6 cards de relatórios em grid:
    1. ✅ Ranking de Franquias → `/relatorios/ranking`
    2. ⏳ Performance de Leads (Em breve)
    3. ✅ Metas e Objetivos → `/metas`
    4. ⏳ Receita e Faturamento (Em breve)
    5. ⏳ Análise de Serviços (Em breve)
    6. ⏳ Campanhas de Marketing (Em breve)
  - [ ] Quick Stats no topo:
    - Este Mês: +X%
    - Leads: N
    - Meta Atingida: X%
    - Dias Restantes: N
  - [ ] Cards desabilitados com opacidade reduzida e badge "Em breve"

---

### 2.3 Hub de Configurações ⬜ 0/10

**Páginas:**
- [ ] Criar `src/pages/configuracoes/ConfiguracoesIndex.tsx`
  - [ ] 5 seções como cards:
    1. Integrações (APIs e serviços externos) → `/configuracoes/integracoes`
    2. Permissões (Controle de acesso) → `/configuracoes/permissoes`
    3. Módulos (Super Admin) → `/configuracoes/modulos`
    4. Notificações (Em breve) - desabilitado
    5. Dados (Backup e exportação) (Em breve) - desabilitado
  - [ ] Breadcrumb navigation

- [ ] Criar `src/pages/configuracoes/Permissoes.tsx`
  - [ ] Seletor de Role (Super Admin, Admin, Diretoria, SDR, Avaliador, Atendente)
  - [ ] Tabela de permissões por módulo:
    - Colunas: Módulo (checkbox), Can View, Can Create, Can Edit, Can Delete
    - Ícones para cada permissão
    - Checkboxes para toggle
  - [ ] Super Admin permissões são read-only (locked)
  - [ ] Módulos agrupados por categoria: Vendas, Sistema, Gestão, Marketing, Comunicação, Organização
  - [ ] Badge "Core" para módulos essenciais

- [ ] Criar `src/pages/configuracoes/Modulos.tsx`
  - [ ] Lista de módulos disponíveis
  - [ ] Toggle ativar/desativar por franquia
  - [ ] Módulos core vs opcionais
  - [ ] Data de ativação e responsável

---

## 🔴 FASE 3: Portal da Franquia Completo (Prioridade Alta)

### 3.1 Páginas do Portal ⬜ 0/15

**Dashboard:**
- [ ] Criar `src/pages/franquia/FranquiaDashboard.tsx`
  - [ ] Welcome message com nome do usuário
  - [ ] Módulos ativos (badges)
  - [ ] Stats grid: Leads Hoje, Leads Esta Semana, Em Contato, Convertidos
  - [ ] Quick action cards: Ver Leads, WhatsApp, Formulários, Metas
  - [ ] Recent leads (últimos 5)

**Leads:**
- [ ] Criar `src/pages/franquia/FranquiaLeads.tsx`
  - [ ] Mini dashboard stats (Total, Novos, Em Contato, Convertidos)
  - [ ] Search bar (nome, telefone, email)
  - [ ] Status filter tabs (Todos, Novos, Em Contato, Convertidos)
  - [ ] Lista de leads com cards

**Funil:**
- [ ] Criar `src/pages/franquia/FranquiaFunil.tsx`
  - [ ] Seletor de funil (dropdown)
  - [ ] Stats: Total no Funil, Taxa Conversão, Etapas, Funis Ativos
  - [ ] Visualização do funil com cores
  - [ ] Kanban view (máx 5 leads por etapa, "+X mais" se houver mais)

**Metas:**
- [ ] Criar `src/pages/franquia/FranquiaMetas.tsx`
  - [ ] Cards de metas da franquia
  - [ ] Progress bars
  - [ ] Status badges

**Configurações:**
- [ ] Criar `src/pages/franquia/FranquiaConfiguracoes.tsx`
  - [ ] Card Dados da Unidade: Nome, CNPJ, Diretoria, Razão Social (read-only)
  - [ ] Card Endereço: Completo com CEP (read-only)
  - [ ] Card Conta: Nome do usuário, role
  - [ ] Módulos ativos (lista)

**Serviços:**
- [ ] Criar `src/pages/franquia/FranquiaServicos.tsx`
  - [ ] Grid de serviços (1/2/3 colunas)
  - [ ] Cards com imagem, nome, descrição
  - [ ] Empty state

**Formulários:**
- [ ] Criar `src/pages/franquia/FranquiaFormularios.tsx`
  - [ ] Grid de formulários (2 colunas)
  - [ ] Cards: nome, descrição, status badge (Ativo/Inativo), slug
  - [ ] Botão "Abrir" → abre /f/{slug} em nova aba

**Relatórios:**
- [ ] Criar `src/pages/franquia/FranquiaRelatorios.tsx`
  - [ ] Placeholder "Em Desenvolvimento" com ícone

**WhatsApp:**
- [ ] Criar `src/pages/franquia/FranquiaWhatsApp.tsx`
  - [ ] Card com ícone WhatsApp
  - [ ] Botão "Acessar Conversas" → /whatsapp/conversas

**Ranking:**
- [ ] Criar `src/pages/franquia/FranquiaRanking.tsx`
  - [ ] Placeholder "Em Desenvolvimento" com ícone troféu

**Usuários:**
- [ ] Criar `src/pages/franquia/FranquiaUsuarios.tsx`
  - [ ] Stats: Total, Ativos, Pendentes, Inativos
  - [ ] Lista de usuários da franquia
  - [ ] Cards: avatar, nome, telefone, role badge, status badge
  - [ ] Role badges coloridos: Admin, Diretoria, SDR, Avaliador, Atendente

**Campanhas:**
- [ ] Criar `src/pages/franquia/FranquiaCampanhas.tsx`
  - [ ] Stats: Total, Ativas, Leads, Orçamento Total
  - [ ] Lista de campanhas da franquia
  - [ ] Cards com tipo badge, status badge, métricas (orçamento, leads, CPL)

**Perfil:**
- [ ] Criar `src/pages/franquia/FranquiaPerfil.tsx`
  - [ ] Wrapper para página de perfil principal

---

## 🔴 FASE 4: Lead Mini CRM (Prioridade Alta)

### 4.1 Activity Timeline ⬜ 0/14

**Migration SQL:**
- [ ] Criar tabela `yeslaser_lead_activities`
  ```sql
  id, lead_id, tipo (nota|ligacao|email|reuniao|agendamento|tarefa),
  titulo, descricao, usuario_id, is_pinned,
  -- Campos específicos por tipo:
  duracao_minutos, resultado_ligacao (atendida|nao_atendida|caixa_postal|ocupado|erro),
  data_agendamento, hora_agendamento, local_agendamento,
  data_prazo, prioridade (baixa|normal|alta|urgente), is_completed,
  metadata (jsonb), created_at, updated_at
  ```

**Hook:**
- [ ] Criar `src/hooks/useLeadActivities.ts`
  - [ ] fetchActivities() (pinned primeiro, depois por data desc)
  - [ ] createActivity()
  - [ ] updateActivity()
  - [ ] deleteActivity()
  - [ ] togglePin()
  - [ ] toggleComplete() (para tarefas)
  - [ ] fetchByFranqueado() (para dashboard)

**Componentes:**
- [ ] Criar `src/components/leads/LeadMiniCRM.tsx`
  - [ ] Quick Actions Panel: Nota, Ligação, Agendar, Tarefa, WhatsApp (link wa.me)
  - [ ] Stats: Total Atividades, Tarefas Pendentes, Ligações, Agendamentos
  - [ ] Tabs: Timeline, WhatsApp, Tarefas (com badge de pendentes)
  - [ ] Filtro por tipo de atividade (dropdown com contagem)

- [ ] Criar `src/components/leads/LeadActivityTimeline.tsx`
  - [ ] Timeline vertical
  - [ ] Ícone e cor por tipo de atividade
  - [ ] Data relativa (há 2 horas, ontem, etc.)
  - [ ] Botões: Pin/Unpin, Delete, Complete (apenas para tarefas)

- [ ] Criar `src/components/leads/AddActivityModal.tsx`
  - [ ] Seletor de tipo (6 tipos com ícones)
  - [ ] Campos comuns: Título, Descrição
  - [ ] Campos por tipo:
    - **Ligação**: Duração (min/seg), Resultado (dropdown)
    - **Agendamento**: Data, Hora, Local
    - **Tarefa**: Data Prazo, Prioridade (baixa/normal/alta/urgente)

- [ ] Criar `src/components/leads/LeadConversations.tsx`
  - [ ] Lista de conversas WhatsApp vinculadas ao lead
  - [ ] Cada item: foto perfil, nome/telefone, sessão, última msg, unread count
  - [ ] Expandir para ver preview (últimas 5 mensagens)
  - [ ] Botão "Abrir Conversa Completa"
  - [ ] Botão "Iniciar Conversa" se não houver

**Tipos:**
- [ ] Criar `src/types/activity.ts`

---

## 🔴 FASE 5: WhatsApp Avançado (Prioridade Alta)

### 5.1 Labels/Etiquetas ⬜ 0/10

**Migration SQL:**
- [ ] Criar tabela `yeslaser_whatsapp_labels`
  ```sql
  id, sessao_id, nome, cor (hex), descricao, created_at
  ```
- [ ] Criar tabela `yeslaser_whatsapp_conversa_labels`
  ```sql
  id, conversa_id, label_id, created_at, UNIQUE(conversa_id, label_id)
  ```

**Hook:**
- [ ] Criar `src/hooks/useLabels.ts`
  - [ ] fetchLabels()
  - [ ] createLabel()
  - [ ] updateLabel()
  - [ ] deleteLabel()
  - [ ] addLabelToConversa()
  - [ ] removeLabelFromConversa()
  - [ ] getConversaLabels()

**Componentes:**
- [ ] Criar `src/components/whatsapp/LabelManager.tsx`
  - [ ] Modes: List, Create, Edit
  - [ ] Color picker (20 cores em grid com checkmark)
  - [ ] Preview do label
  - [ ] Delete com confirmação

- [ ] Criar `src/components/whatsapp/LabelFilter.tsx`
  - [ ] Multi-select na sidebar
  - [ ] Contador de conversas por label

- [ ] Criar `src/components/whatsapp/LabelBadge.tsx`
  - [ ] Badge colorido para exibir na lista

- [ ] Criar `src/components/whatsapp/ChatLabelsDialog.tsx`
  - [ ] Aplicar/remover labels de uma conversa

---

### 5.2 Quick Replies ⬜ 0/6

**Migration SQL:**
- [ ] Criar tabela `yeslaser_whatsapp_quick_replies`
  ```sql
  id, sessao_id, titulo, mensagem, atalho, categoria, ordem, ativo, created_at
  ```

**Hook:**
- [ ] Criar `src/hooks/useQuickReplies.ts`
  - [ ] fetchQuickReplies()
  - [ ] createQuickReply()
  - [ ] updateQuickReply()
  - [ ] deleteQuickReply()
  - [ ] findByAtalho()
  - [ ] reorder()

**Componentes:**
- [ ] Criar `src/components/whatsapp/QuickReplyManager.tsx`
  - [ ] CRUD de respostas rápidas
  - [ ] Categorização
  - [ ] Ordenação drag-drop

- [ ] Criar `src/components/whatsapp/QuickReplyPicker.tsx`
  - [ ] Menu dropdown no ChatInput
  - [ ] Busca por texto/atalho
  - [ ] Inserir ao clicar

---

### 5.3 Attachment Menu Completo ⬜ 0/8

**Componentes:**
- [ ] Melhorar `src/components/whatsapp/chat/AttachmentMenu.tsx`
  - [ ] Imagem, Vídeo, Áudio, Documento
  - [ ] Separador
  - [ ] Localização, Contato, Enquete

- [ ] Criar `src/components/whatsapp/chat/PollDialog.tsx`
  - [ ] Campo Pergunta
  - [ ] Lista de Opções (min 2, max 12)
  - [ ] Botões Add/Remove opção
  - [ ] Toggle "Permitir múltiplas respostas"

- [ ] Criar `src/components/whatsapp/chat/ContactDialog.tsx`
  - [ ] Nome* (obrigatório)
  - [ ] Telefone* (obrigatório)
  - [ ] Empresa (opcional)

- [ ] Criar `src/components/whatsapp/chat/LocationDialog.tsx`
  - [ ] Campos Latitude/Longitude
  - [ ] Botão "Usar minha localização" (Geolocation API)
  - [ ] Título
  - [ ] Endereço

---

### 5.4 Audio Recorder ⬜ 0/4

- [ ] Criar `src/components/whatsapp/AudioRecorder.tsx`
  - [ ] Botão de gravação (mic)
  - [ ] Recording bar com timer (00:00)
  - [ ] Botão Cancel (X)
  - [ ] Botão Stop (⬛)
  - [ ] Preview do áudio gravado antes de enviar
  - [ ] Integrar MediaRecorder API

---

### 5.5 Outros Recursos WhatsApp ⬜ 0/15

**Componentes:**
- [ ] Criar `src/components/whatsapp/MessageContextMenu.tsx`
  - [ ] Menu de contexto (right-click)
  - [ ] Opções: Editar, Deletar, Encaminhar, Reagir, Copiar

- [ ] Criar `src/components/whatsapp/MessageReactions.tsx`
  - [ ] Exibir emojis de reação na mensagem
  - [ ] Contador por emoji
  - [ ] Tooltip "quem reagiu"

- [ ] Criar `src/components/whatsapp/ForwardMessageDialog.tsx`
  - [ ] Busca de contatos/grupos
  - [ ] Multi-select destinatários
  - [ ] Preview da mensagem
  - [ ] Enviar para múltiplos

- [ ] Criar `src/components/whatsapp/ExportHistoryDialog.tsx`
  - [ ] Formato: TXT, JSON, CSV
  - [ ] Filtro por período
  - [ ] Incluir/excluir mídia

- [ ] Criar `src/components/whatsapp/GroupManager.tsx`
  - [ ] Lista de grupos
  - [ ] Criar novo grupo
  - [ ] Adicionar/remover participantes

- [ ] Criar `src/components/whatsapp/SessionUsersModal.tsx`
  - [ ] Listar usuários com acesso
  - [ ] Atribuir/revogar permissões
  - [ ] Níveis: admin, manager, user

- [ ] Criar `src/components/whatsapp/DiagnosticPanel.tsx`
  - [ ] Status da conexão WAHA
  - [ ] Últimos erros
  - [ ] Métricas de sync
  - [ ] Logs recentes

**Hooks:**
- [ ] Criar `src/hooks/useBackgroundSync.ts`
- [ ] Criar `src/hooks/useWhatsAppMetrics.ts`
- [ ] Criar `src/hooks/useLinkLead.ts`
- [ ] Criar `src/hooks/useMessageReactions.ts`
- [ ] Criar `src/hooks/useExportHistory.ts`
- [ ] Criar `src/hooks/useGroups.ts`

---

## 🟡 FASE 6: Formulários Personalização (Prioridade Média)

### 6.1 Editor de Personalização ⬜ 0/12

- [ ] Criar `src/components/formularios/FormularioPersonalizacaoEditor.tsx`

**Tab Template:**
- [ ] Seletor de template (padrão, landing_page, minimalista, card)
- [ ] Textos: Título Principal, Subtítulo, Texto do Botão, Mensagem de Sucesso

**Tab Cores:**
- [ ] 8 Paletas rápidas (Azul, Verde, Roxo, Rosa, Laranja, Vermelho, Teal, Amarelo)
- [ ] Cores principais (6 color pickers): Primária, Secundária, Fundo, Texto, Botão, Texto Botão
- [ ] Gradiente: Toggle, Cor Inicial, Cor Final, Preview
- [ ] Cores dos campos (5): Fundo, Texto, Borda, Borda em Foco, Labels
- [ ] Cores do Stepper (3): Etapa Ativa, Inativa, Completa

**Tab Tipografia:**
- [ ] Fonte (Inter, Roboto, Open Sans, Poppins, Montserrat, Lato)
- [ ] Tamanho da fonte (Pequeno, Normal, Grande)
- [ ] Arredondamento (none, sm, md, lg, xl, 2xl, full)
- [ ] Sombra (none, sm, md, lg, xl, 2xl)
- [ ] Card Max Width (sm to full)
- [ ] Botões largura total (toggle)

**Tab Imagens:**
- [ ] Logo: URL, Tamanho (sm, md, lg, xl)
- [ ] Background: URL, Overlay toggle, Overlay color
- [ ] Badge: Texto, Cor Fundo, Cor Texto, Ícone URL

**Tab Extras:**
- [ ] Animações toggle
- [ ] Stepper: Mostrar números, Mostrar títulos
- [ ] Footer: Mostrar toggle, Texto, Cores
- [ ] Landing Page: Contadores, Depoimentos, Benefícios

---

## 📁 Rotas a Adicionar no App.tsx

```tsx
// Configurações
<Route path="/configuracoes" element={<ConfiguracoesIndex />} />
<Route path="/configuracoes/diretorias" element={<Diretorias />} />
<Route path="/configuracoes/permissoes" element={<Permissoes />} />
<Route path="/configuracoes/modulos" element={<Modulos />} />

// Metas
<Route path="/metas" element={<Metas />} />

// Aprovações
<Route path="/aprovacoes" element={<Aprovacoes />} />

// Campanhas
<Route path="/campanhas" element={<CampanhasIndex />} />
<Route path="/campanhas/novo" element={<CampanhaCreate />} />
<Route path="/campanhas/:id" element={<CampanhaDetail />} />
<Route path="/campanhas/:id/editar" element={<CampanhaEdit />} />

// Relatórios
<Route path="/relatorios" element={<RelatoriosIndex />} />
<Route path="/relatorios/ranking" element={<Ranking />} />

// Portal Franquia (13 páginas)
<Route path="/franquia" element={<FranquiaDashboard />} />
<Route path="/franquia/leads" element={<FranquiaLeads />} />
<Route path="/franquia/funil" element={<FranquiaFunil />} />
<Route path="/franquia/metas" element={<FranquiaMetas />} />
<Route path="/franquia/configuracoes" element={<FranquiaConfiguracoes />} />
<Route path="/franquia/servicos" element={<FranquiaServicos />} />
<Route path="/franquia/formularios" element={<FranquiaFormularios />} />
<Route path="/franquia/relatorios" element={<FranquiaRelatorios />} />
<Route path="/franquia/whatsapp" element={<FranquiaWhatsApp />} />
<Route path="/franquia/ranking" element={<FranquiaRanking />} />
<Route path="/franquia/usuarios" element={<FranquiaUsuarios />} />
<Route path="/franquia/campanhas" element={<FranquiaCampanhas />} />
<Route path="/franquia/perfil" element={<FranquiaPerfil />} />
```

---

## 🗄️ Migrations SQL (Ordem de Execução)

1. `001_diretorias.sql` - Tabela de diretorias + FK em franqueados
2. `002_metas.sql` - Tabelas de metas e histórico
3. `003_campanhas.sql` - Tabela de campanhas de marketing
4. `004_lead_activities.sql` - Tabela de atividades do lead
5. `005_whatsapp_labels.sql` - Tabelas de labels e conversa_labels
6. `006_whatsapp_quick_replies.sql` - Tabela de respostas rápidas
7. `007_modulos_config.sql` - Tabela de configuração de módulos
8. `008_role_permissions.sql` - Tabela de permissões por role

---

## ✅ Progresso Geral

### Fase 1 - Infraestrutura Base
- [ ] 1.1 Diretorias (0/8)
- [ ] 1.2 Sistema de Metas (0/12)
- [ ] 1.3 Sistema de Aprovações (0/10)
- [ ] 1.4 Campanhas de Marketing (0/8)

### Fase 2 - Gestão e Relatórios
- [ ] 2.1 Ranking de Franquias (0/6)
- [ ] 2.2 Hub de Relatórios (0/8)
- [ ] 2.3 Hub de Configurações (0/10)

### Fase 3 - Portal da Franquia
- [ ] 3.1 Páginas do Portal (0/15)

### Fase 4 - Lead Mini CRM
- [ ] 4.1 Activity Timeline (0/14)

### Fase 5 - WhatsApp Avançado
- [ ] 5.1 Labels/Etiquetas (0/10)
- [ ] 5.2 Quick Replies (0/6)
- [ ] 5.3 Attachment Menu (0/8)
- [ ] 5.4 Audio Recorder (0/4)
- [ ] 5.5 Outros Recursos (0/15)

### Fase 6 - Formulários Personalização
- [ ] 6.1 Editor de Personalização (0/12)

---

## 📅 Cronograma Estimado

| Fase | Duração | Acumulado |
|------|---------|-----------|
| Fase 1: Infraestrutura | 2 semanas | 2 semanas |
| Fase 2: Relatórios | 1 semana | 3 semanas |
| Fase 3: Portal Franquia | 1.5 semanas | 4.5 semanas |
| Fase 4: Lead Mini CRM | 1.5 semanas | 6 semanas |
| Fase 5: WhatsApp | 2 semanas | 8 semanas |
| Fase 6: Formulários | 1 semana | 9 semanas |
| **TOTAL** | **9 semanas** | - |

---

## 🧪 Verificação

### Testes Manuais
1. [ ] Criar diretoria e vincular franquia
2. [ ] Criar meta e atualizar progresso
3. [ ] Aprovar/rejeitar usuário
4. [ ] Criar campanha e verificar CPL
5. [ ] Verificar ranking por período
6. [ ] Testar todas as 13 páginas do portal franquia
7. [ ] Criar atividades no lead (todos os 6 tipos)
8. [ ] Testar labels no WhatsApp (criar, aplicar, filtrar)
9. [ ] Enviar enquete, localização, contato via WhatsApp
10. [ ] Testar personalização completa de formulário

### Build & Lint
```bash
npm run build
npm run lint
```

---

*Última atualização: 28/01/2025*

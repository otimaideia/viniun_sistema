# PROPOSTA COMERCIAL
## Sistema Multi-Tenant de Gestão de Franquias

**Data:** 29 de Janeiro de 2025
**Validade:** 30 dias
**Cliente:** Grupo de Franquias M1 Company

---

## 1. RESUMO EXECUTIVO

### Objetivo
Transformar o sistema YESlaser Painel em uma **plataforma multi-tenant centralizada** capaz de gerenciar 9 empresas do grupo em um único sistema, com isolamento de dados e preparado para futura comercialização como SaaS.

### Empresas a Serem Cadastradas

| # | Empresa | Segmento |
|---|---------|----------|
| 1 | YESlaser | Estética/Depilação a Laser |
| 2 | PopDents | Odontologia |
| 3 | NovaLaser | Estética/Depilação |
| 4 | IntimaCenter | Saúde Íntima |
| 5 | OralRecife | Odontologia |
| 6 | M1 Company | Holding/Gestão |
| 7 | Amor Implantes | Implantes Dentários |
| 8 | Confia Crédito | Financeira/Crédito |
| 9 | Franqueadora | Gestão de Franquias |

---

## 2. INVENTÁRIO DO SISTEMA ATUAL

### Métricas do Sistema

| Componente | Quantidade |
|------------|------------|
| Módulos de Negócio | 20 |
| Páginas/Telas | 109 |
| Hooks de Dados | 106 |
| Tabelas no Banco | 46+ |
| Componentes React | 95+ |
| Linhas de Código | ~25.000 |
| Portais | 4 |
| Integrações | 3 |

### Stack Tecnológico
- **Frontend:** React 18 + TypeScript + Vite
- **UI:** shadcn/ui + Tailwind CSS
- **Estado:** TanStack Query (React Query)
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **WhatsApp:** WAHA API
- **Deploy:** Docker/VPS

---

## 3. MÓDULOS INCLUSOS (20 Módulos)

### Módulos de Vendas & CRM
| Módulo | Páginas | Principais Funcionalidades |
|--------|---------|---------------------------|
| Leads & CRM | 5 | 80+ campos, tracking UTM, click IDs, deduplicação, indicações |
| Funil de Vendas | 5 | Kanban drag-drop, múltiplos funis, automações, métricas |
| Agendamentos | 5 | Calendário visual, check-in totem, notificações WhatsApp |

### Módulos de Comunicação
| Módulo | Páginas | Principais Funcionalidades |
|--------|---------|---------------------------|
| WhatsApp Business | 10 | Multi-sessões, QR Code, mídia, templates, real-time |
| Formulários | 5 | Builder visual, 15 tipos campo, A/B testing, analytics |

### Módulos de Marketing
| Módulo | Páginas | Principais Funcionalidades |
|--------|---------|---------------------------|
| Influenciadoras | 13 | Contratos, pagamentos, permutas, portal self-service |
| Parcerias B2B | 11 | Códigos indicação, QR Code, benefícios, portal |
| Campanhas | 4 | Budget, ROI, UTM tracking, assets |

### Módulos de Gestão
| Módulo | Páginas | Principais Funcionalidades |
|--------|---------|---------------------------|
| Franqueados | 4 | CRUD completo, API tokens, vinculação usuários |
| Serviços | 4 | Catálogo, imagens, categorias |
| Metas | 1 | Por período, equipe, unidade, progresso visual |
| Usuários | 3 | 11 roles, RBAC, aprovação cadastro |

### Módulos de RH
| Módulo | Páginas | Principais Funcionalidades |
|--------|---------|---------------------------|
| Recrutamento | 10 | Vagas, candidatos, pipeline, entrevistas |

### Portais
| Portal | Páginas | Público |
|--------|---------|---------|
| Admin | 33 | Administradores do sistema |
| Franqueado | 13 | Donos de franquia |
| Influenciadora | 9 | Influenciadoras parceiras |
| Parceiro | 7 | Empresas parceiras |
| Cliente | 4 | Clientes finais |

### Módulos de Suporte
| Módulo | Páginas | Principais Funcionalidades |
|--------|---------|---------------------------|
| Relatórios | 2 | Ranking, analytics, exportação |
| Configurações | 5 | Módulos, integrações, permissões |
| Aprovações | 1 | Workflow de aprovação |
| Indicações | 2 | Sistema legado |
| Promoções | - | Landing pages |

---

## 4. ESCOPO DA TRANSFORMAÇÃO MULTI-TENANT

### O que será desenvolvido

1. **Tabela Master de Tenants**
   - Cadastro das 9 empresas
   - Configurações por tenant (logo, cores, módulos)
   - Gestão centralizada

2. **Isolamento de Dados**
   - Adicionar `tenant_id` em 46+ tabelas
   - Row Level Security (RLS) para segurança
   - Índices otimizados para performance

3. **Frontend Multi-Tenant**
   - TenantContext para gerenciamento de estado
   - Seletor de empresa no header
   - Atualização de 106 hooks com filtro de tenant

4. **Painel Administrativo**
   - Dashboard consolidado todas empresas
   - CRUD de Tenants
   - Gestão de franquias por tenant
   - Permissões cross-tenant

5. **Configuração dos 9 Tenants**
   - Migração dados YESlaser existentes
   - Setup inicial das 8 novas empresas
   - Configuração de módulos por empresa

---

## 5. ROADMAP DE IMPLEMENTAÇÃO

### Visão Geral

| Fase | Descrição | Duração | Horas |
|------|-----------|---------|-------|
| 0 | Estabilização | 1 semana | 32h |
| 1 | Fundação Multi-Tenant | 2 semanas | 64h |
| 2 | Frontend Multi-Tenant | 2 semanas | 72h |
| 3 | Painel Admin | 2 semanas | 72h |
| 4 | Cadastro dos 9 Tenants | 2 semanas | 64h |
| 5 | Migração Completa | 4 semanas | 160h |
| 6 | Refinamentos | 1 semana | 40h |
| **TOTAL** | | **14 semanas** | **504h** |

---

### FASE 0: ESTABILIZAÇÃO
**Duração:** 1 semana (32 horas)

| Tarefa | Horas |
|--------|-------|
| Validar todos os 20 módulos existentes | 12h |
| Corrigir bugs pendentes identificados | 12h |
| Garantir build sem erros | 4h |
| Commit código estável | 4h |

**Entregável:** Sistema 100% funcional e estável

---

### FASE 1: FUNDAÇÃO MULTI-TENANT
**Duração:** 2 semanas (64 horas)

| Tarefa | Horas |
|--------|-------|
| Criar tabela `tenants` (master) | 4h |
| Criar migration `tenant_id` em 46+ tabelas | 24h |
| Criar índices para performance | 8h |
| Criar tenant YESlaser e migrar dados existentes | 12h |
| Implementar RLS básico (policies principais) | 16h |

**Entregável:** Banco de dados preparado para multi-tenant

---

### FASE 2: FRONTEND MULTI-TENANT
**Duração:** 2 semanas (72 horas)

| Tarefa | Horas |
|--------|-------|
| Criar TenantContext e useTenant hook | 12h |
| Criar TenantSelector no header | 12h |
| Atualizar hooks principais (leads, funil, whatsapp) | 32h |
| Testes de troca de tenant | 16h |

**Entregável:** Frontend funcionando com seletor de tenant

---

### FASE 3: PAINEL ADMIN
**Duração:** 2 semanas (72 horas)

| Tarefa | Horas |
|--------|-------|
| Dashboard consolidado (KPIs todas empresas) | 20h |
| CRUD de Tenants (criar, editar, desativar) | 20h |
| Gerenciamento de franquias por tenant | 16h |
| Permissões cross-tenant para admins | 16h |

**Entregável:** Painel de gestão de tenants completo

---

### FASE 4: CADASTRO DOS 9 TENANTS
**Duração:** 2 semanas (64 horas)

| Tarefa | Horas |
|--------|-------|
| Configurar tenant: YESlaser (validar migração) | 4h |
| Configurar tenant: PopDents | 8h |
| Configurar tenant: NovaLaser | 8h |
| Configurar tenant: IntimaCenter | 8h |
| Configurar tenant: OralRecife | 8h |
| Configurar tenant: M1 Company | 8h |
| Configurar tenant: Amor Implantes | 8h |
| Configurar tenant: Confia Crédito | 8h |
| Configurar tenant: Franqueadora | 4h |

**Entregável:** 9 empresas cadastradas e configuradas

---

### FASE 5: MIGRAÇÃO COMPLETA
**Duração:** 4 semanas (160 horas)

| Tarefa | Horas |
|--------|-------|
| Atualizar hooks restantes (~80 hooks) | 64h |
| Testar todos os 20 módulos com multi-tenant | 40h |
| Implementar RLS completo (todas tabelas) | 32h |
| Testes de isolamento entre tenants | 16h |
| Correção de bugs encontrados | 8h |

**Entregável:** Sistema 100% multi-tenant funcional

---

### FASE 6: REFINAMENTOS
**Duração:** 1 semana (40 horas)

| Tarefa | Horas |
|--------|-------|
| Renomear tabelas (remover prefixo yeslaser_) | 16h |
| Documentação técnica atualizada | 12h |
| Documentação de usuário | 8h |
| Treinamento equipe | 4h |

**Entregável:** Sistema finalizado e documentado

---

## 6. CRONOGRAMA VISUAL

```
JANEIRO 2025
Semana 5 (27-31): ░░░░░░░░░░ FASE 0 - Estabilização

FEVEREIRO 2025
Semana 1 (03-07): ██████████ FASE 1 - Fundação (1/2)
Semana 2 (10-14): ██████████ FASE 1 - Fundação (2/2)
Semana 3 (17-21): ▓▓▓▓▓▓▓▓▓▓ FASE 2 - Frontend (1/2)
Semana 4 (24-28): ▓▓▓▓▓▓▓▓▓▓ FASE 2 - Frontend (2/2)

MARÇO 2025
Semana 1 (03-07): ▒▒▒▒▒▒▒▒▒▒ FASE 3 - Painel Admin (1/2)
Semana 2 (10-14): ▒▒▒▒▒▒▒▒▒▒ FASE 3 - Painel Admin (2/2)
Semana 3 (17-21): ░░░░░░░░░░ FASE 4 - Tenants (1/2)
Semana 4 (24-28): ░░░░░░░░░░ FASE 4 - Tenants (2/2)

ABRIL 2025
Semana 1 (31-04): ████████████ FASE 5 - Migração (1/4)
Semana 2 (07-11): ████████████ FASE 5 - Migração (2/4)
Semana 3 (14-18): ████████████ FASE 5 - Migração (3/4)
Semana 4 (21-25): ████████████ FASE 5 - Migração (4/4)

MAIO 2025
Semana 1 (28-02): ▓▓▓▓▓▓▓▓▓▓ FASE 6 - Refinamentos

🚀 GO-LIVE: 05 de Maio de 2025
```

---

## 7. INVESTIMENTO

### Resumo de Horas

| Categoria | Horas |
|-----------|-------|
| Desenvolvimento Backend | 180h |
| Desenvolvimento Frontend | 184h |
| Testes e QA | 80h |
| Documentação e Treinamento | 24h |
| Gestão e Reuniões | 36h |
| **TOTAL** | **504h** |

### Valor do Investimento

| Item | Valor |
|------|-------|
| **504 horas de desenvolvimento** | |
| Valor hora: R$ ______ | |
| **TOTAL:** | **R$ ______** |

### Formas de Pagamento

**Opção 1 - À Vista**
- 10% de desconto no valor total

**Opção 2 - Parcelado por Fase**
| Fase | % | Momento |
|------|---|---------|
| Entrada | 20% | Início do projeto |
| Fase 1-2 | 25% | Entrega Fase 2 |
| Fase 3-4 | 25% | Entrega Fase 4 |
| Fase 5-6 | 30% | Entrega final |

**Opção 3 - Mensal**
- 4 parcelas mensais iguais
- Fevereiro a Maio/2025

---

## 8. O QUE ESTÁ INCLUSO

### Sistema Atual (100% Desenvolvido)

| Item | Quantidade | Valor Estimado* |
|------|------------|-----------------|
| Módulos de negócio | 20 | R$ 200.000 |
| Páginas/Telas | 109 | R$ 109.000 |
| Hooks de dados | 106 | R$ 53.000 |
| Componentes React | 95 | R$ 47.500 |
| Tabelas no banco | 46+ | R$ 46.000 |
| Integrações (Supabase, WAHA, API) | 3 | R$ 45.000 |
| Portais (Admin, Franquia, etc) | 4 | R$ 80.000 |
| **Subtotal Sistema Existente** | | **R$ 580.500** |

*Valores estimados de mercado para desenvolvimento do zero

### Transformação Multi-Tenant (A Desenvolver)

| Item | Incluso |
|------|---------|
| Arquitetura multi-tenant completa | ✅ |
| Isolamento de dados por empresa | ✅ |
| 9 tenants configurados | ✅ |
| Painel admin de gestão | ✅ |
| Row Level Security (RLS) | ✅ |
| Seletor de tenant no header | ✅ |
| Preparação para SaaS futuro | ✅ |
| Documentação técnica | ✅ |
| Treinamento da equipe | ✅ |

---

## 9. FUNCIONALIDADES DETALHADAS POR MÓDULO

### 9.1 Módulo de Leads & CRM
- Cadastro com 80+ campos (dados pessoais, contato, saúde, financeiro)
- Tracking UTM completo (source, medium, campaign, content, term)
- Click IDs (Google gclid, Facebook fbclid, TikTok ttclid, Microsoft msclkid)
- Deduplicação automática por nome + telefone + email
- Sistema de indicações com código único
- Histórico de atividades (timeline)
- KPIs em tempo real
- Listagem com filtros avançados

### 9.2 Módulo de Funil de Vendas
- Kanban visual com drag-and-drop
- Múltiplos funis personalizados
- Etapas customizáveis (nome, cor, meta de dias)
- Automações (auto-mover após X dias)
- Métricas por etapa (quantidade, valor, tempo médio)
- Templates de funil pré-configurados
- Relatórios de velocidade e conversão

### 9.3 Módulo WhatsApp Business (WAHA)
- Múltiplas sessões (uma por franquia/número)
- Autenticação por QR Code com polling
- Chat em tempo real via Supabase Realtime
- Envio de mídia (fotos, vídeos, docs, áudio até 16MB)
- 10+ templates de mensagem
- Emoji picker integrado
- Status de entrega (✓ enviado, ✓✓ entregue, lido)
- Permissões por usuário
- Fallback offline do banco
- Retry de mensagens falhadas
- Vinculação automática com leads
- Respostas rápidas
- Automações de mensagens

### 9.4 Módulo de Agendamentos
- Calendário visual (dia/semana/mês)
- Agendamento rápido com modal
- Vinculação direta com lead
- Status (Agendado, Confirmado, Cancelado, Concluído)
- Filtros por unidade, data, status, responsável
- KPIs de comparecimento
- Check-in por totem (CPF/telefone)
- Notificações via WhatsApp

### 9.5 Módulo de Formulários
- Builder visual drag-and-drop
- 15 tipos de campo
- Validação com regex e máscaras
- Modo wizard (etapas)
- 76 opções de estilo
- Formulários públicos (/form/:slug)
- Tracking de indicação
- Analytics (views, starts, completions)
- Testes A/B com confiança estatística
- Templates pré-prontos
- Webhooks para sistemas externos
- Pixels (Facebook, Google, TikTok)
- ReCAPTCHA

### 9.6 Módulo de Influenciadoras
- Cadastro completo com redes sociais
- Categorias (Nano, Micro, Médio, Macro, Mega)
- Código de indicação automático
- Tracking de indicações por URL
- Contratos (Mensal, Por Post, Comissão, Permuta, Misto)
- Workflow de pagamentos
- Gestão de permutas
- Tracking de posts publicados
- Envio de promoções via WhatsApp
- Portal self-service completo
- Ranking de performance

### 9.7 Módulo de Parcerias B2B
- Cadastro de parceiros (empresa, CNPJ, responsável)
- Código de indicação automático
- Benefícios configuráveis
- QR Code para indicações
- Tracking de conversão e ROI
- Portal self-service
- Suporte telefone internacional

### 9.8 Módulo de Recrutamento
- Gestão de vagas por unidade
- Cadastro de candidatos com currículo
- Pipeline (Aplicante → Entrevistado → Aprovado/Rejeitado)
- Agendamento de entrevistas
- Métricas de contratação

### 9.9 Módulo de Campanhas
- Tipos: SMS, Email, WhatsApp, Social
- Gestão de orçamento
- Cálculo de CPL
- UTM tracking automático
- Vinculação com leads gerados
- Alertas de performance
- Biblioteca de assets
- Templates de campanha

### 9.10 Demais Módulos
- **Metas:** Por período, equipe, unidade com progresso visual
- **Franqueados:** CRUD completo com API tokens
- **Serviços:** Catálogo com imagens e categorias
- **Usuários:** 11 roles com RBAC completo
- **Relatórios:** Ranking, analytics, exportação
- **Configurações:** Módulos, integrações, permissões
- **Aprovações:** Workflow de aprovação
- **Portais:** Franqueado, Influenciadora, Parceiro, Cliente

---

## 10. REQUISITOS E CONSIDERAÇÕES

### Infraestrutura Existente (Já Disponível)
- ✅ Servidor Supabase self-hosted
- ✅ Servidor WAHA para WhatsApp
- ✅ Domínio e hospedagem

### Responsabilidades do Cliente
- Fornecer informações das 9 empresas (logo, cores, dados)
- Designar responsáveis para validação
- Disponibilidade para reuniões de acompanhamento
- Aprovação de entregas por fase

### Garantias
- 90 dias de garantia para bugs após go-live
- Suporte técnico durante o período de garantia
- Documentação técnica completa
- Código fonte 100% proprietário do cliente

---

## 11. ACEITE DA PROPOSTA

Declaro que li e concordo com os termos desta proposta.

**Cliente:**

Nome: _________________________________

Cargo: _________________________________

Data: ___/___/______

Assinatura: _________________________________

---

**Desenvolvedor:**

Nome: _________________________________

Data: ___/___/______

Assinatura: _________________________________

---

*Proposta gerada em 29/01/2025*
*Versão 1.0*

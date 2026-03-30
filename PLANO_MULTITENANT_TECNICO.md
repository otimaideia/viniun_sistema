# PLANO TÉCNICO COMPLETO: Sistema Multi-Tenant

**Data:** 01/02/2026
**Versão:** 4.0
**Status:** Aprovado para execução

> ⚠️ **ATUALIZAÇÃO v4.0**: Chatbot AI e Lead Scoring agora são features CORE do projeto. Todas as sugestões foram incorporadas ao escopo completo.

---

# PARTE 1: VISÃO GERAL

## 1.1 Objetivo do Projeto

Transformar o sistema YESlaser Painel em uma **plataforma multi-tenant enterprise** para:

- Centralizar gestão de múltiplas empresas do grupo
- Permitir personalização completa por empresa (branding)
- Integrar com principais plataformas de marketing digital
- Preparar arquitetura para comercialização futura (SaaS)

## 1.2 Tenants Iniciais (9 Empresas)

| # | Slug | Nome | Segmento | Franquias Est. |
|---|------|------|----------|----------------|
| 1 | `yeslaser` | YESlaser | Estética/Laser | 34 |
| 2 | `popdents` | PopDents | Odontologia | 59 |
| 3 | `novalaser` | NovaLaser | Estética | 10 |
| 4 | `intimacenter` | IntimaCenter | Saúde Íntima | 5 |
| 5 | `oralrecife` | OralRecife | Odontologia | 8 |
| 6 | `m1company` | M1 Company | Holding | 1 |
| 7 | `amorimplantes` | Amor Implantes | Implantes | 12 |
| 8 | `confiacredito` | Confia Crédito | Financeira | 3 |
| 9 | `franqueadora` | Franqueadora | Gestão | 1 |

**Total estimado:** ~133 franquias

---

# PARTE 2: ARQUITETURA DO SISTEMA

## 2.1 Hierarquia de Acesso (4 Níveis)

```
┌─────────────────────────────────────────────────────────────────────┐
│  NÍVEL 1: PLATFORM ADMIN                                            │
│  ══════════════════════                                             │
│  • Você e admins do sistema                                         │
│  • Acesso: TUDO                                                     │
│  • Funções:                                                         │
│    - Gerenciar todos os tenants                                     │
│    - Liberar módulos para tenants                                   │
│    - Configurar integrações do sistema                              │
│    - Ver dashboard consolidado de todas empresas                    │
│    - Acessar qualquer tenant/franquia                               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  NÍVEL 2: TENANT ADMIN                                              │
│  ═════════════════════                                              │
│  • Administradores da empresa                                       │
│  • Acesso: Dados do seu tenant + todas suas franquias               │
│  • Funções:                                                         │
│    - Gerenciar franquias da empresa                                 │
│    - Liberar módulos para franquias                                 │
│    - Configurar integrações da empresa                              │
│    - Personalizar branding                                          │
│    - Gerenciar usuários admins                                      │
│    - Ver relatórios consolidados da empresa                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  NÍVEL 3: FRANCHISE ADMIN                                           │
│  ════════════════════════                                           │
│  • Administradores da franquia (franqueado/gerente)                 │
│  • Acesso: Dados da sua franquia apenas                             │
│  • Funções:                                                         │
│    - Gerenciar dados da franquia                                    │
│    - Configurar integrações da franquia                             │
│    - Gerenciar usuários da franquia                                 │
│    - Liberar permissões para usuários                               │
│    - Operar todos os módulos liberados                              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  NÍVEL 4: USER                                                      │
│  ═════════════                                                      │
│  • Colaboradores da franquia                                        │
│  • Acesso: Conforme permissões atribuídas                           │
│  • Funções:                                                         │
│    - Operar módulos conforme permissões                             │
│    - Visualizar/criar/editar conforme liberado                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 2.2 Estrutura de Dados

### Prefixo de Tabelas: `mt_`

```
TABELAS DO SISTEMA (35+ tabelas)
│
├── 🔧 PLATFORM (Sistema)
│   ├── mt_platform_settings
│   └── mt_platform_integrations
│
├── 🏢 TENANTS (Empresas)
│   ├── mt_tenants
│   ├── mt_tenant_branding
│   ├── mt_tenant_modules
│   ├── mt_tenant_integrations
│   └── mt_tenant_settings
│
├── 🏪 FRANCHISES (Franquias)
│   ├── mt_franchises
│   ├── mt_franchise_modules
│   ├── mt_franchise_integrations
│   └── mt_franchise_settings
│
├── 👤 USERS (Usuários)
│   ├── mt_users
│   ├── mt_user_roles
│   └── mt_user_permissions
│
├── 📦 MODULES (Módulos)
│   ├── mt_modules
│   └── mt_module_features
│
├── 🔌 INTEGRATIONS (Integrações)
│   ├── mt_integration_types
│   └── mt_integration_logs
│
└── 📊 BUSINESS (Negócio)
    ├── mt_leads
    ├── mt_lead_activities
    ├── mt_funnels
    ├── mt_funnel_stages
    ├── mt_funnel_leads
    ├── mt_appointments
    ├── mt_forms
    ├── mt_form_fields
    ├── mt_form_submissions
    ├── mt_form_analytics
    ├── mt_whatsapp_sessions
    ├── mt_whatsapp_conversations
    ├── mt_whatsapp_messages
    ├── mt_whatsapp_templates
    ├── mt_campaigns
    ├── mt_campaign_analytics
    ├── mt_services
    ├── mt_goals
    ├── mt_influencers
    ├── mt_influencer_contracts
    ├── mt_partnerships
    ├── mt_job_positions
    ├── mt_candidates
    └── mt_interviews
```

---

# PARTE 3: SISTEMA DE INTEGRAÇÕES

## 3.1 Integrações Disponíveis (9 Tipos)

| # | Código | Nome | Categoria | Recursos |
|---|--------|------|-----------|----------|
| 1 | `whatsapp` | WhatsApp Business | Comunicação | Mensagens, Campanhas, Relatórios, Webhooks |
| 2 | `meta` | Meta (Facebook/Instagram) | Social | Postar, Mensagens, Campanhas, Investimentos, Relatórios |
| 3 | `google_ads` | Google Ads | Ads | Campanhas, Investimentos, Relatórios, Webhooks |
| 4 | `youtube` | YouTube | Social | Postar, Mensagens, Relatórios, Webhooks |
| 5 | `tiktok` | TikTok | Social | Postar, Mensagens, Relatórios, Webhooks |
| 6 | `tiktok_ads` | TikTok Ads | Ads | Campanhas, Investimentos, Relatórios, Webhooks |
| 7 | `google_business` | Google Meu Negócio | Maps | Postar, Mensagens, Relatórios, Webhooks |
| 8 | `google_maps` | Google Maps | Maps | Localização |
| 9 | `smtp` | Email (SMTP) | Comunicação | Mensagens, Campanhas, Relatórios |

## 3.2 Hierarquia de Integrações

```
PLATFORM (Sistema)
│
├── 📱 WhatsApp Sistema
│   ├── Uso: Envio de tokens de login
│   ├── Uso: Comunicados do sistema
│   ├── Uso: Notificações transacionais
│   └── Uso: Verificação de telefone
│
├── 📧 SMTP Sistema
│   ├── Uso: Emails de recuperação de senha
│   ├── Uso: Emails de boas-vindas
│   ├── Uso: Notificações do sistema
│   └── Uso: Relatórios agendados
│
TENANT (Empresa) - Opcional
│
├── Integrações corporativas da marca
│   ├── WhatsApp da marca (comunicados corporativos)
│   ├── Meta da marca (página/perfil principal)
│   ├── YouTube da marca (canal principal)
│   └── etc.
│
FRANQUIA (Unidade) - Opcional
│
└── Cada franquia pode ter SUAS credenciais:
    ├── 📱 WhatsApp próprio (+55 11 99999-XXXX)
    ├── 📘 Meta próprio (@marca.franquia)
    ├── 📍 Google Meu Negócio (ficha própria)
    ├── 📺 TikTok próprio (@marca.franquia)
    ├── 🎬 YouTube próprio (canal da franquia)
    └── 📧 SMTP próprio (email@franquia.com)
```

## 3.3 Campos de Configuração por Integração

### WhatsApp (WAHA)
```json
{
  "waha_url": "https://waha.empresa.com.br",
  "waha_api_key": "api-key-xxx",
  "session_name": "franquia_nome",
  "phone_number": "+5511999999999",
  "phone_name": "Nome da Franquia",
  "webhook_url": "https://api.empresa.com/webhook/whatsapp"
}
```

### Meta (Facebook/Instagram)
```json
{
  "app_id": "123456789",
  "app_secret": "secret-xxx",
  "access_token": "token-xxx",
  "page_id": "page-id-xxx",
  "page_name": "Nome da Página",
  "instagram_id": "instagram-id-xxx",
  "instagram_username": "@usuario",
  "ad_account_id": "act_123456",
  "pixel_id": "pixel-xxx"
}
```

### Google Ads
```json
{
  "client_id": "client-id-xxx",
  "client_secret": "client-secret-xxx",
  "refresh_token": "refresh-token-xxx",
  "developer_token": "developer-token-xxx",
  "customer_id": "123-456-7890",
  "manager_id": "098-765-4321"
}
```

### YouTube
```json
{
  "api_key": "api-key-xxx",
  "client_id": "client-id-xxx",
  "client_secret": "client-secret-xxx",
  "refresh_token": "refresh-token-xxx",
  "channel_id": "UCxxxxxxxx"
}
```

### TikTok / TikTok Ads
```json
{
  "app_id": "app-id-xxx",
  "app_secret": "app-secret-xxx",
  "access_token": "access-token-xxx",
  "open_id": "open-id-xxx",
  "advertiser_id": "advertiser-id-xxx",
  "pixel_id": "pixel-xxx"
}
```

### Google Meu Negócio
```json
{
  "client_id": "client-id-xxx",
  "client_secret": "client-secret-xxx",
  "refresh_token": "refresh-token-xxx",
  "account_id": "accounts/123456",
  "location_id": "locations/xxx",
  "location_name": "Nome da Unidade"
}
```

### Google Maps
```json
{
  "api_key": "api-key-xxx",
  "map_id": "map-id-xxx"
}
```

### SMTP
```json
{
  "host": "smtp.gmail.com",
  "port": 587,
  "username": "email@empresa.com",
  "password": "senha-app-xxx",
  "encryption": "tls",
  "from_email": "contato@empresa.com",
  "from_name": "Nome da Empresa",
  "reply_to": "responder@empresa.com"
}
```

---

# PARTE 4: SISTEMA DE BRANDING

## 4.1 Campos de Personalização (80+ campos)

### Logos e Imagens (10 campos)
| Campo | Descrição |
|-------|-----------|
| `logo_url` | Logo principal colorido |
| `logo_branco_url` | Logo para fundos escuros |
| `logo_escuro_url` | Logo para fundos claros |
| `logo_icone_url` | Ícone/símbolo da marca |
| `favicon_url` | Favicon 32x32 |
| `favicon_svg_url` | Favicon SVG |
| `apple_touch_icon_url` | Ícone iOS 180x180 |
| `og_image_url` | Imagem para compartilhamento social |
| `background_image_url` | Imagem de fundo geral |
| `background_login_url` | Imagem de fundo do login |

### Cores Principais (12 campos)
| Campo | Descrição | Default |
|-------|-----------|---------|
| `cor_primaria` | Cor principal da marca | #3B82F6 |
| `cor_primaria_hover` | Hover da cor primária | #2563EB |
| `cor_primaria_light` | Versão clara | #DBEAFE |
| `cor_primaria_dark` | Versão escura | #1E40AF |
| `cor_secundaria` | Cor secundária | #6366F1 |
| `cor_secundaria_hover` | Hover secundária | #4F46E5 |
| `cor_secundaria_light` | Versão clara | #E0E7FF |
| `cor_secundaria_dark` | Versão escura | #3730A3 |
| `cor_accent` | Cor de destaque | #F59E0B |
| `cor_accent_hover` | Hover destaque | #D97706 |
| `cor_accent_light` | Versão clara | #FEF3C7 |

### Cores de Status (8 campos)
| Campo | Descrição | Default |
|-------|-----------|---------|
| `cor_sucesso` | Cor de sucesso | #10B981 |
| `cor_sucesso_light` | Versão clara | #D1FAE5 |
| `cor_erro` | Cor de erro | #EF4444 |
| `cor_erro_light` | Versão clara | #FEE2E2 |
| `cor_aviso` | Cor de aviso | #F59E0B |
| `cor_aviso_light` | Versão clara | #FEF3C7 |
| `cor_info` | Cor de informação | #3B82F6 |
| `cor_info_light` | Versão clara | #DBEAFE |

### Cores de Fundo (10 campos)
| Campo | Descrição | Default |
|-------|-----------|---------|
| `cor_fundo` | Fundo principal | #FFFFFF |
| `cor_fundo_secundario` | Fundo secundário | #F9FAFB |
| `cor_fundo_terciario` | Fundo terciário | #F3F4F6 |
| `cor_fundo_sidebar` | Fundo do sidebar | #1F2937 |
| `cor_fundo_header` | Fundo do header | #FFFFFF |
| `cor_fundo_card` | Fundo de cards | #FFFFFF |
| `cor_fundo_modal` | Fundo de modais | #FFFFFF |
| `cor_fundo_input` | Fundo de inputs | #FFFFFF |
| `cor_fundo_hover` | Fundo hover | #F3F4F6 |

### Cores de Texto (7 campos)
| Campo | Descrição | Default |
|-------|-----------|---------|
| `cor_texto_primario` | Texto principal | #111827 |
| `cor_texto_secundario` | Texto secundário | #6B7280 |
| `cor_texto_terciario` | Texto terciário | #9CA3AF |
| `cor_texto_inverso` | Texto em fundo escuro | #FFFFFF |
| `cor_texto_sidebar` | Texto do sidebar | #FFFFFF |
| `cor_texto_link` | Links | #3B82F6 |
| `cor_texto_link_hover` | Links hover | #2563EB |

### Bordas e Sombras (14 campos)
| Campo | Descrição | Default |
|-------|-----------|---------|
| `cor_borda` | Cor padrão de borda | #E5E7EB |
| `cor_borda_focus` | Borda em foco | #3B82F6 |
| `cor_borda_erro` | Borda de erro | #EF4444 |
| `cor_borda_input` | Borda de inputs | #D1D5DB |
| `borda_radius_sm` | Radius pequeno | 4px |
| `borda_radius_md` | Radius médio | 8px |
| `borda_radius_lg` | Radius grande | 12px |
| `borda_radius_xl` | Radius extra | 16px |
| `borda_radius_full` | Radius completo | 9999px |
| `sombra_sm` | Sombra pequena | 0 1px 2px rgba(0,0,0,0.05) |
| `sombra_md` | Sombra média | 0 4px 6px rgba(0,0,0,0.1) |
| `sombra_lg` | Sombra grande | 0 10px 15px rgba(0,0,0,0.1) |
| `sombra_xl` | Sombra extra | 0 20px 25px rgba(0,0,0,0.15) |

### Tipografia (16 campos)
| Campo | Descrição | Default |
|-------|-----------|---------|
| `fonte_familia` | Fonte principal | Inter, system-ui |
| `fonte_familia_titulo` | Fonte de títulos | Inter, system-ui |
| `fonte_familia_mono` | Fonte monospace | JetBrains Mono |
| `fonte_tamanho_xs` | Tamanho XS | 12px |
| `fonte_tamanho_sm` | Tamanho SM | 14px |
| `fonte_tamanho_base` | Tamanho base | 16px |
| `fonte_tamanho_lg` | Tamanho LG | 18px |
| `fonte_tamanho_xl` | Tamanho XL | 20px |
| `fonte_tamanho_2xl` | Tamanho 2XL | 24px |
| `fonte_tamanho_3xl` | Tamanho 3XL | 30px |
| `fonte_tamanho_4xl` | Tamanho 4XL | 36px |
| `fonte_peso_light` | Peso light | 300 |
| `fonte_peso_normal` | Peso normal | 400 |
| `fonte_peso_medium` | Peso medium | 500 |
| `fonte_peso_semibold` | Peso semibold | 600 |
| `fonte_peso_bold` | Peso bold | 700 |

### Layout (10 campos)
| Campo | Descrição | Default |
|-------|-----------|---------|
| `largura_max_container` | Largura máxima | 1280px |
| `largura_sidebar` | Largura sidebar | 280px |
| `largura_sidebar_collapsed` | Sidebar recolhido | 80px |
| `altura_header` | Altura header | 64px |
| `layout_sidebar_posicao` | Posição sidebar | left |
| `layout_sidebar_tipo` | Tipo sidebar | fixed |
| `layout_header_tipo` | Tipo header | fixed |
| `layout_densidade` | Densidade | normal |

### Modo Escuro (7 campos)
| Campo | Descrição | Default |
|-------|-----------|---------|
| `dark_mode_habilitado` | Habilitar dark mode | true |
| `dark_cor_fundo` | Fundo dark | #111827 |
| `dark_cor_fundo_secundario` | Fundo secundário | #1F2937 |
| `dark_cor_fundo_card` | Fundo card | #1F2937 |
| `dark_cor_texto_primario` | Texto primário | #F9FAFB |
| `dark_cor_texto_secundario` | Texto secundário | #9CA3AF |
| `dark_cor_borda` | Borda | #374151 |

### Textos Customizados (5 campos)
| Campo | Descrição |
|-------|-----------|
| `texto_login_titulo` | Título da tela de login |
| `texto_login_subtitulo` | Subtítulo do login |
| `texto_boas_vindas` | Mensagem de boas-vindas |
| `texto_footer` | Texto do rodapé |
| `texto_copyright` | Texto de copyright |

### CSS Customizado (1 campo)
| Campo | Descrição |
|-------|-----------|
| `css_customizado` | CSS adicional personalizado |

---

# PARTE 5: SISTEMA DE MÓDULOS

## 5.1 Catálogo de Módulos (18 Módulos)

| # | Código | Nome | Categoria | Core | Descrição |
|---|--------|------|-----------|------|-----------|
| 1 | `leads` | Gestão de Leads | Vendas | ✅ | CRM completo com 80+ campos + **Lead Scoring** |
| 2 | `funil` | Funil de Vendas | Vendas | | Kanban com automações |
| 3 | `agendamentos` | Agendamentos | Operação | ✅ | Calendário e check-in |
| 4 | `whatsapp` | WhatsApp Business | Comunicação | | Chat, mídia, templates |
| 5 | `formularios` | Formulários | Marketing | | Builder visual, A/B testing |
| 6 | `influenciadoras` | Influenciadoras | Marketing | | Contratos, pagamentos, portal |
| 7 | `parcerias` | Parcerias B2B | Marketing | | Indicações, benefícios |
| 8 | `campanhas` | Campanhas | Marketing | | Gestão de campanhas |
| 9 | `recrutamento` | Recrutamento | RH | | Vagas, candidatos |
| 10 | `metas` | Metas | Gestão | | Objetivos e progresso |
| 11 | `franqueados` | Franqueados | Gestão | ✅ | Gestão de unidades |
| 12 | `servicos` | Serviços | Gestão | | Catálogo de serviços |
| 13 | `usuarios` | Usuários | Sistema | ✅ | Gestão de usuários |
| 14 | `relatorios` | Relatórios | Sistema | ✅ | Analytics e exports |
| 15 | `integracoes` | Integrações | Sistema | | Configuração de integrações |
| 16 | `chatbot` | **Chatbot IA** | Comunicação | ✅ | **Atendimento automático inteligente** |
| 17 | `automacoes` | Automações | Sistema | ✅ | **Workflows e triggers automáticos** |
| 18 | `api_webhooks` | **API e Webhooks** | Sistema | ✅ | **Conexão com sistemas externos** |

---

## 5.2 Features CORE Detalhadas

### 🤖 Chatbot IA (CORE - Módulo #16)

**Descrição**: Sistema de atendimento automático inteligente com IA generativa para WhatsApp, formulários e chat web.

#### Funcionalidades do Chatbot

| Feature | Descrição | Prioridade |
|---------|-----------|------------|
| **Atendimento Inicial** | Responder automaticamente leads novos 24/7 | Crítica |
| **FAQ Inteligente** | Responder perguntas frequentes com contexto | Crítica |
| **Qualificação de Leads** | Fazer perguntas para qualificar leads | Crítica |
| **Agendamento Automático** | Marcar horários diretamente pelo chat | Alta |
| **Transferência Humana** | Escalar para atendente quando necessário | Alta |
| **Multi-idioma** | Suporte a PT, EN, ES | Média |
| **Personalização por Tenant** | Cada empresa configura seu chatbot | Alta |
| **Treinamento Customizado** | Treinar IA com dados do tenant | Alta |
| **Analytics de Chatbot** | Métricas de atendimento e satisfação | Alta |
| **Histórico Contextual** | Lembrar conversas anteriores | Média |

#### Arquitetura do Chatbot

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CHATBOT IA ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  CANAIS DE ENTRADA                                                  │
│  ├── WhatsApp (via WAHA)                                           │
│  ├── Formulários Web                                               │
│  ├── Widget de Chat no Site                                        │
│  └── API de Integração                                             │
│                                                                     │
│  PROCESSAMENTO                                                      │
│  ├── NLU (Natural Language Understanding)                          │
│  ├── Intent Recognition                                            │
│  ├── Entity Extraction                                             │
│  └── Context Management                                            │
│                                                                     │
│  IA ENGINE                                                          │
│  ├── OpenAI GPT-4 / Claude API                                     │
│  ├── Fine-tuning por Tenant                                        │
│  ├── RAG (Retrieval Augmented Generation)                          │
│  └── Knowledge Base por Tenant                                     │
│                                                                     │
│  AÇÕES                                                              │
│  ├── Responder Perguntas                                           │
│  ├── Qualificar Lead (Lead Scoring)                                │
│  ├── Agendar Consulta                                              │
│  ├── Coletar Dados                                                 │
│  ├── Transferir para Humano                                        │
│  └── Criar Tarefa/Lembrete                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Tabelas do Chatbot

```sql
-- Configuração do chatbot por tenant
mt_chatbot_config (
    id, tenant_id, franchise_id,
    nome, avatar_url, mensagem_boas_vindas,
    horario_atendimento, fora_horario_msg,
    modelo_ia, api_key_ia, temperatura,
    max_tokens, idiomas_suportados,
    transferencia_automatica_palavras,
    created_at, updated_at
)

-- Base de conhecimento
mt_chatbot_knowledge (
    id, tenant_id, franchise_id,
    categoria, pergunta, resposta,
    variantes, tags, prioridade,
    ativo, created_at, updated_at
)

-- Intents (intenções)
mt_chatbot_intents (
    id, tenant_id,
    nome, descricao, exemplos,
    acao, parametros,
    ativo, created_at
)

-- Conversas do chatbot
mt_chatbot_conversations (
    id, tenant_id, franchise_id,
    lead_id, whatsapp_session_id,
    canal, status, satisfacao_score,
    transferido_para, motivo_transferencia,
    duracao_segundos, mensagens_count,
    created_at, closed_at
)

-- Mensagens do chatbot
mt_chatbot_messages (
    id, conversation_id,
    tipo, conteudo, intent_detectado,
    confidence_score, is_bot,
    metadata, created_at
)

-- Analytics
mt_chatbot_analytics (
    id, tenant_id, franchise_id,
    data, total_conversas, transferidas,
    resolvidas_bot, tempo_medio_resposta,
    satisfacao_media, top_intents,
    created_at
)
```

### 📊 Lead Scoring (CORE - Integrado ao Módulo Leads)

**Descrição**: Sistema de pontuação automática de leads baseado em comportamento, perfil e engajamento.

#### Funcionalidades do Lead Scoring

| Feature | Descrição | Prioridade |
|---------|-----------|------------|
| **Score Automático** | Calcular score baseado em regras | Crítica |
| **Score por Comportamento** | Pontos por ações (abrir email, clicar) | Crítica |
| **Score por Perfil** | Pontos por dados demográficos | Crítica |
| **Score por Engajamento** | Pontos por interações (WhatsApp, chat) | Alta |
| **Regras Customizáveis** | Cada tenant define suas regras | Alta |
| **Alertas de Lead Quente** | Notificar quando score alto | Alta |
| **Decay (Deterioração)** | Score diminui com inatividade | Média |
| **Histórico de Score** | Rastrear evolução do score | Média |
| **Comparativo** | Comparar leads por score | Média |
| **Integração Funil** | Mover lead no funil por score | Alta |

#### Modelo de Scoring

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LEAD SCORING MODEL                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SCORE FINAL = Perfil + Comportamento + Engajamento + Bônus        │
│                                                                     │
│  📋 PERFIL (0-30 pontos)                                           │
│  ├── Dados completos: +10                                          │
│  ├── Região de interesse: +5                                       │
│  ├── Renda compatível: +10                                         │
│  └── Idade target: +5                                              │
│                                                                     │
│  🎯 COMPORTAMENTO (0-40 pontos)                                    │
│  ├── Visitou site: +5                                              │
│  ├── Preencheu formulário: +15                                     │
│  ├── Baixou material: +10                                          │
│  └── Solicitou orçamento: +20                                      │
│                                                                     │
│  💬 ENGAJAMENTO (0-30 pontos)                                      │
│  ├── Respondeu WhatsApp: +10                                       │
│  ├── Abriu email: +5                                               │
│  ├── Clicou em link: +10                                           │
│  └── Agendou visita: +15                                           │
│                                                                     │
│  ⭐ BÔNUS/PENALIDADES                                               │
│  ├── Indicação: +20                                                │
│  ├── Retorno: +15                                                  │
│  ├── Inatividade 7d: -10                                           │
│  └── Inatividade 30d: -30                                          │
│                                                                     │
│  CLASSIFICAÇÃO                                                      │
│  ├── 🔥 HOT (80-100): Prioridade máxima                           │
│  ├── 🟡 WARM (50-79): Acompanhar de perto                         │
│  ├── 🔵 COLD (20-49): Nutrir                                      │
│  └── ⚪ ICE (0-19): Reengajar ou descartar                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Tabelas do Lead Scoring

```sql
-- Regras de scoring por tenant
mt_lead_scoring_rules (
    id, tenant_id,
    nome, categoria, condicao,
    pontos, descricao, ativo,
    created_at, updated_at
)

-- Score atual dos leads
mt_lead_scores (
    id, lead_id,
    score_total, score_perfil,
    score_comportamento, score_engajamento,
    classificacao, ultimo_calculo,
    created_at, updated_at
)

-- Histórico de mudanças de score
mt_lead_score_history (
    id, lead_id,
    score_anterior, score_novo,
    motivo, regra_aplicada,
    created_at
)

-- Configuração de scoring por tenant
mt_lead_scoring_config (
    id, tenant_id,
    peso_perfil, peso_comportamento,
    peso_engajamento, decay_dias,
    decay_pontos, threshold_hot,
    threshold_warm, threshold_cold,
    notificar_hot, created_at
)
```

### 🔌 API e Webhooks (CORE - Módulo #18)

**Descrição**: Sistema completo de integração com sistemas externos via API REST e Webhooks para comunicação bidirecional.

#### Funcionalidades da API

| Feature | Descrição | Prioridade |
|---------|-----------|------------|
| **API REST Completa** | Endpoints para todos os recursos do sistema | Crítica |
| **Autenticação por API Key** | Chaves seguras por tenant/franquia | Crítica |
| **Documentação Swagger** | Documentação interativa e atualizada | Crítica |
| **Rate Limiting** | Controle de requisições por minuto/hora | Alta |
| **Versionamento** | Suporte a múltiplas versões da API | Alta |
| **Logs de Acesso** | Registro de todas as chamadas | Alta |
| **Permissões por Endpoint** | Controle granular de acesso | Média |
| **SDK para Integradores** | Bibliotecas prontas (JS, Python, PHP) | Média |

#### Funcionalidades de Webhooks

| Feature | Descrição | Prioridade |
|---------|-----------|------------|
| **Webhooks Outgoing** | Notificar sistemas externos de eventos | Crítica |
| **Webhooks Incoming** | Receber dados de sistemas externos | Crítica |
| **Retry Automático** | Reenviar em caso de falha | Alta |
| **Assinatura de Segurança** | HMAC para validar autenticidade | Alta |
| **Filtro de Eventos** | Escolher quais eventos disparam | Alta |
| **Logs de Envio** | Histórico de webhooks enviados | Alta |
| **Teste de Webhook** | Enviar webhook de teste | Média |
| **Payload Customizável** | Escolher campos a enviar | Média |

#### Eventos Disponíveis para Webhook

| Categoria | Eventos |
|-----------|---------|
| **Leads** | lead.created, lead.updated, lead.status_changed, lead.deleted |
| **Funil** | funnel_lead.moved, funnel_lead.won, funnel_lead.lost |
| **Agendamentos** | appointment.created, appointment.confirmed, appointment.cancelled, appointment.completed |
| **WhatsApp** | message.received, message.sent, session.connected, session.disconnected |
| **Formulários** | form.submitted, form.started, form.abandoned |
| **Chatbot** | chatbot.conversation_started, chatbot.transferred, chatbot.completed |
| **Pagamentos** | payment.received, payment.failed, subscription.created, subscription.cancelled |

#### Arquitetura de Integração

```
┌─────────────────────────────────────────────────────────────────────┐
│                    API & WEBHOOKS ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SISTEMAS EXTERNOS                                                  │
│  ├── ERPs (SAP, TOTVS, Sankhya)                                    │
│  ├── CRMs (Salesforce, HubSpot, Pipedrive)                         │
│  ├── Automação (Zapier, Make, n8n)                                 │
│  ├── Google Sheets, Excel Online                                   │
│  ├── Slack, Discord, Teams                                         │
│  └── Sistemas próprios do cliente                                  │
│                                                                     │
│              ↕ (REST API + Webhooks)                               │
│                                                                     │
│  API GATEWAY                                                        │
│  ├── Autenticação (API Key + JWT)                                  │
│  ├── Rate Limiting                                                 │
│  ├── Logging & Monitoring                                          │
│  └── Cache (Redis)                                                 │
│                                                                     │
│              ↕                                                      │
│                                                                     │
│  SISTEMA MULTI-TENANT                                               │
│  ├── Leads, Funil, Agendamentos                                    │
│  ├── WhatsApp, Formulários, Chatbot                                │
│  └── Relatórios, Campanhas, etc.                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Tabelas de API e Webhooks

```sql
-- API Keys por tenant/franquia
mt_api_keys (
    id, tenant_id, franchise_id,
    nome, key_hash, secret_hash,
    permissions, rate_limit_per_minute,
    rate_limit_per_hour, allowed_ips,
    expires_at, last_used_at,
    created_by, created_at
)

-- Logs de chamadas à API
mt_api_logs (
    id, tenant_id, api_key_id,
    method, endpoint, request_body,
    response_status, response_time_ms,
    ip_address, user_agent,
    created_at
)

-- Configuração de Webhooks
mt_webhooks (
    id, tenant_id, franchise_id,
    nome, url, secret,
    eventos, headers_custom,
    ativo, retry_count,
    created_by, created_at
)

-- Logs de Webhooks enviados
mt_webhook_logs (
    id, webhook_id, evento,
    payload, response_status,
    response_body, attempts,
    next_retry_at, completed_at,
    created_at
)

-- Webhooks incoming (recebidos)
mt_webhook_incoming (
    id, tenant_id, franchise_id,
    source, endpoint_slug,
    payload, processed,
    processed_at, created_at
)
```

## 5.3 Fluxo de Liberação de Módulos

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. PLATFORM ADMIN libera módulos para TENANT                       │
│                                                                     │
│    Exemplo: Libera WhatsApp para YESlaser                          │
│    INSERT INTO mt_tenant_modules (tenant_id, module_id)            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. TENANT ADMIN libera módulos para FRANQUIAS                      │
│                                                                     │
│    Exemplo: Libera WhatsApp para Franquia Altamira                 │
│    INSERT INTO mt_franchise_modules (franchise_id, module_id)      │
│                                                                     │
│    ⚠️ Só pode liberar módulos que o TENANT possui!                 │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. FRANCHISE ADMIN libera permissões para USUÁRIOS                 │
│                                                                     │
│    Exemplo: Usuário Pedro pode usar WhatsApp                       │
│    INSERT INTO mt_user_permissions (user_id, module_id, can_*)     │
│                                                                     │
│    ⚠️ Só pode liberar módulos que a FRANQUIA possui!               │
└─────────────────────────────────────────────────────────────────────┘
```

---

# PARTE 6: FEATURES ADICIONAIS DO PROJETO

> ✅ **TODAS AS FEATURES ABAIXO ESTÃO INCLUÍDAS NO ESCOPO DO PROJETO**

## 6.1 Features de Segurança (Fase 11)

| # | Feature | Descrição | Horas | Status |
|---|---------|-----------|-------|--------|
| 1 | **Two-Factor Auth (2FA)** | Autenticação em dois fatores via SMS/TOTP | 24h | Incluído |
| 2 | **Audit Log** | Log de todas as ações do sistema com filtros | 32h | Incluído |
| 3 | **Session Management** | Gerenciar/encerrar sessões ativas | 16h | Incluído |
| 4 | **IP Whitelist** | Lista de IPs permitidos por tenant | 16h | Incluído |
| 5 | **Password Policy** | Política de senhas configurável por tenant | 12h | Incluído |

**Total Segurança: 100h**

### Tabelas de Segurança
```sql
mt_audit_logs (id, tenant_id, user_id, action, entity, entity_id, old_data, new_data, ip_address, user_agent, created_at)
mt_user_sessions (id, user_id, token_hash, device_info, ip_address, last_activity, expires_at, created_at)
mt_ip_whitelist (id, tenant_id, ip_address, descricao, ativo, created_by, created_at)
mt_password_policies (id, tenant_id, min_length, require_uppercase, require_lowercase, require_number, require_special, expires_days, created_at)
mt_2fa_settings (id, user_id, method, secret, phone_number, is_enabled, backup_codes, created_at)
```

---

## 6.2 Features de Analytics e Relatórios (Fase 12)

| # | Feature | Descrição | Horas | Status |
|---|---------|-----------|-------|--------|
| 1 | **Dashboard Consolidado** | KPIs de todos os tenants para platform admin | 40h | Incluído |
| 2 | **Relatórios Agendados** | Envio automático por email (diário/semanal) | 24h | Incluído |
| 3 | **Export de Dados** | CSV, Excel, PDF com branding do tenant | 20h | Incluído |
| 4 | **Comparativo Franquias** | Ranking e benchmarks entre unidades | 24h | Incluído |
| 5 | **Funil de Conversão** | Analytics detalhado por etapa do funil | 20h | Incluído |

**Total Analytics: 128h**

### Tabelas de Analytics
```sql
mt_reports_scheduled (id, tenant_id, nome, tipo, filtros, destinatarios, frequencia, proximo_envio, ativo, created_at)
mt_reports_history (id, report_id, status, file_url, enviado_para, created_at)
mt_dashboard_widgets (id, tenant_id, user_id, tipo, config, posicao, tamanho, created_at)
mt_benchmarks (id, tenant_id, metrica, periodo, valor_tenant, valor_medio_mercado, percentil, created_at)
```

---

## 6.3 Features de Notificações (Fase 13)

| # | Feature | Descrição | Horas | Status |
|---|---------|-----------|-------|--------|
| 1 | **Push Notifications** | Notificações web browser | 24h | Incluído |
| 2 | **Central de Notificações** | Histórico de todas as notificações | 16h | Incluído |
| 3 | **Preferências de Notificação** | Configurar canais por tipo de notificação | 16h | Incluído |
| 4 | **Alertas de Performance** | Avisar quando meta em risco | 20h | Incluído |
| 5 | **Notificações WhatsApp** | Enviar alertas via WhatsApp sistema | 16h | Incluído |

**Total Notificações: 92h**

### Tabelas de Notificações
```sql
mt_notifications (id, tenant_id, user_id, tipo, titulo, mensagem, link, lida, created_at)
mt_notification_preferences (id, user_id, tipo_notificacao, email, push, whatsapp, in_app, created_at)
mt_notification_templates (id, tenant_id, tipo, assunto, corpo, variaveis, created_at)
mt_push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
```

---

## 6.4 Features de Automações (Fase 14 - CORE)

| # | Feature | Descrição | Horas | Status |
|---|---------|-----------|-------|--------|
| 1 | **Workflows Automatizados** | If/then visual entre módulos | 48h | **CORE** |
| 2 | **Triggers de Evento** | Ações automáticas por eventos | 32h | **CORE** |
| 3 | **Agendamento de Ações** | Programar envios/tarefas futuras | 24h | **CORE** |
| 4 | **Templates de Workflow** | Modelos prontos por segmento | 16h | **CORE** |
| 5 | **Condições Avançadas** | AND/OR/NOT em regras | 20h | **CORE** |

**Total Automações: 140h**

### Arquitetura de Automações
```
┌─────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW ENGINE                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  TRIGGERS (O que inicia)                                           │
│  ├── Lead criado                                                   │
│  ├── Lead mudou de status                                          │
│  ├── Lead respondeu WhatsApp                                       │
│  ├── Lead não respondeu em X horas                                 │
│  ├── Score atingiu X pontos                                        │
│  ├── Formulário enviado                                            │
│  ├── Agendamento criado/confirmado/cancelado                       │
│  ├── Data específica                                               │
│  └── Webhook recebido                                              │
│                                                                     │
│  CONDITIONS (Verificações)                                          │
│  ├── IF score > 80                                                 │
│  ├── IF origem = "facebook"                                        │
│  ├── IF cidade IN ["SP", "RJ"]                                     │
│  ├── AND/OR/NOT combinações                                        │
│  └── Funções: contains, starts_with, regex                         │
│                                                                     │
│  ACTIONS (O que fazer)                                              │
│  ├── Enviar WhatsApp (template)                                    │
│  ├── Enviar Email                                                  │
│  ├── Mover no funil                                                │
│  ├── Atribuir responsável                                          │
│  ├── Criar tarefa                                                  │
│  ├── Atualizar campo                                               │
│  ├── Adicionar tag                                                 │
│  ├── Criar agendamento                                             │
│  ├── Notificar usuário                                             │
│  ├── Chamar webhook                                                │
│  └── Aguardar X minutos/horas/dias                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Tabelas de Automações
```sql
mt_workflows (id, tenant_id, nome, descricao, trigger_tipo, trigger_config, ativo, execucoes_count, created_at)
mt_workflow_steps (id, workflow_id, ordem, tipo, config, delay_minutos, created_at)
mt_workflow_conditions (id, step_id, campo, operador, valor, logica, created_at)
mt_workflow_executions (id, workflow_id, lead_id, status, step_atual, started_at, finished_at, erro)
mt_workflow_templates (id, nome, descricao, segmento, workflow_json, created_at)
```

---

## 6.5 Features de Multi-idioma (Fase 15)

| # | Feature | Descrição | Horas | Status |
|---|---------|-----------|-------|--------|
| 1 | **Suporte Multi-idioma** | Interface em PT-BR, EN, ES | 40h | Incluído |
| 2 | **Formatação Regional** | Data, moeda, telefone por região | 16h | Incluído |
| 3 | **Timezone por Usuário** | Horário local automático | 12h | Incluído |
| 4 | **Tradução de Templates** | Templates de email/WhatsApp multi-idioma | 20h | Incluído |

**Total Multi-idioma: 88h**

### Tabelas de i18n
```sql
mt_translations (id, locale, namespace, key, value, created_at)
mt_user_locale_settings (id, user_id, locale, timezone, date_format, currency, created_at)
```

---

## 6.6 Features Mobile e PWA (Fase 16)

| # | Feature | Descrição | Horas | Status |
|---|---------|-----------|-------|--------|
| 1 | **Progressive Web App** | Instalar como app no mobile | 32h | Incluído |
| 2 | **Offline Mode** | Cache de dados críticos | 24h | Incluído |
| 3 | **App Responsivo** | Layout 100% mobile-friendly | 40h | Incluído |
| 4 | **Camera Access** | Upload de fotos direto | 16h | Incluído |

**Total Mobile: 112h**

---

## 6.7 Features de Personalização Avançada (Fase 17)

| # | Feature | Descrição | Horas | Status |
|---|---------|-----------|-------|--------|
| 1 | **Temas Pré-definidos** | 10 temas prontos (Light, Dark, etc) | 24h | Incluído |
| 2 | **Editor Visual de Branding** | Preview em tempo real | 32h | Incluído |
| 3 | **CSS Avançado** | Editor CSS customizado por tenant | 16h | Incluído |
| 4 | **Componentes Customizáveis** | Escolher layout de componentes | 24h | Incluído |

**Total Personalização: 96h**

---

## 6.8 Features de Email Marketing (Fase 18)

| # | Feature | Descrição | Horas | Status |
|---|---------|-----------|-------|--------|
| 1 | **Templates de Email** | Biblioteca de templates com branding | 24h | Incluído |
| 2 | **Editor Drag-and-Drop** | Builder visual de emails | 48h | Incluído |
| 3 | **Automação de Email** | Sequências automáticas (drip) | 32h | Incluído |
| 4 | **Analytics de Email** | Abertura, cliques, bounces | 24h | Incluído |
| 5 | **Segmentação** | Enviar para segmentos de leads | 20h | Incluído |

**Total Email Marketing: 148h**

### Tabelas de Email Marketing
```sql
mt_email_templates (id, tenant_id, nome, assunto, corpo_html, corpo_text, variaveis, categoria, created_at)
mt_email_campaigns (id, tenant_id, nome, template_id, segmento, status, agendado_para, enviados, abertos, clicados, created_at)
mt_email_sends (id, campaign_id, lead_id, status, aberto_em, clicado_em, bounce_tipo, created_at)
mt_email_sequences (id, tenant_id, nome, descricao, trigger, ativo, created_at)
mt_email_sequence_steps (id, sequence_id, ordem, template_id, delay_horas, created_at)
```

---

## 6.9 Features de Billing/SaaS (Fase 19)

| # | Feature | Descrição | Horas | Status |
|---|---------|-----------|-------|--------|
| 1 | **Planos e Preços** | Definir planos por módulo/recurso | 32h | Incluído |
| 2 | **Cobrança Automática** | Integração com Stripe/PagSeguro | 48h | Incluído |
| 3 | **Uso e Consumo** | Medir uso (leads, msgs, storage) | 24h | Incluído |
| 4 | **Faturas** | Gerar faturas automáticas PDF | 24h | Incluído |
| 5 | **Limites por Plano** | Bloquear quando atingir limite | 20h | Incluído |

**Total Billing: 148h**

### Tabelas de Billing
```sql
mt_plans (id, nome, descricao, preco_mensal, preco_anual, recursos, limites, ativo, created_at)
mt_subscriptions (id, tenant_id, plan_id, status, trial_ends_at, current_period_start, current_period_end, created_at)
mt_usage_records (id, tenant_id, metrica, quantidade, periodo, created_at)
mt_invoices (id, tenant_id, subscription_id, valor, status, pdf_url, vencimento, pago_em, created_at)
mt_payment_methods (id, tenant_id, tipo, dados_criptografados, is_default, created_at)
```

---

## 6.10 Features de API e Integrações (Fase 21 - CORE)

> ✅ **MÓDULO CORE**: API e Webhooks é um módulo essencial para integração com sistemas externos.

| # | Feature | Descrição | Horas | Status |
|---|---------|-----------|-------|--------|
| 1 | **API Pública por Tenant** | REST API com auth por tenant | 48h | **CORE** |
| 2 | **Webhooks Outgoing** | Notificar sistemas externos | 24h | **CORE** |
| 3 | **Webhooks Incoming** | Receber dados de sistemas externos | 24h | **CORE** |
| 4 | **Marketplace de Plugins** | Extensões/apps por tenant | 40h | Incluído |
| 5 | **Zapier/Make Integration** | Conectores no-code | 32h | Incluído |

**Total API: 168h**

### Tabelas de API
```sql
mt_api_keys (id, tenant_id, nome, key_hash, permissions, rate_limit, expires_at, last_used_at, created_at)
mt_api_logs (id, tenant_id, api_key_id, method, endpoint, status_code, response_time_ms, created_at)
mt_webhooks (id, tenant_id, nome, url, eventos, secret, ativo, created_at)
mt_webhook_logs (id, webhook_id, evento, payload, response_status, response_body, created_at)
mt_plugins (id, nome, descricao, autor, versao, manifest, created_at)
mt_tenant_plugins (id, tenant_id, plugin_id, config, ativo, installed_at)
```

---

## 6.11 Features de Onboarding e Suporte (Fase 21)

| # | Feature | Descrição | Horas | Status |
|---|---------|-----------|-------|--------|
| 1 | **Wizard de Configuração** | Assistente inicial por tenant | 32h | Incluído |
| 2 | **Central de Ajuda** | FAQ e docs por tenant | 24h | Incluído |
| 3 | **Chat de Suporte** | Widget de suporte integrado | 24h | Incluído |
| 4 | **Vídeos Tutoriais** | Biblioteca de vídeos embedded | 16h | Incluído |
| 5 | **Tooltips e Tours** | Guias interativos na UI | 20h | Incluído |

**Total Onboarding: 116h**

### Tabelas de Suporte
```sql
mt_help_articles (id, tenant_id, categoria, titulo, conteudo, tags, ordem, ativo, created_at)
mt_help_categories (id, tenant_id, nome, descricao, icone, ordem, created_at)
mt_support_tickets (id, tenant_id, user_id, assunto, descricao, status, prioridade, assigned_to, created_at)
mt_support_messages (id, ticket_id, user_id, mensagem, attachments, is_internal, created_at)
mt_onboarding_progress (id, tenant_id, user_id, step, completed, completed_at, created_at)
```

---

## 6.12 Features de IA Avançada (Fase 22)

| # | Feature | Descrição | Horas | Status |
|---|---------|-----------|-------|--------|
| 1 | **Sugestões Inteligentes** | Próxima melhor ação para lead | 32h | Incluído |
| 2 | **Análise de Sentimento** | Detectar sentimento em mensagens | 24h | Incluído |
| 3 | **Previsão de Conversão** | ML para prever conversão | 40h | Incluído |
| 4 | **Resumo de Conversas** | IA resumir conversas longas | 20h | Incluído |
| 5 | **Geração de Conteúdo** | IA escrever mensagens/emails | 24h | Incluído |

**Total IA Avançada: 140h**

### Tabelas de IA
```sql
mt_ai_suggestions (id, lead_id, tipo, sugestao, confianca, aceita, created_at)
mt_sentiment_analysis (id, message_id, sentimento, score, keywords, created_at)
mt_conversion_predictions (id, lead_id, probabilidade, fatores, model_version, created_at)
mt_ai_generated_content (id, tenant_id, tipo, prompt, conteudo, aprovado, created_at)
```

---

# PARTE 7: CHECKLIST COMPLETO

## 7.1 Fase 0: Preparação

### Backup e Documentação
- [ ] Backup completo do código fonte
- [ ] Backup completo do banco de dados
- [ ] Documentar estrutura atual das tabelas
- [ ] Documentar hooks existentes
- [ ] Documentar componentes existentes
- [ ] Mapear relacionamentos entre tabelas
- [ ] Listar todas as queries existentes

### Validação do Sistema Atual
- [ ] Testar módulo de Leads
- [ ] Testar módulo de Funil
- [ ] Testar módulo de WhatsApp
- [ ] Testar módulo de Agendamentos
- [ ] Testar módulo de Formulários
- [ ] Testar módulo de Influenciadoras
- [ ] Testar módulo de Parcerias
- [ ] Testar módulo de Recrutamento
- [ ] Testar módulo de Campanhas
- [ ] Testar módulo de Metas
- [ ] Testar módulo de Franqueados
- [ ] Testar módulo de Serviços
- [ ] Testar módulo de Usuários
- [ ] Testar módulo de Relatórios
- [ ] Verificar build sem erros
- [ ] Verificar TypeScript sem erros
- [ ] Commitar código estável

---

## 7.2 Fase 1: Estrutura de Banco de Dados

### Tabelas de Platform
- [ ] Criar tabela `mt_platform_settings`
- [ ] Criar tabela `mt_platform_integrations`
- [ ] Inserir configurações iniciais
- [ ] Inserir integração WhatsApp sistema
- [ ] Inserir integração SMTP sistema

### Tabelas de Tenant
- [ ] Criar tabela `mt_tenants`
- [ ] Criar tabela `mt_tenant_branding`
- [ ] Criar tabela `mt_tenant_modules`
- [ ] Criar tabela `mt_tenant_integrations`
- [ ] Criar tabela `mt_tenant_settings`
- [ ] Criar índices para `mt_tenants`
- [ ] Criar índices para `mt_tenant_branding`

### Tabelas de Franchise
- [ ] Criar tabela `mt_franchises`
- [ ] Criar tabela `mt_franchise_modules`
- [ ] Criar tabela `mt_franchise_integrations`
- [ ] Criar tabela `mt_franchise_settings`
- [ ] Criar índices para `mt_franchises`

### Tabelas de User
- [ ] Criar tabela `mt_users`
- [ ] Criar tabela `mt_user_roles`
- [ ] Criar tabela `mt_user_permissions`
- [ ] Criar índices para `mt_users`

### Tabelas de Módulos
- [ ] Criar tabela `mt_modules`
- [ ] Criar tabela `mt_module_features`
- [ ] Inserir 15 módulos iniciais

### Tabelas de Integrações
- [ ] Criar tabela `mt_integration_types`
- [ ] Criar tabela `mt_integration_logs`
- [ ] Inserir 9 tipos de integração

### Tabelas de Negócio
- [ ] Criar tabela `mt_leads`
- [ ] Criar tabela `mt_lead_activities`
- [ ] Criar tabela `mt_funnels`
- [ ] Criar tabela `mt_funnel_stages`
- [ ] Criar tabela `mt_funnel_leads`
- [ ] Criar tabela `mt_appointments`
- [ ] Criar tabela `mt_forms`
- [ ] Criar tabela `mt_form_fields`
- [ ] Criar tabela `mt_form_submissions`
- [ ] Criar tabela `mt_form_analytics`
- [ ] Criar tabela `mt_whatsapp_sessions`
- [ ] Criar tabela `mt_whatsapp_conversations`
- [ ] Criar tabela `mt_whatsapp_messages`
- [ ] Criar tabela `mt_whatsapp_templates`
- [ ] Criar tabela `mt_campaigns`
- [ ] Criar tabela `mt_campaign_analytics`
- [ ] Criar tabela `mt_services`
- [ ] Criar tabela `mt_goals`
- [ ] Criar tabela `mt_influencers`
- [ ] Criar tabela `mt_influencer_contracts`
- [ ] Criar tabela `mt_partnerships`
- [ ] Criar tabela `mt_job_positions`
- [ ] Criar tabela `mt_candidates`
- [ ] Criar tabela `mt_interviews`

### Tabelas de Chatbot IA (CORE)
- [ ] Criar tabela `mt_chatbot_config`
- [ ] Criar tabela `mt_chatbot_knowledge`
- [ ] Criar tabela `mt_chatbot_intents`
- [ ] Criar tabela `mt_chatbot_conversations`
- [ ] Criar tabela `mt_chatbot_messages`
- [ ] Criar tabela `mt_chatbot_analytics`

### Tabelas de Lead Scoring (CORE)
- [ ] Criar tabela `mt_lead_scoring_rules`
- [ ] Criar tabela `mt_lead_scores`
- [ ] Criar tabela `mt_lead_score_history`
- [ ] Criar tabela `mt_lead_scoring_config`

### Tabelas de Automações (CORE)
- [ ] Criar tabela `mt_workflows`
- [ ] Criar tabela `mt_workflow_steps`
- [ ] Criar tabela `mt_workflow_conditions`
- [ ] Criar tabela `mt_workflow_executions`
- [ ] Criar tabela `mt_workflow_templates`

### Tabelas de Segurança
- [ ] Criar tabela `mt_audit_logs`
- [ ] Criar tabela `mt_user_sessions`
- [ ] Criar tabela `mt_ip_whitelist`
- [ ] Criar tabela `mt_password_policies`
- [ ] Criar tabela `mt_2fa_settings`

### Tabelas de Notificações
- [ ] Criar tabela `mt_notifications`
- [ ] Criar tabela `mt_notification_preferences`
- [ ] Criar tabela `mt_notification_templates`
- [ ] Criar tabela `mt_push_subscriptions`

### Tabelas de Analytics
- [ ] Criar tabela `mt_reports_scheduled`
- [ ] Criar tabela `mt_reports_history`
- [ ] Criar tabela `mt_dashboard_widgets`
- [ ] Criar tabela `mt_benchmarks`

### Tabelas de Email Marketing
- [ ] Criar tabela `mt_email_templates`
- [ ] Criar tabela `mt_email_campaigns`
- [ ] Criar tabela `mt_email_sends`
- [ ] Criar tabela `mt_email_sequences`
- [ ] Criar tabela `mt_email_sequence_steps`

### Tabelas de Billing/SaaS
- [ ] Criar tabela `mt_plans`
- [ ] Criar tabela `mt_subscriptions`
- [ ] Criar tabela `mt_usage_records`
- [ ] Criar tabela `mt_invoices`
- [ ] Criar tabela `mt_payment_methods`

### Tabelas de API
- [ ] Criar tabela `mt_api_keys`
- [ ] Criar tabela `mt_api_logs`
- [ ] Criar tabela `mt_webhooks`
- [ ] Criar tabela `mt_webhook_logs`
- [ ] Criar tabela `mt_plugins`
- [ ] Criar tabela `mt_tenant_plugins`

### Tabelas de Suporte
- [ ] Criar tabela `mt_help_articles`
- [ ] Criar tabela `mt_help_categories`
- [ ] Criar tabela `mt_support_tickets`
- [ ] Criar tabela `mt_support_messages`
- [ ] Criar tabela `mt_onboarding_progress`

### Tabelas de IA Avançada
- [ ] Criar tabela `mt_ai_suggestions`
- [ ] Criar tabela `mt_sentiment_analysis`
- [ ] Criar tabela `mt_conversion_predictions`
- [ ] Criar tabela `mt_ai_generated_content`

### Tabelas de i18n
- [ ] Criar tabela `mt_translations`
- [ ] Criar tabela `mt_user_locale_settings`

### Row Level Security
- [ ] Criar função `current_tenant_id()`
- [ ] Criar função `current_franchise_id()`
- [ ] Criar função `is_platform_admin()`
- [ ] Criar função `is_tenant_admin()`
- [ ] Criar função `is_franchise_admin()`
- [ ] Habilitar RLS em todas as tabelas mt_*
- [ ] Criar policies de isolamento por tenant
- [ ] Criar policies de isolamento por franchise
- [ ] Criar policies especiais para admins
- [ ] Testar isolamento de dados

---

## 7.3 Fase 2: Cadastro dos Tenants

### Tenant: YESlaser
- [ ] Inserir tenant YESlaser
- [ ] Configurar branding YESlaser
- [ ] Liberar módulos para YESlaser
- [ ] Migrar franqueados para mt_franchises
- [ ] Migrar usuários para mt_users
- [ ] Configurar permissões
- [ ] Testar acesso

### Tenant: PopDents
- [ ] Inserir tenant PopDents
- [ ] Configurar branding PopDents
- [ ] Liberar módulos para PopDents
- [ ] Migrar franqueados para mt_franchises
- [ ] Migrar usuários para mt_users
- [ ] Configurar permissões
- [ ] Testar acesso

### Tenant: NovaLaser
- [ ] Inserir tenant NovaLaser
- [ ] Configurar branding NovaLaser
- [ ] Liberar módulos para NovaLaser
- [ ] Cadastrar franquias iniciais
- [ ] Cadastrar usuários iniciais

### Tenant: IntimaCenter
- [ ] Inserir tenant IntimaCenter
- [ ] Configurar branding IntimaCenter
- [ ] Liberar módulos para IntimaCenter
- [ ] Cadastrar franquias iniciais
- [ ] Cadastrar usuários iniciais

### Tenant: OralRecife
- [ ] Inserir tenant OralRecife
- [ ] Configurar branding OralRecife
- [ ] Liberar módulos para OralRecife
- [ ] Cadastrar franquias iniciais
- [ ] Cadastrar usuários iniciais

### Tenant: M1 Company
- [ ] Inserir tenant M1 Company
- [ ] Configurar branding M1 Company
- [ ] Liberar TODOS os módulos
- [ ] Configurar como holding

### Tenant: Amor Implantes
- [ ] Inserir tenant Amor Implantes
- [ ] Configurar branding Amor Implantes
- [ ] Liberar módulos para Amor Implantes
- [ ] Cadastrar franquias iniciais
- [ ] Cadastrar usuários iniciais

### Tenant: Confia Crédito
- [ ] Inserir tenant Confia Crédito
- [ ] Configurar branding Confia Crédito
- [ ] Liberar módulos para Confia Crédito
- [ ] Cadastrar franquias iniciais
- [ ] Cadastrar usuários iniciais

### Tenant: Franqueadora
- [ ] Inserir tenant Franqueadora
- [ ] Configurar branding Franqueadora
- [ ] Liberar módulos de gestão
- [ ] Configurar acesso especial

---

## 7.4 Fase 3: Migração de Dados

### Migrar Leads
- [ ] Criar script de migração de leads YESlaser
- [ ] Criar script de migração de leads PopDents
- [ ] Executar migração YESlaser
- [ ] Executar migração PopDents
- [ ] Validar contagem de registros
- [ ] Validar integridade dos dados
- [ ] Validar relacionamentos

### Migrar Funil
- [ ] Migrar funis YESlaser
- [ ] Migrar etapas de funil
- [ ] Migrar leads no funil
- [ ] Validar dados

### Migrar WhatsApp
- [ ] Migrar sessões YESlaser
- [ ] Migrar sessões PopDents
- [ ] Migrar conversas
- [ ] Migrar mensagens (cuidado: 225k registros)
- [ ] Validar dados

### Migrar Formulários
- [ ] Migrar formulários YESlaser
- [ ] Migrar formulários PopDents
- [ ] Migrar campos
- [ ] Migrar submissões
- [ ] Validar dados

### Migrar Demais Dados
- [ ] Migrar agendamentos
- [ ] Migrar serviços
- [ ] Migrar campanhas
- [ ] Migrar metas
- [ ] Migrar influenciadoras
- [ ] Migrar parcerias
- [ ] Migrar vagas/candidatos
- [ ] Validar todos os dados

---

## 7.5 Fase 4: Frontend - Contextos e Hooks

### Contextos
- [ ] Criar TenantContext
- [ ] Criar TenantProvider
- [ ] Criar hook useTenant
- [ ] Criar hook useFranchise
- [ ] Criar hook useBranding
- [ ] Criar hook useModules
- [ ] Criar hook useIntegrations
- [ ] Criar hook usePermissions
- [ ] Atualizar AuthContext

### Componentes Base
- [ ] Criar TenantSelector
- [ ] Criar FranchiseSelector
- [ ] Criar BrandingProvider
- [ ] Criar ThemeProvider dinâmico
- [ ] Atualizar DashboardLayout
- [ ] Atualizar Sidebar
- [ ] Atualizar Header

### Aplicar Branding
- [ ] Carregar branding do tenant
- [ ] Aplicar cores CSS variables
- [ ] Aplicar tipografia
- [ ] Aplicar logos
- [ ] Aplicar espaçamentos
- [ ] Implementar dark mode
- [ ] Testar em todos os componentes

---

## 7.6 Fase 5: Frontend - Atualização de Hooks

### Hooks de Leads
- [ ] Atualizar useLeads
- [ ] Atualizar useLeadActivities
- [ ] Atualizar useLeadMetrics
- [ ] Adicionar filtro por tenant/franchise
- [ ] Testar CRUD

### Hooks de Funil
- [ ] Atualizar useFunnels
- [ ] Atualizar useFunnelStages
- [ ] Atualizar useFunnelLeads
- [ ] Adicionar filtro por tenant/franchise
- [ ] Testar CRUD

### Hooks de WhatsApp
- [ ] Atualizar useWhatsAppSessions
- [ ] Atualizar useWhatsAppConversations
- [ ] Atualizar useWhatsAppMessages
- [ ] Atualizar useWhatsAppChat
- [ ] Adicionar filtro por tenant/franchise
- [ ] Testar envio/recebimento

### Hooks de Formulários
- [ ] Atualizar useForms
- [ ] Atualizar useFormFields
- [ ] Atualizar useFormSubmissions
- [ ] Adicionar filtro por tenant/franchise
- [ ] Testar CRUD

### Hooks de Demais Módulos
- [ ] Atualizar useAppointments
- [ ] Atualizar useServices
- [ ] Atualizar useCampaigns
- [ ] Atualizar useGoals
- [ ] Atualizar useInfluencers
- [ ] Atualizar usePartnerships
- [ ] Atualizar useRecruiting
- [ ] Adicionar filtros
- [ ] Testar todos

---

## 7.7 Fase 6: Painel Platform Admin

### Dashboard
- [ ] Criar página /admin
- [ ] Dashboard consolidado
- [ ] KPIs por tenant
- [ ] Gráficos comparativos
- [ ] Lista de tenants

### CRUD Tenants
- [ ] Listar tenants
- [ ] Criar tenant
- [ ] Editar tenant
- [ ] Desativar tenant
- [ ] Visualizar detalhes

### Editor de Branding
- [ ] Formulário de logos
- [ ] Seletor de cores
- [ ] Configuração de tipografia
- [ ] Configuração de layout
- [ ] Preview em tempo real
- [ ] Salvar branding

### Gerenciador de Módulos
- [ ] Listar módulos
- [ ] Liberar módulo para tenant
- [ ] Revogar módulo
- [ ] Configurar limites

### Gerenciador de Integrações Sistema
- [ ] Listar integrações do sistema
- [ ] Configurar WhatsApp sistema
- [ ] Configurar SMTP sistema
- [ ] Testar integrações

---

## 7.8 Fase 7: Painel Tenant Admin

### Dashboard
- [ ] Criar página /tenant
- [ ] Dashboard do tenant
- [ ] KPIs por franquia
- [ ] Gráficos do tenant

### CRUD Franquias
- [ ] Listar franquias
- [ ] Criar franquia
- [ ] Editar franquia
- [ ] Desativar franquia

### Gerenciador de Módulos
- [ ] Listar módulos do tenant
- [ ] Liberar módulo para franquia
- [ ] Revogar módulo

### Gerenciador de Integrações
- [ ] Listar integrações do tenant
- [ ] Configurar integrações
- [ ] Testar integrações

### Gerenciador de Usuários
- [ ] Listar admins do tenant
- [ ] Adicionar admin
- [ ] Remover admin

---

## 7.9 Fase 8: Painel Franchise Admin

### Dashboard
- [ ] Dashboard da franquia
- [ ] KPIs da franquia

### Gerenciador de Integrações
- [ ] Listar integrações disponíveis
- [ ] Configurar integrações da franquia
- [ ] Testar integrações

### Gerenciador de Usuários
- [ ] Listar usuários da franquia
- [ ] Adicionar usuário
- [ ] Editar permissões
- [ ] Remover usuário

---

## 7.10 Fase 9: Testes e Validação

### Testes de Isolamento
- [ ] Testar isolamento entre tenants
- [ ] Testar isolamento entre franquias
- [ ] Testar que user não vê dados de outro tenant
- [ ] Testar que franchise admin não vê outra franquia
- [ ] Testar que tenant admin vê todas franquias do tenant
- [ ] Testar que platform admin vê tudo

### Testes de Funcionalidade
- [ ] Testar login por tenant
- [ ] Testar troca de tenant (platform admin)
- [ ] Testar todos os módulos
- [ ] Testar integrações
- [ ] Testar branding dinâmico

### Testes de Performance
- [ ] Testar queries com índices
- [ ] Testar com volume de dados
- [ ] Otimizar queries lentas

---

## 7.11 Fase 10: Chatbot IA (CORE)

### Configuração do Chatbot
- [ ] Criar tabelas mt_chatbot_*
- [ ] Implementar integração com OpenAI/Claude
- [ ] Criar interface de configuração por tenant
- [ ] Implementar base de conhecimento (FAQ)

### Funcionalidades do Chatbot
- [ ] Atendimento inicial automático
- [ ] FAQ inteligente com contexto
- [ ] Qualificação de leads via chat
- [ ] Agendamento automático
- [ ] Transferência para humano
- [ ] Histórico contextual

### Analytics do Chatbot
- [ ] Dashboard de métricas
- [ ] Relatório de satisfação
- [ ] Log de conversas
- [ ] Intents mais usados

---

## 7.12 Fase 11: Lead Scoring (CORE)

### Configuração do Scoring
- [ ] Criar tabelas mt_lead_scoring_*
- [ ] Interface de regras por tenant
- [ ] Pesos configuráveis

### Funcionalidades do Scoring
- [ ] Cálculo automático de score
- [ ] Score por perfil
- [ ] Score por comportamento
- [ ] Score por engajamento
- [ ] Decay (deterioração por inatividade)

### Automações do Scoring
- [ ] Alertas de lead quente
- [ ] Mover no funil por score
- [ ] Histórico de mudanças

---

## 7.13 Fase 12: Segurança

### Autenticação Avançada
- [ ] Implementar 2FA (TOTP)
- [ ] Implementar 2FA (SMS)
- [ ] Backup codes
- [ ] Forçar 2FA para admins

### Audit e Logs
- [ ] Criar tabela mt_audit_logs
- [ ] Log de todas as ações
- [ ] Filtros por user/tenant/ação
- [ ] Export de logs

### Sessões e Acesso
- [ ] Gerenciamento de sessões
- [ ] Encerrar sessões remotamente
- [ ] IP Whitelist por tenant
- [ ] Política de senhas

---

## 7.14 Fase 13: Analytics e Relatórios

### Dashboard Consolidado
- [ ] KPIs de todos os tenants
- [ ] Gráficos comparativos
- [ ] Widgets customizáveis

### Relatórios
- [ ] Relatórios agendados
- [ ] Export CSV/Excel/PDF
- [ ] Envio por email
- [ ] Comparativo entre franquias

### Funil de Conversão
- [ ] Analytics por etapa
- [ ] Tempo médio por etapa
- [ ] Taxa de conversão

---

## 7.15 Fase 14: Notificações

### Push Notifications
- [ ] Implementar Web Push
- [ ] Solicitar permissão
- [ ] Enviar notificações

### Central de Notificações
- [ ] Listar notificações
- [ ] Marcar como lida
- [ ] Filtrar por tipo

### Preferências
- [ ] Configurar por tipo
- [ ] Canais (email, push, WhatsApp)
- [ ] Alertas de performance

---

## 7.16 Fase 15: Automações (CORE)

### Engine de Workflows
- [ ] Criar tabelas mt_workflow_*
- [ ] Builder visual de workflows
- [ ] Triggers de eventos

### Ações Automáticas
- [ ] Enviar WhatsApp
- [ ] Enviar Email
- [ ] Mover no funil
- [ ] Criar tarefa
- [ ] Atribuir responsável

### Templates
- [ ] Templates por segmento
- [ ] Importar/exportar workflows

---

## 7.17 Fase 16: Multi-idioma

### Internacionalização
- [ ] Implementar i18n
- [ ] Traduzir para EN
- [ ] Traduzir para ES

### Localização
- [ ] Formatação de data por região
- [ ] Formatação de moeda
- [ ] Timezone automático

---

## 7.18 Fase 17: Mobile e PWA

### Progressive Web App
- [ ] Service Worker
- [ ] Manifest.json
- [ ] Ícones e splash

### Offline
- [ ] Cache de dados críticos
- [ ] Sync quando online

### Responsivo
- [ ] Testar todas as telas
- [ ] Otimizar para touch

---

## 7.19 Fase 18: Personalização Avançada

### Temas
- [ ] 10 temas pré-definidos
- [ ] Dark mode por tenant
- [ ] Custom CSS

### Editor Visual
- [ ] Preview em tempo real
- [ ] Color picker avançado
- [ ] Upload de fontes

---

## 7.20 Fase 19: Email Marketing

### Templates
- [ ] Biblioteca de templates
- [ ] Editor drag-and-drop
- [ ] Variáveis dinâmicas

### Automação
- [ ] Sequências de email
- [ ] Drip campaigns
- [ ] Segmentação

### Analytics
- [ ] Taxa de abertura
- [ ] Taxa de clique
- [ ] Bounces e unsubscribe

---

## 7.21 Fase 20: Billing/SaaS

### Planos
- [ ] CRUD de planos
- [ ] Recursos por plano
- [ ] Limites por plano

### Cobrança
- [ ] Integrar Stripe
- [ ] Integrar PagSeguro
- [ ] Cobrar automaticamente

### Uso e Faturas
- [ ] Medir uso por tenant
- [ ] Gerar faturas
- [ ] Bloquear por limite

---

## 7.22 Fase 21: API e Integrações

### API Pública
- [ ] REST API completa
- [ ] Autenticação por API Key
- [ ] Rate limiting
- [ ] Documentação Swagger

### Webhooks
- [ ] Webhooks outgoing
- [ ] Webhooks incoming
- [ ] Retry automático

### Marketplace
- [ ] Estrutura de plugins
- [ ] Instalar/desinstalar
- [ ] Zapier/Make

---

## 7.23 Fase 22: Onboarding e Suporte

### Wizard
- [ ] Wizard de configuração inicial
- [ ] Checklist de setup
- [ ] Progress tracking

### Central de Ajuda
- [ ] FAQ por tenant
- [ ] Artigos de ajuda
- [ ] Busca

### Suporte
- [ ] Widget de chat
- [ ] Sistema de tickets
- [ ] Vídeos tutoriais

---

## 7.24 Fase 23: IA Avançada

### Sugestões
- [ ] Próxima melhor ação
- [ ] Recomendações de contato

### Análise
- [ ] Sentimento de mensagens
- [ ] Previsão de conversão

### Geração
- [ ] Geração de mensagens
- [ ] Resumo de conversas

---

## 7.25 Fase 24: Documentação e Deploy

### Documentação
- [ ] Documentar arquitetura
- [ ] Documentar APIs
- [ ] Documentar integrações
- [ ] Criar manual do Platform Admin
- [ ] Criar manual do Tenant Admin
- [ ] Criar manual do Franchise Admin
- [ ] Criar manual do Usuário

### Deploy
- [ ] Atualizar variáveis de ambiente
- [ ] Deploy em staging
- [ ] Testes em staging
- [ ] Deploy em produção
- [ ] Monitorar erros
- [ ] Validar funcionamento

### Treinamento
- [ ] Treinar Platform Admins
- [ ] Treinar Tenant Admins
- [ ] Criar vídeos tutoriais

---

# PARTE 8: CRONOGRAMA E INVESTIMENTO

## 8.1 Cronograma Completo por Fase

### Fases Core (Multi-Tenant Base)

| Fase | Descrição | Semanas | Horas |
|------|-----------|---------|-------|
| 0 | Preparação e Backup | 1 | 32h |
| 1 | Estrutura de Banco | 2 | 80h |
| 2 | Cadastro dos 9 Tenants | 1 | 40h |
| 3 | Migração de Dados | 2 | 80h |
| 4 | Frontend Contextos | 2 | 72h |
| 5 | Atualização de Hooks | 3 | 120h |
| 6 | Painel Platform Admin | 2 | 72h |
| 7 | Painel Tenant Admin | 2 | 64h |
| 8 | Painel Franchise Admin | 1 | 40h |
| 9 | Testes e Validação | 1 | 40h |
| **Subtotal Core** | | **17 semanas** | **640h** |

### Fases CORE Adicionais (Chatbot + Lead Scoring + Automações)

| Fase | Descrição | Semanas | Horas |
|------|-----------|---------|-------|
| 10 | **Chatbot IA** (CORE) | 3 | 120h |
| 11 | **Lead Scoring** (CORE) | 2 | 80h |
| 12 | Segurança (2FA, Audit) | 2.5 | 100h |
| 13 | Analytics e Relatórios | 3 | 128h |
| 14 | Notificações | 2 | 92h |
| 15 | **Automações/Workflows** (CORE) | 3.5 | 140h |
| **Subtotal CORE Adicional** | | **16 semanas** | **660h** |

### Fases de Expansão

| Fase | Descrição | Semanas | Horas |
|------|-----------|---------|-------|
| 16 | Multi-idioma (i18n) | 2 | 88h |
| 17 | Mobile e PWA | 3 | 112h |
| 18 | Personalização Avançada | 2.5 | 96h |
| 19 | Email Marketing | 4 | 148h |
| 20 | Billing/SaaS | 4 | 148h |
| 21 | API Pública e Webhooks | 4 | 168h |
| 22 | Onboarding e Suporte | 3 | 116h |
| 23 | IA Avançada | 3.5 | 140h |
| 24 | Documentação e Deploy | 1 | 40h |
| **Subtotal Expansão** | | **27 semanas** | **1056h** |

---

## 8.2 Resumo do Cronograma

| Bloco | Fases | Semanas | Horas | % Total |
|-------|-------|---------|-------|---------|
| **Core Multi-Tenant** | 0-9 | 17 | 640h | 27% |
| **Core Adicional (IA + Automações)** | 10-15 | 16 | 660h | 28% |
| **Expansão** | 16-24 | 27 | 1056h | 45% |
| **TOTAL** | 0-24 | **60 semanas** | **2356h** | 100% |

**Observação**: 60 semanas = ~15 meses (considerando 40h/semana útil)

---

## 8.3 Investimento Total

### Por Bloco (Valor/Hora: R$ 180,00)

| Bloco | Horas | Valor |
|-------|-------|-------|
| Core Multi-Tenant | 640h | R$ 115.200 |
| Core Adicional | 660h | R$ 118.800 |
| Expansão | 1056h | R$ 190.080 |
| **TOTAL** | **2.356h** | **R$ 424.080** |

### Investimento Final

| Descrição | Valor |
|-----------|-------|
| Valor por hora | R$ 180,00 |
| Total de horas | 2.356h |
| **Investimento Total** | **R$ 424.080,00** |

### Formas de Pagamento

| Parcelas | Valor por Parcela |
|----------|-------------------|
| À vista | R$ 424.080,00 |
| 10x | R$ 42.408,00 |
| 12x | R$ 35.340,00 |
| **15x** | **R$ 28.272,00** |

---

## 8.4 Opções de Contratação

### Opção 1: Projeto Completo (Recomendado)
- **Escopo**: Todas as 24 fases
- **Prazo**: 60 semanas (~15 meses)
- **Horas**: 2.356h
- **Investimento**: R$ 424.080,00
- **Parcelamento**: 15x de R$ 28.272,00

### Opção 2: Core + Features Essenciais
- **Escopo**: Fases 0-15 (Multi-Tenant + IA + Automações)
- **Prazo**: 33 semanas (~8 meses)
- **Horas**: 1.300h
- **Investimento**: R$ 234.000,00
- **Parcelamento**: 8x de R$ 29.250,00

### Opção 3: Apenas Core Multi-Tenant
- **Escopo**: Fases 0-9 (Base multi-tenant)
- **Prazo**: 17 semanas (~4 meses)
- **Horas**: 640h
- **Investimento**: R$ 115.200,00
- **Parcelamento**: 4x de R$ 24.000

---

## 8.5 Cronograma Visual (Gantt Simplificado)

```
MÊS        1    2    3    4    5    6    7    8    9   10   11   12   13   14   15
           ├────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤

CORE       ████████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
(F0-9)     │    Banco    │ Frontend │  Painéis  │

IA/AUTO    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████████████████████████░░░░░░░░░░
(F10-15)                                   │ Chatbot │ Score │ Security │ Automation │

EXPANSÃO   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█████████████████
(F16-24)                                                           │ Mobile │ Email │ API │ Deploy │

LEGENDA:   ████ = Em execução   ░░░░ = Aguardando
```

---

## 8.6 Entregáveis por Marco

### Marco 1: Multi-Tenant Funcional (Mês 4)
- ✅ 9 tenants cadastrados
- ✅ Hierarquia 4 níveis funcionando
- ✅ RLS implementado
- ✅ Branding por tenant
- ✅ Todos os módulos migrados

### Marco 2: IA e Automações (Mês 8)
- ✅ Chatbot IA respondendo leads
- ✅ Lead Scoring automático
- ✅ Workflows de automação
- ✅ 2FA e Audit Log
- ✅ Notificações push

### Marco 3: Expansão Completa (Mês 12)
- ✅ Multi-idioma (PT, EN, ES)
- ✅ PWA funcionando
- ✅ Email Marketing completo
- ✅ Billing/SaaS pronto

### Marco 4: Enterprise Ready (Mês 15)
- ✅ API pública documentada
- ✅ Webhooks configurados
- ✅ IA avançada
- ✅ Documentação completa
- ✅ Treinamento realizado

---

# PARTE 9: PADRÕES TÉCNICOS

## 9.1 Telefones (Padrão Internacional)

```typescript
// Formato de armazenamento
telefone: "+5511999999999"

// Formato de exibição
telefone: "+55 (11) 99999-9999"

// Validação (regex)
/^\+[1-9]\d{1,14}$/

// Tipo no banco
VARCHAR(20)
```

## 9.2 UUIDs

```sql
-- Todas as PKs são UUID
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- Foreign Keys
tenant_id UUID NOT NULL REFERENCES mt_tenants(id)
franchise_id UUID REFERENCES mt_franchises(id)
```

## 9.3 Timestamps

```sql
-- Sempre TIMESTAMPTZ
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()

-- Trigger para updated_at
CREATE TRIGGER update_timestamp
    BEFORE UPDATE ON tabela
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

## 9.4 Status

```sql
-- Padrão para campos de status
status VARCHAR(20) DEFAULT 'ativo'

-- Valores comuns
'ativo', 'inativo', 'pendente', 'suspenso', 'cancelado'
```

## 9.5 JSONB

```sql
-- Para dados flexíveis
credentials JSONB NOT NULL
settings JSONB DEFAULT '{}'
recursos_ativos JSONB DEFAULT '{}'
```

---

---

# PARTE 10: RESUMO DAS FEATURES CORE E ADICIONAIS

## 10.1 Features CORE do Projeto

| # | Feature | Descrição | Fase |
|---|---------|-----------|------|
| 1 | **Multi-Tenant Base** | Hierarquia 4 níveis, 9 tenants, RLS | 0-9 |
| 2 | **Chatbot IA** | Atendimento automático 24/7 com IA | 10 |
| 3 | **Lead Scoring** | Pontuação automática de leads | 11 |
| 4 | **Automações/Workflows** | If/then visual entre módulos | 15 |
| 5 | **Segurança (2FA/Audit)** | Autenticação avançada e logs | 12 |
| 6 | **API e Webhooks** | Integração com sistemas externos | 21 |

## 10.2 Features Adicionais Incluídas

| # | Feature | Horas | Fase |
|---|---------|-------|------|
| 1 | Analytics e Relatórios | 128h | 13 |
| 2 | Notificações (Push/Central) | 92h | 14 |
| 3 | Multi-idioma (PT/EN/ES) | 88h | 16 |
| 4 | Mobile e PWA | 112h | 17 |
| 5 | Personalização Avançada | 96h | 18 |
| 6 | Email Marketing | 148h | 19 |
| 7 | Billing/SaaS | 148h | 20 |
| 8 | Onboarding e Suporte | 116h | 22 |
| 9 | IA Avançada (Sentimento/Previsão) | 140h | 23 |

## 10.3 Contagem Total

| Categoria | Quantidade |
|-----------|------------|
| **Fases do Projeto** | 24 |
| **Tabelas do Banco** | 85+ |
| **Horas de Desenvolvimento** | 2.356h |
| **Semanas de Projeto** | 60 (~15 meses) |
| **Módulos do Sistema** | 18 |
| **Tipos de Integração** | 9 |
| **Campos de Branding** | 80+ |
| **Features CORE** | 6 |
| **Features Adicionais** | 9 |
| **Investimento (R$ 180/h)** | R$ 424.080 |

## 10.4 Comparativo de Versões

| Versão | Horas | Semanas | Investimento | Fases |
|--------|-------|---------|--------------|-------|
| v1.0 (proposta inicial) | 504h | 14 | R$ 90.720 | 6 |
| v2.0 (multi-tenant) | 680h | 18 | R$ 122.400 | 10 |
| v3.0 (+ integrações) | 680h | 18 | R$ 122.400 | 10 |
| **v4.0 (completo)** | **2.356h** | **60** | **R$ 424.080** | **24** |

---

# PARTE 11: PRÓXIMOS PASSOS

## 11.1 Para Aprovação

1. [ ] Revisar este documento completo
2. [ ] Validar escopo das 24 fases
3. [ ] Escolher opção de contratação (Completo, Core+IA, ou Apenas Core)
4. [ ] Aprovar cronograma e investimento
5. [ ] Assinar contrato

## 11.2 Após Aprovação

1. [ ] Executar backups completos (já feitos)
2. [ ] Iniciar Fase 0 (Preparação)
3. [ ] Criar ambiente de staging
4. [ ] Definir cadência de reuniões de acompanhamento
5. [ ] Iniciar desenvolvimento

---

*Documento técnico gerado em: 01/02/2026*
*Versão: 4.0 (Completo com IA + Automações)*
*Total de páginas: ~80*
*Autor: Claude Code Assistant*

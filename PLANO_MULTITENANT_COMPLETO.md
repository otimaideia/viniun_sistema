# PLANO COMPLETO: Sistema Multi-Tenant

**Data:** 01/02/2026
**Versão:** 2.0
**Status:** Aprovado para desenvolvimento

---

## 1. VISÃO GERAL

### Objetivo
Transformar o sistema YESlaser Painel em uma **plataforma multi-tenant completa** para gerenciar múltiplas empresas e suas franquias, com:

- Isolamento total de dados por empresa
- Personalização visual completa (branding)
- Sistema de integrações por tenant/franquia
- Hierarquia de permissões em 4 níveis
- Preparado para SaaS futuro

### Empresas a Cadastrar (9 Tenants)

| # | Slug | Nome | Segmento |
|---|------|------|----------|
| 1 | `yeslaser` | YESlaser | Estética/Depilação a Laser |
| 2 | `popdents` | PopDents | Odontologia |
| 3 | `novalaser` | NovaLaser | Estética/Depilação |
| 4 | `intimacenter` | IntimaCenter | Saúde Íntima |
| 5 | `oralrecife` | OralRecife | Odontologia |
| 6 | `m1company` | M1 Company | Holding/Gestão |
| 7 | `amorimplantes` | Amor Implantes | Implantes Dentários |
| 8 | `confiacredito` | Confia Crédito | Financeira/Crédito |
| 9 | `franqueadora` | Franqueadora | Gestão de Franquias |

---

## 2. ARQUITETURA HIERÁRQUICA

```
┌─────────────────────────────────────────────────────────────────────┐
│                    🔑 PLATFORM ADMIN (Nível 1)                      │
│                                                                      │
│  • Gerencia TODOS os tenants                                        │
│  • Libera módulos para tenants                                      │
│  • Configura integrações do sistema (WhatsApp tokens, SMTP)         │
│  • Acesso total a todas as empresas e franquias                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│ 🏢 TENANT (Nível 2)│   │ 🏢 TENANT         │   │ 🏢 TENANT         │
│    YESlaser       │   │    PopDents       │   │    NovaLaser      │
│                   │   │                   │   │                   │
│ • Cadastro completo│   │ • Cadastro completo│   │ • Cadastro completo│
│ • Branding próprio│   │ • Branding próprio│   │ • Branding próprio│
│ • Módulos ativos  │   │ • Módulos ativos  │   │ • Módulos ativos  │
│ • Integrações     │   │ • Integrações     │   │ • Integrações     │
│ • Admins do tenant│   │ • Admins do tenant│   │ • Admins do tenant│
└─────────┬─────────┘   └─────────┬─────────┘   └───────────────────┘
          │                       │
    ┌─────┴─────┐           ┌─────┴─────┐
    ▼           ▼           ▼           ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│🏪 FRANQ│ │🏪 FRANQ│ │🏪 FRANQ│ │🏪 FRANQ│
│(Nível 3)│ │        │ │        │ │        │
│Altamira│ │  MCC   │ │ Recife │ │B. Viagem│
│        │ │        │ │        │ │        │
│•Módulos│ │•Módulos│ │•Módulos│ │•Módulos│
│•Integr.│ │•Integr.│ │•Integr.│ │•Integr.│
│•Usuários│ │•Usuários│ │•Usuários│ │•Usuários│
└────┬───┘ └────┬───┘ └────────┘ └────────┘
     │          │
     ▼          ▼
┌─────────┐ ┌─────────┐
│👤 USER  │ │👤 USER  │
│(Nível 4)│ │         │
│ Pedro   │ │  Ana    │
│ Julia   │ │ Marcos  │
└─────────┘ └─────────┘
```

### Níveis de Acesso

| Nível | Role | Escopo | Permissões |
|-------|------|--------|------------|
| 1 | `platform_admin` | Sistema | Tudo - gerencia todos os tenants |
| 2 | `tenant_admin` | Tenant | Gerencia empresa, franquias, módulos, integrações |
| 3 | `franchise_admin` | Franquia | Gerencia franquia, usuários, opera módulos |
| 4 | `user` | Franquia | Opera módulos conforme permissões |

---

## 3. ESTRUTURA DE TABELAS

### Prefixo: `mt_` (Multi-Tenant)

### 3.1 Tabelas de Administração

| Tabela | Descrição |
|--------|-----------|
| `mt_platform_settings` | Configurações globais do sistema |
| `mt_platform_integrations` | Integrações do sistema (WhatsApp tokens, SMTP) |

### 3.2 Tabelas de Tenant (Empresa)

| Tabela | Descrição |
|--------|-----------|
| `mt_tenants` | Cadastro completo da empresa |
| `mt_tenant_branding` | Personalização visual (80+ campos) |
| `mt_tenant_modules` | Módulos liberados para o tenant |
| `mt_tenant_integrations` | Integrações da empresa |
| `mt_tenant_settings` | Configurações específicas |

### 3.3 Tabelas de Franquia

| Tabela | Descrição |
|--------|-----------|
| `mt_franchises` | Cadastro das franquias |
| `mt_franchise_modules` | Módulos liberados para franquia |
| `mt_franchise_integrations` | Integrações da franquia |
| `mt_franchise_settings` | Configurações da franquia |

### 3.4 Tabelas de Usuário

| Tabela | Descrição |
|--------|-----------|
| `mt_users` | Todos os usuários do sistema |
| `mt_user_roles` | Roles atribuídas ao usuário |
| `mt_user_permissions` | Permissões por módulo |

### 3.5 Tabelas de Módulos

| Tabela | Descrição |
|--------|-----------|
| `mt_modules` | Catálogo de módulos disponíveis |
| `mt_module_features` | Features de cada módulo |

### 3.6 Tabelas de Integrações

| Tabela | Descrição |
|--------|-----------|
| `mt_integration_types` | Tipos de integração (Meta, Google, etc.) |
| `mt_integration_logs` | Logs de uso das integrações |

### 3.7 Tabelas de Negócio

| Tabela | Descrição |
|--------|-----------|
| `mt_leads` | Leads (com tenant_id + franchise_id) |
| `mt_lead_activities` | Histórico de atividades |
| `mt_funnels` | Funis de vendas |
| `mt_funnel_stages` | Etapas do funil |
| `mt_funnel_leads` | Leads no funil |
| `mt_appointments` | Agendamentos |
| `mt_forms` | Formulários |
| `mt_form_fields` | Campos dos formulários |
| `mt_form_submissions` | Submissões |
| `mt_whatsapp_sessions` | Sessões WhatsApp |
| `mt_whatsapp_conversations` | Conversas |
| `mt_whatsapp_messages` | Mensagens |
| `mt_campaigns` | Campanhas de marketing |
| `mt_services` | Serviços/Procedimentos |
| `mt_goals` | Metas |
| `mt_influencers` | Influenciadoras |
| `mt_partnerships` | Parcerias |
| `mt_job_positions` | Vagas |
| `mt_candidates` | Candidatos |
| `mt_interviews` | Entrevistas |

---

## 4. DETALHAMENTO DAS TABELAS PRINCIPAIS

### 4.1 `mt_tenants` (Cadastro Completo da Empresa)

```sql
CREATE TABLE mt_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- IDENTIFICAÇÃO
    slug VARCHAR(50) UNIQUE NOT NULL,
    nome_fantasia VARCHAR(255) NOT NULL,
    razao_social VARCHAR(255) NOT NULL,

    -- DOCUMENTOS
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    inscricao_estadual VARCHAR(20),
    inscricao_municipal VARCHAR(20),

    -- ENDEREÇO (Matriz)
    cep VARCHAR(10),
    endereco VARCHAR(255),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    pais VARCHAR(50) DEFAULT 'Brasil',

    -- CONTATO (Padrão Internacional)
    telefone VARCHAR(20),                     -- +5511999999999
    telefone_secundario VARCHAR(20),          -- +5511988888888
    whatsapp VARCHAR(20),                     -- +5511999999999
    email VARCHAR(255) NOT NULL,
    email_financeiro VARCHAR(255),
    website VARCHAR(255),

    -- RESPONSÁVEL LEGAL
    responsavel_nome VARCHAR(255),
    responsavel_cpf VARCHAR(14),
    responsavel_cargo VARCHAR(100),
    responsavel_telefone VARCHAR(20),         -- +5511999999999
    responsavel_email VARCHAR(255),

    -- CONFIGURAÇÕES
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    idioma VARCHAR(10) DEFAULT 'pt-BR',
    moeda VARCHAR(3) DEFAULT 'BRL',

    -- PLANO E LIMITES
    plano VARCHAR(50) DEFAULT 'enterprise',
    max_franquias INTEGER DEFAULT 100,
    max_usuarios INTEGER DEFAULT 500,
    max_leads_mes INTEGER DEFAULT 10000,

    -- CONTROLE
    status VARCHAR(20) DEFAULT 'ativo',
    data_ativacao DATE,
    data_expiracao DATE,

    -- TIMESTAMPS
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);
```

### 4.2 `mt_tenant_branding` (Personalização Visual Completa)

```sql
CREATE TABLE mt_tenant_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- =============================================
    -- LOGOS E IMAGENS
    -- =============================================
    logo_url TEXT,
    logo_branco_url TEXT,
    logo_escuro_url TEXT,
    logo_icone_url TEXT,
    favicon_url TEXT,
    favicon_svg_url TEXT,
    apple_touch_icon_url TEXT,
    og_image_url TEXT,
    background_image_url TEXT,
    background_login_url TEXT,

    -- =============================================
    -- CORES PRINCIPAIS
    -- =============================================
    cor_primaria VARCHAR(7) DEFAULT '#3B82F6',
    cor_primaria_hover VARCHAR(7) DEFAULT '#2563EB',
    cor_primaria_light VARCHAR(7) DEFAULT '#DBEAFE',
    cor_primaria_dark VARCHAR(7) DEFAULT '#1E40AF',

    cor_secundaria VARCHAR(7) DEFAULT '#6366F1',
    cor_secundaria_hover VARCHAR(7) DEFAULT '#4F46E5',
    cor_secundaria_light VARCHAR(7) DEFAULT '#E0E7FF',
    cor_secundaria_dark VARCHAR(7) DEFAULT '#3730A3',

    cor_accent VARCHAR(7) DEFAULT '#F59E0B',
    cor_accent_hover VARCHAR(7) DEFAULT '#D97706',
    cor_accent_light VARCHAR(7) DEFAULT '#FEF3C7',

    -- =============================================
    -- CORES DE STATUS
    -- =============================================
    cor_sucesso VARCHAR(7) DEFAULT '#10B981',
    cor_sucesso_light VARCHAR(7) DEFAULT '#D1FAE5',
    cor_erro VARCHAR(7) DEFAULT '#EF4444',
    cor_erro_light VARCHAR(7) DEFAULT '#FEE2E2',
    cor_aviso VARCHAR(7) DEFAULT '#F59E0B',
    cor_aviso_light VARCHAR(7) DEFAULT '#FEF3C7',
    cor_info VARCHAR(7) DEFAULT '#3B82F6',
    cor_info_light VARCHAR(7) DEFAULT '#DBEAFE',

    -- =============================================
    -- CORES DE FUNDO
    -- =============================================
    cor_fundo VARCHAR(7) DEFAULT '#FFFFFF',
    cor_fundo_secundario VARCHAR(7) DEFAULT '#F9FAFB',
    cor_fundo_terciario VARCHAR(7) DEFAULT '#F3F4F6',
    cor_fundo_sidebar VARCHAR(7) DEFAULT '#1F2937',
    cor_fundo_header VARCHAR(7) DEFAULT '#FFFFFF',
    cor_fundo_card VARCHAR(7) DEFAULT '#FFFFFF',
    cor_fundo_modal VARCHAR(7) DEFAULT '#FFFFFF',
    cor_fundo_input VARCHAR(7) DEFAULT '#FFFFFF',
    cor_fundo_hover VARCHAR(7) DEFAULT '#F3F4F6',

    -- =============================================
    -- CORES DE TEXTO
    -- =============================================
    cor_texto_primario VARCHAR(7) DEFAULT '#111827',
    cor_texto_secundario VARCHAR(7) DEFAULT '#6B7280',
    cor_texto_terciario VARCHAR(7) DEFAULT '#9CA3AF',
    cor_texto_inverso VARCHAR(7) DEFAULT '#FFFFFF',
    cor_texto_sidebar VARCHAR(7) DEFAULT '#FFFFFF',
    cor_texto_link VARCHAR(7) DEFAULT '#3B82F6',
    cor_texto_link_hover VARCHAR(7) DEFAULT '#2563EB',

    -- =============================================
    -- BORDAS E SOMBRAS
    -- =============================================
    cor_borda VARCHAR(7) DEFAULT '#E5E7EB',
    cor_borda_focus VARCHAR(7) DEFAULT '#3B82F6',
    cor_borda_erro VARCHAR(7) DEFAULT '#EF4444',
    cor_borda_input VARCHAR(7) DEFAULT '#D1D5DB',

    borda_radius_sm VARCHAR(10) DEFAULT '4px',
    borda_radius_md VARCHAR(10) DEFAULT '8px',
    borda_radius_lg VARCHAR(10) DEFAULT '12px',
    borda_radius_xl VARCHAR(10) DEFAULT '16px',
    borda_radius_full VARCHAR(10) DEFAULT '9999px',

    sombra_sm TEXT DEFAULT '0 1px 2px rgba(0,0,0,0.05)',
    sombra_md TEXT DEFAULT '0 4px 6px rgba(0,0,0,0.1)',
    sombra_lg TEXT DEFAULT '0 10px 15px rgba(0,0,0,0.1)',
    sombra_xl TEXT DEFAULT '0 20px 25px rgba(0,0,0,0.15)',

    -- =============================================
    -- TIPOGRAFIA
    -- =============================================
    fonte_familia VARCHAR(100) DEFAULT 'Inter, system-ui, sans-serif',
    fonte_familia_titulo VARCHAR(100) DEFAULT 'Inter, system-ui, sans-serif',
    fonte_familia_mono VARCHAR(100) DEFAULT 'JetBrains Mono, monospace',

    fonte_tamanho_xs VARCHAR(10) DEFAULT '12px',
    fonte_tamanho_sm VARCHAR(10) DEFAULT '14px',
    fonte_tamanho_base VARCHAR(10) DEFAULT '16px',
    fonte_tamanho_lg VARCHAR(10) DEFAULT '18px',
    fonte_tamanho_xl VARCHAR(10) DEFAULT '20px',
    fonte_tamanho_2xl VARCHAR(10) DEFAULT '24px',
    fonte_tamanho_3xl VARCHAR(10) DEFAULT '30px',
    fonte_tamanho_4xl VARCHAR(10) DEFAULT '36px',

    fonte_peso_light INTEGER DEFAULT 300,
    fonte_peso_normal INTEGER DEFAULT 400,
    fonte_peso_medium INTEGER DEFAULT 500,
    fonte_peso_semibold INTEGER DEFAULT 600,
    fonte_peso_bold INTEGER DEFAULT 700,

    linha_altura_tight VARCHAR(10) DEFAULT '1.25',
    linha_altura_normal VARCHAR(10) DEFAULT '1.5',
    linha_altura_relaxed VARCHAR(10) DEFAULT '1.75',

    -- =============================================
    -- ESPAÇAMENTO
    -- =============================================
    espacamento_xs VARCHAR(10) DEFAULT '4px',
    espacamento_sm VARCHAR(10) DEFAULT '8px',
    espacamento_md VARCHAR(10) DEFAULT '16px',
    espacamento_lg VARCHAR(10) DEFAULT '24px',
    espacamento_xl VARCHAR(10) DEFAULT '32px',
    espacamento_2xl VARCHAR(10) DEFAULT '48px',

    -- =============================================
    -- LAYOUT
    -- =============================================
    largura_max_container VARCHAR(10) DEFAULT '1280px',
    largura_sidebar VARCHAR(10) DEFAULT '280px',
    largura_sidebar_collapsed VARCHAR(10) DEFAULT '80px',
    altura_header VARCHAR(10) DEFAULT '64px',

    layout_sidebar_posicao VARCHAR(20) DEFAULT 'left',
    layout_sidebar_tipo VARCHAR(20) DEFAULT 'fixed',
    layout_header_tipo VARCHAR(20) DEFAULT 'fixed',
    layout_densidade VARCHAR(20) DEFAULT 'normal',

    -- =============================================
    -- COMPONENTES
    -- =============================================
    botao_padding VARCHAR(20) DEFAULT '10px 20px',
    botao_fonte_peso INTEGER DEFAULT 500,
    botao_texto_transform VARCHAR(20) DEFAULT 'none',

    card_padding VARCHAR(20) DEFAULT '24px',
    card_borda_radius VARCHAR(10) DEFAULT '12px',

    input_padding VARCHAR(20) DEFAULT '10px 14px',
    input_borda_radius VARCHAR(10) DEFAULT '8px',
    input_altura VARCHAR(10) DEFAULT '42px',

    tabela_header_bg VARCHAR(7) DEFAULT '#F9FAFB',
    tabela_linha_hover VARCHAR(7) DEFAULT '#F3F4F6',
    tabela_borda VARCHAR(7) DEFAULT '#E5E7EB',

    -- =============================================
    -- MODO ESCURO
    -- =============================================
    dark_mode_habilitado BOOLEAN DEFAULT true,
    dark_cor_fundo VARCHAR(7) DEFAULT '#111827',
    dark_cor_fundo_secundario VARCHAR(7) DEFAULT '#1F2937',
    dark_cor_fundo_card VARCHAR(7) DEFAULT '#1F2937',
    dark_cor_texto_primario VARCHAR(7) DEFAULT '#F9FAFB',
    dark_cor_texto_secundario VARCHAR(7) DEFAULT '#9CA3AF',
    dark_cor_borda VARCHAR(7) DEFAULT '#374151',

    -- =============================================
    -- ANIMAÇÕES
    -- =============================================
    animacao_duracao_rapida VARCHAR(10) DEFAULT '150ms',
    animacao_duracao_normal VARCHAR(10) DEFAULT '300ms',
    animacao_duracao_lenta VARCHAR(10) DEFAULT '500ms',
    animacao_timing VARCHAR(50) DEFAULT 'cubic-bezier(0.4, 0, 0.2, 1)',
    animacoes_habilitadas BOOLEAN DEFAULT true,

    -- =============================================
    -- TEXTOS CUSTOMIZADOS
    -- =============================================
    texto_login_titulo VARCHAR(100),
    texto_login_subtitulo VARCHAR(255),
    texto_boas_vindas VARCHAR(255),
    texto_footer VARCHAR(255),
    texto_copyright VARCHAR(255),

    -- =============================================
    -- CSS CUSTOMIZADO
    -- =============================================
    css_customizado TEXT,

    -- TIMESTAMPS
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tenant_id)
);
```

### 4.3 `mt_franchises` (Franquias)

```sql
CREATE TABLE mt_franchises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- IDENTIFICAÇÃO
    codigo VARCHAR(20),
    nome VARCHAR(255) NOT NULL,
    nome_curto VARCHAR(50),

    -- TIPO
    tipo VARCHAR(50) DEFAULT 'franquia',

    -- DOCUMENTOS
    cnpj VARCHAR(18),
    inscricao_estadual VARCHAR(20),

    -- ENDEREÇO
    cep VARCHAR(10),
    endereco VARCHAR(255),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    pais VARCHAR(50) DEFAULT 'Brasil',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- CONTATO (Padrão Internacional)
    telefone VARCHAR(20),                     -- +5511999999999
    telefone_secundario VARCHAR(20),          -- +5511988888888
    whatsapp VARCHAR(20),                     -- +5511999999999
    email VARCHAR(255),

    -- RESPONSÁVEL
    responsavel_nome VARCHAR(255),
    responsavel_telefone VARCHAR(20),         -- +5511999999999
    responsavel_email VARCHAR(255),

    -- OPERAÇÃO
    horario_funcionamento JSONB,
    capacidade_atendimento INTEGER,

    -- INTEGRAÇÃO
    api_token VARCHAR(255),
    external_id VARCHAR(100),

    -- CONTROLE
    status VARCHAR(20) DEFAULT 'ativo',
    data_inauguracao DATE,

    -- TIMESTAMPS
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.4 `mt_users` (Usuários)

```sql
CREATE TABLE mt_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),

    -- VÍNCULO
    tenant_id UUID REFERENCES mt_tenants(id),
    franchise_id UUID REFERENCES mt_franchises(id),

    -- NÍVEL DE ACESSO
    access_level VARCHAR(20) NOT NULL,

    -- DADOS PESSOAIS
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),                     -- +5511999999999
    telefone_secundario VARCHAR(20),          -- +5511988888888
    cpf VARCHAR(14),
    avatar_url TEXT,

    -- CARGO
    cargo VARCHAR(100),
    departamento VARCHAR(100),

    -- CONTROLE
    status VARCHAR(20) DEFAULT 'pendente',
    approved_at TIMESTAMPTZ,
    approved_by UUID,

    -- TIMESTAMPS
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,

    -- VALIDAÇÃO
    CONSTRAINT user_access_check CHECK (
        (access_level = 'platform_admin' AND tenant_id IS NULL AND franchise_id IS NULL) OR
        (access_level = 'tenant_admin' AND tenant_id IS NOT NULL AND franchise_id IS NULL) OR
        (access_level IN ('franchise_admin', 'user') AND franchise_id IS NOT NULL)
    )
);
```

---

## 5. SISTEMA DE INTEGRAÇÕES

### 5.1 Tipos de Integração Disponíveis

| Código | Nome | Categoria | Recursos |
|--------|------|-----------|----------|
| `meta` | Meta (Facebook/Instagram) | Social | Postar, Mensagens, Campanhas, Investimentos, Relatórios |
| `google_ads` | Google Ads | Ads | Campanhas, Investimentos, Relatórios |
| `youtube` | YouTube | Social | Postar, Mensagens, Relatórios |
| `smtp` | Email (SMTP) | Comunicação | Mensagens, Campanhas, Relatórios |
| `google_business` | Google Meu Negócio | Maps | Postar, Mensagens, Relatórios |
| `google_maps` | Google Maps | Maps | Localização |
| `tiktok` | TikTok | Social | Postar, Mensagens, Relatórios |
| `tiktok_ads` | TikTok Ads | Ads | Campanhas, Investimentos, Relatórios |
| `whatsapp` | WhatsApp Business | Comunicação | Mensagens, Campanhas, Relatórios |

### 5.2 Hierarquia de Integrações

```
PLATFORM (Sistema)
│
├── WhatsApp Sistema
│   └── Usado para: tokens de login, comunicados do sistema
│
├── SMTP Sistema
│   └── Usado para: emails transacionais
│
TENANT (Empresa) - OPCIONAL
│
├── Integrações corporativas da marca
│   ├── WhatsApp corporativo
│   ├── Meta da marca principal
│   └── etc.
│
FRANQUIA (Unidade) - OPCIONAL
│
└── Cada franquia pode ter SUAS PRÓPRIAS credenciais:
    ├── WhatsApp: +55 11 99999-XXXX
    ├── Meta: @marca.franquia
    ├── Google Meu Negócio: ficha própria
    ├── TikTok: @marca.franquia
    └── etc.
```

### 5.3 `mt_integration_types` (Tipos de Integração)

```sql
CREATE TABLE mt_integration_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    codigo VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    icone VARCHAR(50),
    categoria VARCHAR(50),

    -- Recursos disponíveis
    recursos JSONB DEFAULT '{
        "postar": false,
        "mensagens": false,
        "campanhas": false,
        "investimentos": false,
        "relatorios": false,
        "webhooks": false
    }',

    -- Campos de configuração
    campos_config JSONB,

    -- Documentação
    docs_url TEXT,
    setup_instructions TEXT,

    -- Controle
    is_active BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.4 `mt_platform_integrations` (Integrações do Sistema)

```sql
CREATE TABLE mt_platform_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_type_id UUID NOT NULL REFERENCES mt_integration_types(id),

    nome VARCHAR(100) NOT NULL,
    descricao TEXT,

    -- Credenciais
    credentials JSONB NOT NULL,

    -- Configurações
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    uso VARCHAR(50),

    -- Limites
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_day INTEGER DEFAULT 10000,

    -- Status
    last_sync_at TIMESTAMPTZ,
    last_error TEXT,
    status VARCHAR(20) DEFAULT 'pending',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);
```

### 5.5 `mt_tenant_integrations` (Integrações do Tenant)

```sql
CREATE TABLE mt_tenant_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    integration_type_id UUID NOT NULL REFERENCES mt_integration_types(id),

    nome VARCHAR(100) NOT NULL,
    descricao TEXT,

    -- Credenciais
    credentials JSONB NOT NULL,

    -- Recursos habilitados
    recursos_ativos JSONB DEFAULT '{
        "postar": true,
        "mensagens": true,
        "campanhas": true,
        "investimentos": true,
        "relatorios": true
    }',

    -- Status
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    last_error TEXT,
    status VARCHAR(20) DEFAULT 'pending',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,

    UNIQUE(tenant_id, integration_type_id, nome)
);
```

### 5.6 `mt_franchise_integrations` (Integrações da Franquia)

```sql
CREATE TABLE mt_franchise_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    franchise_id UUID NOT NULL REFERENCES mt_franchises(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
    integration_type_id UUID NOT NULL REFERENCES mt_integration_types(id),

    nome VARCHAR(100) NOT NULL,
    descricao TEXT,

    -- Credenciais próprias da franquia
    credentials JSONB NOT NULL,

    -- Recursos habilitados
    recursos_ativos JSONB DEFAULT '{
        "postar": true,
        "mensagens": true,
        "campanhas": true,
        "investimentos": true,
        "relatorios": true
    }',

    -- Status
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    last_error TEXT,
    status VARCHAR(20) DEFAULT 'pending',

    -- Métricas
    total_requests INTEGER DEFAULT 0,
    total_errors INTEGER DEFAULT 0,
    last_request_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,

    UNIQUE(franchise_id, integration_type_id)
);
```

---

## 6. SISTEMA DE MÓDULOS

### 6.1 Catálogo de Módulos

| Código | Nome | Categoria | Core |
|--------|------|-----------|------|
| `leads` | Gestão de Leads | Vendas | Sim |
| `funil` | Funil de Vendas | Vendas | Não |
| `agendamentos` | Agendamentos | Operação | Sim |
| `whatsapp` | WhatsApp Business | Comunicação | Não |
| `formularios` | Formulários | Marketing | Não |
| `influenciadoras` | Influenciadoras | Marketing | Não |
| `parcerias` | Parcerias B2B | Marketing | Não |
| `campanhas` | Campanhas | Marketing | Não |
| `recrutamento` | Recrutamento | RH | Não |
| `metas` | Metas | Gestão | Não |
| `franqueados` | Franqueados | Gestão | Sim |
| `servicos` | Serviços | Gestão | Não |
| `usuarios` | Usuários | Sistema | Sim |
| `relatorios` | Relatórios | Sistema | Sim |
| `integracoes` | Integrações | Sistema | Não |

### 6.2 Fluxo de Liberação

```
Platform Admin
    │
    ▼ Libera módulos para Tenant
    │
Tenant Admin
    │
    ▼ Libera módulos para Franquias
    │
Franchise Admin
    │
    ▼ Libera permissões para Usuários
    │
User
    └── Opera módulos conforme permissões
```

### 6.3 `mt_modules` (Catálogo de Módulos)

```sql
CREATE TABLE mt_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    codigo VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    icone VARCHAR(50),
    categoria VARCHAR(50),

    -- Controle
    is_core BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,

    -- Dependências
    depends_on TEXT[],

    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.4 `mt_tenant_modules`

```sql
CREATE TABLE mt_tenant_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES mt_modules(id),

    is_active BOOLEAN DEFAULT true,
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,

    limits JSONB DEFAULT '{}',

    activated_by UUID,

    UNIQUE(tenant_id, module_id)
);
```

### 6.5 `mt_franchise_modules`

```sql
CREATE TABLE mt_franchise_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    franchise_id UUID NOT NULL REFERENCES mt_franchises(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES mt_modules(id),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id),

    is_active BOOLEAN DEFAULT true,
    activated_at TIMESTAMPTZ DEFAULT NOW(),

    activated_by UUID,

    UNIQUE(franchise_id, module_id)
);
```

### 6.6 `mt_user_permissions`

```sql
CREATE TABLE mt_user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES mt_users(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES mt_modules(id),

    -- Permissões CRUD
    can_view BOOLEAN DEFAULT true,
    can_create BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,

    -- Permissões especiais
    can_export BOOLEAN DEFAULT false,
    can_manage BOOLEAN DEFAULT false,

    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by UUID,

    UNIQUE(user_id, module_id)
);
```

---

## 7. TABELAS DE NEGÓCIO

### 7.1 `mt_leads`

```sql
CREATE TABLE mt_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- HIERARQUIA
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
    franchise_id UUID REFERENCES mt_franchises(id),

    -- DADOS PESSOAIS
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefone VARCHAR(20),                     -- +5511999999999
    telefone_secundario VARCHAR(20),          -- +5511988888888
    whatsapp VARCHAR(20),                     -- +5511999999999
    cpf VARCHAR(14),
    data_nascimento DATE,
    genero VARCHAR(20),

    -- ENDEREÇO
    cep VARCHAR(10),
    endereco VARCHAR(255),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    pais VARCHAR(50) DEFAULT 'Brasil',

    -- TRACKING
    origem VARCHAR(50),
    midia VARCHAR(50),
    campanha VARCHAR(100),

    -- UTM
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    utm_content VARCHAR(100),
    utm_term VARCHAR(100),

    -- CLICK IDS
    gclid VARCHAR(100),
    fbclid VARCHAR(100),
    ttclid VARCHAR(100),
    msclkid VARCHAR(100),

    -- INDICAÇÃO
    indicado_por UUID REFERENCES mt_leads(id),
    codigo_indicacao VARCHAR(20),

    -- STATUS
    status VARCHAR(50) DEFAULT 'novo',
    temperatura VARCHAR(20),

    -- RESPONSÁVEL
    responsavel_id UUID REFERENCES mt_users(id),

    -- TIMESTAMPS
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    converted_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_mt_leads_tenant ON mt_leads(tenant_id);
CREATE INDEX idx_mt_leads_franchise ON mt_leads(franchise_id);
CREATE INDEX idx_mt_leads_status ON mt_leads(tenant_id, status);
CREATE INDEX idx_mt_leads_created ON mt_leads(tenant_id, created_at DESC);
CREATE INDEX idx_mt_leads_telefone ON mt_leads(telefone);
```

### 7.2 Demais Tabelas de Negócio

Todas seguem o mesmo padrão:
- `tenant_id UUID NOT NULL` - Referência ao tenant
- `franchise_id UUID` - Referência à franquia (quando aplicável)
- Campos de telefone no padrão internacional
- Timestamps (created_at, updated_at)
- Índices por tenant e franchise

---

## 8. ROW LEVEL SECURITY (RLS)

### 8.1 Função para Tenant Atual

```sql
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.current_tenant_id', true)::uuid,
        (SELECT tenant_id FROM mt_users WHERE id = auth.uid() LIMIT 1)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 8.2 Função para Verificar Platform Admin

```sql
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM mt_users
        WHERE id = auth.uid()
        AND access_level = 'platform_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 8.3 Policy Padrão

```sql
-- Para todas as tabelas com tenant_id
CREATE POLICY "tenant_isolation" ON mt_leads
    FOR ALL
    USING (
        tenant_id = current_tenant_id()
        OR is_platform_admin()
    );
```

---

## 9. MAPEAMENTO DE MIGRAÇÃO

### Tabelas Antigas → Novas

| Tabela Antiga | Tabela Nova |
|---------------|-------------|
| `yeslaser_profiles` | `mt_users` |
| `yeslaser_franqueados` | `mt_franchises` |
| `sistema_leads_yeslaser` | `mt_leads` |
| `yeslaser_funis` | `mt_funnels` |
| `yeslaser_funil_etapas` | `mt_funnel_stages` |
| `yeslaser_funil_leads` | `mt_funnel_leads` |
| `yeslaser_agendamentos` | `mt_appointments` |
| `yeslaser_formularios` | `mt_forms` |
| `yeslaser_formulario_campos` | `mt_form_fields` |
| `yeslaser_formulario_submissoes` | `mt_form_submissions` |
| `yeslaser_whatsapp_sessoes` | `mt_whatsapp_sessions` |
| `yeslaser_whatsapp_conversas` | `mt_whatsapp_conversations` |
| `yeslaser_whatsapp_mensagens` | `mt_whatsapp_messages` |
| `yeslaser_influenciadoras` | `mt_influencers` |
| `yeslaser_parcerias` | `mt_partnerships` |
| `yeslaser_campanhas` | `mt_campaigns` |
| `yeslaser_servicos` | `mt_services` |
| `yeslaser_metas` | `mt_goals` |
| `yeslaser_vagas` | `mt_job_positions` |
| `yeslaser_candidatos` | `mt_candidates` |
| `yeslaser_entrevistas` | `mt_interviews` |
| `yeslaser_modulos` | `mt_modules` |
| `yeslaser_waha_config` | `mt_platform_integrations` |

---

## 10. ROADMAP DE IMPLEMENTAÇÃO

### Fase 1: Estrutura Base (2 semanas - 64h)

| Tarefa | Horas |
|--------|-------|
| Criar tabela `mt_tenants` | 4h |
| Criar tabela `mt_tenant_branding` | 8h |
| Criar tabela `mt_franchises` | 4h |
| Criar tabela `mt_users` | 4h |
| Criar tabelas de módulos | 8h |
| Criar tabelas de integrações | 16h |
| Inserir dados iniciais | 8h |
| Criar índices e RLS | 12h |

### Fase 2: Frontend Base (2 semanas - 72h)

| Tarefa | Horas |
|--------|-------|
| Criar TenantContext | 12h |
| Criar TenantSelector | 8h |
| Criar hook useTenant | 8h |
| Criar hook useBranding | 12h |
| Aplicar branding dinâmico | 16h |
| Atualizar AuthContext | 8h |
| Testar troca de tenant | 8h |

### Fase 3: Painel Admin Platform (2 semanas - 72h)

| Tarefa | Horas |
|--------|-------|
| Dashboard consolidado | 16h |
| CRUD de Tenants | 16h |
| Editor de Branding | 20h |
| Gerenciador de Módulos | 12h |
| Gerenciador de Integrações | 8h |

### Fase 4: Painel Admin Tenant (2 semanas - 64h)

| Tarefa | Horas |
|--------|-------|
| Dashboard do Tenant | 12h |
| CRUD de Franquias | 16h |
| Gerenciador de Módulos | 12h |
| Gerenciador de Integrações | 16h |
| Gerenciador de Usuários | 8h |

### Fase 5: Migração de Dados (2 semanas - 80h)

| Tarefa | Horas |
|--------|-------|
| Criar scripts de migração | 24h |
| Migrar dados YESlaser | 16h |
| Migrar dados PopDents | 16h |
| Validar integridade | 16h |
| Testes de regressão | 8h |

### Fase 6: Atualização de Hooks (3 semanas - 120h)

| Tarefa | Horas |
|--------|-------|
| Atualizar hooks de leads | 16h |
| Atualizar hooks de funil | 16h |
| Atualizar hooks de whatsapp | 20h |
| Atualizar hooks de forms | 16h |
| Atualizar hooks de campanhas | 12h |
| Atualizar demais hooks | 24h |
| Testes de integração | 16h |

### Fase 7: Cadastro dos 9 Tenants (1 semana - 40h)

| Tarefa | Horas |
|--------|-------|
| Configurar YESlaser | 4h |
| Configurar PopDents | 4h |
| Configurar NovaLaser | 4h |
| Configurar IntimaCenter | 4h |
| Configurar OralRecife | 4h |
| Configurar M1 Company | 4h |
| Configurar Amor Implantes | 4h |
| Configurar Confia Crédito | 4h |
| Configurar Franqueadora | 4h |
| Validação final | 4h |

### Fase 8: Refinamentos (1 semana - 40h)

| Tarefa | Horas |
|--------|-------|
| Documentação técnica | 16h |
| Documentação de usuário | 12h |
| Treinamento | 8h |
| Ajustes finais | 4h |

---

## 11. RESUMO

### Totais

| Item | Quantidade |
|------|------------|
| **Duração Total** | 15 semanas |
| **Horas Total** | 552 horas |
| **Tabelas Novas** | ~35 tabelas mt_* |
| **Tenants** | 9 empresas |
| **Integrações** | 9 tipos |
| **Campos de Branding** | 80+ |

### Valor Estimado

| Valor/Hora | Total |
|------------|-------|
| R$ 120 | R$ 66.240 |
| R$ 150 | R$ 82.800 |
| R$ 180 | R$ 99.360 |

---

## 12. PADRÕES TÉCNICOS

### Telefones
- Formato: `+5511999999999` (com DDI)
- Tipo: `VARCHAR(20)`
- Validação: Regex internacional

### UUIDs
- Todas as PKs são UUID
- Geração: `gen_random_uuid()`

### Timestamps
- Tipo: `TIMESTAMPTZ`
- Timezone: `America/Sao_Paulo`

### Status
- Padrão: `VARCHAR(20)`
- Valores comuns: `ativo`, `inativo`, `pendente`, `suspenso`

---

*Documento gerado em: 01/02/2026*
*Versão: 2.0*

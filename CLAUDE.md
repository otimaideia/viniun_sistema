# Viniun - Sistema de Gestão Imobiliária Multi-Tenant

## Visão Geral

**Sistema de gestão multi-tenant para o mercado imobiliário** - Painel administrativo para gerenciamento de múltiplas empresas (imobiliárias, incorporadoras, construtoras, corretoras) com leads, agendamentos, WhatsApp Business, CRM e chatbot IA.

| Métrica | Valor |
|---------|-------|
| **Tamanho** | 3.1 MB |
| **Arquivos TypeScript** | 171 |
| **Linhas de Código** | ~24.834 |
| **Componentes** | 95 |
| **Páginas** | 33 |
| **Hooks Customizados** | 33 |
| **Tabelas Multi-Tenant** | **88 (prefixo mt_)** |
| **Tenants Ativos** | 9 empresas |
| **Módulos Disponíveis** | 26 (10 CORE) |

---

## Stack Tecnológico

### Frontend
- **Framework**: React 18.3.1 + TypeScript 5.8
- **Build Tool**: Vite 5.4.19
- **Roteamento**: React Router DOM 6.30.1
- **UI Library**: shadcn-ui (49 componentes Radix UI)
- **Styling**: Tailwind CSS 3.4.17
- **State Management**: React Query (TanStack) 5.83.0
- **Formulários**: React Hook Form 7.61.1
- **Validação**: Zod 3.25.76
- **Gráficos**: Recharts 2.15.4

### Backend & Banco de Dados
- **Backend-as-a-Service**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **URL**: https://supabase.viniun.com.br
- **Integração WhatsApp**: WAHA (WhatsApp HTTP API)
- **Extensão pgvector**: Habilitada para embeddings de chatbot IA

---

## 🏢 Sistema Multi-Tenant (Fevereiro 2026)

### Visão Geral da Arquitetura

O sistema suporta **9 empresas (tenants)** com isolamento completo de dados via Row Level Security (RLS).

```
┌─────────────────────────────────────────────────────────────────┐
│                    PLATFORM ADMIN                                │
│         Acesso total a todos os tenants e franquias             │
└─────────────────────────┬───────────────────────────────────────┘
                          │
    ┌─────────────────────┼─────────────────────┐
    ▼                     ▼                     ▼
┌─────────┐         ┌─────────┐           ┌─────────┐
│ Viniun  │         │ImobPrime│           │  ...    │
│ TENANT  │         │ TENANT  │           │ TENANT  │
└────┬────┘         └────┬────┘           └────┬────┘
     │                   │                     │
   ┌─┴─┐               ┌─┴─┐                 ┌─┴─┐
   ▼   ▼               ▼   ▼                 ▼   ▼
┌───┐ ┌───┐         ┌───┐ ┌───┐           ┌───┐ ┌───┐
│F1 │ │F2 │         │F1 │ │F2 │           │F1 │ │F2 │
└───┘ └───┘         └───┘ └───┘           └───┘ └───┘
Filiais             Filiais               Filiais
```

### Hierarquia de 4 Níveis

| Nível | Role | Descrição | Acesso |
|-------|------|-----------|--------|
| 1 | **platform_admin** | Administrador da plataforma | Todos os tenants e dados |
| 2 | **tenant_admin** | Administrador da empresa | Todas as franquias do tenant |
| 3 | **franchise_admin** | Administrador da franquia | Dados da sua franquia |
| 4 | **user** | Usuário operacional | Conforme permissões atribuídas |

### 9 Tenants Cadastrados

| Slug | Nome | Segmento | Cor Primária |
|------|------|----------|--------------|
| `viniun` | Viniun | Imobiliário | #1E3A5F |
| `imobprime` | ImobPrime | Imobiliário | #2196F3 |
| `construtop` | ConstruTop | Construção | #FF9800 |
| `realtybr` | RealtyBR | Corretagem | #4CAF50 |
| `habitaplus` | HabitaPlus | Construção | #9C27B0 |
| `urbantech` | UrbanTech | Tecnologia | #607D8B |
| `casanova` | Casa Nova | Imobiliário | #F44336 |
| `creditoimob` | Crédito Imob | Financeiro | #00BCD4 |
| `adminviniun` | Viniun Admin | Gestão | #FF5722 |

### 26 Módulos do Sistema

| Código | Nome | Categoria | CORE |
|--------|------|-----------|------|
| **SISTEMA** ||||
| `dashboard` | Dashboard | sistema | ✅ |
| `usuarios` | Usuários | sistema | ✅ |
| `relatorios` | Relatórios | sistema | ✅ |
| `automacoes` | Automações | sistema | ✅ |
| `api_webhooks` | API & Webhooks | sistema | ✅ |
| `configuracoes` | Configurações | sistema | ✅ |
| `integracoes` | Integrações | sistema | |
| `aprovacoes` | Aprovações | sistema | |
| **VENDAS** ||||
| `leads` | Gestão de Leads | vendas | ✅ |
| `funil` | Funil de Vendas | vendas | |
| **OPERAÇÃO** ||||
| `agendamentos` | Agendamentos | operacao | ✅ |
| **COMUNICAÇÃO** ||||
| `chatbot` | Chatbot IA | comunicacao | ✅ |
| `whatsapp` | WhatsApp Business | comunicacao | |
| **MARKETING** ||||
| `formularios` | Formulários | marketing | |
| `influenciadoras` | Influenciadoras | marketing | |
| `parcerias` | Parcerias B2B | marketing | |
| `campanhas` | Campanhas | marketing | |
| `marketing` | Marketing | marketing | |
| **GESTÃO** ||||
| `franqueados` | Franqueados | gestao | ✅ |
| `metas` | Metas | gestao | |
| `servicos` | Serviços | gestao | |
| `departamentos` | Departamentos | gestao | |
| `equipes` | Equipes | gestao | |
| `diretorias` | Diretorias | gestao | |
| **RH** ||||
| `recrutamento` | Recrutamento | rh | |
| **RELATÓRIOS** ||||
| `ranking` | Ranking | relatorios | |

### 9 Tipos de Integração

| Código | Nome | Categoria |
|--------|------|-----------|
| `whatsapp` | WhatsApp (WAHA) | Comunicação |
| `smtp` | Email SMTP | Comunicação |
| `meta_ads` | Meta Ads | Marketing |
| `youtube` | YouTube | Social |
| `tiktok` | TikTok | Social |
| `google_ads` | Google Ads | Marketing |
| `tiktok_ads` | TikTok Ads | Marketing |
| `google_business` | Google Meu Negócio | Local |
| `google_maps` | Google Maps | Local |

---

## 📊 Tabelas Multi-Tenant (88 tabelas mt_*)

### Platform (2 tabelas)
- `mt_platform_settings` - Configurações globais da plataforma
- `mt_platform_integrations` - Integrações globais

### Tenants (5 tabelas)
- `mt_tenants` - Empresas/tenants cadastrados
- `mt_tenant_branding` - Personalização visual (80+ campos: cores, logos, textos)
- `mt_tenant_modules` - Módulos habilitados por tenant
- `mt_tenant_integrations` - Integrações por tenant
- `mt_tenant_settings` - Configurações específicas por tenant

### Franquias (4 tabelas)
- `mt_franchises` - Unidades/franquias
- `mt_franchise_modules` - Módulos por franquia
- `mt_franchise_integrations` - Integrações por franquia
- `mt_franchise_settings` - Configurações por franquia

### Usuários e Permissões (8 tabelas)
- `mt_users` - Usuários do sistema
- `mt_roles` - Roles (platform_admin, tenant_admin, etc.)
- `mt_user_roles` - Associação usuário ↔ role
- `mt_permissions` - Permissões disponíveis
- `mt_role_permissions` - Permissões por role
- `mt_user_permissions` - Permissões específicas por usuário
- `mt_user_module_access` - Acesso a módulos por usuário
- `mt_modules` - Catálogo de módulos

### Leads e CRM (6 tabelas)
- `mt_leads` - Leads (80+ campos)
- `mt_lead_activities` - Histórico de atividades
- `mt_lead_scoring_rules` - Regras de pontuação
- `mt_lead_scores` - Scores calculados por lead
- `mt_lead_scoring_config` - Configuração de scoring
- `mt_lead_score_history` - Histórico de mudanças de score

### Funil de Vendas (3 tabelas)
- `mt_funnels` - Funis de vendas
- `mt_funnel_stages` - Etapas do funil
- `mt_funnel_leads` - Leads no funil

### Agendamentos (1 tabela)
- `mt_appointments` - Agendamentos

### Formulários (4 tabelas)
- `mt_forms` - Formulários
- `mt_form_fields` - Campos dos formulários
- `mt_form_submissions` - Submissões
- `mt_form_analytics` - Métricas de formulários

### WhatsApp (4 tabelas)
- `mt_whatsapp_sessions` - Sessões WAHA
- `mt_whatsapp_conversations` - Conversas
- `mt_whatsapp_messages` - Mensagens
- `mt_whatsapp_templates` - Templates de mensagem

### Campanhas e Marketing (5 tabelas)
- `mt_campaigns` - Campanhas
- `mt_campaign_analytics` - Métricas de campanhas
- `mt_influencers` - Influenciadoras
- `mt_influencer_contracts` - Contratos
- `mt_partnerships` - Parcerias

### Gestão (5 tabelas)
- `mt_services` - Serviços
- `mt_goals` - Metas
- `mt_job_positions` - Vagas
- `mt_candidates` - Candidatos
- `mt_interviews` - Entrevistas

### Chatbot IA (7 tabelas)
- `mt_chatbot_config` - Configuração do chatbot
- `mt_chatbot_knowledge` - Base de conhecimento (com VECTOR embedding)
- `mt_chatbot_intents` - Intenções reconhecidas
- `mt_chatbot_conversations` - Conversas do chatbot
- `mt_chatbot_messages` - Mensagens
- `mt_chatbot_analytics` - Métricas agregadas
- `mt_chatbot_training` - Dados de treinamento/feedback

### Automações (7 tabelas)
- `mt_workflows` - Definição de workflows
- `mt_workflow_steps` - Passos do workflow
- `mt_workflow_conditions` - Condições reutilizáveis
- `mt_workflow_executions` - Execuções
- `mt_workflow_execution_logs` - Log detalhado
- `mt_workflow_templates` - Templates prontos
- `mt_workflow_schedules` - Agendamentos

### API e Webhooks (6 tabelas)
- `mt_api_keys` - Chaves de API
- `mt_api_logs` - Log de chamadas
- `mt_api_rate_limits` - Controle de rate limiting
- `mt_webhooks` - Webhooks de saída
- `mt_webhook_logs` - Log de envios
- `mt_webhook_incoming` - Webhooks recebidos

### Segurança (10 tabelas)
- `mt_audit_logs` - Log de auditoria
- `mt_user_sessions` - Sessões de usuário
- `mt_login_attempts` - Tentativas de login
- `mt_ip_whitelist` - IPs permitidos
- `mt_password_policies` - Políticas de senha
- `mt_2fa_settings` - Configuração 2FA
- `mt_password_history` - Histórico de senhas
- `mt_security_alerts` - Alertas de segurança
- `mt_data_exports` - Exportações (LGPD)
- `mt_consent_logs` - Consentimentos (LGPD)

### Notificações (4 tabelas)
- `mt_notifications` - Notificações
- `mt_notification_preferences` - Preferências por usuário
- `mt_notification_templates` - Templates
- `mt_push_subscriptions` - Inscrições push

### Reports e Dashboard (4 tabelas)
- `mt_reports_scheduled` - Relatórios agendados
- `mt_reports_history` - Histórico de relatórios
- `mt_dashboard_widgets` - Widgets personalizados
- `mt_benchmarks` - Benchmarks e metas

### Integrações (3 tabelas)
- `mt_integration_types` - Tipos de integração
- `mt_integration_logs` - Log de integrações
- `mt_module_features` - Features por módulo

---

## 🔐 Row Level Security (RLS)

### Funções Auxiliares

```sql
-- Retorna o user_id do usuário autenticado
current_user_id() → UUID

-- Retorna o tenant_id do usuário atual
current_tenant_id() → UUID

-- Retorna o franchise_id do usuário atual (ou NULL)
current_franchise_id() → UUID

-- Retorna o nível de acesso (platform, tenant, franchise, user)
current_access_level() → TEXT

-- Verifica se é platform admin
is_platform_admin() → BOOLEAN

-- Verifica se é tenant admin
is_tenant_admin() → BOOLEAN

-- Verifica se é franchise admin
is_franchise_admin() → BOOLEAN

-- Verifica se pode acessar determinado tenant
can_access_tenant(p_tenant_id UUID) → BOOLEAN

-- Verifica se pode acessar determinada franquia
can_access_franchise(p_franchise_id UUID) → BOOLEAN

-- Define contexto da sessão (chamado no login)
set_session_context(p_user_id UUID) → VOID
```

### Políticas Padrão

Todas as 88 tabelas mt_* têm RLS habilitado com policies que:
1. **Platform Admin**: Acesso total a todos os registros
2. **Tenant Admin**: Acesso a todos os registros do seu tenant
3. **Franchise Admin**: Acesso aos registros da sua franquia
4. **User**: Acesso conforme permissões específicas

---

## 📁 Arquivos de Migration

```
supabase/migrations/
├── 20260201_001_mt_platform.sql      # Platform settings
├── 20260201_002_mt_tenants.sql       # Tenants e branding
├── 20260201_003_mt_modules.sql       # Módulos e integrações
├── 20260201_004_mt_franchises.sql    # Franquias
├── 20260201_005_mt_users.sql         # Usuários e RBAC
├── 20260201_006_mt_business.sql      # Leads, Funil, WhatsApp, etc.
├── 20260201_007_mt_chatbot.sql       # Chatbot IA
├── 20260201_008_mt_automations.sql   # Workflows
├── 20260201_009_mt_api.sql           # API e Webhooks
├── 20260201_010_mt_security.sql      # Segurança e Auditoria
├── 20260201_011_mt_rls.sql           # Row Level Security
├── 20260201_012_mt_seed.sql          # Dados iniciais
└── 20260201_013_mt_missing_tables.sql # Tabelas complementares
```

---

## 🎨 Sistema de Branding (80+ campos)

Cada tenant pode personalizar completamente a aparência:

### Cores
- `cor_primaria`, `cor_primaria_hover`
- `cor_secundaria`, `cor_secundaria_hover`
- `cor_sucesso`, `cor_erro`, `cor_aviso`, `cor_info`
- `cor_fundo`, `cor_fundo_card`, `cor_borda`
- `cor_texto`, `cor_texto_secundario`, `cor_texto_invertido`

### Logos
- `logo_url` - Logo principal
- `logo_branco_url` - Logo para fundos escuros
- `favicon_url` - Favicon

### Textos de Login
- `texto_login_titulo`
- `texto_login_subtitulo`
- `texto_boas_vindas`
- `texto_rodape`

### Fontes e Visual
- `fonte_primaria`, `fonte_secundaria`
- `border_radius`
- `sombra_cards`

---

## 🔧 Frontend Multi-Tenant (A Implementar)

### Contextos Necessários

```typescript
// src/contexts/TenantContext.tsx
const { tenant, branding, isLoading } = useTenantContext();

// src/contexts/BrandingContext.tsx
const { colors, logos, fonts, applyBranding } = useBrandingContext();
```

### Hooks Necessários

```typescript
// Hook para dados do tenant atual
useTenant() → { tenant, isLoading, error }

// Hook para franquia atual
useFranchise() → { franchise, franchises, selectFranchise }

// Hook para branding dinâmico
useBranding() → { branding, cssVariables }

// Hook para módulos habilitados
useModules() → { modules, hasModule, isModuleActive }

// Hook para permissões
usePermissions() → { permissions, hasPermission, canAccess }
```

### Componentes Necessários

```
src/components/
├── TenantSelector.tsx      # Seletor de tenant (platform admin)
├── FranchiseSelector.tsx   # Seletor de franquia
└── BrandingProvider.tsx    # Aplica CSS variables dinamicamente
```

### Tipos TypeScript

```typescript
// src/types/multitenant.ts

type AccessLevel = 'platform' | 'tenant' | 'franchise' | 'user';

interface Tenant {
  id: string;
  slug: string;
  nome_fantasia: string;
  // ...
}

interface Branding {
  cor_primaria: string;
  cor_secundaria: string;
  logo_url: string;
  // ...80+ campos
}

interface Module {
  codigo: string;
  nome: string;
  is_core: boolean;
  is_active: boolean;
}
```

---

## Diretrizes de Desenvolvimento

> 🚨 **SISTEMA 100% MULTI-TENANT**: Este sistema é EXCLUSIVAMENTE multi-tenant. NÃO existe código legacy. TODAS as operações DEVEM usar tabelas `mt_*` e hooks MT.

> ⚠️ **REGRA CRÍTICA 1**: NUNCA usar modais para CRUD de módulos de negócio (Leads, Franquias, Influenciadoras, etc). SEMPRE usar páginas com rotas dedicadas. **Exceção**: modais são permitidos em páginas de configuração (WhatsApp Providers, Routing Rules, etc) e para confirmações/seleções rápidas.

> ⚠️ **REGRA CRÍTICA 2**: ANTES de criar qualquer arquivo novo, SEMPRE verificar se já existe um arquivo similar usando Glob ou Grep. Evitar duplicações.

> ⚠️ **REGRA CRÍTICA 3**: TODO código DEVE usar tabelas `mt_*` e hooks MT. Código sem isolamento de tenant será REJEITADO.

> ❌ **PROIBIDO**: Usar tabelas `yeslaser_*`, `popdents_*` ou qualquer tabela sem prefixo `mt_`. Usar hooks legacy sem sufixo `MT` ou `Adapter`.

---

## 🔒 Regras Multi-Tenant (OBRIGATÓRIO)

**TODO código DEVE seguir estas regras de isolamento multi-tenant. NÃO existe código legacy neste sistema.**

### Regra 1: SEMPRE Usar Tabelas MT

```typescript
// ❌ PROIBIDO - Tabelas legacy
supabase.from("sistema_leads_yeslaser")
supabase.from("yeslaser_franqueados")
supabase.from("yeslaser_*")

// ✅ OBRIGATÓRIO - Tabelas multi-tenant
supabase.from("mt_leads")
supabase.from("mt_franchises")
supabase.from("mt_*")
```

### Regra 2: SEMPRE Usar TenantContext

Todo hook que acessa dados DEVE usar o `TenantContext`:

```typescript
// ❌ PROIBIDO - Hook sem contexto de tenant
export function useLeads() {
  const { data } = useQuery({
    queryFn: async () => {
      return supabase.from("mt_leads").select("*"); // SEM FILTRO!
    }
  });
}

// ✅ OBRIGATÓRIO - Hook com TenantContext
export function useLeads() {
  const { tenant, franchise, accessLevel } = useTenantContext();

  const { data } = useQuery({
    queryFn: async () => {
      // RLS filtra automaticamente, mas filtro explícito melhora performance
      let query = supabase.from("mt_leads").select("*");

      if (accessLevel === 'tenant') {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise') {
        query = query.eq('franchise_id', franchise.id);
      }

      return query;
    },
    enabled: !!tenant || accessLevel === 'platform'
  });
}
```

### Regra 3: SEMPRE Incluir tenant_id em Mutations

```typescript
// ❌ PROIBIDO - Insert sem tenant_id
const createLead = async (data) => {
  return supabase.from("mt_leads").insert(data);
};

// ✅ OBRIGATÓRIO - Insert com tenant_id
const createLead = async (data) => {
  const { tenant, franchise } = useTenantContext();

  return supabase.from("mt_leads").insert({
    ...data,
    tenant_id: tenant.id,           // OBRIGATÓRIO
    franchise_id: franchise?.id,    // Se aplicável
  });
};
```

### Regra 4: Validar Nível de Acesso

```typescript
// Níveis de acesso (do maior para o menor)
type AccessLevel = 'platform' | 'tenant' | 'franchise' | 'user';

// Validar antes de operações sensíveis
const { accessLevel, tenant, franchise } = useTenantContext();

// Platform admin: vê tudo
// Tenant admin: vê apenas seu tenant
// Franchise admin: vê apenas sua franquia
// User: vê apenas o que tem permissão

if (accessLevel === 'platform') {
  // Pode acessar qualquer tenant
} else if (accessLevel === 'tenant') {
  // Filtrar por tenant_id obrigatório
} else if (accessLevel === 'franchise') {
  // Filtrar por franchise_id obrigatório
} else {
  // Filtrar por user_id ou permissões específicas
}
```

### Regra 5: Estrutura Padrão de Hook MT

```typescript
// Template padrão para hooks multi-tenant
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useNomeModuloMT(filters?: FilterType) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Query principal
  const query = useQuery({
    queryKey: ['mt-nome-modulo', tenant?.id, franchise?.id, filters],
    queryFn: async () => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado');
      }

      let q = supabase
        .from('mt_nome_tabela')
        .select('*, tenant:mt_tenants(slug, nome_fantasia)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Filtros por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Mutation: Criar
  const create = useMutation({
    mutationFn: async (newItem: CreateType) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      const { data, error } = await supabase
        .from('mt_nome_tabela')
        .insert({
          ...newItem,
          tenant_id: tenant?.id,
          franchise_id: franchise?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-nome-modulo'] });
      toast.success('Criado com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Mutation: Atualizar
  const update = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateType) => {
      const { data, error } = await supabase
        .from('mt_nome_tabela')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-nome-modulo'] });
      toast.success('Atualizado com sucesso');
    },
  });

  // Mutation: Deletar (soft delete)
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_nome_tabela')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-nome-modulo'] });
      toast.success('Removido com sucesso');
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    create,
    update,
    remove,
  };
}
```

### Regra 6: Checklist COMPLETO para Novos Módulos

> ⚠️ **OBRIGATÓRIO**: Todo novo módulo DEVE seguir TODOS os passos abaixo na ordem indicada.

#### PASSO 1: Banco de Dados

**1.1 - Registrar módulo na tabela `mt_modules`:**
```sql
INSERT INTO mt_modules (codigo, nome, descricao, icone, categoria, ordem, is_core, is_active)
VALUES (
  'nome_modulo',           -- Código único (snake_case)
  'Nome do Módulo',        -- Nome para exibição
  'Descrição do módulo',   -- Descrição clara
  'IconeName',             -- Ícone do Lucide React
  'categoria',             -- vendas|sistema|gestao|marketing|comunicacao|operacao|rh|relatorios
  99,                      -- Ordem no menu (ajustar conforme categoria)
  false,                   -- is_core: true = essencial, false = opcional
  true                     -- is_active: habilitado por padrão
)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao;
```

**1.2 - Habilitar para todos os tenants:**
```sql
INSERT INTO mt_tenant_modules (tenant_id, module_id, is_active)
SELECT t.id, m.id, true
FROM mt_tenants t
CROSS JOIN mt_modules m
WHERE m.codigo = 'nome_modulo'
AND NOT EXISTS (
  SELECT 1 FROM mt_tenant_modules tm
  WHERE tm.tenant_id = t.id AND tm.module_id = m.id
);
```

**1.3 - Criar tabela(s) do módulo:**
```sql
CREATE TABLE IF NOT EXISTS mt_nome_modulo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),

  -- Campos específicos do módulo
  codigo VARCHAR(50) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  -- ... outros campos ...

  -- Timestamps e soft delete (OBRIGATÓRIO)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(tenant_id, codigo)
);

-- Índices obrigatórios para performance
CREATE INDEX idx_mt_nome_modulo_tenant ON mt_nome_modulo(tenant_id);
CREATE INDEX idx_mt_nome_modulo_franchise ON mt_nome_modulo(franchise_id);
CREATE INDEX idx_mt_nome_modulo_deleted ON mt_nome_modulo(deleted_at) WHERE deleted_at IS NULL;
```

**1.4 - Criar políticas RLS:**
```sql
-- Habilitar RLS
ALTER TABLE mt_nome_modulo ENABLE ROW LEVEL SECURITY;

-- Policy para SELECT
CREATE POLICY "mt_nome_modulo_select" ON mt_nome_modulo FOR SELECT
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
  (tenant_id = current_tenant_id())
);

-- Policy para INSERT
CREATE POLICY "mt_nome_modulo_insert" ON mt_nome_modulo FOR INSERT
WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);

-- Policy para UPDATE
CREATE POLICY "mt_nome_modulo_update" ON mt_nome_modulo FOR UPDATE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);

-- Policy para DELETE
CREATE POLICY "mt_nome_modulo_delete" ON mt_nome_modulo FOR DELETE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);
```

#### PASSO 2: Frontend - Hook

Criar hook em `src/hooks/multitenant/useNomeModulo.ts` seguindo o template da Regra 5.

#### PASSO 3: Frontend - Páginas

Criar páginas com rotas dedicadas (NUNCA modais):
```
src/pages/configuracoes/NomeModulo.tsx       # Listagem
src/pages/configuracoes/NomeModuloDetail.tsx # Visualização
src/pages/configuracoes/NomeModuloEdit.tsx   # Criar/Editar
```

#### PASSO 4: Frontend - Rotas

Adicionar rotas em `src/App.tsx`:
```tsx
<Route path="/configuracoes/nome-modulo" element={<ProtectedRoute requireAdmin><DashboardLayout><NomeModulo /></DashboardLayout></ProtectedRoute>} />
<Route path="/configuracoes/nome-modulo/novo" element={<ProtectedRoute requireAdmin><DashboardLayout><NomeModuloEdit /></DashboardLayout></ProtectedRoute>} />
<Route path="/configuracoes/nome-modulo/:id" element={<ProtectedRoute requireAdmin><DashboardLayout><NomeModuloDetail /></DashboardLayout></ProtectedRoute>} />
<Route path="/configuracoes/nome-modulo/:id/editar" element={<ProtectedRoute requireAdmin><DashboardLayout><NomeModuloEdit /></DashboardLayout></ProtectedRoute>} />
```

#### PASSO 5: Verificação Final

Antes de criar/modificar qualquer módulo, verificar:

- [ ] **Módulo registrado**: Inserido em `mt_modules`?
- [ ] **Tenants habilitados**: Inserido em `mt_tenant_modules` para todos os tenants?
- [ ] **Tabela criada**: Tabela `mt_*` com campos obrigatórios?
- [ ] **RLS habilitado**: Políticas para SELECT/INSERT/UPDATE/DELETE?
- [ ] **Hook criado**: Usando `useTenantContext()`?
- [ ] **tenant_id em inserts**: Todas as mutations incluem `tenant_id`?
- [ ] **Filtro por acesso**: Query filtra por `accessLevel`?
- [ ] **Query key com tenant**: `queryKey` inclui `tenant?.id`?
- [ ] **enabled condicional**: Query só executa quando tenant carregado?
- [ ] **Soft delete**: Usando `deleted_at` em vez de DELETE?
- [ ] **Páginas criadas**: Listagem, Detail e Edit (sem modais)?
- [ ] **Rotas configuradas**: Em App.tsx com ProtectedRoute?
- [ ] **CRUD testado**: CREATE, READ, UPDATE, DELETE funcionando?

#### Categorias de Módulos

| Categoria | Descrição | Exemplos |
|-----------|-----------|----------|
| `sistema` | Funcionalidades do sistema | dashboard, usuarios, configuracoes |
| `vendas` | Gestão de vendas | leads, funil |
| `operacao` | Operações diárias | agendamentos |
| `comunicacao` | Comunicação | whatsapp, chatbot |
| `marketing` | Marketing | campanhas, influenciadoras |
| `gestao` | Gestão organizacional | franqueados, departamentos, equipes |
| `rh` | Recursos Humanos | recrutamento |
| `relatorios` | Relatórios e métricas | ranking |

#### Ícones Disponíveis (Lucide React)

Usar nomes do Lucide React: `Building2`, `Users`, `Settings`, `MessageSquare`, `TrendingUp`, `Megaphone`, `Target`, `DollarSign`, `Briefcase`, `Calendar`, `FileText`, `BarChart3`, etc.

### Regra 7: Hooks Multi-Tenant (Padrão)

Todos os hooks DEVEM usar tabelas `mt_*` e `TenantContext`:

```typescript
// ✅ PADRÃO - Hook Multi-Tenant
export function useNomeModulo(filters?: FilterType) {
  const { tenant, franchise, accessLevel } = useTenantContext();

  return useQuery({
    queryKey: ['mt-nome-modulo', tenant?.id, franchise?.id, filters],
    queryFn: async () => {
      let query = supabase.from('mt_nome_tabela').select('*');

      if (accessLevel === 'tenant') {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise') {
        query = query.eq('franchise_id', franchise.id);
      }

      return query;
    },
    enabled: !!tenant || accessLevel === 'platform'
  });
}
```

> ❌ **PROIBIDO**: Criar hooks que acessem tabelas `yeslaser_*` ou sem `TenantContext`.

### Regra 8: Tipos TypeScript Multi-Tenant

Todo tipo deve incluir campos de tenant:

```typescript
// ❌ PROIBIDO - Tipo sem tenant
interface Lead {
  id: string;
  nome: string;
  telefone: string;
}

// ✅ OBRIGATÓRIO - Tipo com tenant
interface MTLead {
  id: string;
  tenant_id: string;           // OBRIGATÓRIO
  franchise_id: string | null; // Se aplicável

  // Dados do registro
  nome: string;
  telefone: string;

  // Relacionamentos
  tenant?: MTTenant;
  franchise?: MTFranchise;

  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;  // Soft delete
}
```

### Regra 9: Componentes com Contexto de Tenant

Páginas e componentes devem exibir contexto quando relevante:

```tsx
// Para Platform Admin: mostrar seletor de tenant
function LeadsPage() {
  const { accessLevel, tenant } = useTenantContext();

  return (
    <div>
      {accessLevel === 'platform' && <TenantSelector />}

      <h1>Leads {tenant && `- ${tenant.nome_fantasia}`}</h1>

      <LeadsTable />
    </div>
  );
}
```

### Regra 10: Documentação Técnica

Todos os módulos usam tabelas `mt_*` e hooks MT. Documentação técnica disponível:

| Módulo | Documentação | Tabelas MT |
|--------|--------------|------------|
| Leads | `PLANO_MIGRACAO_LEADS_MT.md` | `mt_leads`, `mt_lead_activities`, `mt_lead_scores` |
| WhatsApp | `PLANO_MIGRACAO_WHATSAPP_MT.md` | `mt_whatsapp_sessions`, `mt_whatsapp_conversations`, `mt_whatsapp_messages` |
| Formulários | `PLANO_MIGRACAO_FORMULARIOS_MT.md` | `mt_forms`, `mt_form_fields`, `mt_form_submissions` |
| Agendamentos | - | `mt_appointments` |
| Influenciadoras | - | `mt_influencers`, `mt_influencer_contracts` |
| Franquias | - | `mt_franchises`, `mt_franchise_modules` |
| Usuários | - | `mt_users`, `mt_user_roles`, `mt_permissions` |
| Campanhas | - | `mt_campaigns`, `mt_campaign_analytics` |
| Chatbot | - | `mt_chatbot_config`, `mt_chatbot_knowledge`, `mt_chatbot_conversations` |

---

### Exemplo Completo: Página MT

```tsx
// src/pages/LeadsMT.tsx
import { useTenantContext } from '@/contexts/TenantContext';
import { useLeadsMT } from '@/hooks/useLeadsMT';
import { TenantSelector } from '@/components/TenantSelector';
import { FranchiseSelector } from '@/components/FranchiseSelector';

export function LeadsMT() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const { data: leads, isLoading, create, update, remove } = useLeadsMT();

  if (isTenantLoading) {
    return <Loading message="Carregando contexto..." />;
  }

  if (!tenant && accessLevel !== 'platform') {
    return <Error message="Tenant não encontrado" />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Seletores para admin */}
        {accessLevel === 'platform' && <TenantSelector />}
        {accessLevel === 'tenant' && <FranchiseSelector />}

        {/* Header com contexto */}
        <div className="flex justify-between">
          <h1 className="text-2xl font-bold">
            Leads
            {tenant && <span className="text-muted-foreground ml-2">({tenant.nome_fantasia})</span>}
          </h1>
          <Button onClick={() => navigate('/leads/novo')}>Novo Lead</Button>
        </div>

        {/* Tabela de leads */}
        <LeadsTable
          leads={leads}
          isLoading={isLoading}
          onEdit={(id) => navigate(`/leads/${id}/editar`)}
          onDelete={(id) => remove.mutate(id)}
        />
      </div>
    </DashboardLayout>
  );
}
```

---

### Verificação Obrigatória Antes de Criar Arquivos

**SEMPRE executar antes de criar novas páginas:**
```bash
# Verificar páginas existentes para o módulo
Glob: src/pages/**/*NomeModulo*.tsx
Glob: src/pages/**/NomeModulo*.tsx

# Verificar componentes existentes
Glob: src/components/**/*NomeModulo*.tsx

# Verificar hooks existentes
Glob: src/hooks/use*NomeModulo*.ts
```

### Páginas CRUD Existentes (Todas Multi-Tenant)

| Entidade | Listagem | Detalhes | Criar/Editar | Tabela MT |
|----------|----------|----------|--------------|-----------|
| Empresas (Tenants) | `Empresas.tsx` | `EmpresaDetail.tsx` | `EmpresaEdit.tsx` | `mt_tenants` |
| Franquias | `configuracoes/Franquias.tsx` | `FranquiaDetail.tsx` | `FranquiaEdit.tsx` | `mt_franchises` |
| Usuários | `configuracoes/Usuarios.tsx` | `UsuarioDetail.tsx` | `UsuarioEdit.tsx` | `mt_users` |
| Departamentos | `configuracoes/Departamentos.tsx` | `DepartamentoDetail.tsx` | `DepartamentoEdit.tsx` | `mt_departments` |
| Equipes | `configuracoes/Equipes.tsx` | `EquipeDetail.tsx` | `EquipeEdit.tsx` | `mt_teams` |
| Leads | `Leads.tsx` | `LeadDetail.tsx` | `LeadEdit.tsx` | `mt_leads` |
| Agendamentos | `Agendamentos.tsx` | `AgendamentoDetail.tsx` | `AgendamentoEdit.tsx` | `mt_appointments` |
| Serviços | `Servicos.tsx` | `ServicoDetail.tsx` | `ServicoEdit.tsx` | `mt_services` |
| Formulários | `Formularios.tsx` | `FormularioDetail.tsx` | `FormularioEdit.tsx` | `mt_forms` |
| Influenciadoras | `Influenciadoras.tsx` | `InfluenciadoraDetail.tsx` | `InfluenciadoraEdit.tsx` | `mt_influencers` |
| Parcerias | `Parcerias.tsx` | `ParceriaDetail.tsx` | `ParceriaEdit.tsx` | `mt_partnerships` |
| Campanhas | `CampanhasIndex.tsx` | `CampanhaDetail.tsx` | `CampanhaEdit.tsx` | `mt_campaigns` |
| Vagas | `Recrutamento.tsx` | `VagaDetail.tsx` | `VagaEdit.tsx` | `mt_job_positions` |
| Candidatos | - | `CandidatoDetail.tsx` | `CandidatoEdit.tsx` | `mt_candidates` |
| Entrevistas | - | `EntrevistaDetail.tsx` | `EntrevistaEdit.tsx` | `mt_interviews` |
| WhatsApp Sessões | `WhatsAppSessoes.tsx` | - | - | `mt_whatsapp_sessions` |
| WhatsApp Chat | `WhatsAppChat.tsx` | - | - | `mt_whatsapp_conversations` |

---

### Navegação por URL (Padrão Obrigatório)

**A partir de Janeiro 2025, todos os novos módulos DEVEM usar navegação por URL em vez de modais.**

#### ❌ PROIBIDO (Padrão Antigo)
```tsx
// NÃO FAZER - Modal para criar/editar
const [isModalOpen, setIsModalOpen] = useState(false);
<Dialog open={isModalOpen}>
  <FormularioCadastro />
</Dialog>
```

#### ✅ OBRIGATÓRIO (Padrão Novo)

Páginas dedicadas com rotas:
```
/modulo              → Listagem (página)
/modulo/novo         → Formulário de criação (página)
/modulo/:id          → Visualização de detalhes (página)
/modulo/:id/editar   → Formulário de edição (página)
```

#### Exemplo de Implementação Correta
```tsx
// App.tsx - Rotas
<Route path="/influenciadoras" element={<Influenciadoras />} />
<Route path="/influenciadoras/novo" element={<InfluenciadoraEdit />} />
<Route path="/influenciadoras/:id" element={<InfluenciadoraDetail />} />
<Route path="/influenciadoras/:id/editar" element={<InfluenciadoraEdit />} />

// Listagem - Link para criar/editar
<Button asChild>
  <Link to="/influenciadoras/novo">Nova Influenciadora</Link>
</Button>

// Listagem - Link para detalhes
<Link to={`/influenciadoras/${item.id}`}>Ver</Link>
<Link to={`/influenciadoras/${item.id}/editar`}>Editar</Link>

// Formulário - Detectar modo (criar vs editar)
const { id } = useParams();
const isEditing = !!id;
```

#### Benefícios
- URLs compartilháveis e bookmark-friendly
- Histórico de navegação funciona corretamente
- Melhor SEO e acessibilidade
- Separação clara entre visualização e edição
- Formulários podem ser maiores e mais detalhados

#### Quando Modal é Permitido
- ✅ Confirmação de exclusão (AlertDialog)
- ✅ QR Code do WhatsApp (visualização rápida)
- ✅ Seleção de opções simples
- ✅ Configuração de providers/regras WhatsApp (Dialog em páginas de config)
- ✅ Formulários de configuração em telas de settings (ex: WhatsApp Providers, Routing Rules)
- ❌ Formulários de cadastro/edição de **módulos principais** (Leads, Franquias, Influenciadoras, etc.)
- ❌ Visualização de detalhes de registros de módulos
- ❌ Operação CRUD principal de entidades de negócio

#### Módulos Migrados para URL
- [x] Influenciadoras (Janeiro 2025)
- [x] Parcerias (Janeiro 2025)
- [x] Empresas/Tenants (Fevereiro 2026)
- [x] Franquias Multi-Tenant (Fevereiro 2026)
- [x] Usuários Multi-Tenant (Fevereiro 2026)
- [ ] Leads (pendente)
- [ ] Franqueados (pendente)
- [ ] Agendamentos (pendente)

---

### Sistema de Módulos Multi-Tenant (OBRIGATÓRIO)

> ⚠️ **REGRA CRÍTICA**: Todo novo módulo DEVE ser registrado na tabela `mt_modules` e habilitado para tenants via `mt_tenant_modules`.

#### Checklist para Novos Módulos

1. **Registrar módulo em `mt_modules`**:
```sql
INSERT INTO mt_modules (codigo, nome, descricao, icone, categoria, ordem, is_core, is_active)
VALUES (
  'nome_modulo',
  'Nome do Módulo',
  'Descrição do módulo',
  'IconeName', -- Ícone do Lucide React
  'categoria', -- vendas, sistema, gestao, marketing, comunicacao, operacao, rh, relatorios
  18, -- ordem no menu
  false, -- is_core: true para módulos essenciais
  true   -- is_active: habilitado por padrão
)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao;
```

2. **Habilitar para todos os tenants**:
```sql
INSERT INTO mt_tenant_modules (tenant_id, module_id, is_active)
SELECT t.id, m.id, true
FROM mt_tenants t
CROSS JOIN mt_modules m
WHERE m.codigo = 'nome_modulo'
AND NOT EXISTS (
  SELECT 1 FROM mt_tenant_modules tm
  WHERE tm.tenant_id = t.id AND tm.module_id = m.id
);
```

3. **Criar tabela MT do módulo** (ver Regra 6 - Checklist Completo)

4. **Atualizar `src/types/modulo.ts`**:
```typescript
export type ModuloCodigo =
  | 'leads'
  | ...
  | 'nome_modulo'; // NOVO

export const MODULO_ROUTES: Record<ModuloCodigo, string[]> = {
  ...
  nome_modulo: ['/nome-modulo'], // NOVO
};
```

5. **Categorias**: vendas, sistema, gestao, marketing, comunicacao, operacao, rh, relatorios

6. **Ícones**: Usar nomes do Lucide React (ex: Building2, Users, Settings)

#### 26 Módulos Registrados (mt_modules)

Ver seção **"26 Módulos do Sistema"** acima para lista completa.

---

## Estrutura do Projeto

```
yeslaserpainel/
├── src/
│   ├── components/       # 95 componentes
│   │   ├── ui/          # 49 componentes shadcn
│   │   ├── dashboard/   # 21 componentes
│   │   ├── layout/      # DashboardLayout
│   │   ├── recrutamento/# 7 componentes
│   │   ├── franqueados/ # 3 componentes
│   │   ├── agendamentos/# 3 componentes
│   │   ├── whatsapp/    # 6 componentes + chat/
│   │   └── configuracoes/
│   ├── pages/           # 33 páginas
│   ├── hooks/           # 23 hooks customizados
│   ├── types/           # 11 tipos/interfaces
│   │   └── multitenant.ts  # (A CRIAR) Tipos MT
│   ├── services/        # Integrações API
│   ├── contexts/        # AuthContext
│   │   ├── TenantContext.tsx    # (A CRIAR)
│   │   └── BrandingContext.tsx  # (A CRIAR)
│   ├── integrations/    # Supabase client
│   └── lib/             # Utilitários
├── supabase/
│   ├── functions/       # Edge Functions
│   │   ├── webhook-leads/
│   │   ├── franqueado-servicos/
│   │   ├── waha-proxy/
│   │   └── waha-webhook/
│   └── migrations/      # 13 arquivos de migration MT
│       ├── 20260201_001_mt_platform.sql
│       ├── 20260201_002_mt_tenants.sql
│       ├── 20260201_003_mt_modules.sql
│       ├── 20260201_004_mt_franchises.sql
│       ├── 20260201_005_mt_users.sql
│       ├── 20260201_006_mt_business.sql
│       ├── 20260201_007_mt_chatbot.sql
│       ├── 20260201_008_mt_automations.sql
│       ├── 20260201_009_mt_api.sql
│       ├── 20260201_010_mt_security.sql
│       ├── 20260201_011_mt_rls.sql
│       ├── 20260201_012_mt_seed.sql
│       └── 20260201_013_mt_missing_tables.sql
└── package.json
```

---

## Configurações de Ambiente

### Variáveis Necessárias (.env)
```env
VITE_SUPABASE_URL=https://supabase-app.yeslaserpraiagrande.com.br
VITE_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MDc4MTc0MCwiZXhwIjo0OTI2NDU1MzQwLCJyb2xlIjoiYW5vbiJ9.fPIz99uMBXqwF9vwupAtYO_mGLlrGdeBoHofmjWg1L4
```

### Chaves de Acesso Supabase (Admin)
```
# Service Role Key (ADMIN - usado para SQL e operações privilegiadas)
SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MDc4MTc0MCwiZXhwIjo0OTI2NDU1MzQwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.K1j07Xd07FuQHNNXqnwXnWvakPBfUirpKXqB5sZmkTE

# Dashboard do Supabase (Basic Auth) - Coolify
SUPABASE_DASHBOARD_USER=OlJafwzZkirOedBv
SUPABASE_DASHBOARD_PASSWORD=IQp1QWS8r2lhIZ4tk29ZyOmRdcgxs0Tt

# PostgreSQL
POSTGRES_PASSWORD=ZZy07JXbfuFDWaOuEdVrYhEAl6b9Lld3

# MinIO (Object Storage)
MINIO_ROOT_USER=8w7SHVe62ZAKfj6d
MINIO_ROOT_PASSWORD=w1BdMeqJESrapnytl6tLPV8T8Cg2Sb1W
```

### Coolify (Gerenciamento de Containers)
```
# Coolify Dashboard
URL=https://coolify.otimaideia.com.br
EMAIL=marketing@otimaideia.com.br
PASSWORD=Marketing@Otimaideia@2025

# Projeto Supabase no Coolify
PROJECT_URL=https://coolify.otimaideia.com.br/project/ps4sk44kkcowcc08g48cg4cg/environment/cck0kw448oowss080oco8wsk
SERVICE_ID=tk0sw4gskkwgc8gw08swoccc

# Edge Functions - Volume Persistente
HOST_PATH=/data/coolify/services/tk0sw4gskkwgc8gw08swoccc/volumes/functions
CONTAINER_PATH=/home/deno/functions
```

### Servidor de Desenvolvimento
```bash
# Porta padrão
http://localhost:8080

# Rede local
http://192.168.15.30:8080
```

### Comandos
```bash
npm install          # Instalar dependências
npm run dev          # Iniciar desenvolvimento
npm run build        # Build para produção
npm run preview      # Preview do build
```

### Infraestrutura - Coolify (Deploy & Docker)
- **Coolify URL**: https://coolify.otimaideia.com.br
- **Servidor**: VPS DigitalOcean (146.190.141.13)
- **Supabase Self-Hosted**: https://supabase-app.yeslaserpraiagrande.com.br
- **WAHA Server**: https://waha.yeslaser.com.br

### Repositório Git
```bash
# ÚNICO remote — Coolify puxa automaticamente daqui
origin → https://github.com/otimaideia/sistema-otima-crm-whatsapp.git
```

### Coolify App (Deploy Automático)
- **URL**: https://coolify.otimaideia.com.br/project/ps4sk44kkcowcc08g48cg4cg/environment/cck0kw448oowss080oco8wsk/application/vcgg4sgwkkg4c0wwg4c84gk8
- Puxa automaticamente do repo `sistema-otima-crm-whatsapp.git` ao dar push

### Deploy do Frontend
```bash
# Push para origin → Coolify detecta e faz deploy automático
git push origin main
```

### Edge Functions (14 funções no Supabase)
```
webhook-leads, franqueado-servicos, waha-proxy, waha-webhook,
chatbot, chatbot-embed, chatbot-train, check-in,
form-submit, meta-oauth-callback, meta-webhook,
send-appointment-notifications, totem-public, whatsapp-send
```
- **Deploy bundle**: https://supabase-app.yeslaserpraiagrande.com.br/storage/v1/object/public/deploy/edge-functions-all.tar.gz
- **Caminho no container**: `/home/deno/functions/`
- **Container**: `supabase/edge-runtime:v1.69.28`

---

## Banco de Dados - Tabelas Multi-Tenant

### 🏢 Sistema 100% Multi-Tenant

> **IMPORTANTE**: Este sistema usa EXCLUSIVAMENTE tabelas multi-tenant (`mt_*`). São 88 tabelas com isolamento por tenant via Row Level Security (RLS).

Ver seção **"Tabelas Multi-Tenant (88 tabelas mt_*)"** acima para lista completa das tabelas organizadas por categoria:
- Platform (2 tabelas)
- Tenants (5 tabelas)
- Franquias (4 tabelas)
- Usuários e Permissões (8 tabelas)
- Leads e CRM (6 tabelas)
- Funil de Vendas (3 tabelas)
- Agendamentos (1 tabela)
- Formulários (4 tabelas)
- WhatsApp (4 tabelas)
- Campanhas e Marketing (5 tabelas)
- Gestão (5 tabelas)
- Chatbot IA (7 tabelas)
- Automações (7 tabelas)
- API e Webhooks (6 tabelas)
- Segurança (10 tabelas)
- Notificações (4 tabelas)
- Reports e Dashboard (4 tabelas)
- Integrações (3 tabelas)

---

## Módulo WhatsApp/WAHA (Multi-Tenant)

### Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                          │
│  WhatsAppSessoes.tsx │ WhatsAppChat.tsx │ Adapters/Hooks MT  │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   SUPABASE BACKEND                           │
│  Edge Functions: waha-proxy, waha-webhook                    │
│  Database: mt_whatsapp_* tables (Multi-Tenant)               │
│  - mt_whatsapp_sessions (2 sessões)                          │
│  - mt_whatsapp_conversations (6.666 conversas)               │
│  - mt_whatsapp_messages (225.772 mensagens)                  │
│  - mt_whatsapp_templates (3 templates)                       │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    WAHA API SERVER                           │
│  https://waha.yeslaser.com.br                                │
└─────────────────────────────────────────────────────────────┘
```

### Arquivos do Módulo

| Categoria | Arquivos |
|-----------|----------|
| **Types** | `src/types/whatsapp.ts`, `whatsapp-mt.ts`, `whatsapp-sessao.ts`, `whatsapp-chat.ts` |
| **Services** | `src/services/waha-api.ts`, `src/services/waha/wahaDirectClient.ts` |
| **Hooks MT** | `useWhatsAppSessionsMT`, `useWhatsAppConversationsMT`, `useWhatsAppMessagesMT`, `useWhatsAppPermissionsMT`, `useWhatsAppLabelsMT`, `useWhatsAppQuickRepliesMT`, `useWhatsAppTemplatesMT` |
| **Adapters** | `useWhatsAppSessionsAdapter`, `useWhatsAppConversationsAdapter`, `useWhatsAppMessagesAdapter`, `useWhatsAppLabelsAdapter`, `useWhatsAppQuickRepliesAdapter`, `useWhatsAppTemplatesAdapter`, `useWhatsAppPermissionsAdapter` |
| **Pages** | `WhatsAppSessoes.tsx`, `WhatsAppChat.tsx`, `WhatsAppDashboard.tsx`, `WhatsAppTemplates.tsx`, `WhatsAppRespostasRapidas.tsx` |
| **Components** | `SessaoCard`, `SessaoFormModal`, `QRCodeModal`, `ImportSessoesModal`, `chat/ChatInput`, `chat/ChatMessages`, `chat/ChatHeader`, `chat/ChatSidebar`, `chat/MessageTemplates` |
| **Edge Functions** | `waha-proxy`, `waha-webhook` |

Ver [PLANO_MIGRACAO_WHATSAPP_MT.md](./PLANO_MIGRACAO_WHATSAPP_MT.md) para detalhes técnicos completos.

### Funcionalidades Implementadas

#### Funcionalidades Base
- [x] Configuração WAHA (URL, API Key, Engine)
- [x] Teste de conexão com servidor WAHA
- [x] CRUD de sessões (criar, editar, deletar)
- [x] Start/Stop/Restart sessões
- [x] QR Code de autenticação com polling
- [x] Importar sessões existentes do WAHA
- [x] Listar e filtrar chats
- [x] Visualizar mensagens
- [x] Real-time subscriptions (Supabase)
- [x] Sincronização manual com WAHA
- [x] Webhook para eventos em tempo real
- [x] Emoji picker no chat
- [x] Status de entrega (✓ ✓✓)

#### Novas Funcionalidades (Janeiro 2025)

- [x] **Envio de mensagens para WAHA** - Mensagens são enviadas para API WAHA antes de salvar no banco
- [x] **Envio de mídia** - Suporte para fotos, vídeos, documentos e áudio (até 16MB)
- [x] **Templates de mensagens** - 10 templates pré-configurados com categorias
- [x] **Validação de permissões** - Hook `useWhatsAppPermissions` valida `can_send` e `can_manage`
- [x] **QR Code com auto-refresh** - QR atualiza automaticamente a cada 30s
- [x] **Fallback offline** - Carrega dados do banco quando WAHA indisponível
- [x] **Retry de mensagens** - Função para reenviar mensagens falhadas
- [x] **Gestão de sessões** - Hook `useWhatsAppSessionManager` com auto-check (60s)
- [x] **UI aprimorada** - Loading states, feedback visual, toast notifications

### Status do Módulo: ~95% Funcional

| Área | Status |
|------|--------|
| Gerenciamento de sessões | 100% |
| Autenticação QR | 100% |
| Visualização de chats | 100% |
| Sincronização | 100% |
| Real-time updates | 100% |
| **Envio de mensagens** | **100%** |
| Envio de mídia | 100% |
| Templates | 100% |
| Permissões | 100% |
| Reconexão automática | 80% |

---

## 🔒 Função v3 de Extração de Telefone (CRÍTICO - NÃO MEXER)

> ⚠️ **AVISO IMPORTANTE**: Esta função foi testada e validada extensivamente. **NÃO MODIFICAR** sem autorização explícita.

### Localização
- **Arquivo**: `src/services/waha-api.ts`
- **Método**: `extractPhoneNumber(sessionName, chatId, chatData)`
- **Linhas**: 624-803

### Onde é Usada (SEMPRE passa por ela)

#### 1. Sincronização via Página de Sessões
- **Arquivo**: `src/pages/WhatsAppSessoes.tsx`
- **Função**: `handleSyncConversas()` (linha ~1578)
- **Trigger**: Botão "Sincronizar Conversas" na lista de sessões

#### 2. Sincronização via Botão do Chat
- **Arquivo**: `src/hooks/useWhatsAppChatAdapter.ts`
- **Função**: `syncChatsFromWaha()` (linha ~896)
- **Trigger**: Botão de refresh (ícone ↻) dentro do chat

### 15 Fontes de Extração (em ordem de prioridade)

A função tenta extrair o telefone de **15 campos diferentes**, garantindo sucesso mesmo quando o WAHA usa formato `@lid` (NOWEB engine):

#### Grupo 0: Campos Diretos (4 fontes)
1. `chatData.phone`
2. `chatData.phoneNumber`
3. `chatData.number`
4. `chatData.contact?.phone`

#### Grupo 1: remoteJidAlt (1 fonte)
5. `lastMessage._data.key.remoteJidAlt` ← **PRINCIPAL para @lid**

#### Grupo 2: from (1 fonte)
6. `lastMessage._data.from` ← Para mensagens **RECEBIDAS**

#### Grupo 3: to (1 fonte)
7. `lastMessage._data.to` ← Para mensagens **ENVIADAS**

#### Grupo 4: JID (2 fontes)
8. `contact.jid`
9. `chatData.jid`

#### Grupo 5: Participant (2 fontes)
10. `lastMessage.participant`
11. `chatData.participant`

#### Grupo 6: Nome (1 fonte)
12. `chat.name` (se parecer telefone: 10-15 dígitos)

#### Grupo 7: API WAHA (3 fontes)
13. `resolveLidToPhone()` - API `/api/${session}/lid/${lid}`
14. `contact.number` - API `/api/${session}/contacts/${id}`
15. `contact.id` - API `/api/${session}/contacts/${id}`

### Formatos Suportados

| Formato | Exemplo | Extração |
|---------|---------|----------|
| **@c.us** (WhatsApp Web) | `5511999999999@c.us` | Direto do chatId |
| **@lid** (NOWEB) | `276544522055926@lid` | Navega por 15 fontes |
| **@g.us** (Grupos) | `12345678@g.us` | Retorna `null` |

### Validação e Limpeza

Após extração, o número é validado por `cleanPhoneNumber()`:
- Remove todos os caracteres não-numéricos
- Valida tamanho: 10-15 dígitos
- Retorna `null` se inválido

### Logs de Debug

A função gera logs console para troubleshooting:
```
[WAHA] Telefone extraído de remoteJidAlt: 5513991888100
[WAHA] Telefone extraído de _data.from: 5513991888100
[WAHA] Telefone resolvido via API LID: 5513991888100
```

### Integração com Criação de Leads

Após extração do telefone, ambas as funções de sincronização **criam automaticamente um lead** se:
1. ✅ Não é grupo (`@g.us`)
2. ✅ Telefone foi extraído com sucesso
3. ✅ Não existe lead com esse telefone no banco

### Documentação Adicional

Ver arquivos de documentação detalhada:
- `LOGICA_EXTRACAO_TELEFONE_WHATSAPP.md` - Explicação das 8 fontes agrupadas
- `SOLUCAO_TELEFONE_LID.md` - Troubleshooting para @lid

### Por Que NÃO Mexer?

1. ✅ **Testada extensivamente** com 225.772 mensagens reais
2. ✅ **Compatível** com NOWEB e Web engines
3. ✅ **Fallback inteligente** - tenta múltiplas fontes
4. ✅ **Logs detalhados** para debug
5. ✅ **Validação robusta** de números
6. ❌ **Qualquer modificação** pode quebrar extração de @lid

---

### 📦 WhatsApp Multi-Tenant (Fevereiro 2026)

O módulo WhatsApp foi migrado para multi-tenant com suporte completo a isolamento por tenant e franchise.

#### Status da Migração

| Aspecto | Status |
|---------|--------|
| **Tabelas MT** | ✅ 8 tabelas criadas com RLS |
| **Dados migrados** | ✅ 225.772 mensagens, 6.666 conversas |
| **Hooks MT** | ✅ 7 hooks criados |
| **Adapters** | ✅ 7 adapters para transição |
| **Feature flag** | ✅ `USE_MT_WHATSAPP` no localStorage |

#### Arquivos MT Criados

```
src/types/
└── whatsapp-mt.ts              # Interfaces MT

src/hooks/multitenant/
├── useWhatsAppSessionsMT.ts    # CRUD sessões
├── useWhatsAppConversationsMT.ts # Conversas + real-time
├── useWhatsAppMessagesMT.ts    # Mensagens + paginação infinita
├── useWhatsAppLabelsMT.ts      # Labels/etiquetas
├── useWhatsAppQuickRepliesMT.ts # Respostas rápidas
├── useWhatsAppTemplatesMT.ts   # Templates
└── useWhatsAppPermissionsMT.ts # Permissões granulares

src/hooks/
├── useWhatsAppSessionsAdapter.ts
├── useWhatsAppConversationsAdapter.ts
├── useWhatsAppMessagesAdapter.ts
├── useWhatsAppLabelsAdapter.ts
├── useWhatsAppQuickRepliesAdapter.ts
├── useWhatsAppTemplatesAdapter.ts
└── useWhatsAppPermissionsAdapter.ts
```

#### Modo MT (Sempre Ativo)

O sistema WhatsApp usa EXCLUSIVAMENTE tabelas `mt_whatsapp_*`. Não há modo legacy.

**Requisitos:**

1. Usuário deve existir em `mt_users` com `auth_user_id` correto
2. Usuário deve estar vinculado a um tenant ativo
3. Tenant deve ter módulo 'whatsapp' habilitado
4. TenantContext deve estar carregado

#### Tabelas MT WhatsApp

| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `mt_whatsapp_sessions` | 2 | Sessões WAHA |
| `mt_whatsapp_conversations` | 6.666 | Conversas |
| `mt_whatsapp_messages` | 225.772 | Mensagens |
| `mt_whatsapp_templates` | 3 | Templates |
| `mt_whatsapp_user_sessions` | 3 | Permissões |
| `mt_whatsapp_labels` | 0 | Etiquetas |
| `mt_whatsapp_quick_replies` | 0 | Respostas rápidas |
| `mt_whatsapp_conversation_labels` | 0 | Associação label↔conversa |

#### Hooks MT Disponíveis

```typescript
// Sessões
const { sessions, createSession, updateSession, deleteSession } = useWhatsAppSessionsMT();
const { session } = useWhatsAppSessionMT(sessionId);

// Conversas (com real-time)
const { conversations, markAsRead, archiveConversation } = useWhatsAppConversationsMT(sessionId);

// Mensagens (paginação infinita)
const { messages, sendMessage, fetchNextPage, hasNextPage } = useWhatsAppMessagesMT(conversationId);

// Permissões
const { canSend, canManage, grantPermission, revokePermission } = useWhatsAppPermissionsMT(sessionId);

// Labels
const { labels, createLabel, LABEL_COLORS } = useWhatsAppLabelsMT();

// Templates
const { templates, createTemplate, renderTemplate } = useWhatsAppTemplatesMT();

// Respostas rápidas
const { quickReplies, getByShortcut } = useWhatsAppQuickRepliesMT();
```

#### Níveis de Acesso

| Nível | Acesso WhatsApp |
|-------|-----------------|
| `platform` | Todas as sessões de todos os tenants |
| `tenant` | Todas as sessões do seu tenant |
| `franchise` | Sessões da sua franquia |
| `user` | Sessões com permissão explícita |

#### Documentação Completa

Ver [PLANO_MIGRACAO_WHATSAPP_MT.md](./PLANO_MIGRACAO_WHATSAPP_MT.md) para detalhes técnicos completos.

---

## Módulo Influenciadoras

### Visão Geral
Sistema completo de gestão de influenciadoras digitais com:
- Código de indicação e tracking via URL (`?influenciadores=CODE`)
- Integração WAHA para envio de promoções
- Sistema de pagamentos e comissões
- Portal self-service para influenciadoras
- Vinculação híbrida (global + por franquia)

### Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                          │
│  Influenciadoras.tsx │ InfluenciadoraEdit │ Portal           │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   SUPABASE BACKEND                           │
│  Tables: mt_influencers, mt_influencer_contracts, etc.      │
│  Auth: Magic link via WAHA                                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    WAHA INTEGRATION                          │
│  Enviar promoções e códigos de verificação                   │
└─────────────────────────────────────────────────────────────┘
```

### Tabelas Multi-Tenant

| Tabela MT | Descrição |
|-----------|-----------|
| `mt_influencers` | Perfil principal da influenciadora |
| `mt_influencer_social_networks` | Redes sociais com seguidores |
| `mt_influencer_pricing` | Valores por tipo de conteúdo |
| `mt_influencer_referrals` | Histórico de indicações |
| `mt_influencer_contracts` | Contratos e modalidades |
| `mt_influencer_payments` | Pagamentos realizados |
| `mt_influencer_credits` | Créditos de permuta |
| `mt_influencer_posts` | Posts publicados |
| `mt_influencer_promotions` | Promoções enviadas |
| `mt_influencer_messages` | Log de mensagens WAHA |

### Hooks Multi-Tenant

```typescript
// CRUD principal
useInfluenciadorasMT(filters)

// Financeiro
useInfluenciadoraContratosMT(influenciadoraId)
useInfluenciadoraPagamentosMT(filters)
useInfluenciadoraCreditosMT(influenciadoraId)
useInfluenciadoraPostsMT(influenciadoraId)

// Valores e indicações
useInfluenciadoraPricingMT(influenciadoraId)
useInfluenciadoraReferralsMT(filters)

// WAHA
useInfluenciadoraPromocoesMT(filters)

// Autenticação do Portal
useInfluenciadoraAuthMT()
```

### Rotas Admin
```
/influenciadoras              → Listagem
/influenciadoras/novo         → Criar influenciadora
/influenciadoras/:id          → Visualizar detalhes
/influenciadoras/:id/editar   → Editar influenciadora
/influenciadoras/promocoes    → Gestão de promoções
/influenciadoras/relatorios   → Relatórios
```

### Rotas Portal (Self-Service)
```
/influenciadora/cadastro      → Landing page pública
/influenciadora/login         → Login com código
/influenciadora/portal        → Dashboard
/influenciadora/perfil        → Meu perfil
/influenciadora/valores       → Meus valores
/influenciadora/indicacoes    → Minhas indicações
/influenciadora/ganhos        → Meus ganhos
/influenciadora/permutas      → Minhas permutas
/influenciadora/posts         → Meus posts
```

### Tracking de Indicações

**URL com código**: `https://site.com/form/slug?influenciadores=CODE`

O código é capturado em `FormularioPublico.tsx` e registrado na tabela `mt_influencer_referrals`.

### Modalidades de Contrato
1. **Mensal** - Pagamento fixo mensal
2. **Por Post** - Valor por conteúdo produzido
3. **Comissão** - % ou valor fixo por conversão
4. **Permuta** - Troca por procedimentos
5. **Misto** - Combinação de modalidades

### Permissões
- **Admin**: Vê todas as influenciadoras
- **Franqueado**: Vê globais (sem franqueado_id) + próprias

---

## Credenciais de Acesso

### Painel Admin
- **URL Local**: http://localhost:8080
- **URL Produção**: https://www.yeslaserpraiagrande.com.br (ou https://www.depilacaoalaserpraiagrande.com.br)
- **Email**: marketing@franquiayeslaser.com.br
- **Senha**: yeslaser@2025M

### WAHA Server
- **URL**: https://waha.yeslaser.com.br
- **API Key**: GY9SDuKPFnJ4_dr (atualizada em mt_waha_config - Feb 2026)
- **API Key Antiga**: ~~wahamkt@310809~~ (OBSOLETA - retorna 401)
- **Engine**: NOWEB
- **Auth Header**: `X-Api-Key: GY9SDuKPFnJ4_dr`
- **Configuração**: Via painel em Configurações → WhatsApp

### Supabase Dashboard (Studio)
- **URL**: https://supabase.yeslaserpraiagrande.com.br
- **User**: OlJafwzZkirOedBv
- **Password**: IQp1QWS8r2lhIZ4tk29ZyOmRdcgxs0Tt

### Supabase API
- **URL**: https://supabase-app.yeslaserpraiagrande.com.br
- **Anon Key**: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MDc4MTc0MCwiZXhwIjo0OTI2NDU1MzQwLCJyb2xlIjoiYW5vbiJ9.fPIz99uMBXqwF9vwupAtYO_mGLlrGdeBoHofmjWg1L4
- **Service Role Key**: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MDc4MTc0MCwiZXhwIjo0OTI2NDU1MzQwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.K1j07Xd07FuQHNNXqnwXnWvakPBfUirpKXqB5sZmkTE

### PostgreSQL (Direto)
- **Host**: supabase-app.yeslaserpraiagrande.com.br
- **Database**: postgres
- **Password**: ZZy07JXbfuFDWaOuEdVrYhEAl6b9Lld3

### MinIO (Object Storage)
- **User**: 8w7SHVe62ZAKfj6d
- **Password**: w1BdMeqJESrapnytl6tLPV8T8Cg2Sb1W

### Coolify (Docker Management)
- **URL**: https://coolify.otimaideia.com.br
- **Servidor**: VPS DigitalOcean (146.190.141.13)

### SSH Server (VPS)
- **Host**: 5.189.153.222
- **User**: root
- **Password**: Mkt@310809
- **Uso**: Acesso direto ao servidor para operações Docker e volumes

---

## Execução de SQL / Migrations

**IMPORTANTE**: Sempre usar o endpoint `/pg/query` para executar SQL no Supabase self-hosted.

### Formato de Execução

```bash
SERVICE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MDc4MTc0MCwiZXhwIjo0OTI2NDU1MzQwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.K1j07Xd07FuQHNNXqnwXnWvakPBfUirpKXqB5sZmkTE"

curl -s -X POST "https://supabase-app.yeslaserpraiagrande.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT 1 as test"}'
```

### Exemplos de Uso

**Consulta simples:**
```bash
curl -s -X POST "https://supabase-app.yeslaserpraiagrande.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT column_name FROM information_schema.columns WHERE table_name = '\''nome_tabela'\'' LIMIT 5"}'
```

**ALTER TABLE:**
```bash
curl -s -X POST "https://supabase-app.yeslaserpraiagrande.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "ALTER TABLE minha_tabela ADD COLUMN IF NOT EXISTS nova_coluna varchar(100)"}'
```

**CREATE TABLE:**
```bash
curl -s -X POST "https://supabase-app.yeslaserpraiagrande.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "CREATE TABLE IF NOT EXISTS minha_tabela (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome varchar(255) NOT NULL)"}'
```

**CREATE FUNCTION (escapar aspas):**
```bash
curl -s -X POST "https://supabase-app.yeslaserpraiagrande.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "CREATE OR REPLACE FUNCTION minha_funcao() RETURNS TRIGGER AS $$ BEGIN IF NEW.campo IS NULL THEN NEW.campo := '\''valor'\''; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql"}'
```

### Notas Importantes

1. **Usar SERVICE_KEY**: Sempre usar o service_role key, não o anon key
2. **Escapar aspas simples**: Use `'\''` para escapar aspas simples dentro do JSON
3. **Resposta vazia `[]`**: Significa sucesso para comandos DDL (ALTER, CREATE, DROP)
4. **Verificar após execução**: Sempre verificar se as alterações foram aplicadas
5. **NÃO usar `exec_sql` RPC**: A função exec_sql requer super_admins, use `/pg/query` diretamente

### Queries de Verificação Multi-Tenant

**Contar tabelas mt_*:**
```sql
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'mt_%';
-- Resultado esperado: 88
```

**Listar tenants:**
```sql
SELECT slug, nome_fantasia, is_active FROM mt_tenants ORDER BY slug;
```

**Listar módulos:**
```sql
SELECT codigo, nome, is_core FROM mt_modules ORDER BY ordem;
```

**Verificar RLS habilitado:**
```sql
SELECT COUNT(*) FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'mt_%' AND rowsecurity = true;
-- Resultado esperado: 88
```

**Verificar funções RLS:**
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('current_user_id', 'current_tenant_id', 'is_platform_admin');
```

**Contar módulos por tenant:**
```sql
SELECT t.slug, COUNT(tm.module_id) as modulos
FROM mt_tenants t
LEFT JOIN mt_tenant_modules tm ON t.id = tm.tenant_id AND tm.is_active = true
GROUP BY t.slug ORDER BY t.slug;
```

---

## Regras de Deploy (OBRIGATÓRIO)

> ⚠️ **REGRA CRÍTICA**: O deploy do frontend é feito EXCLUSIVAMENTE via `git push`. NUNCA usar SSH/SCP para deploy do frontend.

### Frontend (React/Vite)
- **Método**: `git push origin main` → Coolify puxa automaticamente e faz build + deploy
- **Repositório**: `origin` → https://github.com/otimaideia/sistema-otima-crm-whatsapp.git
- **NUNCA** usar SSH/SCP para subir arquivos do frontend
- **NUNCA** usar SSH para reiniciar containers do frontend

### Edge Functions (Supabase/Deno)
- **Método**: SCP via SSH para o servidor
- **Servidor**: `root@5.189.153.222` (senha: `Mkt@310809`)
- **Caminho**: `/data/coolify/services/fgk4cco0gssk4sggo848kggo/volumes/functions/`
- **Este é o ÚNICO caso** onde SSH/SCP é permitido

### Resumo
| Componente | Método de Deploy | Comando |
|------------|-----------------|---------|
| Frontend | Git push | `git push origin main` |
| Edge Functions | SCP via SSH | `scp arquivo root@5.189.153.222:/data/coolify/.../functions/` |

---

## Erros Conhecidos

### Foreign Key Relationships (Dashboard)
```
PGRST200: Searched for a foreign key relationship...
```
Ocorre ao carregar indicações e cadastros de promoção. Verificar relacionamentos nas tabelas MT:
- `mt_influencer_referrals`
- `mt_form_submissions`
- `mt_leads`

---

## Melhorias Recomendadas

### Prioridade Alta (CONCLUÍDO)
1. ~~**Implementar envio de mensagens para WAHA**~~ ✅
2. ~~**Validar permissões de usuário**~~ ✅
3. ~~**Adicionar fallback offline**~~ ✅
4. ~~**Implementar envio de mídia**~~ ✅
5. ~~**Adicionar templates de mensagens**~~ ✅

### Prioridade Média
6. Habilitar strict mode no TypeScript
7. Adicionar testes automatizados (Vitest + RTL)
8. Documentar API e endpoints
9. Implementar gravação de áudio diretamente no chat

### Prioridade Baixa
10. Métricas de performance do WhatsApp
11. Dashboard com estatísticas de mensagens
12. Integração com CRM (vincular leads a conversas)

---

## 🚀 Roadmap Multi-Tenant

### Fase 1: Banco de Dados ✅ CONCLUÍDA
- [x] 88 tabelas mt_* criadas
- [x] RLS habilitado em todas as tabelas
- [x] 8 funções auxiliares de segurança
- [x] 9 tenants cadastrados
- [x] 18 módulos registrados
- [x] 9 tipos de integração
- [x] Dados de branding por tenant
- [x] pgvector para chatbot IA

### Fase 2: Frontend Multi-Tenant ✅ CONCLUÍDA (100%)
- [x] TenantContext (completo)
- [x] BrandingContext (completo com CSS variables dinâmicas)
- [x] Hooks MT para Leads (useLeadsMT, useLeadMT, useLeadMetricsMT)
- [x] Hooks MT para Atividades (useLeadActivitiesMT)
- [x] Hooks MT para Funil (useFunilLeadsMT, useFunilMetricsMT)
- [x] Hooks MT para Histórico (useLeadHistoryMT, useLeadTimelineMT)
- [x] Hooks MT para Indicações (useIndicacoesMT)
- [x] Hooks MT para CRM (useLeadCRMMT)
- [x] Adapters para transição gradual (useLeadsAdapter)
- [x] Hooks MT para Departamentos (useDepartments, useDepartment, useUserDepartments)
- [x] Hooks MT para Equipes (useTeams, useTeam, useUserTeams)
- [x] Hooks MT para Formulários (useFormulariosMT, useFormularioMT, useFormFieldsMT)
- [x] Hooks MT para Agendamentos (useAgendamentosMT, useAgendamentoMT, useDisponibilidade)
- [x] Adapters para Formulários e Agendamentos (useFormulariosAdapter, useAgendamentosAdapter)
- [x] Páginas MT: Departamentos (CRUD completo)
- [x] Páginas MT: Equipes (CRUD completo)
- [x] Páginas MT: Empresas/Tenants (CRUD completo)
- [x] Páginas MT: Franquias MT (CRUD completo)
- [x] Páginas MT: Usuários MT (CRUD completo)
- [x] Componentes: TenantSelector (dropdown + list variants)
- [x] Componentes: FranchiseSelector (dropdown + select + list variants)
- [x] ConfiguracoesIndex atualizado com links MT
- [x] CSS variables dinâmicas por tenant (hex → HSL, shadcn/Tailwind)
- [x] Detecção de tenant por subdomínio (useTenantDetection)
- [x] Sidebar dinâmica baseada em módulos habilitados

#### CSS Variables Dinâmicas por Tenant

O BrandingContext converte automaticamente as cores hexadecimais do branding do tenant para formato HSL usado pelo shadcn/Tailwind:

```typescript
// Cores do branding (hex) são convertidas para HSL
// Exemplo: #E91E63 → "340 82% 52%"

// Variáveis aplicadas automaticamente:
// --primary, --secondary, --success, --destructive, --warning
// --background, --card, --sidebar-background
// --foreground, --card-foreground, --sidebar-foreground
// --border, --input, --radius
```

#### Detecção de Tenant

```typescript
// Em produção: detecta por subdomínio
// yeslaser.app.com → tenant YESlaser
// popdents.app.com → tenant PopDents

// Em desenvolvimento: usa query param ou path
// localhost:8080?tenant=popdents → tenant PopDents

// Fallback: yeslaser (tenant padrão)
```

#### Hooks Multi-Tenant de Leads

**Hooks Disponíveis (todos usam tabelas mt_*):**
- `useLeadsMT.ts` - CRUD principal de leads
- `useLeadActivitiesMT.ts` - Atividades e tarefas
- `useFunilLeadsMT.ts` - Kanban/Funil de vendas
- `useLeadHistoryMT.ts` - Timeline e histórico
- `useLeadMetricsMT.ts` - Métricas e KPIs
- `useIndicacoesMT.ts` - Sistema de indicações
- `useLeadCRMMT.ts` - Mini CRM integrado

**Todas as Páginas usam MT:**
- [x] `Leads.tsx` - useLeadsMT
- [x] `LeadDetail.tsx` - useLeadMT, useLeadHistoryMT, useIndicacoesMT
- [x] `LeadEdit.tsx` - useLeadMT, useLeadsMT
- [x] `LeadsTable.tsx` - useLeadHistoryMT
- [x] `FranquiaLeads.tsx` - useLeadsMT
- [x] `LeadMiniCRM.tsx` - useLeadCRMMT

**Requisitos:**
1. Usuário deve existir em mt_users com auth_user_id correto
2. Usuário deve estar vinculado a um tenant ativo
3. Tenant deve ter módulo 'leads' habilitado

#### Novos Hooks MT (Fevereiro 2026)

**Departamentos e Equipes:**
```typescript
// src/hooks/multitenant/useDepartments.ts
const { departments, departmentTree, createDepartment, updateDepartment, deleteDepartment } = useDepartments();
const { department, isLoading } = useDepartment(id);
const { userDepartments, assignDepartment, unassignDepartment } = useUserDepartments(userId);

// src/hooks/multitenant/useTeams.ts
const { teams, createTeam, updateTeam, deleteTeam } = useTeams();
const { team, members, isLoading } = useTeam(id);
const { userTeams, joinTeam, leaveTeam } = useUserTeams(userId);
```

**Formulários MT:**
```typescript
// src/hooks/multitenant/useFormulariosMT.ts
const { forms, stats, createForm, updateForm, deleteForm, togglePublish, duplicateForm } = useFormulariosMT();
const { form, isLoading, incrementView } = useFormularioMT(id);
const { fields, createField, updateField, deleteField, reorderFields } = useFormFieldsMT(formId);
```

**Agendamentos MT:**
```typescript
// src/hooks/multitenant/useAgendamentosMT.ts
const {
  appointments, appointmentsByDay, stats,
  createAppointment, updateAppointment, deleteAppointment,
  confirmAppointment, cancelAppointment, checkIn, checkOut, markAsNoShow
} = useAgendamentosMT({ startDate, endDate, status });

const { appointment, isLoading } = useAgendamentoMT(id);
const { slots, isLoading } = useDisponibilidade(franchiseId, date);
```

**Todos os Módulos usam MT:**
```typescript
// Formulários (mt_forms, mt_form_fields, mt_form_submissions)
const { formularios, isLoading, createFormulario, ... } = useFormulariosMT();

// Agendamentos (mt_appointments)
const { appointments, isLoading, createAppointment, ... } = useAgendamentosMT();

// WhatsApp (mt_whatsapp_sessions, mt_whatsapp_conversations, mt_whatsapp_messages)
const { sessions, isLoading, createSession, ... } = useWhatsAppSessionsMT();
```

**Componentes MT Implementados:**
```typescript
// src/components/multitenant/TenantSelector.tsx
// Variantes: dropdown, list
// Visível apenas para platform admins
<TenantSelector variant="dropdown" onSelect={handleTenantChange} />

// src/components/multitenant/FranchiseSelector.tsx
// Variantes: dropdown, select, list
// Suporta: agrupamento por estado, busca, limpar seleção
<FranchiseSelector variant="select" showClear groupByState />
```

### Fase 3: Dados Multi-Tenant ✅ CONCLUÍDA (100%)

Todos os dados estão nas tabelas `mt_*`. Sistema 100% Multi-Tenant.

**Dados Atuais (Fevereiro 2026):**

| Entidade | Registros MT | Tabela |
|----------|--------------|--------|
| Leads | 303 | `mt_leads` |
| Formulários | 16 | `mt_forms` |
| Agendamentos | 1 | `mt_appointments` |
| Franquias | 111 (9 tenants) | `mt_franchises` |
| Serviços | 84 | `mt_services` |
| Usuários | 27 | `mt_users` |
| Campanhas | 1 | `mt_campaigns` |
| WhatsApp Sessões | 2 | `mt_whatsapp_sessions` |
| WhatsApp Conversas | 6.666 | `mt_whatsapp_conversations` |
| WhatsApp Mensagens | 225.772 | `mt_whatsapp_messages` |

### Fase 4: Novos Módulos
- [ ] Chatbot IA funcional
- [ ] Sistema de automações
- [ ] API pública com rate limiting
- [ ] Dashboard personalizado por tenant

---

## Hooks Principais

### useWhatsAppChat
```typescript
const {
  chats,              // Lista de conversas
  messages,           // Mensagens do chat selecionado
  selectedChatId,     // ID do chat ativo
  isLoadingChats,
  isLoadingMessages,
  isSyncing,
  selectChat,         // Selecionar conversa
  sendMessage,        // Enviar texto para WAHA + salvar no banco
  sendMedia,          // Enviar mídia (imagem, vídeo, documento, áudio)
  retryMessage,       // Reenviar mensagem falhada
  syncChatsFromWaha,  // Sincronizar conversas do WAHA
  syncMessagesFromWaha, // Sincronizar mensagens de um chat
  refreshChats,       // Recarregar lista de chats
  refreshMessages     // Recarregar mensagens
} = useWhatsAppChat(sessionName, sessaoId);
```

### useWhatsAppPermissions
```typescript
const {
  canSend,          // Pode enviar mensagens
  canManage,        // Pode gerenciar sessão
  isLoading,
  error,
  refetch,          // Recarregar permissões
  grantPermission,  // Conceder permissão a usuário
  revokePermission, // Revogar permissão
  getSessionPermissions // Listar permissões da sessão
} = useWhatsAppPermissions(sessaoId);
```

### useWhatsAppSessionManager
```typescript
const {
  sessionStatuses,   // Map<sessionName, SessionStatus>
  isChecking,
  checkSessionStatus,  // Verificar status de uma sessão
  checkAllSessions,    // Verificar todas as sessões
  reconnectSession,    // Tentar reconectar sessão
  restartSession,      // Reiniciar sessão
  startAutoCheck,      // Iniciar verificação automática (intervalo em ms)
  stopAutoCheck        // Parar verificação automática
} = useWhatsAppSessionManager();
```

### useWhatsAppSessoes
```typescript
const {
  sessoes,        // Lista de sessões
  isLoading,
  createSessao,   // Criar nova sessão
  updateSessao,   // Atualizar dados
  updateStatus,   // Atualizar status/QR
  deleteSessao,   // Remover sessão
  getSessao,      // Buscar por ID
  refetch         // Recarregar lista
} = useWhatsAppSessoes();
```

### useWahaConfig
```typescript
const {
  config,         // Configuração atual
  isLoading,
  error,
  saveConfig,     // Salvar configuração
  isSaving,
  testConnection, // Testar conexão
  isTesting
} = useWahaConfig();
```

---

## Edge Functions

### waha-proxy
Proxy entre frontend e WAHA API com sincronização para banco.

**Endpoints:**
- `GET /chats` - Buscar chats
- `GET /messages` - Buscar mensagens
- `POST /send-text` - Enviar mensagem
- `GET /backup-chats` - Fallback do banco
- `GET /backup-messages` - Fallback do banco

### waha-webhook
Recebe eventos do servidor WAHA.

**Eventos:**
- `message` / `message.any` - Nova mensagem
- `message.ack` - Status de entrega
- `session.status` - Status da sessão

### whatsapp-chatbot-handler
Handler de chatbot IA com integração OpenAI/Anthropic para WhatsApp.

**Status**: ✅ Deployed (15/02/2026 via SCP)
**Tamanho**: 7.3KB
**Localização**: `/home/deno/functions/whatsapp-chatbot-handler/index.ts`

**Funcionalidades:**
- Integração OpenAI (GPT-4) e Anthropic (Claude)
- Histórico de conversas (últimas 10 mensagens)
- System prompts personalizáveis
- Configuração de temperatura e max_tokens
- Estatísticas de uso (tokens)
- Auto-respond configurável por sessão
- CORS habilitado

**Estrutura de Dados:**
- Configuração: `mt_chatbot_config` (API key, model, prompts)
- Vínculo WhatsApp: `mt_whatsapp_bot_config` (session → chatbot)
- Mensagens: `mt_chatbot_messages`
- Conversas: `mt_chatbot_conversations`

**Próximos Passos para Ativar:**
1. Criar configuração de chatbot em `mt_chatbot_config`:
   - `api_key_encrypted`: Chave OpenAI ou Anthropic
   - `provider`: "openai" ou "anthropic"
   - `modelo`: "gpt-4-turbo-preview" ou "claude-3-opus-20240229"
   - `system_prompt`: Personalidade do bot
   - `temperature`: 0.0-1.0 (padrão 0.7)
   - `max_tokens`: Limite de resposta (padrão 500)

2. Criar vínculo em `mt_whatsapp_bot_config`:
   - `session_id`: UUID da sessão WhatsApp
   - `chatbot_config_id`: UUID do chatbot criado
   - `is_active`: true
   - `auto_respond`: true

**Endpoint:**
```bash
POST https://supabase-app.yeslaserpraiagrande.com.br/functions/v1/whatsapp-chatbot-handler
Content-Type: application/json
Authorization: Bearer <anon-key>

{
  "sessionId": "<uuid-session>",
  "message": "Olá, como você pode me ajudar?",
  "conversationId": "<uuid-conversation>"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "response": "Mensagem gerada pela IA",
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 50,
    "total_tokens": 200
  },
  "model": "gpt-4-turbo-preview",
  "provider": "openai"
}
```

---

## Contato

Desenvolvido para **YESlaser Franquias**

- **Suporte**: marketing@franquiayeslaser.com.br

---

## Configurações WAHA (Atual)

### Servidor WAHA
- **URL**: https://waha.yeslaser.com.br
- **API Key**: GY9SDuKPFnJ4_dr (de mt_waha_config)
- **Engine**: NOWEB (Recomendado)
- **Webhook URL**: https://supabase-app.yeslaserpraiagrande.com.br/functions/v1/waha-webhook

### Endpoints WAHA Disponíveis
```
GET/POST  /api/sessions           - Gerenciar sessões
GET       /api/{session}/auth/qr  - Obter QR Code
POST      /api/sendText           - Enviar mensagem de texto
GET       /api/{session}/chats    - Listar chats
GET       /api/{session}/chats/{chatId}/messages - Listar mensagens
```

### Sessões Cadastradas
| Nome | Session Name | Franquia | Status |
|------|--------------|----------|--------|
| Vendas Danilo | vendas_danilo_altamira | YESlaser Altamira | Aguardando QR |
| session_01ketg7204z5yq9phm3mf708pr | session_01ketg7204z5yq9phm3mf708pr | MCC YESlaser | Aguardando QR |

---

## Fluxo de Autenticação WhatsApp

1. Criar sessão no painel (Nova Sessão)
2. Sistema chama `POST /api/sessions` no WAHA
3. Sessão entra em status "SCAN_QR_CODE"
4. Usuário clica "Ver QR Code"
5. Sistema busca `GET /api/{session}/auth/qr`
6. Exibe QR Code no modal
7. Usuário escaneia com WhatsApp no celular
8. WAHA atualiza status para "WORKING"
9. Polling detecta mudança e fecha modal
10. Chat disponível para uso

---

## Integração Yeslaser Office API

### Configuração Atual
- **Usuário**: marketing@franquiayeslaser.com.br
- **Senha**: yeslaser@2025M
- **Documentação**: https://apiaberta.yeslaseroffice.com.br/swagger/ui/index

### Funcionalidades
- Sincronizar agendamentos com sistema principal
- Consultar horários disponíveis por unidade
- Enviar leads diretamente para a API
- Listar unidades e agências de marketing

---

## Credenciais de Sistema

### Sudo (macOS)
- **Senha**: Mkt@310809
- **Uso**: `sudo chown -R $(whoami) /path/to/dir`

### Corrigir Permissões do Projeto
```bash
sudo chown -R $(whoami) /Applications/XAMPP/xamppfiles/htdocs/sites/yeslaserpainel
```

 modelo para usar a sql 
 SERVICE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MDc4MTc0MCwiZXhwIjo0OTI2NDU1MzQwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.K1j07Xd07FuQHNNXqnwXnWvakPBfUirpKXqB5sZmkTE"

echo "=== LIMPANDO DADOS DE TESTE ==="

# Deletar leads de teste (historico será deletado por CASCADE)
curl -s -X POST "https://supabase-app.yeslaserpraiagrande.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "DELETE FROM mt_leads WHERE email LIKE '\''%teste.com'\'' RETURNING nome"}'

echo ""

# Deletar submissões de teste
curl -s -X POST "https://supabase-app.yeslaserpraiagrande.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "DELETE FROM mt_form_submissions WHERE form_id = '\''3254d519-325d-4152-b3c7-b6e3ef1fc67d'\'' RETURNING id"}'

echo ""

# Deletar formulário de teste (campos serão deletados por CASCADE)
curl -s -X POST "https://supabase-app.yeslaserpraiagrande.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "DELETE FROM mt_forms WHERE slug = '\''teste-promocao-mcc'\'' RETURNING nome"}'

echo ""
echo "✅ Dados de teste removidos"
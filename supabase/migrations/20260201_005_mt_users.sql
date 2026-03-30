-- =============================================================================
-- MULTI-TENANT MIGRATION: Users Tables
-- Data: 01/02/2026
-- Descrição: Tabelas de usuários, roles e permissões
-- =============================================================================

-- -----------------------------------------------------------------------------
-- mt_users: Usuários do sistema multi-tenant
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Vínculo com auth.users do Supabase
    auth_user_id UUID UNIQUE,

    -- CONTEXTO MULTI-TENANT
    tenant_id UUID REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- NÍVEL DE ACESSO (Hierarquia)
    access_level VARCHAR(20) NOT NULL DEFAULT 'user',
    -- platform_admin: Acesso total ao sistema
    -- tenant_admin: Gerencia empresa e franquias
    -- franchise_admin: Gerencia sua franquia
    -- user: Opera conforme permissões

    -- IDENTIFICAÇÃO
    email VARCHAR(255) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    nome_curto VARCHAR(50),
    avatar_url TEXT,

    -- CONTATO (Padrão Internacional +5511999999999)
    telefone VARCHAR(20),
    whatsapp VARCHAR(20),

    -- PROFISSIONAL
    cargo VARCHAR(100),
    departamento VARCHAR(100),
    matricula VARCHAR(50),

    -- CONFIGURAÇÕES
    idioma VARCHAR(10) DEFAULT 'pt-BR',
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    tema VARCHAR(20) DEFAULT 'system', -- light, dark, system

    -- NOTIFICAÇÕES
    notificacoes_email BOOLEAN DEFAULT true,
    notificacoes_push BOOLEAN DEFAULT true,
    notificacoes_whatsapp BOOLEAN DEFAULT false,

    -- SEGURANÇA
    ultimo_login TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    failed_login_count INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    must_change_password BOOLEAN DEFAULT false,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret TEXT,

    -- CONTROLE
    status VARCHAR(20) DEFAULT 'ativo', -- ativo, inativo, pendente, suspenso, bloqueado
    data_admissao DATE,
    data_demissao DATE,

    -- TIMESTAMPS
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,

    -- CONSTRAINTS
    CONSTRAINT mt_users_access_level_check CHECK (
        access_level IN ('platform_admin', 'tenant_admin', 'franchise_admin', 'user')
    ),
    CONSTRAINT mt_users_status_check CHECK (
        status IN ('ativo', 'inativo', 'pendente', 'suspenso', 'bloqueado')
    ),
    -- Platform admin não precisa de tenant/franchise
    -- Tenant admin precisa de tenant
    -- Franchise admin precisa de tenant e franchise
    -- User precisa de tenant e pode ter franchise
    CONSTRAINT mt_users_hierarchy_check CHECK (
        (access_level = 'platform_admin') OR
        (access_level = 'tenant_admin' AND tenant_id IS NOT NULL) OR
        (access_level = 'franchise_admin' AND tenant_id IS NOT NULL AND franchise_id IS NOT NULL) OR
        (access_level = 'user' AND tenant_id IS NOT NULL)
    )
);

COMMENT ON TABLE mt_users IS 'Usuários do sistema com hierarquia de 4 níveis de acesso';

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_users_auth_user ON mt_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_mt_users_tenant ON mt_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_users_franchise ON mt_users(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_users_email ON mt_users(email);
CREATE INDEX IF NOT EXISTS idx_mt_users_access_level ON mt_users(access_level);
CREATE INDEX IF NOT EXISTS idx_mt_users_status ON mt_users(status);
CREATE INDEX IF NOT EXISTS idx_mt_users_tenant_status ON mt_users(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_mt_users_franchise_status ON mt_users(franchise_id, status);

-- -----------------------------------------------------------------------------
-- mt_roles: Definição de roles customizáveis
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Identificação
    codigo VARCHAR(50) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,

    -- Configuração
    is_system BOOLEAN DEFAULT false, -- Roles do sistema não podem ser editadas
    is_default BOOLEAN DEFAULT false, -- Role padrão para novos usuários

    -- Hierarquia (para herança de permissões)
    parent_role_id UUID REFERENCES mt_roles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,

    -- Constraint: código único por tenant (ou global se tenant_id = NULL)
    CONSTRAINT mt_roles_unique UNIQUE(tenant_id, codigo)
);

COMMENT ON TABLE mt_roles IS 'Roles customizáveis por tenant com herança';

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_roles_tenant ON mt_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_roles_codigo ON mt_roles(codigo);
CREATE INDEX IF NOT EXISTS idx_mt_roles_parent ON mt_roles(parent_role_id);

-- -----------------------------------------------------------------------------
-- mt_user_roles: Atribuição de roles aos usuários
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES mt_users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES mt_roles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Escopo da role
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE CASCADE,
    -- NULL = role válida para todo o tenant
    -- Preenchido = role válida apenas para essa franquia

    -- Validade
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ, -- NULL = sem expiração

    -- Quem atribuiu
    assigned_by UUID REFERENCES mt_users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint
    CONSTRAINT mt_user_roles_unique UNIQUE(user_id, role_id, franchise_id)
);

COMMENT ON TABLE mt_user_roles IS 'Atribuição de roles aos usuários com escopo por franquia';

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_user_roles_user ON mt_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_user_roles_role ON mt_user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_mt_user_roles_tenant ON mt_user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_user_roles_franchise ON mt_user_roles(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_user_roles_validity ON mt_user_roles(valid_from, valid_until);

-- -----------------------------------------------------------------------------
-- mt_permissions: Catálogo de permissões disponíveis
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identificação
    codigo VARCHAR(100) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,

    -- Categorização
    module_id UUID REFERENCES mt_modules(id) ON DELETE CASCADE,
    categoria VARCHAR(50), -- crud, action, view, config

    -- Tipo de permissão
    tipo VARCHAR(20) DEFAULT 'action', -- action, crud, view, manage

    -- Ordenação
    ordem INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_permissions IS 'Catálogo de permissões granulares por módulo';

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_permissions_codigo ON mt_permissions(codigo);
CREATE INDEX IF NOT EXISTS idx_mt_permissions_module ON mt_permissions(module_id);
CREATE INDEX IF NOT EXISTS idx_mt_permissions_categoria ON mt_permissions(categoria);

-- -----------------------------------------------------------------------------
-- mt_role_permissions: Permissões atribuídas às roles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES mt_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES mt_permissions(id) ON DELETE CASCADE,

    -- Configuração
    granted BOOLEAN DEFAULT true, -- true = concede, false = nega explicitamente

    -- Restrições adicionais (JSON para flexibilidade)
    restrictions JSONB DEFAULT '{}',
    -- Exemplo: {"franchise_ids": ["uuid1", "uuid2"]} - limita a franquias específicas

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint
    CONSTRAINT mt_role_permissions_unique UNIQUE(role_id, permission_id)
);

COMMENT ON TABLE mt_role_permissions IS 'Permissões atribuídas a cada role';

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_role_permissions_role ON mt_role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_mt_role_permissions_permission ON mt_role_permissions(permission_id);

-- -----------------------------------------------------------------------------
-- mt_user_permissions: Permissões diretas do usuário (override)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES mt_users(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES mt_permissions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Escopo
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE CASCADE,

    -- Configuração
    granted BOOLEAN DEFAULT true, -- true = concede, false = nega explicitamente

    -- Override de role (permissão direta tem prioridade)
    is_override BOOLEAN DEFAULT false,

    -- Validade
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,

    -- Quem atribuiu
    assigned_by UUID REFERENCES mt_users(id) ON DELETE SET NULL,
    reason TEXT, -- Motivo da atribuição/remoção

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint
    CONSTRAINT mt_user_permissions_unique UNIQUE(user_id, permission_id, franchise_id)
);

COMMENT ON TABLE mt_user_permissions IS 'Permissões diretas do usuário (override das roles)';

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_user_permissions_user ON mt_user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_user_permissions_permission ON mt_user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_mt_user_permissions_tenant ON mt_user_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_user_permissions_franchise ON mt_user_permissions(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_user_permissions_validity ON mt_user_permissions(valid_from, valid_until);

-- -----------------------------------------------------------------------------
-- mt_user_module_access: Acesso do usuário aos módulos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_user_module_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES mt_users(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES mt_modules(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Escopo
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE CASCADE,

    -- Permissões CRUD
    can_create BOOLEAN DEFAULT false,
    can_read BOOLEAN DEFAULT true,
    can_update BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    can_export BOOLEAN DEFAULT false,
    can_import BOOLEAN DEFAULT false,

    -- Permissões especiais
    can_manage BOOLEAN DEFAULT false, -- Configurar o módulo
    can_approve BOOLEAN DEFAULT false, -- Aprovar registros

    -- Restrições de dados
    data_filter JSONB DEFAULT '{}',
    -- Exemplo: {"status": ["ativo", "pendente"]} - só vê leads ativos/pendentes

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint
    CONSTRAINT mt_user_module_access_unique UNIQUE(user_id, module_id, franchise_id)
);

COMMENT ON TABLE mt_user_module_access IS 'Acesso granular do usuário aos módulos com permissões CRUD';

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_user_module_access_user ON mt_user_module_access(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_user_module_access_module ON mt_user_module_access(module_id);
CREATE INDEX IF NOT EXISTS idx_mt_user_module_access_tenant ON mt_user_module_access(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_user_module_access_franchise ON mt_user_module_access(franchise_id);

-- -----------------------------------------------------------------------------
-- INSERIR ROLES DO SISTEMA (Globais)
-- -----------------------------------------------------------------------------
INSERT INTO mt_roles (tenant_id, codigo, nome, descricao, is_system, is_default) VALUES
(NULL, 'super_admin', 'Super Administrador', 'Acesso total ao sistema (Platform Admin)', true, false),
(NULL, 'tenant_owner', 'Proprietário', 'Dono da empresa com acesso total ao tenant', true, false),
(NULL, 'tenant_manager', 'Gerente Geral', 'Gerencia todas as franquias do tenant', true, false),
(NULL, 'franchise_manager', 'Gerente de Unidade', 'Gerencia uma franquia específica', true, false),
(NULL, 'supervisor', 'Supervisor', 'Supervisiona equipe da franquia', true, false),
(NULL, 'attendant', 'Atendente', 'Atendimento e operações básicas', true, true),
(NULL, 'viewer', 'Visualizador', 'Apenas visualização de dados', true, false)
ON CONFLICT (tenant_id, codigo) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- INSERIR PERMISSÕES BASE
-- -----------------------------------------------------------------------------
-- Permissões serão inseridas via seed após criar módulos
-- Aqui criamos apenas as permissões genéricas

INSERT INTO mt_permissions (codigo, nome, descricao, categoria, tipo, ordem) VALUES
-- CRUD genérico
('create', 'Criar', 'Permissão para criar registros', 'crud', 'crud', 1),
('read', 'Visualizar', 'Permissão para visualizar registros', 'crud', 'crud', 2),
('update', 'Editar', 'Permissão para editar registros', 'crud', 'crud', 3),
('delete', 'Excluir', 'Permissão para excluir registros', 'crud', 'crud', 4),
('export', 'Exportar', 'Permissão para exportar dados', 'crud', 'crud', 5),
('import', 'Importar', 'Permissão para importar dados', 'crud', 'crud', 6),

-- Ações especiais
('manage', 'Gerenciar', 'Permissão para configurar/gerenciar', 'action', 'manage', 10),
('approve', 'Aprovar', 'Permissão para aprovar registros', 'action', 'action', 11),
('assign', 'Atribuir', 'Permissão para atribuir/delegar', 'action', 'action', 12),
('transfer', 'Transferir', 'Permissão para transferir entre franquias', 'action', 'action', 13),

-- Visualização
('view_reports', 'Ver Relatórios', 'Acesso aos relatórios do módulo', 'view', 'view', 20),
('view_analytics', 'Ver Analytics', 'Acesso aos dashboards e métricas', 'view', 'view', 21),
('view_all', 'Ver Todos', 'Ver registros de todas as franquias', 'view', 'view', 22),
('view_sensitive', 'Ver Dados Sensíveis', 'Ver dados sensíveis (CPF, financeiro)', 'view', 'view', 23),

-- Configuração
('config_module', 'Configurar Módulo', 'Alterar configurações do módulo', 'config', 'manage', 30),
('config_integrations', 'Configurar Integrações', 'Gerenciar integrações externas', 'config', 'manage', 31),
('config_automations', 'Configurar Automações', 'Criar e editar automações', 'config', 'manage', 32)

ON CONFLICT (codigo) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- TRIGGERS para updated_at
-- -----------------------------------------------------------------------------
CREATE TRIGGER trigger_mt_users_updated_at
    BEFORE UPDATE ON mt_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_roles_updated_at
    BEFORE UPDATE ON mt_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_user_roles_updated_at
    BEFORE UPDATE ON mt_user_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_permissions_updated_at
    BEFORE UPDATE ON mt_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_role_permissions_updated_at
    BEFORE UPDATE ON mt_role_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_user_permissions_updated_at
    BEFORE UPDATE ON mt_user_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_user_module_access_updated_at
    BEFORE UPDATE ON mt_user_module_access
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- FIM DA MIGRATION 005
-- =============================================================================

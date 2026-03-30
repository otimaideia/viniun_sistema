-- =============================================================================
-- MULTI-TENANT MIGRATION: Tenant Tables
-- Data: 01/02/2026
-- Descrição: Tabelas de empresas (tenants) e personalização visual
-- =============================================================================

-- -----------------------------------------------------------------------------
-- mt_tenants: Cadastro completo das empresas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_tenants (
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

    -- CONTATO (Padrão Internacional +5511999999999)
    telefone VARCHAR(20),
    telefone_secundario VARCHAR(20),
    whatsapp VARCHAR(20),
    email VARCHAR(255) NOT NULL,
    email_financeiro VARCHAR(255),
    website VARCHAR(255),

    -- RESPONSÁVEL LEGAL
    responsavel_nome VARCHAR(255),
    responsavel_cpf VARCHAR(14),
    responsavel_cargo VARCHAR(100),
    responsavel_telefone VARCHAR(20),
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
    status VARCHAR(20) DEFAULT 'ativo', -- ativo, inativo, pendente, suspenso
    data_ativacao DATE,
    data_expiracao DATE,

    -- TIMESTAMPS
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

COMMENT ON TABLE mt_tenants IS 'Empresas cadastradas na plataforma multi-tenant';

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_tenants_slug ON mt_tenants(slug);
CREATE INDEX IF NOT EXISTS idx_mt_tenants_cnpj ON mt_tenants(cnpj);
CREATE INDEX IF NOT EXISTS idx_mt_tenants_status ON mt_tenants(status);

-- -----------------------------------------------------------------------------
-- mt_tenant_branding: Personalização visual completa (80+ campos)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_tenant_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- =============================================
    -- LOGOS E IMAGENS (10 campos)
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
    -- CORES PRINCIPAIS (12 campos)
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
    -- CORES DE STATUS (8 campos)
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
    -- CORES DE FUNDO (10 campos)
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
    -- CORES DE TEXTO (7 campos)
    -- =============================================
    cor_texto_primario VARCHAR(7) DEFAULT '#111827',
    cor_texto_secundario VARCHAR(7) DEFAULT '#6B7280',
    cor_texto_terciario VARCHAR(7) DEFAULT '#9CA3AF',
    cor_texto_inverso VARCHAR(7) DEFAULT '#FFFFFF',
    cor_texto_sidebar VARCHAR(7) DEFAULT '#FFFFFF',
    cor_texto_link VARCHAR(7) DEFAULT '#3B82F6',
    cor_texto_link_hover VARCHAR(7) DEFAULT '#2563EB',

    -- =============================================
    -- BORDAS E SOMBRAS (14 campos)
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
    -- TIPOGRAFIA (16 campos)
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

    -- =============================================
    -- LAYOUT (8 campos)
    -- =============================================
    largura_max_container VARCHAR(10) DEFAULT '1280px',
    largura_sidebar VARCHAR(10) DEFAULT '280px',
    largura_sidebar_collapsed VARCHAR(10) DEFAULT '80px',
    altura_header VARCHAR(10) DEFAULT '64px',

    layout_sidebar_posicao VARCHAR(20) DEFAULT 'left', -- left, right
    layout_sidebar_tipo VARCHAR(20) DEFAULT 'fixed', -- fixed, static
    layout_header_tipo VARCHAR(20) DEFAULT 'fixed', -- fixed, static
    layout_densidade VARCHAR(20) DEFAULT 'normal', -- compact, normal, comfortable

    -- =============================================
    -- MODO ESCURO (7 campos)
    -- =============================================
    dark_mode_habilitado BOOLEAN DEFAULT true,
    dark_cor_fundo VARCHAR(7) DEFAULT '#111827',
    dark_cor_fundo_secundario VARCHAR(7) DEFAULT '#1F2937',
    dark_cor_fundo_card VARCHAR(7) DEFAULT '#1F2937',
    dark_cor_texto_primario VARCHAR(7) DEFAULT '#F9FAFB',
    dark_cor_texto_secundario VARCHAR(7) DEFAULT '#9CA3AF',
    dark_cor_borda VARCHAR(7) DEFAULT '#374151',

    -- =============================================
    -- ANIMAÇÕES (5 campos)
    -- =============================================
    animacao_duracao_rapida VARCHAR(10) DEFAULT '150ms',
    animacao_duracao_normal VARCHAR(10) DEFAULT '300ms',
    animacao_duracao_lenta VARCHAR(10) DEFAULT '500ms',
    animacao_timing VARCHAR(50) DEFAULT 'cubic-bezier(0.4, 0, 0.2, 1)',
    animacoes_habilitadas BOOLEAN DEFAULT true,

    -- =============================================
    -- TEXTOS CUSTOMIZADOS (5 campos)
    -- =============================================
    texto_login_titulo VARCHAR(100),
    texto_login_subtitulo VARCHAR(255),
    texto_boas_vindas VARCHAR(255),
    texto_footer VARCHAR(255),
    texto_copyright VARCHAR(255),

    -- =============================================
    -- CSS CUSTOMIZADO (1 campo)
    -- =============================================
    css_customizado TEXT,

    -- TIMESTAMPS
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint
    CONSTRAINT mt_tenant_branding_tenant_unique UNIQUE(tenant_id)
);

COMMENT ON TABLE mt_tenant_branding IS 'Personalização visual completa por tenant (80+ campos de customização)';

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_tenant_branding_tenant ON mt_tenant_branding(tenant_id);

-- -----------------------------------------------------------------------------
-- mt_tenant_settings: Configurações específicas do tenant
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_tenant_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Configuração
    chave VARCHAR(100) NOT NULL,
    valor TEXT,
    tipo VARCHAR(50) DEFAULT 'string', -- string, number, boolean, json

    -- Descrição
    descricao TEXT,
    categoria VARCHAR(50) DEFAULT 'geral',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint
    CONSTRAINT mt_tenant_settings_unique UNIQUE(tenant_id, chave)
);

COMMENT ON TABLE mt_tenant_settings IS 'Configurações personalizadas por tenant';

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_tenant_settings_tenant ON mt_tenant_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_tenant_settings_chave ON mt_tenant_settings(chave);

-- -----------------------------------------------------------------------------
-- TRIGGERS para updated_at
-- -----------------------------------------------------------------------------
CREATE TRIGGER trigger_mt_tenants_updated_at
    BEFORE UPDATE ON mt_tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_tenant_branding_updated_at
    BEFORE UPDATE ON mt_tenant_branding
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_tenant_settings_updated_at
    BEFORE UPDATE ON mt_tenant_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- FIM DA MIGRATION 002
-- =============================================================================

-- =============================================================================
-- MULTI-TENANT MIGRATION: Security Tables
-- Data: 01/02/2026
-- Descrição: Tabelas de segurança, auditoria e controle de acesso
-- =============================================================================

-- -----------------------------------------------------------------------------
-- mt_audit_logs: Log de auditoria de ações
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES mt_tenants(id) ON DELETE SET NULL,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,
    user_id UUID REFERENCES mt_users(id) ON DELETE SET NULL,

    -- Ação
    action VARCHAR(50) NOT NULL, -- create, read, update, delete, login, logout, export, etc
    resource_type VARCHAR(100) NOT NULL, -- lead, usuario, agendamento, etc
    resource_id UUID,
    resource_name VARCHAR(255),

    -- Dados
    old_data JSONB, -- Dados antes da alteração
    new_data JSONB, -- Dados após a alteração
    changed_fields TEXT[], -- Campos que foram alterados

    -- Contexto
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id UUID,
    request_id UUID,

    -- Localização
    country VARCHAR(2),
    city VARCHAR(100),

    -- Resultado
    status VARCHAR(20) DEFAULT 'success', -- success, failed, denied
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_audit_logs IS 'Log de auditoria de todas as ações do sistema';

-- Particionamento por mês recomendado em produção
CREATE INDEX IF NOT EXISTS idx_mt_audit_logs_tenant ON mt_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_audit_logs_user ON mt_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_audit_logs_action ON mt_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_mt_audit_logs_resource ON mt_audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_mt_audit_logs_created ON mt_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mt_audit_logs_ip ON mt_audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_mt_audit_logs_status ON mt_audit_logs(status);

-- -----------------------------------------------------------------------------
-- mt_user_sessions: Sessões de usuário ativas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES mt_users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Token
    token_hash TEXT NOT NULL, -- Hash do token de sessão
    refresh_token_hash TEXT,

    -- Dispositivo
    device_type VARCHAR(20), -- desktop, mobile, tablet
    device_name VARCHAR(255),
    browser VARCHAR(100),
    os VARCHAR(100),

    -- Localização
    ip_address VARCHAR(45),
    country VARCHAR(2),
    city VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Status
    is_active BOOLEAN DEFAULT true,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),

    -- Expiração
    expires_at TIMESTAMPTZ NOT NULL,
    refresh_expires_at TIMESTAMPTZ,

    -- Revogação
    revoked_at TIMESTAMPTZ,
    revoked_by UUID,
    revoked_reason VARCHAR(100),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_user_sessions IS 'Sessões de usuário ativas';

CREATE INDEX IF NOT EXISTS idx_mt_user_sessions_user ON mt_user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_user_sessions_tenant ON mt_user_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_user_sessions_token ON mt_user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_mt_user_sessions_active ON mt_user_sessions(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_mt_user_sessions_last_activity ON mt_user_sessions(last_activity_at DESC);

-- -----------------------------------------------------------------------------
-- mt_login_attempts: Tentativas de login
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES mt_users(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES mt_tenants(id) ON DELETE SET NULL,

    -- Resultado
    success BOOLEAN NOT NULL DEFAULT false,
    failure_reason VARCHAR(100),

    -- Contexto
    ip_address VARCHAR(45),
    user_agent TEXT,
    country VARCHAR(2),
    city VARCHAR(100),

    -- Método
    auth_method VARCHAR(50), -- password, magic_link, oauth, 2fa

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_login_attempts IS 'Histórico de tentativas de login';

CREATE INDEX IF NOT EXISTS idx_mt_login_attempts_email ON mt_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_mt_login_attempts_user ON mt_login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_login_attempts_ip ON mt_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_mt_login_attempts_created ON mt_login_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mt_login_attempts_failed ON mt_login_attempts(email, created_at DESC) WHERE NOT success;

-- -----------------------------------------------------------------------------
-- mt_ip_whitelist: IPs permitidos por tenant
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_ip_whitelist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- IP ou range
    ip_address VARCHAR(45), -- IP específico
    ip_range_start VARCHAR(45), -- Início do range
    ip_range_end VARCHAR(45), -- Fim do range
    cidr VARCHAR(50), -- Notação CIDR (ex: 192.168.1.0/24)

    -- Identificação
    descricao VARCHAR(255),
    tipo VARCHAR(20) DEFAULT 'allow', -- allow, deny

    -- Escopo
    applies_to VARCHAR(50) DEFAULT 'all', -- all, api, dashboard, admin

    -- Validade
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,

    -- Controle
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

COMMENT ON TABLE mt_ip_whitelist IS 'Whitelist/blacklist de IPs por tenant';

CREATE INDEX IF NOT EXISTS idx_mt_ip_whitelist_tenant ON mt_ip_whitelist(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_ip_whitelist_ip ON mt_ip_whitelist(ip_address);
CREATE INDEX IF NOT EXISTS idx_mt_ip_whitelist_active ON mt_ip_whitelist(tenant_id, is_active);

-- -----------------------------------------------------------------------------
-- mt_password_policies: Políticas de senha por tenant
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_password_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID UNIQUE NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Complexidade
    min_length INTEGER DEFAULT 8,
    max_length INTEGER DEFAULT 128,
    require_uppercase BOOLEAN DEFAULT true,
    require_lowercase BOOLEAN DEFAULT true,
    require_numbers BOOLEAN DEFAULT true,
    require_special BOOLEAN DEFAULT true,
    special_characters VARCHAR(100) DEFAULT '!@#$%^&*()_+-=[]{}|;:,.<>?',

    -- Histórico
    prevent_reuse INTEGER DEFAULT 5, -- Não reutilizar últimas N senhas
    max_age_days INTEGER DEFAULT 90, -- Forçar troca após N dias
    min_age_days INTEGER DEFAULT 1, -- Mínimo entre trocas

    -- Bloqueio
    max_failed_attempts INTEGER DEFAULT 5,
    lockout_duration_minutes INTEGER DEFAULT 30,

    -- 2FA
    require_2fa BOOLEAN DEFAULT false,
    require_2fa_for_roles TEXT[], -- Roles que requerem 2FA

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_password_policies IS 'Políticas de senha por tenant';

CREATE INDEX IF NOT EXISTS idx_mt_password_policies_tenant ON mt_password_policies(tenant_id);

-- -----------------------------------------------------------------------------
-- mt_2fa_settings: Configuração de 2FA por usuário
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_2fa_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES mt_users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    -- Método
    method VARCHAR(20) NOT NULL, -- totp, sms, email, whatsapp

    -- TOTP
    totp_secret_encrypted TEXT,
    totp_verified BOOLEAN DEFAULT false,
    totp_verified_at TIMESTAMPTZ,

    -- Backup codes
    backup_codes_hash TEXT[], -- Hashes dos códigos de backup
    backup_codes_used INTEGER DEFAULT 0,

    -- Recovery
    recovery_email VARCHAR(255),
    recovery_phone VARCHAR(20),

    -- Status
    is_enabled BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_2fa_settings IS 'Configuração de autenticação de dois fatores';

CREATE INDEX IF NOT EXISTS idx_mt_2fa_settings_user ON mt_2fa_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_2fa_settings_tenant ON mt_2fa_settings(tenant_id);

-- -----------------------------------------------------------------------------
-- mt_password_history: Histórico de senhas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_password_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES mt_users(id) ON DELETE CASCADE,

    -- Hash da senha
    password_hash TEXT NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_password_history IS 'Histórico de senhas para evitar reutilização';

CREATE INDEX IF NOT EXISTS idx_mt_password_history_user ON mt_password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_password_history_created ON mt_password_history(user_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- mt_security_alerts: Alertas de segurança
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES mt_tenants(id) ON DELETE SET NULL,
    user_id UUID REFERENCES mt_users(id) ON DELETE SET NULL,

    -- Alerta
    tipo VARCHAR(50) NOT NULL,
    -- login_suspeito, brute_force, ip_bloqueado, 2fa_falha,
    -- senha_fraca, sessao_expirada, acesso_negado, api_abuse

    severidade VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,

    -- Contexto
    dados JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- Status
    status VARCHAR(20) DEFAULT 'new', -- new, investigating, resolved, false_positive
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    resolution_notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_security_alerts IS 'Alertas de segurança do sistema';

CREATE INDEX IF NOT EXISTS idx_mt_security_alerts_tenant ON mt_security_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_security_alerts_user ON mt_security_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_security_alerts_tipo ON mt_security_alerts(tipo);
CREATE INDEX IF NOT EXISTS idx_mt_security_alerts_severidade ON mt_security_alerts(severidade);
CREATE INDEX IF NOT EXISTS idx_mt_security_alerts_status ON mt_security_alerts(status);
CREATE INDEX IF NOT EXISTS idx_mt_security_alerts_created ON mt_security_alerts(created_at DESC);

-- -----------------------------------------------------------------------------
-- mt_data_exports: Exportações de dados (LGPD compliance)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_data_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES mt_users(id) ON DELETE CASCADE,

    -- Tipo
    tipo VARCHAR(50) NOT NULL, -- full_export, partial_export, gdpr_request
    formato VARCHAR(20) DEFAULT 'json', -- json, csv, xlsx

    -- Dados exportados
    tabelas_incluidas TEXT[],
    filtros JSONB,
    total_registros INTEGER,

    -- Arquivo
    file_url TEXT,
    file_size_bytes BIGINT,
    file_expires_at TIMESTAMPTZ,

    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    -- pending, processing, completed, failed, expired

    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,

    -- Motivo (para LGPD)
    motivo TEXT,
    solicitante VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_data_exports IS 'Exportações de dados para compliance LGPD';

CREATE INDEX IF NOT EXISTS idx_mt_data_exports_tenant ON mt_data_exports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_data_exports_user ON mt_data_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_data_exports_status ON mt_data_exports(status);
CREATE INDEX IF NOT EXISTS idx_mt_data_exports_created ON mt_data_exports(created_at DESC);

-- -----------------------------------------------------------------------------
-- mt_consent_logs: Log de consentimentos (LGPD)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_consent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES mt_leads(id) ON DELETE SET NULL,
    user_id UUID REFERENCES mt_users(id) ON DELETE SET NULL,

    -- Consentimento
    tipo VARCHAR(50) NOT NULL, -- marketing, comunicacao, dados_terceiros, cookies
    versao VARCHAR(20) NOT NULL, -- Versão da política
    aceito BOOLEAN NOT NULL,

    -- Contexto
    ip_address VARCHAR(45),
    user_agent TEXT,
    origem VARCHAR(100), -- formulario, site, app, manual

    -- Texto aceito
    texto_politica TEXT,

    -- Revogação
    revogado BOOLEAN DEFAULT false,
    revogado_em TIMESTAMPTZ,
    motivo_revogacao TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mt_consent_logs IS 'Log de consentimentos para LGPD';

CREATE INDEX IF NOT EXISTS idx_mt_consent_logs_tenant ON mt_consent_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_consent_logs_lead ON mt_consent_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_mt_consent_logs_user ON mt_consent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_consent_logs_tipo ON mt_consent_logs(tipo);
CREATE INDEX IF NOT EXISTS idx_mt_consent_logs_created ON mt_consent_logs(created_at DESC);

-- -----------------------------------------------------------------------------
-- TRIGGERS para updated_at
-- -----------------------------------------------------------------------------
CREATE TRIGGER trigger_mt_user_sessions_updated_at
    BEFORE UPDATE ON mt_user_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_ip_whitelist_updated_at
    BEFORE UPDATE ON mt_ip_whitelist
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_password_policies_updated_at
    BEFORE UPDATE ON mt_password_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_2fa_settings_updated_at
    BEFORE UPDATE ON mt_2fa_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_security_alerts_updated_at
    BEFORE UPDATE ON mt_security_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mt_data_exports_updated_at
    BEFORE UPDATE ON mt_data_exports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- FIM DA MIGRATION 010
-- =============================================================================

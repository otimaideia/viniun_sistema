-- =====================================================
-- Migration: 20260322_001_mt_password_vault.sql
-- Purpose: Modulo Cofre de Senhas (Password Vault) Multi-Tenant
-- Description: Gerenciamento seguro de credenciais, chaves de API e tokens
-- Tables: 5 (folders, vault, access_log, shares, history)
-- Author: Claude + Danilo
-- Date: 2026-03-22
-- =====================================================

-- Garantir que pgcrypto esta habilitado
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- 1. TABELA: mt_password_vault_folders
-- Organizacao por pastas hierarquicas
-- =====================================================
CREATE TABLE IF NOT EXISTS mt_password_vault_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES mt_password_vault_folders(id) ON DELETE SET NULL,

    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    icone VARCHAR(50) DEFAULT 'Folder',
    cor VARCHAR(7) DEFAULT '#6B7280',
    ordem INTEGER DEFAULT 0,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES mt_users(id) ON DELETE SET NULL,

    UNIQUE(tenant_id, nome, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

CREATE INDEX IF NOT EXISTS idx_mt_pv_folders_tenant ON mt_password_vault_folders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_pv_folders_franchise ON mt_password_vault_folders(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_pv_folders_parent ON mt_password_vault_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_mt_pv_folders_active ON mt_password_vault_folders(is_active) WHERE is_active = true;

-- =====================================================
-- 2. TABELA: mt_password_vault (Principal)
-- Entradas do cofre de senhas
-- =====================================================
CREATE TABLE IF NOT EXISTS mt_password_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,
    folder_id UUID REFERENCES mt_password_vault_folders(id) ON DELETE SET NULL,

    -- Identificacao
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    url VARCHAR(2048),
    categoria VARCHAR(50) NOT NULL CHECK (categoria IN (
        'credencial', 'api_key', 'token', 'certificado',
        'env_var', 'conexao_db', 'integracao'
    )),
    tags TEXT[] DEFAULT '{}',

    -- Credenciais (criptografadas)
    username VARCHAR(500),
    encrypted_value TEXT NOT NULL,
    encryption_method VARCHAR(30) DEFAULT 'pgcrypto_aes256',
    value_preview VARCHAR(20),

    -- Metadados
    notas TEXT,
    campos_extras JSONB DEFAULT '{}',

    -- Expiracao e rotacao
    expires_at TIMESTAMPTZ,
    rotation_days INTEGER,
    last_rotated_at TIMESTAMPTZ,

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_favorite BOOLEAN DEFAULT false,
    strength_score INTEGER CHECK (strength_score >= 0 AND strength_score <= 100),

    -- Tracking
    last_accessed_at TIMESTAMPTZ,
    access_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES mt_users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES mt_users(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mt_pv_tenant ON mt_password_vault(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_pv_franchise ON mt_password_vault(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_pv_folder ON mt_password_vault(folder_id);
CREATE INDEX IF NOT EXISTS idx_mt_pv_categoria ON mt_password_vault(categoria);
CREATE INDEX IF NOT EXISTS idx_mt_pv_tags ON mt_password_vault USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_mt_pv_favorite ON mt_password_vault(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_mt_pv_expires ON mt_password_vault(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mt_pv_deleted ON mt_password_vault(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mt_pv_search ON mt_password_vault USING GIN(to_tsvector('portuguese', nome));
CREATE INDEX IF NOT EXISTS idx_mt_pv_created_by ON mt_password_vault(created_by);

-- =====================================================
-- 3. TABELA: mt_password_vault_access_log
-- Auditoria de acessos
-- =====================================================
CREATE TABLE IF NOT EXISTS mt_password_vault_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    vault_entry_id UUID NOT NULL REFERENCES mt_password_vault(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES mt_users(id) ON DELETE CASCADE,

    action VARCHAR(30) NOT NULL CHECK (action IN (
        'view', 'reveal', 'copy', 'create', 'update',
        'delete', 'export', 'share', 'unshare'
    )),
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mt_pv_log_tenant ON mt_password_vault_access_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_pv_log_entry ON mt_password_vault_access_log(vault_entry_id);
CREATE INDEX IF NOT EXISTS idx_mt_pv_log_user ON mt_password_vault_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_pv_log_created ON mt_password_vault_access_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mt_pv_log_action ON mt_password_vault_access_log(action);

-- =====================================================
-- 4. TABELA: mt_password_vault_shares
-- Compartilhamento entre usuarios
-- =====================================================
CREATE TABLE IF NOT EXISTS mt_password_vault_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    vault_entry_id UUID NOT NULL REFERENCES mt_password_vault(id) ON DELETE CASCADE,
    shared_with_user_id UUID NOT NULL REFERENCES mt_users(id) ON DELETE CASCADE,
    shared_by_user_id UUID NOT NULL REFERENCES mt_users(id) ON DELETE CASCADE,

    permission VARCHAR(20) DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(vault_entry_id, shared_with_user_id)
);

CREATE INDEX IF NOT EXISTS idx_mt_pv_shares_tenant ON mt_password_vault_shares(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_pv_shares_entry ON mt_password_vault_shares(vault_entry_id);
CREATE INDEX IF NOT EXISTS idx_mt_pv_shares_user ON mt_password_vault_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_mt_pv_shares_active ON mt_password_vault_shares(is_active) WHERE is_active = true;

-- =====================================================
-- 5. TABELA: mt_password_vault_history
-- Historico de alteracoes
-- =====================================================
CREATE TABLE IF NOT EXISTS mt_password_vault_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_entry_id UUID NOT NULL REFERENCES mt_password_vault(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES mt_users(id) ON DELETE CASCADE,

    changed_fields TEXT[],
    old_values JSONB,
    new_values JSONB,
    change_reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mt_pv_history_entry ON mt_password_vault_history(vault_entry_id);
CREATE INDEX IF NOT EXISTS idx_mt_pv_history_tenant ON mt_password_vault_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_pv_history_created ON mt_password_vault_history(created_at DESC);

-- =====================================================
-- 6. FUNCOES DE CRIPTOGRAFIA
-- =====================================================

-- Funcao para criptografar valor
CREATE OR REPLACE FUNCTION vault_encrypt(plaintext TEXT, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(extensions.pgp_sym_encrypt(plaintext, encryption_key), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funcao para descriptografar valor
CREATE OR REPLACE FUNCTION vault_decrypt(ciphertext TEXT, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN extensions.pgp_sym_decrypt(decode(ciphertext, 'base64'), encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revogar acesso direto as funcoes de criptografia
REVOKE ALL ON FUNCTION vault_encrypt(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION vault_decrypt(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vault_encrypt(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION vault_decrypt(TEXT, TEXT) TO service_role;

-- =====================================================
-- 7. RLS POLICIES
-- =====================================================

-- === mt_password_vault_folders ===
ALTER TABLE mt_password_vault_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY mt_pv_folders_select ON mt_password_vault_folders FOR SELECT USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
    (tenant_id = current_tenant_id())
);

CREATE POLICY mt_pv_folders_insert ON mt_password_vault_folders FOR INSERT WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id())
);

CREATE POLICY mt_pv_folders_update ON mt_password_vault_folders FOR UPDATE USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id())
);

CREATE POLICY mt_pv_folders_delete ON mt_password_vault_folders FOR DELETE USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- === mt_password_vault ===
ALTER TABLE mt_password_vault ENABLE ROW LEVEL SECURITY;

CREATE POLICY mt_pv_select ON mt_password_vault FOR SELECT USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
    (created_by = current_user_id()) OR
    (id IN (
        SELECT vault_entry_id FROM mt_password_vault_shares
        WHERE shared_with_user_id = current_user_id()
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
    ))
);

CREATE POLICY mt_pv_insert ON mt_password_vault FOR INSERT WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id())
);

CREATE POLICY mt_pv_update ON mt_password_vault FOR UPDATE USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (created_by = current_user_id()) OR
    (id IN (
        SELECT vault_entry_id FROM mt_password_vault_shares
        WHERE shared_with_user_id = current_user_id()
        AND permission = 'edit'
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
    ))
);

CREATE POLICY mt_pv_delete ON mt_password_vault FOR DELETE USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- === mt_password_vault_access_log ===
ALTER TABLE mt_password_vault_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY mt_pv_log_select ON mt_password_vault_access_log FOR SELECT USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND tenant_id = current_tenant_id()) OR
    (user_id = current_user_id())
);

CREATE POLICY mt_pv_log_insert ON mt_password_vault_access_log FOR INSERT WITH CHECK (
    is_platform_admin() OR
    tenant_id = current_tenant_id()
);

-- === mt_password_vault_shares ===
ALTER TABLE mt_password_vault_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY mt_pv_shares_select ON mt_password_vault_shares FOR SELECT USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    shared_with_user_id = current_user_id() OR
    shared_by_user_id = current_user_id()
);

CREATE POLICY mt_pv_shares_insert ON mt_password_vault_shares FOR INSERT WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY mt_pv_shares_update ON mt_password_vault_shares FOR UPDATE USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    shared_by_user_id = current_user_id()
);

CREATE POLICY mt_pv_shares_delete ON mt_password_vault_shares FOR DELETE USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    shared_by_user_id = current_user_id()
);

-- === mt_password_vault_history ===
ALTER TABLE mt_password_vault_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY mt_pv_history_select ON mt_password_vault_history FOR SELECT USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY mt_pv_history_insert ON mt_password_vault_history FOR INSERT WITH CHECK (
    is_platform_admin() OR
    tenant_id = current_tenant_id()
);

-- =====================================================
-- 8. REGISTRO DO MODULO
-- =====================================================

INSERT INTO mt_modules (codigo, nome, descricao, icone, categoria, ordem, is_core, is_active)
VALUES (
    'cofre_senhas',
    'Cofre de Senhas',
    'Gerenciamento seguro de credenciais, chaves de API e tokens',
    'KeyRound',
    'sistema',
    17,
    false,
    true
)
ON CONFLICT (codigo) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    icone = EXCLUDED.icone;

-- Habilitar para todos os tenants
INSERT INTO mt_tenant_modules (tenant_id, module_id, is_active)
SELECT t.id, m.id, true
FROM mt_tenants t
CROSS JOIN mt_modules m
WHERE m.codigo = 'cofre_senhas'
AND NOT EXISTS (
    SELECT 1 FROM mt_tenant_modules tm
    WHERE tm.tenant_id = t.id AND tm.module_id = m.id
);

-- =====================================================
-- 9. TRIGGER PARA UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_pv_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mt_pv_updated_at
    BEFORE UPDATE ON mt_password_vault
    FOR EACH ROW EXECUTE FUNCTION update_pv_updated_at();

CREATE TRIGGER trg_mt_pv_folders_updated_at
    BEFORE UPDATE ON mt_password_vault_folders
    FOR EACH ROW EXECUTE FUNCTION update_pv_updated_at();

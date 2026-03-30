-- ============================================
-- Módulo: ClickUp Migração CRM
-- Data: 03 de Fevereiro de 2026
-- Descrição: Tabelas para integração e migração de leads do ClickUp
-- ============================================

-- ============================================
-- 1. REGISTRAR MÓDULO
-- ============================================

INSERT INTO mt_modules (codigo, nome, descricao, icone, categoria, ordem, is_core, is_active)
VALUES (
  'clickup_migracao',
  'ClickUp Migração CRM',
  'Migração de leads do ClickUp para o sistema',
  'ArrowRightLeft',
  'sistema',
  99,
  false,
  true
)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  icone = EXCLUDED.icone;

-- Habilitar para tenant yeslaser
INSERT INTO mt_tenant_modules (tenant_id, module_id, is_active)
SELECT t.id, m.id, true
FROM mt_tenants t
CROSS JOIN mt_modules m
WHERE m.codigo = 'clickup_migracao'
AND t.slug = 'yeslaser'
AND NOT EXISTS (
  SELECT 1 FROM mt_tenant_modules tm
  WHERE tm.tenant_id = t.id AND tm.module_id = m.id
);

-- ============================================
-- 2. TABELA DE CONFIGURAÇÃO
-- ============================================

CREATE TABLE IF NOT EXISTS mt_clickup_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

  -- Credenciais (API Key será criptografada na aplicação)
  api_key VARCHAR(255) NOT NULL,

  -- Workspace selecionado
  workspace_id VARCHAR(50),
  workspace_name VARCHAR(255),

  -- Space selecionado
  space_id VARCHAR(50),
  space_name VARCHAR(255),

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Apenas uma config por tenant
  UNIQUE(tenant_id)
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_mt_clickup_config_tenant ON mt_clickup_config(tenant_id);

-- ============================================
-- 3. TABELA DE MAPEAMENTO DE LISTAS
-- ============================================

CREATE TABLE IF NOT EXISTS mt_clickup_list_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES mt_clickup_config(id) ON DELETE CASCADE,

  -- Dados do ClickUp
  clickup_list_id VARCHAR(50) NOT NULL,
  clickup_list_name VARCHAR(255),

  -- Mapeamento para usuário do sistema (SDR)
  assigned_user_id UUID REFERENCES mt_users(id) ON DELETE SET NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,

  -- Contadores
  total_tasks INTEGER DEFAULT 0,
  synced_tasks INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Única lista por config
  UNIQUE(config_id, clickup_list_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_clickup_list_config ON mt_clickup_list_mapping(config_id);
CREATE INDEX IF NOT EXISTS idx_mt_clickup_list_active ON mt_clickup_list_mapping(is_active) WHERE is_active = true;

-- ============================================
-- 4. TABELA DE MAPEAMENTO DE CAMPOS
-- ============================================

CREATE TABLE IF NOT EXISTS mt_clickup_field_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES mt_clickup_config(id) ON DELETE CASCADE,

  -- Campo do ClickUp
  clickup_field_id VARCHAR(100) NOT NULL,
  clickup_field_name VARCHAR(255),
  clickup_field_type VARCHAR(50), -- short_text, drop_down, labels, date, checkbox, currency, etc

  -- Campo do mt_leads
  mt_leads_column VARCHAR(100) NOT NULL,

  -- Tipo de transformação
  transformation VARCHAR(50) DEFAULT 'direct', -- direct, date, dropdown, labels, currency, boolean, phone, status, json

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Único campo por config
  UNIQUE(config_id, clickup_field_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_clickup_field_config ON mt_clickup_field_mapping(config_id);

-- ============================================
-- 5. TABELA DE MAPEAMENTO DE VALORES
-- ============================================

CREATE TABLE IF NOT EXISTS mt_clickup_value_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_mapping_id UUID NOT NULL REFERENCES mt_clickup_field_mapping(id) ON DELETE CASCADE,

  -- Valor do ClickUp (ID ou orderindex)
  clickup_value VARCHAR(255) NOT NULL,
  clickup_label VARCHAR(255),

  -- Valor no sistema
  mt_value VARCHAR(255) NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Único valor por campo
  UNIQUE(field_mapping_id, clickup_value)
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_mt_clickup_value_field ON mt_clickup_value_mapping(field_mapping_id);

-- ============================================
-- 6. TABELA DE SESSÕES DE IMPORTAÇÃO
-- ============================================

CREATE TABLE IF NOT EXISTS mt_clickup_import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES mt_clickup_config(id) ON DELETE CASCADE,

  -- Status: pending, running, paused, completed, failed, cancelled
  status VARCHAR(20) NOT NULL DEFAULT 'pending',

  -- Progresso
  total_tasks INTEGER DEFAULT 0,
  processed_tasks INTEGER DEFAULT 0,
  created_leads INTEGER DEFAULT 0,
  updated_leads INTEGER DEFAULT 0,
  skipped_tasks INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,

  -- Controle de paginação
  current_list_id VARCHAR(50),
  current_page INTEGER DEFAULT 0,
  last_processed_task_id VARCHAR(50),

  -- Timestamps
  started_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Configuração da sessão (snapshot do momento da importação)
  import_config JSONB DEFAULT '{}'::jsonb
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_clickup_import_config ON mt_clickup_import_sessions(config_id);
CREATE INDEX IF NOT EXISTS idx_mt_clickup_import_status ON mt_clickup_import_sessions(status);
CREATE INDEX IF NOT EXISTS idx_mt_clickup_import_created ON mt_clickup_import_sessions(created_at DESC);

-- ============================================
-- 7. TABELA DE LOG DE MIGRAÇÃO
-- ============================================

CREATE TABLE IF NOT EXISTS mt_clickup_migration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES mt_clickup_config(id) ON DELETE CASCADE,
  session_id UUID REFERENCES mt_clickup_import_sessions(id) ON DELETE SET NULL,

  -- Referências
  clickup_task_id VARCHAR(50) NOT NULL,
  clickup_list_id VARCHAR(50),
  lead_id UUID REFERENCES mt_leads(id) ON DELETE SET NULL,

  -- Status: pending, success, error, skipped, duplicate
  status VARCHAR(20) NOT NULL DEFAULT 'pending',

  -- Ação realizada: created, updated, skipped
  action VARCHAR(20),

  -- Detalhes de erro
  error_message TEXT,

  -- Dados brutos para debug
  raw_data JSONB,

  -- Dados transformados (para verificação)
  transformed_data JSONB,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Única entrada por task por sessão
  UNIQUE(config_id, clickup_task_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_clickup_log_config ON mt_clickup_migration_log(config_id);
CREATE INDEX IF NOT EXISTS idx_mt_clickup_log_status ON mt_clickup_migration_log(status);
CREATE INDEX IF NOT EXISTS idx_mt_clickup_log_task ON mt_clickup_migration_log(clickup_task_id);
CREATE INDEX IF NOT EXISTS idx_mt_clickup_log_created ON mt_clickup_migration_log(created_at DESC);

-- ============================================
-- 8. ROW LEVEL SECURITY
-- ============================================

-- Habilitar RLS
ALTER TABLE mt_clickup_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_clickup_list_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_clickup_field_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_clickup_value_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_clickup_import_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_clickup_migration_log ENABLE ROW LEVEL SECURITY;

-- Policies para mt_clickup_config
DROP POLICY IF EXISTS "clickup_config_select" ON mt_clickup_config;
CREATE POLICY "clickup_config_select" ON mt_clickup_config FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "clickup_config_insert" ON mt_clickup_config;
CREATE POLICY "clickup_config_insert" ON mt_clickup_config FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

DROP POLICY IF EXISTS "clickup_config_update" ON mt_clickup_config;
CREATE POLICY "clickup_config_update" ON mt_clickup_config FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

DROP POLICY IF EXISTS "clickup_config_delete" ON mt_clickup_config;
CREATE POLICY "clickup_config_delete" ON mt_clickup_config FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- Policies para mt_clickup_list_mapping
DROP POLICY IF EXISTS "clickup_list_all" ON mt_clickup_list_mapping;
CREATE POLICY "clickup_list_all" ON mt_clickup_list_mapping FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM mt_clickup_config c
    WHERE c.id = config_id
    AND (is_platform_admin() OR c.tenant_id = current_tenant_id())
  )
);

-- Policies para mt_clickup_field_mapping
DROP POLICY IF EXISTS "clickup_field_all" ON mt_clickup_field_mapping;
CREATE POLICY "clickup_field_all" ON mt_clickup_field_mapping FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM mt_clickup_config c
    WHERE c.id = config_id
    AND (is_platform_admin() OR c.tenant_id = current_tenant_id())
  )
);

-- Policies para mt_clickup_value_mapping
DROP POLICY IF EXISTS "clickup_value_all" ON mt_clickup_value_mapping;
CREATE POLICY "clickup_value_all" ON mt_clickup_value_mapping FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM mt_clickup_field_mapping fm
    JOIN mt_clickup_config c ON c.id = fm.config_id
    WHERE fm.id = field_mapping_id
    AND (is_platform_admin() OR c.tenant_id = current_tenant_id())
  )
);

-- Policies para mt_clickup_import_sessions
DROP POLICY IF EXISTS "clickup_import_all" ON mt_clickup_import_sessions;
CREATE POLICY "clickup_import_all" ON mt_clickup_import_sessions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM mt_clickup_config c
    WHERE c.id = config_id
    AND (is_platform_admin() OR c.tenant_id = current_tenant_id())
  )
);

-- Policies para mt_clickup_migration_log
DROP POLICY IF EXISTS "clickup_log_all" ON mt_clickup_migration_log;
CREATE POLICY "clickup_log_all" ON mt_clickup_migration_log FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM mt_clickup_config c
    WHERE c.id = config_id
    AND (is_platform_admin() OR c.tenant_id = current_tenant_id())
  )
);

-- ============================================
-- 9. FUNÇÕES AUXILIARES
-- ============================================

-- Função para normalizar telefone
CREATE OR REPLACE FUNCTION normalize_phone(phone TEXT)
RETURNS TEXT AS $$
DECLARE
  numbers TEXT;
BEGIN
  -- Remove tudo exceto números
  numbers := regexp_replace(phone, '[^0-9]', '', 'g');

  -- Se tiver 11 dígitos (DDD + número), adiciona +55
  IF length(numbers) = 11 THEN
    RETURN '+55' || numbers;
  -- Se tiver 13 dígitos e começar com 55, adiciona +
  ELSIF length(numbers) = 13 AND numbers LIKE '55%' THEN
    RETURN '+' || numbers;
  -- Se tiver 10 dígitos (DDD antigo + número), adiciona +55 e 9
  ELSIF length(numbers) = 10 THEN
    RETURN '+55' || substring(numbers, 1, 2) || '9' || substring(numbers, 3);
  ELSE
    RETURN '+55' || numbers;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para converter timestamp Unix (ms) para TIMESTAMPTZ
CREATE OR REPLACE FUNCTION unix_ms_to_timestamp(unix_ms BIGINT)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  IF unix_ms IS NULL OR unix_ms = 0 THEN
    RETURN NULL;
  END IF;
  RETURN to_timestamp(unix_ms / 1000.0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para converter data DD/MM/YYYY para DATE
CREATE OR REPLACE FUNCTION parse_br_date(date_str TEXT)
RETURNS DATE AS $$
DECLARE
  parts TEXT[];
BEGIN
  IF date_str IS NULL OR date_str = '' THEN
    RETURN NULL;
  END IF;

  parts := string_to_array(date_str, '/');

  IF array_length(parts, 1) = 3 THEN
    RETURN make_date(
      parts[3]::INTEGER,
      parts[2]::INTEGER,
      parts[1]::INTEGER
    );
  END IF;

  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 10. TRIGGER PARA ATUALIZAR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_clickup_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_clickup_config_updated_at ON mt_clickup_config;
CREATE TRIGGER tr_clickup_config_updated_at
  BEFORE UPDATE ON mt_clickup_config
  FOR EACH ROW
  EXECUTE FUNCTION update_clickup_config_updated_at();

-- ============================================
-- 11. COMENTÁRIOS
-- ============================================

COMMENT ON TABLE mt_clickup_config IS 'Configuração da integração ClickUp por tenant';
COMMENT ON TABLE mt_clickup_list_mapping IS 'Mapeamento de listas do ClickUp para usuários do sistema';
COMMENT ON TABLE mt_clickup_field_mapping IS 'Mapeamento de campos customizados do ClickUp para colunas do mt_leads';
COMMENT ON TABLE mt_clickup_value_mapping IS 'Mapeamento de valores de dropdowns e labels do ClickUp';
COMMENT ON TABLE mt_clickup_import_sessions IS 'Sessões de importação com controle de progresso';
COMMENT ON TABLE mt_clickup_migration_log IS 'Log de migração de tarefas do ClickUp para leads';

COMMENT ON FUNCTION normalize_phone(TEXT) IS 'Normaliza número de telefone para formato internacional +55';
COMMENT ON FUNCTION unix_ms_to_timestamp(BIGINT) IS 'Converte timestamp Unix em milissegundos para TIMESTAMPTZ';
COMMENT ON FUNCTION parse_br_date(TEXT) IS 'Converte data no formato DD/MM/YYYY para DATE';

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================

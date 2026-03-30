-- Migration: 20250128_add_social_sync_fields.sql
-- Purpose: Adicionar campos de sincronização de redes sociais para auto-fetch
-- Author: Claude + Danilo
-- Date: 2025-01-28

-- ROLLBACK PLAN:
-- BEGIN;
-- ALTER TABLE yeslaser_influenciadora_redes_sociais DROP COLUMN IF EXISTS sync_enabled;
-- ALTER TABLE yeslaser_influenciadora_redes_sociais DROP COLUMN IF EXISTS last_sync_at;
-- ALTER TABLE yeslaser_influenciadora_redes_sociais DROP COLUMN IF EXISTS sync_status;
-- ALTER TABLE yeslaser_influenciadora_redes_sociais DROP COLUMN IF EXISTS sync_error_message;
-- ALTER TABLE yeslaser_influenciadora_redes_sociais DROP COLUMN IF EXISTS profile_name;
-- ALTER TABLE yeslaser_influenciadora_redes_sociais DROP COLUMN IF EXISTS profile_picture_url;
-- ALTER TABLE yeslaser_influenciadora_redes_sociais DROP COLUMN IF EXISTS is_verified;
-- ALTER TABLE yeslaser_influenciadora_redes_sociais DROP COLUMN IF EXISTS external_id;
-- DROP TABLE IF EXISTS yeslaser_influenciadora_sync_logs CASCADE;
-- ALTER TABLE yeslaser_waha_config DROP COLUMN IF EXISTS youtube_api_key;
-- DROP INDEX IF EXISTS idx_redes_sociais_sync;
-- DROP INDEX IF EXISTS idx_sync_logs_date;
-- DROP INDEX IF EXISTS idx_sync_logs_rede;
-- COMMIT;

BEGIN;

-- ============================================
-- STEP 1: Add sync fields to redes_sociais table
-- ============================================

-- sync_enabled: Se a sincronização automática está habilitada para esta rede
ALTER TABLE yeslaser_influenciadora_redes_sociais
ADD COLUMN IF NOT EXISTS sync_enabled boolean DEFAULT true;

-- last_sync_at: Última vez que os dados foram sincronizados
ALTER TABLE yeslaser_influenciadora_redes_sociais
ADD COLUMN IF NOT EXISTS last_sync_at timestamp with time zone;

-- sync_status: Status da última sincronização (pending, success, error, not_supported)
ALTER TABLE yeslaser_influenciadora_redes_sociais
ADD COLUMN IF NOT EXISTS sync_status varchar(20) DEFAULT 'pending';

-- sync_error_message: Mensagem de erro da última sincronização
ALTER TABLE yeslaser_influenciadora_redes_sociais
ADD COLUMN IF NOT EXISTS sync_error_message text;

-- profile_name: Nome do perfil obtido da API
ALTER TABLE yeslaser_influenciadora_redes_sociais
ADD COLUMN IF NOT EXISTS profile_name varchar(200);

-- profile_picture_url: URL da foto do perfil
ALTER TABLE yeslaser_influenciadora_redes_sociais
ADD COLUMN IF NOT EXISTS profile_picture_url text;

-- is_verified: Se o perfil é verificado na plataforma
ALTER TABLE yeslaser_influenciadora_redes_sociais
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- external_id: ID do perfil na plataforma (channel ID do YouTube, etc)
ALTER TABLE yeslaser_influenciadora_redes_sociais
ADD COLUMN IF NOT EXISTS external_id varchar(100);

-- Index para otimizar queries de sincronização
CREATE INDEX IF NOT EXISTS idx_redes_sociais_sync
ON yeslaser_influenciadora_redes_sociais(sync_enabled, last_sync_at);

COMMENT ON COLUMN yeslaser_influenciadora_redes_sociais.sync_enabled IS 'Habilita sincronização automática de dados';
COMMENT ON COLUMN yeslaser_influenciadora_redes_sociais.last_sync_at IS 'Timestamp da última sincronização bem-sucedida';
COMMENT ON COLUMN yeslaser_influenciadora_redes_sociais.sync_status IS 'Status: pending, success, error, not_supported';
COMMENT ON COLUMN yeslaser_influenciadora_redes_sociais.sync_error_message IS 'Mensagem de erro se sync_status = error';
COMMENT ON COLUMN yeslaser_influenciadora_redes_sociais.profile_name IS 'Nome do perfil obtido da API';
COMMENT ON COLUMN yeslaser_influenciadora_redes_sociais.profile_picture_url IS 'URL da foto de perfil';
COMMENT ON COLUMN yeslaser_influenciadora_redes_sociais.is_verified IS 'Perfil verificado na plataforma';
COMMENT ON COLUMN yeslaser_influenciadora_redes_sociais.external_id IS 'ID único do perfil na plataforma (ex: YouTube channel ID)';

-- ============================================
-- STEP 2: Create sync logs table
-- ============================================

CREATE TABLE IF NOT EXISTS yeslaser_influenciadora_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relacionamentos
  rede_social_id uuid REFERENCES yeslaser_influenciadora_redes_sociais(id) ON DELETE CASCADE,
  influenciadora_id uuid REFERENCES yeslaser_influenciadoras(id) ON DELETE CASCADE,

  -- Dados da sincronização
  plataforma varchar(50) NOT NULL,
  status varchar(20) NOT NULL, -- success, error, skipped

  -- Métricas antes e depois
  old_followers integer,
  new_followers integer,
  old_engagement decimal(5,2),
  new_engagement decimal(5,2),

  -- Dados adicionais obtidos
  profile_name varchar(200),
  profile_picture_url text,
  is_verified boolean,
  external_id varchar(100),

  -- Erro (se houver)
  error_message text,

  -- Performance
  sync_duration_ms integer,

  -- Tipo de sync: manual (usuário clicou) ou cron (automático)
  sync_type varchar(20) DEFAULT 'manual',

  -- Metadata
  triggered_by uuid REFERENCES yeslaser_profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Indexes para consultas
CREATE INDEX IF NOT EXISTS idx_sync_logs_date ON yeslaser_influenciadora_sync_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_logs_rede ON yeslaser_influenciadora_sync_logs(rede_social_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_influenciadora ON yeslaser_influenciadora_sync_logs(influenciadora_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON yeslaser_influenciadora_sync_logs(status);

-- RLS
ALTER TABLE yeslaser_influenciadora_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON yeslaser_influenciadora_sync_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Service role pode inserir (para cron job)
CREATE POLICY "Allow insert for service_role" ON yeslaser_influenciadora_sync_logs
  FOR INSERT TO service_role WITH CHECK (true);

COMMENT ON TABLE yeslaser_influenciadora_sync_logs IS 'Log de sincronizações de dados de redes sociais';

-- ============================================
-- STEP 3: Add YouTube API Key to config table
-- ============================================

ALTER TABLE yeslaser_waha_config
ADD COLUMN IF NOT EXISTS youtube_api_key text;

COMMENT ON COLUMN yeslaser_waha_config.youtube_api_key IS 'API Key do YouTube Data API v3 para buscar dados de canais';

COMMIT;

-- ============================================
-- POST-MIGRATION VALIDATION
-- ============================================

-- Verificar colunas adicionadas à tabela redes_sociais
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'yeslaser_influenciadora_redes_sociais'
  AND column_name IN ('sync_enabled', 'last_sync_at', 'sync_status', 'sync_error_message',
                       'profile_name', 'profile_picture_url', 'is_verified', 'external_id')
ORDER BY column_name;

-- Verificar tabela de logs criada
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'yeslaser_influenciadora_sync_logs';

-- Verificar coluna youtube_api_key na config
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'yeslaser_waha_config'
  AND column_name = 'youtube_api_key';

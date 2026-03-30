-- Migration: 20250127_create_marketing_module.sql
-- Purpose: Criar módulo completo de Marketing (templates, campanhas, assets)
-- Author: Claude + Danilo
-- Date: 2025-01-27

-- ROLLBACK PLAN:
-- BEGIN;
-- DROP TABLE IF EXISTS yeslaser_marketing_assets;
-- DROP TABLE IF EXISTS yeslaser_marketing_campanhas;
-- DROP TABLE IF EXISTS yeslaser_marketing_templates;
-- COMMIT;

BEGIN;

-- ============================================
-- Tabela: yeslaser_marketing_templates
-- Templates de mensagens para WhatsApp, Email, Redes Sociais
-- ============================================
CREATE TABLE IF NOT EXISTS yeslaser_marketing_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_template varchar(255) NOT NULL,
  template_content text NOT NULL,
  tipo varchar(50) NOT NULL CHECK (tipo IN ('whatsapp', 'email', 'social_media', 'landing_page')),
  variaveis_disponiveis jsonb DEFAULT '[]',
  is_default boolean DEFAULT false,
  ativo boolean DEFAULT true,
  unidade_id uuid REFERENCES yeslaser_franqueados(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes para templates
CREATE INDEX IF NOT EXISTS idx_marketing_templates_unidade ON yeslaser_marketing_templates(unidade_id);
CREATE INDEX IF NOT EXISTS idx_marketing_templates_tipo ON yeslaser_marketing_templates(tipo);
CREATE INDEX IF NOT EXISTS idx_marketing_templates_ativo ON yeslaser_marketing_templates(ativo);

-- ============================================
-- Tabela: yeslaser_marketing_campanhas
-- Campanhas de marketing com budget e UTM tracking
-- ============================================
CREATE TABLE IF NOT EXISTS yeslaser_marketing_campanhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome varchar(255) NOT NULL,
  descricao text,
  tipo varchar(50) NOT NULL CHECK (tipo IN ('geral', 'unidade_especifica')),
  status varchar(50) NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'pausada', 'finalizada')),
  unidade_id uuid REFERENCES yeslaser_franqueados(id) ON DELETE SET NULL,
  data_inicio date,
  data_fim date,
  budget_estimado numeric(10,2),
  objetivo text,
  publico_alvo text,
  canais jsonb DEFAULT '[]',
  metricas jsonb DEFAULT '{}',
  utm_source varchar(100),
  utm_medium varchar(100),
  utm_campaign varchar(100),
  utm_term varchar(100),
  utm_content varchar(100),
  ativa boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes para campanhas
CREATE INDEX IF NOT EXISTS idx_marketing_campanhas_unidade ON yeslaser_marketing_campanhas(unidade_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campanhas_status ON yeslaser_marketing_campanhas(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campanhas_tipo ON yeslaser_marketing_campanhas(tipo);
CREATE INDEX IF NOT EXISTS idx_marketing_campanhas_data_inicio ON yeslaser_marketing_campanhas(data_inicio);

-- ============================================
-- Tabela: yeslaser_marketing_assets
-- Assets de marketing (imagens, vídeos, banners, logos, artes)
-- ============================================
CREATE TABLE IF NOT EXISTS yeslaser_marketing_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome varchar(255) NOT NULL,
  descricao text,
  tipo varchar(50) NOT NULL CHECK (tipo IN ('imagem', 'video', 'banner', 'logo', 'arte_social')),
  categoria varchar(100),
  unidade_id uuid REFERENCES yeslaser_franqueados(id) ON DELETE SET NULL,
  campanha_id uuid REFERENCES yeslaser_marketing_campanhas(id) ON DELETE SET NULL,
  file_url text NOT NULL,
  file_size integer,
  file_type varchar(100),
  tags jsonb DEFAULT '[]',
  dimensoes jsonb DEFAULT '{}',
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes para assets
CREATE INDEX IF NOT EXISTS idx_marketing_assets_unidade ON yeslaser_marketing_assets(unidade_id);
CREATE INDEX IF NOT EXISTS idx_marketing_assets_campanha ON yeslaser_marketing_assets(campanha_id);
CREATE INDEX IF NOT EXISTS idx_marketing_assets_tipo ON yeslaser_marketing_assets(tipo);
CREATE INDEX IF NOT EXISTS idx_marketing_assets_categoria ON yeslaser_marketing_assets(categoria);
CREATE INDEX IF NOT EXISTS idx_marketing_assets_ativo ON yeslaser_marketing_assets(ativo);

-- ============================================
-- RLS (Row Level Security)
-- ============================================
ALTER TABLE yeslaser_marketing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE yeslaser_marketing_campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE yeslaser_marketing_assets ENABLE ROW LEVEL SECURITY;

-- Policies para templates
CREATE POLICY "Allow all operations for authenticated users on templates"
  ON yeslaser_marketing_templates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies para campanhas
CREATE POLICY "Allow all operations for authenticated users on campanhas"
  ON yeslaser_marketing_campanhas
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies para assets
CREATE POLICY "Allow all operations for authenticated users on assets"
  ON yeslaser_marketing_assets
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Comments para documentação
-- ============================================
COMMENT ON TABLE yeslaser_marketing_templates IS 'Templates de mensagens para marketing (WhatsApp, Email, Redes Sociais)';
COMMENT ON COLUMN yeslaser_marketing_templates.tipo IS 'Tipo do template: whatsapp, email, social_media, landing_page';
COMMENT ON COLUMN yeslaser_marketing_templates.variaveis_disponiveis IS 'Array de variáveis disponíveis para substituição no template';
COMMENT ON COLUMN yeslaser_marketing_templates.is_default IS 'Se é um template padrão do sistema';

COMMENT ON TABLE yeslaser_marketing_campanhas IS 'Campanhas de marketing com budget e tracking UTM';
COMMENT ON COLUMN yeslaser_marketing_campanhas.tipo IS 'Tipo da campanha: geral ou unidade_especifica';
COMMENT ON COLUMN yeslaser_marketing_campanhas.status IS 'Status da campanha: ativa, pausada, finalizada';
COMMENT ON COLUMN yeslaser_marketing_campanhas.canais IS 'Array de canais: whatsapp, email, facebook, instagram, google, tiktok';
COMMENT ON COLUMN yeslaser_marketing_campanhas.metricas IS 'Objeto com métricas de desempenho da campanha';

COMMENT ON TABLE yeslaser_marketing_assets IS 'Assets de marketing (imagens, vídeos, banners, logos, artes gráficas)';
COMMENT ON COLUMN yeslaser_marketing_assets.tipo IS 'Tipo do asset: imagem, video, banner, logo, arte_social';
COMMENT ON COLUMN yeslaser_marketing_assets.dimensoes IS 'Objeto com width e height do asset';
COMMENT ON COLUMN yeslaser_marketing_assets.tags IS 'Array de tags para organização';

COMMIT;

-- ============================================
-- Post-migration validation
-- ============================================
SELECT 'yeslaser_marketing_templates' as table_name, count(*) as columns
FROM information_schema.columns
WHERE table_name = 'yeslaser_marketing_templates';

SELECT 'yeslaser_marketing_campanhas' as table_name, count(*) as columns
FROM information_schema.columns
WHERE table_name = 'yeslaser_marketing_campanhas';

SELECT 'yeslaser_marketing_assets' as table_name, count(*) as columns
FROM information_schema.columns
WHERE table_name = 'yeslaser_marketing_assets';

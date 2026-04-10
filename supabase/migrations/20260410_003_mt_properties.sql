-- ═══════════════════════════════════════════════════════════
-- Migration: Módulo IMÓVEIS (CORE)
-- 6 tabelas: types, purposes, features, properties, feature_links, photos
-- Substitui: imoveis (86+ campos), tipoimovel, subtipoimovel, finalidade,
--   caracteristicas, proximidades, acabamento, situacao, fotosimovel, album_imoveis
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────
-- 1. TIPOS DE IMÓVEL (com subtipos via parent_id)
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_property_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  parent_id UUID REFERENCES mt_property_types(id),
  codigo VARCHAR(50) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  icone VARCHAR(50),
  ordem INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_mt_property_types_tenant ON mt_property_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_property_types_parent ON mt_property_types(parent_id);

ALTER TABLE mt_property_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_property_types_select" ON mt_property_types FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_property_types_insert" ON mt_property_types FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_property_types_update" ON mt_property_types FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_property_types_delete" ON mt_property_types FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- ───────────────────────────────────────────
-- 2. FINALIDADES (venda, aluguel, temporada)
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_property_purposes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  codigo VARCHAR(50) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  ordem INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_mt_property_purposes_tenant ON mt_property_purposes(tenant_id);

ALTER TABLE mt_property_purposes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_property_purposes_select" ON mt_property_purposes FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_property_purposes_insert" ON mt_property_purposes FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_property_purposes_update" ON mt_property_purposes FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_property_purposes_delete" ON mt_property_purposes FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- ───────────────────────────────────────────
-- 3. CATÁLOGO DE FEATURES (características, proximidades, acabamentos)
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_property_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('caracteristica', 'proximidade', 'acabamento', 'infraestrutura')),
  nome VARCHAR(100) NOT NULL,
  icone VARCHAR(50),
  ordem INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, categoria, nome)
);

CREATE INDEX IF NOT EXISTS idx_mt_property_features_tenant ON mt_property_features(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_property_features_cat ON mt_property_features(categoria);

ALTER TABLE mt_property_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_property_features_select" ON mt_property_features FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_property_features_insert" ON mt_property_features FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_property_features_update" ON mt_property_features FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_property_features_delete" ON mt_property_features FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- ───────────────────────────────────────────
-- 4. TABELA PRINCIPAL: mt_properties (86+ campos)
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),

  -- Referência e legado
  ref_code VARCHAR(50),
  legacy_id INTEGER,

  -- Classificação
  property_type_id UUID REFERENCES mt_property_types(id),
  property_subtype_id UUID REFERENCES mt_property_types(id),
  purpose_id UUID REFERENCES mt_property_purposes(id),

  -- Pessoas (FKs adicionadas por migrations posteriores)
  owner_id UUID,
  captador_id UUID,
  corretor_id UUID,
  construtora_id UUID REFERENCES mt_construtoras(id),

  -- Localização
  location_estado_id UUID REFERENCES mt_locations(id),
  location_cidade_id UUID REFERENCES mt_locations(id),
  location_bairro_id UUID REFERENCES mt_locations(id),
  endereco TEXT,
  numero VARCHAR(20),
  complemento VARCHAR(100),
  cep VARCHAR(10),
  building_id UUID REFERENCES mt_buildings(id),
  ponto_referencia TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  status_endereco VARCHAR(30),
  chaves VARCHAR(200),

  -- Cômodos
  dormitorios INTEGER DEFAULT 0,
  suites INTEGER DEFAULT 0,
  banheiros INTEGER DEFAULT 0,
  salas INTEGER DEFAULT 0,
  cozinhas INTEGER DEFAULT 0,
  garagens INTEGER DEFAULT 0,
  dep_empregada INTEGER DEFAULT 0,

  -- Áreas (m²)
  area_construida NUMERIC(12,2),
  area_privada NUMERIC(12,2),
  area_terreno NUMERIC(12,2),
  area_total NUMERIC(12,2),
  area_util NUMERIC(12,2),

  -- Preços (BRL)
  valor_venda NUMERIC(14,2),
  valor_locacao NUMERIC(14,2),
  valor_temporada NUMERIC(14,2),
  valor_iptu NUMERIC(14,2),
  valor_condominio NUMERIC(14,2),
  valor_promocao NUMERIC(14,2),
  status_valor VARCHAR(30),

  -- Financiamento Caixa
  aceita_financiamento BOOLEAN DEFAULT false,
  financiamento_caixa BOOLEAN DEFAULT false,
  financ_caixa_mostrar_site BOOLEAN DEFAULT false,
  financ_caixa_valor_entrada NUMERIC(14,2),
  financ_caixa_valor_parcela NUMERIC(14,2),
  financ_caixa_valor_chaves NUMERIC(14,2),
  financ_caixa_valor_intermediarias NUMERIC(14,2),
  financ_caixa_qtd_parcelas INTEGER,
  financ_caixa_qtd_intermediarias INTEGER,
  financ_caixa_tipo_intermediarias VARCHAR(255),
  financ_caixa_valor_subsidio NUMERIC(14,2),
  financ_caixa_valor_financiado NUMERIC(14,2),
  financ_caixa_observacoes TEXT,

  -- Financiamento Construtora
  financiamento_construtora BOOLEAN DEFAULT false,
  financ_const_mostrar_site BOOLEAN DEFAULT false,
  financ_const_valor_entrada NUMERIC(14,2),
  financ_const_valor_parcela NUMERIC(14,2),
  financ_const_valor_chaves NUMERIC(14,2),
  financ_const_valor_intermediarias NUMERIC(14,2),
  financ_const_qtd_parcelas INTEGER,
  financ_const_qtd_intermediarias INTEGER,
  financ_const_tipo_intermediarias VARCHAR(255),
  financ_const_observacoes TEXT,

  -- Status e flags
  situacao VARCHAR(30) DEFAULT 'disponivel',
  disponibilidade VARCHAR(30) DEFAULT 'disponivel',
  destaque BOOLEAN DEFAULT false,
  destaque_semana BOOLEAN DEFAULT false,
  lancamento BOOLEAN DEFAULT false,

  -- Condição
  mobiliado BOOLEAN DEFAULT false,
  semimobiliado BOOLEAN DEFAULT false,
  situacao_documentacao VARCHAR(100),
  distancia_praia INTEGER,

  -- Conteúdo
  titulo VARCHAR(300),
  descricao TEXT,
  descricao_interna TEXT,
  post_texto TEXT,

  -- SEO
  slug VARCHAR(300),
  seo_title VARCHAR(200),
  seo_descricao TEXT,
  seo_palavras_chave TEXT,

  -- Mídia
  foto_destaque_url TEXT,
  video_youtube_url TEXT,
  tour_virtual_url TEXT,

  -- Contadores desnormalizados
  total_visualizacoes INTEGER DEFAULT 0,
  total_consultas INTEGER DEFAULT 0,
  total_favoritos INTEGER DEFAULT 0,

  -- Portais
  portal_export BOOLEAN DEFAULT true,
  portal_metadata JSONB DEFAULT '{}',

  -- Tabela de preço (referência legado)
  id_tabela INTEGER,

  -- Auditoria
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES mt_users(id),
  updated_by UUID REFERENCES mt_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_mt_properties_tenant ON mt_properties(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_properties_franchise ON mt_properties(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_properties_type ON mt_properties(property_type_id);
CREATE INDEX IF NOT EXISTS idx_mt_properties_purpose ON mt_properties(purpose_id);
CREATE INDEX IF NOT EXISTS idx_mt_properties_owner ON mt_properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_mt_properties_captador ON mt_properties(captador_id);
CREATE INDEX IF NOT EXISTS idx_mt_properties_corretor ON mt_properties(corretor_id);
CREATE INDEX IF NOT EXISTS idx_mt_properties_building ON mt_properties(building_id);
CREATE INDEX IF NOT EXISTS idx_mt_properties_bairro ON mt_properties(location_bairro_id);
CREATE INDEX IF NOT EXISTS idx_mt_properties_cidade ON mt_properties(location_cidade_id);
CREATE INDEX IF NOT EXISTS idx_mt_properties_situacao ON mt_properties(situacao);
CREATE INDEX IF NOT EXISTS idx_mt_properties_destaque ON mt_properties(destaque) WHERE destaque = true;
CREATE INDEX IF NOT EXISTS idx_mt_properties_lancamento ON mt_properties(lancamento) WHERE lancamento = true;
CREATE INDEX IF NOT EXISTS idx_mt_properties_deleted ON mt_properties(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mt_properties_ref ON mt_properties(tenant_id, ref_code);
CREATE INDEX IF NOT EXISTS idx_mt_properties_slug ON mt_properties(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_mt_properties_valor_venda ON mt_properties(valor_venda) WHERE valor_venda IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mt_properties_valor_locacao ON mt_properties(valor_locacao) WHERE valor_locacao IS NOT NULL AND deleted_at IS NULL;

-- Índice composto para busca principal
CREATE INDEX IF NOT EXISTS idx_mt_properties_search ON mt_properties(tenant_id, property_type_id, purpose_id, location_cidade_id, situacao)
  WHERE deleted_at IS NULL;

-- Full-text search em português
ALTER TABLE mt_properties ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(titulo, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(descricao, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(ref_code, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(endereco, '')), 'C')
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_mt_properties_fts ON mt_properties USING GIN(search_vector);

ALTER TABLE mt_properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_properties_select" ON mt_properties FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_properties_insert" ON mt_properties FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()) OR (is_franchise_admin() AND franchise_id = current_franchise_id()));
CREATE POLICY "mt_properties_update" ON mt_properties FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()) OR (is_franchise_admin() AND franchise_id = current_franchise_id()));
CREATE POLICY "mt_properties_delete" ON mt_properties FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- ───────────────────────────────────────────
-- 5. VÍNCULO IMÓVEL ↔ FEATURE (many-to-many)
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_property_feature_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES mt_properties(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES mt_property_features(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  valor TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, feature_id)
);

CREATE INDEX IF NOT EXISTS idx_mt_pflinks_property ON mt_property_feature_links(property_id);
CREATE INDEX IF NOT EXISTS idx_mt_pflinks_feature ON mt_property_feature_links(feature_id);
CREATE INDEX IF NOT EXISTS idx_mt_pflinks_tenant ON mt_property_feature_links(tenant_id);

ALTER TABLE mt_property_feature_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_pflinks_select" ON mt_property_feature_links FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_pflinks_insert" ON mt_property_feature_links FOR INSERT
WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_pflinks_delete" ON mt_property_feature_links FOR DELETE
USING (is_platform_admin() OR tenant_id = current_tenant_id());

-- ───────────────────────────────────────────
-- 6. FOTOS DE IMÓVEIS (Supabase Storage)
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_property_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  property_id UUID NOT NULL REFERENCES mt_properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  storage_path TEXT,
  descricao VARCHAR(200),
  album VARCHAR(100),
  ordem INTEGER DEFAULT 0,
  is_destaque BOOLEAN DEFAULT false,
  mime_type VARCHAR(50),
  tamanho_bytes INTEGER,
  largura INTEGER,
  altura INTEGER,
  legacy_filename VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mt_prop_photos_property ON mt_property_photos(property_id);
CREATE INDEX IF NOT EXISTS idx_mt_prop_photos_tenant ON mt_property_photos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_prop_photos_ordem ON mt_property_photos(property_id, ordem);

ALTER TABLE mt_property_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_prop_photos_select" ON mt_property_photos FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_prop_photos_insert" ON mt_property_photos FOR INSERT
WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_prop_photos_update" ON mt_property_photos FOR UPDATE
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_prop_photos_delete" ON mt_property_photos FOR DELETE
USING (is_platform_admin() OR tenant_id = current_tenant_id());

-- Storage bucket para fotos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('property-photos', 'property-photos', true, 10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT DO NOTHING;

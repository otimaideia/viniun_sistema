-- ═══════════════════════════════════════════════════════════
-- Migration: Módulos EDIFÍCIOS + CONSTRUTORAS
-- Substitui: edificios, e_album_edificios, e_fotos_edificios, construtoras
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────
-- CONSTRUTORAS (precisa existir antes de buildings por FK)
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_construtoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  user_id UUID REFERENCES mt_users(id),
  legacy_id INTEGER,
  -- Dados
  nome VARCHAR(200) NOT NULL,
  logo_url TEXT,
  -- Endereço
  endereco TEXT,
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cep VARCHAR(10),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  ponto_referencia TEXT,
  -- Contato
  email VARCHAR(200),
  telefone VARCHAR(20),
  celular VARCHAR(20),
  responsavel VARCHAR(200),
  site VARCHAR(300),
  -- SEO
  seo_titulo VARCHAR(200),
  seo_descricao TEXT,
  seo_palavras_chave TEXT,
  mostrar_endereco BOOLEAN DEFAULT true,
  -- Status
  status VARCHAR(20) DEFAULT 'ativo',
  observacao TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES mt_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mt_construtoras_tenant ON mt_construtoras(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_construtoras_franchise ON mt_construtoras(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_construtoras_deleted ON mt_construtoras(deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE mt_construtoras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_construtoras_select" ON mt_construtoras FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_construtoras_insert" ON mt_construtoras FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()) OR (is_franchise_admin() AND franchise_id = current_franchise_id()));
CREATE POLICY "mt_construtoras_update" ON mt_construtoras FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_construtoras_delete" ON mt_construtoras FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- ───────────────────────────────────────────
-- EDIFÍCIOS / CONDOMÍNIOS
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  construtora_id UUID REFERENCES mt_construtoras(id),
  legacy_id INTEGER,
  -- Dados
  nome VARCHAR(200) NOT NULL,
  endereco TEXT,
  numero VARCHAR(20),
  complemento VARCHAR(100),
  cep VARCHAR(10),
  location_bairro_id UUID REFERENCES mt_locations(id),
  location_cidade_id UUID REFERENCES mt_locations(id),
  -- Contatos do edifício
  sindico_nome VARCHAR(200),
  sindico_telefone VARCHAR(20),
  sindico_email VARCHAR(200),
  sindico_celular VARCHAR(20),
  porteiro1_nome VARCHAR(200),
  porteiro1_telefone VARCHAR(20),
  porteiro1_email VARCHAR(200),
  porteiro1_celular VARCHAR(20),
  porteiro2_nome VARCHAR(200),
  porteiro2_telefone VARCHAR(20),
  porteiro2_email VARCHAR(200),
  porteiro2_celular VARCHAR(20),
  zelador_nome VARCHAR(200),
  zelador_telefone VARCHAR(20),
  zelador_email VARCHAR(200),
  zelador_celular VARCHAR(20),
  -- Dados do edifício
  ano_construcao INTEGER,
  total_unidades INTEGER,
  total_andares INTEGER,
  valor_condominio NUMERIC(14,2),
  infraestrutura JSONB DEFAULT '[]',
  fotos JSONB DEFAULT '[]',
  foto_destaque_url TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  descricao TEXT,
  campos_personalizados JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mt_buildings_tenant ON mt_buildings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_buildings_franchise ON mt_buildings(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_buildings_construtora ON mt_buildings(construtora_id);
CREATE INDEX IF NOT EXISTS idx_mt_buildings_location ON mt_buildings(location_bairro_id);
CREATE INDEX IF NOT EXISTS idx_mt_buildings_deleted ON mt_buildings(deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE mt_buildings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_buildings_select" ON mt_buildings FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_buildings_insert" ON mt_buildings FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()) OR (is_franchise_admin() AND franchise_id = current_franchise_id()));
CREATE POLICY "mt_buildings_update" ON mt_buildings FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()) OR (is_franchise_admin() AND franchise_id = current_franchise_id()));
CREATE POLICY "mt_buildings_delete" ON mt_buildings FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- ═══════════════════════════════════════════════════════════
-- Migration: Módulos PROPRIETÁRIOS + CAPTAÇÃO + CORRETORES
-- Substitui: proprietario, convites_proprietario, captador, corretor
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────
-- PROPRIETÁRIOS
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_property_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  user_id UUID REFERENCES mt_users(id),
  legacy_id INTEGER,
  -- Identificação
  nome VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  telefone VARCHAR(20),
  telefone2 VARCHAR(20),
  celular VARCHAR(20),
  cpf_cnpj VARCHAR(20),
  rg_inscricao_estadual VARCHAR(30),
  tipo_pessoa VARCHAR(2) DEFAULT 'PF',
  -- Endereço
  endereco TEXT,
  numero VARCHAR(20),
  complemento VARCHAR(100),
  cep VARCHAR(10),
  location_id UUID REFERENCES mt_locations(id),
  bairro VARCHAR(100),
  -- Status
  status VARCHAR(20) DEFAULT 'ativo',
  observacao TEXT,
  total_imoveis INTEGER DEFAULT 0,
  total_imoveis_ativos INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mt_property_owners_tenant ON mt_property_owners(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_property_owners_franchise ON mt_property_owners(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_property_owners_user ON mt_property_owners(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_property_owners_cpf ON mt_property_owners(tenant_id, cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_mt_property_owners_deleted ON mt_property_owners(deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE mt_property_owners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_prop_owners_select" ON mt_property_owners FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_prop_owners_insert" ON mt_property_owners FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()) OR (is_franchise_admin() AND franchise_id = current_franchise_id()));
CREATE POLICY "mt_prop_owners_update" ON mt_property_owners FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()) OR (is_franchise_admin() AND franchise_id = current_franchise_id()));
CREATE POLICY "mt_prop_owners_delete" ON mt_property_owners FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- Convites para proprietários
CREATE TABLE IF NOT EXISTS mt_property_owner_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  owner_id UUID NOT NULL REFERENCES mt_property_owners(id),
  token VARCHAR(64) NOT NULL UNIQUE,
  email VARCHAR(200) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  used_at TIMESTAMPTZ,
  user_created_id UUID REFERENCES mt_users(id),
  created_by UUID REFERENCES mt_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mt_property_owner_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_prop_invites_select" ON mt_property_owner_invites FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_prop_invites_insert" ON mt_property_owner_invites FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- ───────────────────────────────────────────
-- CAPTADORES
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_captadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  user_id UUID REFERENCES mt_users(id),
  legacy_id INTEGER,
  -- Dados pessoais
  nome VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  telefone VARCHAR(20),
  celular VARCHAR(20),
  foto_url TEXT,
  data_nascimento DATE,
  -- Endereço
  endereco TEXT,
  numero VARCHAR(20),
  complemento VARCHAR(100),
  cep VARCHAR(10),
  location_bairro_id UUID REFERENCES mt_locations(id),
  location_cidade_id UUID REFERENCES mt_locations(id),
  location_estado_id UUID REFERENCES mt_locations(id),
  -- Profissional
  creci VARCHAR(30),
  especialidade VARCHAR(100),
  comissao_percentual NUMERIC(5,2) DEFAULT 0,
  -- Métricas
  total_imoveis_captados INTEGER DEFAULT 0,
  total_imoveis_ativos INTEGER DEFAULT 0,
  -- Status
  status VARCHAR(20) DEFAULT 'ativo',
  observacao TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mt_captadores_tenant ON mt_captadores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_captadores_user ON mt_captadores(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_captadores_deleted ON mt_captadores(deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE mt_captadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_captadores_select" ON mt_captadores FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_captadores_insert" ON mt_captadores FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()) OR (is_franchise_admin() AND franchise_id = current_franchise_id()));
CREATE POLICY "mt_captadores_update" ON mt_captadores FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()) OR (is_franchise_admin() AND franchise_id = current_franchise_id()));
CREATE POLICY "mt_captadores_delete" ON mt_captadores FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- ───────────────────────────────────────────
-- CORRETORES
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_corretores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  user_id UUID REFERENCES mt_users(id),
  legacy_id INTEGER,
  -- Dados pessoais
  nome VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  telefone VARCHAR(20),
  celular VARCHAR(20),
  foto_url TEXT,
  data_nascimento DATE,
  -- Endereço
  endereco TEXT,
  numero VARCHAR(20),
  complemento VARCHAR(100),
  cep VARCHAR(10),
  location_bairro_id UUID REFERENCES mt_locations(id),
  location_cidade_id UUID REFERENCES mt_locations(id),
  location_estado_id UUID REFERENCES mt_locations(id),
  -- Profissional
  creci VARCHAR(30),
  creci_estado VARCHAR(2),
  creci_validade DATE,
  especialidades JSONB DEFAULT '[]',
  comissao_percentual NUMERIC(5,2) DEFAULT 0,
  -- Métricas
  total_vendas INTEGER DEFAULT 0,
  total_alugueis INTEGER DEFAULT 0,
  total_imoveis_ativos INTEGER DEFAULT 0,
  valor_total_vendas NUMERIC(14,2) DEFAULT 0,
  -- Status
  status VARCHAR(20) DEFAULT 'ativo',
  observacao TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mt_corretores_tenant ON mt_corretores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_corretores_user ON mt_corretores(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_corretores_creci ON mt_corretores(creci);
CREATE INDEX IF NOT EXISTS idx_mt_corretores_deleted ON mt_corretores(deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE mt_corretores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_corretores_select" ON mt_corretores FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_corretores_insert" ON mt_corretores FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()) OR (is_franchise_admin() AND franchise_id = current_franchise_id()));
CREATE POLICY "mt_corretores_update" ON mt_corretores FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()) OR (is_franchise_admin() AND franchise_id = current_franchise_id()));
CREATE POLICY "mt_corretores_delete" ON mt_corretores FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- Atribuição corretor ↔ imóvel (histórico)
CREATE TABLE IF NOT EXISTS mt_corretor_imovel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  corretor_id UUID NOT NULL REFERENCES mt_corretores(id),
  property_id UUID NOT NULL REFERENCES mt_properties(id),
  status VARCHAR(20) DEFAULT 'ativo',
  atribuido_em TIMESTAMPTZ DEFAULT NOW(),
  finalizado_em TIMESTAMPTZ,
  atribuido_por UUID REFERENCES mt_users(id),
  UNIQUE(corretor_id, property_id, status)
);

CREATE INDEX IF NOT EXISTS idx_mt_corretor_imovel_tenant ON mt_corretor_imovel(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_corretor_imovel_corretor ON mt_corretor_imovel(corretor_id);
CREATE INDEX IF NOT EXISTS idx_mt_corretor_imovel_property ON mt_corretor_imovel(property_id);

ALTER TABLE mt_corretor_imovel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_corretor_imovel_select" ON mt_corretor_imovel FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_corretor_imovel_insert" ON mt_corretor_imovel FOR INSERT
WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_corretor_imovel_update" ON mt_corretor_imovel FOR UPDATE
USING (is_platform_admin() OR tenant_id = current_tenant_id());

-- ───────────────────────────────────────────
-- ADICIONAR FKs em mt_properties
-- ───────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_properties_owner') THEN
    ALTER TABLE mt_properties ADD CONSTRAINT fk_properties_owner FOREIGN KEY (owner_id) REFERENCES mt_property_owners(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_properties_captador') THEN
    ALTER TABLE mt_properties ADD CONSTRAINT fk_properties_captador FOREIGN KEY (captador_id) REFERENCES mt_captadores(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_properties_corretor') THEN
    ALTER TABLE mt_properties ADD CONSTRAINT fk_properties_corretor FOREIGN KEY (corretor_id) REFERENCES mt_corretores(id);
  END IF;
END $$;

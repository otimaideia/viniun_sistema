-- ═══════════════════════════════════════════════════════════
-- Migration: Módulos TABELAS DE PREÇO + CLIENTES
-- Substitui: tabelas_imoveis, imoveis_to_tabelas, dono_tabelas,
--   clientes, atendimento, comoconheceu, grupos
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────
-- TABELAS DE PREÇO
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_property_price_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  nome VARCHAR(200) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(50) DEFAULT 'padrao',
  validade_inicio DATE,
  validade_fim DATE,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES mt_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mt_price_tables_tenant ON mt_property_price_tables(tenant_id);

ALTER TABLE mt_property_price_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_price_tables_select" ON mt_property_price_tables FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_price_tables_insert" ON mt_property_price_tables FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_price_tables_update" ON mt_property_price_tables FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_price_tables_delete" ON mt_property_price_tables FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- Itens da tabela de preço
CREATE TABLE IF NOT EXISTS mt_property_price_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  table_id UUID NOT NULL REFERENCES mt_property_price_tables(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES mt_properties(id),
  valor_tabela NUMERIC(14,2),
  valor_desconto NUMERIC(14,2),
  condicoes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mt_price_items_table ON mt_property_price_items(table_id);
CREATE INDEX IF NOT EXISTS idx_mt_price_items_property ON mt_property_price_items(property_id);

ALTER TABLE mt_property_price_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_price_items_select" ON mt_property_price_items FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_price_items_insert" ON mt_property_price_items FOR INSERT
WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_price_items_delete" ON mt_property_price_items FOR DELETE
USING (is_platform_admin() OR tenant_id = current_tenant_id());

-- Donos de tabelas de preço
CREATE TABLE IF NOT EXISTS mt_price_table_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  table_id UUID NOT NULL REFERENCES mt_property_price_tables(id) ON DELETE CASCADE,
  tipo_dono VARCHAR(50) NOT NULL,
  dono_id UUID,
  nome VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mt_price_table_owners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_ptowners_select" ON mt_price_table_owners FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_ptowners_insert" ON mt_price_table_owners FOR INSERT
WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id());

-- ───────────────────────────────────────────
-- CLIENTES IMOBILIÁRIOS
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_client_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  codigo VARCHAR(50) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, codigo)
);

ALTER TABLE mt_client_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_client_sources_select" ON mt_client_sources FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_client_sources_insert" ON mt_client_sources FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

CREATE TABLE IF NOT EXISTS mt_property_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  lead_id UUID REFERENCES mt_leads(id),
  legacy_id INTEGER,
  -- Identificação
  nome VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  telefone VARCHAR(20),
  telefone2 VARCHAR(20),
  celular VARCHAR(20),
  cpf_cnpj VARCHAR(20),
  rg_inscricao_estadual VARCHAR(30),
  -- Endereço
  endereco TEXT,
  numero VARCHAR(20),
  complemento VARCHAR(100),
  cep VARCHAR(10),
  location_id UUID REFERENCES mt_locations(id),
  bairro VARCHAR(100),
  -- Classificação
  tipo_cadastro VARCHAR(50),
  grupo VARCHAR(100),
  como_conheceu_id UUID REFERENCES mt_client_sources(id),
  receber_email BOOLEAN DEFAULT true,
  -- Status
  status VARCHAR(20) DEFAULT 'ativo',
  observacao TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mt_prop_clients_tenant ON mt_property_clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_prop_clients_lead ON mt_property_clients(lead_id);
CREATE INDEX IF NOT EXISTS idx_mt_prop_clients_deleted ON mt_property_clients(deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE mt_property_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_prop_clients_select" ON mt_property_clients FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_prop_clients_insert" ON mt_property_clients FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()) OR (is_franchise_admin() AND franchise_id = current_franchise_id()));
CREATE POLICY "mt_prop_clients_update" ON mt_property_clients FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()) OR (is_franchise_admin() AND franchise_id = current_franchise_id()));
CREATE POLICY "mt_prop_clients_delete" ON mt_property_clients FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- Tickets de atendimento
CREATE TABLE IF NOT EXISTS mt_property_client_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  client_id UUID NOT NULL REFERENCES mt_property_clients(id),
  user_id UUID REFERENCES mt_users(id),
  property_id UUID REFERENCES mt_properties(id),
  assunto VARCHAR(300),
  mensagem TEXT,
  status VARCHAR(30) DEFAULT 'aberto',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mt_prop_tickets_client ON mt_property_client_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_mt_prop_tickets_tenant ON mt_property_client_tickets(tenant_id);

ALTER TABLE mt_property_client_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_prop_tickets_select" ON mt_property_client_tickets FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_prop_tickets_insert" ON mt_property_client_tickets FOR INSERT
WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_prop_tickets_update" ON mt_property_client_tickets FOR UPDATE
USING (is_platform_admin() OR tenant_id = current_tenant_id());

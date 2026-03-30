-- =====================================================================
-- MIGRATION: Patrimônio (Asset Inventory) Module
-- Date: 2026-03-12
-- Tables: mt_asset_categories, mt_assets, mt_asset_maintenance, mt_asset_status_history
-- =====================================================================

-- 1. Register module in mt_modules
INSERT INTO mt_modules (codigo, nome, descricao, icone, categoria, ordem, is_core, is_active)
VALUES (
  'patrimonio',
  'Patrimônio',
  'Gestão de ativos fixos, depreciação e manutenção',
  'Landmark',
  'gestao',
  20,
  false,
  true
)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao;

-- 2. Enable for all tenants
INSERT INTO mt_tenant_modules (tenant_id, module_id, is_active)
SELECT t.id, m.id, true
FROM mt_tenants t
CROSS JOIN mt_modules m
WHERE m.codigo = 'patrimonio'
AND NOT EXISTS (
  SELECT 1 FROM mt_tenant_modules tm
  WHERE tm.tenant_id = t.id AND tm.module_id = m.id
);

-- 3. mt_asset_categories
CREATE TABLE IF NOT EXISTS mt_asset_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),

  codigo VARCHAR(50) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  icone VARCHAR(50),
  cor VARCHAR(7),

  depreciation_method VARCHAR(30) DEFAULT 'straight_line',
  default_useful_life_years INTEGER,
  default_salvage_rate NUMERIC(5,2),

  ordem INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  UNIQUE(tenant_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_mt_asset_categories_tenant ON mt_asset_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_asset_categories_deleted ON mt_asset_categories(deleted_at) WHERE deleted_at IS NULL;

-- 4. mt_assets (main table)
CREATE TABLE IF NOT EXISTS mt_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  category_id UUID REFERENCES mt_asset_categories(id),

  codigo VARCHAR(50) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  numero_serie VARCHAR(100),
  marca VARCHAR(100),
  modelo VARCHAR(100),
  fornecedor VARCHAR(255),
  nota_fiscal VARCHAR(50),
  imagem_url TEXT,

  valor_aquisicao NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_residual NUMERIC(12,2) DEFAULT 0,
  moeda VARCHAR(3) DEFAULT 'BRL',
  data_aquisicao DATE,
  data_inicio_uso DATE,

  metodo_depreciacao VARCHAR(30) DEFAULT 'straight_line',
  vida_util_anos INTEGER DEFAULT 5,
  vida_util_meses INTEGER,
  unidades_total_esperadas INTEGER,
  unidades_produzidas INTEGER DEFAULT 0,
  taxa_depreciacao NUMERIC(8,4),

  depreciacao_acumulada NUMERIC(12,2) DEFAULT 0,
  valor_contabil NUMERIC(12,2) DEFAULT 0,

  status VARCHAR(30) DEFAULT 'acquired',
  localizacao VARCHAR(255),
  responsavel VARCHAR(255),

  data_baixa DATE,
  motivo_baixa TEXT,
  valor_baixa NUMERIC(12,2),

  franchise_origem_id UUID REFERENCES mt_franchises(id),
  data_transferencia DATE,

  tags TEXT[],
  observacoes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,

  UNIQUE(tenant_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_mt_assets_tenant ON mt_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_assets_franchise ON mt_assets(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_assets_category ON mt_assets(category_id);
CREATE INDEX IF NOT EXISTS idx_mt_assets_status ON mt_assets(status);
CREATE INDEX IF NOT EXISTS idx_mt_assets_deleted ON mt_assets(deleted_at) WHERE deleted_at IS NULL;

-- 5. mt_asset_maintenance
CREATE TABLE IF NOT EXISTS mt_asset_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  asset_id UUID NOT NULL REFERENCES mt_assets(id) ON DELETE CASCADE,

  tipo VARCHAR(30) NOT NULL,
  descricao TEXT NOT NULL,
  fornecedor_servico VARCHAR(255),
  custo NUMERIC(12,2) DEFAULT 0,

  data_agendada DATE,
  data_realizada DATE,
  proxima_manutencao DATE,

  status VARCHAR(20) DEFAULT 'scheduled',
  notas TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_mt_asset_maintenance_tenant ON mt_asset_maintenance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_asset_maintenance_asset ON mt_asset_maintenance(asset_id);
CREATE INDEX IF NOT EXISTS idx_mt_asset_maintenance_status ON mt_asset_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_mt_asset_maintenance_deleted ON mt_asset_maintenance(deleted_at) WHERE deleted_at IS NULL;

-- 6. mt_asset_status_history
CREATE TABLE IF NOT EXISTS mt_asset_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  asset_id UUID NOT NULL REFERENCES mt_assets(id) ON DELETE CASCADE,

  status_anterior VARCHAR(30),
  status_novo VARCHAR(30) NOT NULL,
  motivo TEXT,

  franchise_anterior_id UUID REFERENCES mt_franchises(id),
  franchise_nova_id UUID REFERENCES mt_franchises(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_mt_asset_status_history_asset ON mt_asset_status_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_mt_asset_status_history_tenant ON mt_asset_status_history(tenant_id);

-- 7. RLS Policies
ALTER TABLE mt_asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_asset_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_asset_status_history ENABLE ROW LEVEL SECURITY;

-- mt_asset_categories
CREATE POLICY "mt_asset_categories_select" ON mt_asset_categories FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_asset_categories_insert" ON mt_asset_categories FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_asset_categories_update" ON mt_asset_categories FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_asset_categories_delete" ON mt_asset_categories FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- mt_assets
CREATE POLICY "mt_assets_select" ON mt_assets FOR SELECT
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
  (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_assets_insert" ON mt_assets FOR INSERT
WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);
CREATE POLICY "mt_assets_update" ON mt_assets FOR UPDATE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);
CREATE POLICY "mt_assets_delete" ON mt_assets FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- mt_asset_maintenance
CREATE POLICY "mt_asset_maintenance_select" ON mt_asset_maintenance FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_asset_maintenance_insert" ON mt_asset_maintenance FOR INSERT
WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_asset_maintenance_update" ON mt_asset_maintenance FOR UPDATE
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_asset_maintenance_delete" ON mt_asset_maintenance FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- mt_asset_status_history
CREATE POLICY "mt_asset_status_history_select" ON mt_asset_status_history FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_asset_status_history_insert" ON mt_asset_status_history FOR INSERT
WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id());

-- 8. Seed default categories for all tenants
INSERT INTO mt_asset_categories (tenant_id, codigo, nome, descricao, icone, cor, depreciation_method, default_useful_life_years, default_salvage_rate, ordem)
SELECT t.id, v.codigo, v.nome, v.descricao, v.icone, v.cor, v.method, v.vida_util, v.salvage, v.ordem
FROM mt_tenants t
CROSS JOIN (VALUES
  ('equipamentos_laser', 'Equipamentos Laser', 'Máquinas de depilação a laser, IPL, etc.', 'Zap', '#E91E63', 'straight_line', 10, 10.00, 1),
  ('tecnologia', 'Tecnologia', 'Computadores, tablets, impressoras, etc.', 'Monitor', '#2196F3', 'straight_line', 5, 5.00, 2),
  ('mobiliario', 'Mobiliário', 'Mesas, cadeiras, macas, armários, etc.', 'Armchair', '#4CAF50', 'straight_line', 10, 10.00, 3),
  ('veiculos', 'Veículos', 'Carros, motos, vans, etc.', 'Car', '#FF9800', 'declining_balance', 5, 20.00, 4),
  ('infraestrutura', 'Infraestrutura', 'Reforma, instalações, benfeitorias, etc.', 'Building2', '#9C27B0', 'straight_line', 15, 0.00, 5),
  ('utensilios', 'Utensílios e Ferramentas', 'Instrumentos, acessórios, ferramentas', 'Wrench', '#607D8B', 'straight_line', 5, 5.00, 6)
) AS v(codigo, nome, descricao, icone, cor, method, vida_util, salvage, ordem)
WHERE NOT EXISTS (
  SELECT 1 FROM mt_asset_categories ac
  WHERE ac.tenant_id = t.id AND ac.codigo = v.codigo
);

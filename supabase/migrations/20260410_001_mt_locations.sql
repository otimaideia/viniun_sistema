-- ═══════════════════════════════════════════════════════════
-- Migration: Módulo LOCALIZAÇÕES (localizacoes)
-- Tabela hierárquica: país → estado → cidade → bairro
-- Substitui: estado, cidade, bairros, bairros_descricao, pais
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS mt_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  parent_id UUID REFERENCES mt_locations(id),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('pais', 'estado', 'cidade', 'bairro')),
  nome VARCHAR(200) NOT NULL,
  codigo_ibge VARCHAR(10),
  uf CHAR(2),
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  descricao_seo TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mt_locations_tenant ON mt_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_locations_parent ON mt_locations(parent_id);
CREATE INDEX IF NOT EXISTS idx_mt_locations_tipo ON mt_locations(tipo);
CREATE INDEX IF NOT EXISTS idx_mt_locations_nome ON mt_locations(tenant_id, tipo, nome);
CREATE INDEX IF NOT EXISTS idx_mt_locations_deleted ON mt_locations(deleted_at) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE mt_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_locations_select" ON mt_locations FOR SELECT
USING (
  is_platform_admin() OR
  tenant_id = current_tenant_id()
);

CREATE POLICY "mt_locations_insert" ON mt_locations FOR INSERT
WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_locations_update" ON mt_locations FOR UPDATE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_locations_delete" ON mt_locations FOR DELETE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

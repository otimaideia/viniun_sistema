-- ═══════════════════════════════════════════════════════════
-- Migration: Módulo CONSULTAS DE IMÓVEIS
-- Substitui: contador, maisinfo, faleconosco, encomenda,
--   desbloqueio, ligacoes, w_page_visitadas, visitantes
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────
-- CONSULTAS / LEADS DE IMÓVEIS (unifica 6 tabelas legado)
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_property_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  property_id UUID REFERENCES mt_properties(id),
  lead_id UUID REFERENCES mt_leads(id),
  appointment_id UUID REFERENCES mt_appointments(id),
  corretor_id UUID REFERENCES mt_corretores(id),
  -- Tipo (unifica as 6 tabelas legado)
  tipo VARCHAR(30) DEFAULT 'consulta' CHECK (tipo IN ('consulta', 'encomenda', 'mais_info', 'fale_conosco', 'desbloqueio', 'ligacao')),
  -- Contato
  nome VARCHAR(200),
  email VARCHAR(200),
  telefone VARCHAR(20),
  mensagem TEXT,
  forma_contato VARCHAR(50),
  como_conheceu VARCHAR(100),
  source_url TEXT,
  source_portal VARCHAR(50),
  -- Encomenda (quando tipo=encomenda)
  encomenda_tipo_imovel VARCHAR(50),
  encomenda_dormitorios INTEGER,
  encomenda_area_min NUMERIC(12,2),
  encomenda_area_max NUMERIC(12,2),
  encomenda_valor_min NUMERIC(14,2),
  encomenda_valor_max NUMERIC(14,2),
  encomenda_localizacao TEXT,
  encomenda_descricao TEXT,
  encomenda_financiamento BOOLEAN DEFAULT false,
  -- Status
  status VARCHAR(30) DEFAULT 'novo' CHECK (status IN ('novo', 'respondido', 'agendado', 'convertido', 'perdido', 'em_atendimento')),
  prioridade VARCHAR(20) DEFAULT 'normal',
  respondido_em TIMESTAMPTZ,
  respondido_por UUID REFERENCES mt_users(id),
  notas_internas TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mt_prop_inquiries_property ON mt_property_inquiries(property_id);
CREATE INDEX IF NOT EXISTS idx_mt_prop_inquiries_lead ON mt_property_inquiries(lead_id);
CREATE INDEX IF NOT EXISTS idx_mt_prop_inquiries_tenant ON mt_property_inquiries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_prop_inquiries_tipo ON mt_property_inquiries(tipo);
CREATE INDEX IF NOT EXISTS idx_mt_prop_inquiries_status ON mt_property_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_mt_prop_inquiries_date ON mt_property_inquiries(created_at DESC);

ALTER TABLE mt_property_inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_prop_inq_select" ON mt_property_inquiries FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_prop_inq_insert" ON mt_property_inquiries FOR INSERT
WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_prop_inq_update" ON mt_property_inquiries FOR UPDATE
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_prop_inq_delete" ON mt_property_inquiries FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- ───────────────────────────────────────────
-- PEDIDOS
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_property_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  client_id UUID REFERENCES mt_property_clients(id),
  property_id UUID REFERENCES mt_properties(id),
  items JSONB DEFAULT '[]',
  status VARCHAR(30) DEFAULT 'pendente',
  valor_total NUMERIC(14,2),
  observacoes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mt_prop_orders_tenant ON mt_property_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_prop_orders_client ON mt_property_orders(client_id);

ALTER TABLE mt_property_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_prop_orders_select" ON mt_property_orders FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_prop_orders_insert" ON mt_property_orders FOR INSERT
WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_prop_orders_update" ON mt_property_orders FOR UPDATE
USING (is_platform_admin() OR tenant_id = current_tenant_id());

-- ───────────────────────────────────────────
-- VISUALIZAÇÕES / ANALYTICS
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_property_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  property_id UUID NOT NULL REFERENCES mt_properties(id),
  lead_id UUID REFERENCES mt_leads(id),
  visitor_session VARCHAR(100),
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  source VARCHAR(50),
  duracao_segundos INTEGER,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mt_prop_views_property ON mt_property_views(property_id);
CREATE INDEX IF NOT EXISTS idx_mt_prop_views_tenant ON mt_property_views(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_prop_views_date ON mt_property_views(viewed_at DESC);

ALTER TABLE mt_property_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_prop_views_select" ON mt_property_views FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_prop_views_insert" ON mt_property_views FOR INSERT
WITH CHECK (true); -- qualquer um pode registrar view

-- ───────────────────────────────────────────
-- FAVORITOS
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_property_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  property_id UUID NOT NULL REFERENCES mt_properties(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES mt_leads(id),
  user_id UUID REFERENCES mt_users(id),
  session_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mt_prop_favorites_property ON mt_property_favorites(property_id);
CREATE INDEX IF NOT EXISTS idx_mt_prop_favorites_tenant ON mt_property_favorites(tenant_id);

ALTER TABLE mt_property_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_prop_favs_select" ON mt_property_favorites FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_prop_favs_insert" ON mt_property_favorites FOR INSERT
WITH CHECK (true); -- qualquer um pode favoritar

-- ───────────────────────────────────────────
-- EXTENSÃO mt_leads
-- ───────────────────────────────────────────
ALTER TABLE mt_leads ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES mt_properties(id);
ALTER TABLE mt_leads ADD COLUMN IF NOT EXISTS property_inquiry_id UUID REFERENCES mt_property_inquiries(id);
CREATE INDEX IF NOT EXISTS idx_mt_leads_property ON mt_leads(property_id) WHERE property_id IS NOT NULL;

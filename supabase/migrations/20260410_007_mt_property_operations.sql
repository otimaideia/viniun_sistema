-- ═══════════════════════════════════════════════════════════
-- Migration: Módulos PORTAIS + EMAIL MARKETING + CONTEÚDO
-- Substitui: imoveisportais, imoveisparaintegrar, logintegracao,
--   emailcampanha, emailclick, emailrecebimento, logemailmarketing,
--   newsletter, templates, noticias, paginas
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────
-- PORTAIS IMOBILIÁRIOS
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_property_portals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  codigo VARCHAR(50) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  logo_url TEXT,
  url_portal TEXT,
  formato_export VARCHAR(20) DEFAULT 'xml',
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, codigo)
);

ALTER TABLE mt_property_portals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_prop_portals_select" ON mt_property_portals FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_prop_portals_insert" ON mt_property_portals FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_prop_portals_update" ON mt_property_portals FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- Fila de exportação
CREATE TABLE IF NOT EXISTS mt_property_portal_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  property_id UUID NOT NULL REFERENCES mt_properties(id),
  portal_id UUID NOT NULL REFERENCES mt_property_portals(id),
  destaque BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'pendente',
  last_exported_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, portal_id)
);

CREATE INDEX IF NOT EXISTS idx_mt_portal_queue_tenant ON mt_property_portal_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_portal_queue_portal ON mt_property_portal_queue(portal_id);

ALTER TABLE mt_property_portal_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_portal_queue_select" ON mt_property_portal_queue FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_portal_queue_insert" ON mt_property_portal_queue FOR INSERT
WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_portal_queue_update" ON mt_property_portal_queue FOR UPDATE
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_portal_queue_delete" ON mt_property_portal_queue FOR DELETE
USING (is_platform_admin() OR tenant_id = current_tenant_id());

-- Log de exportações
CREATE TABLE IF NOT EXISTS mt_property_portal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  portal_id UUID NOT NULL REFERENCES mt_property_portals(id),
  property_id UUID REFERENCES mt_properties(id),
  action VARCHAR(30),
  status VARCHAR(20),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mt_portal_logs_tenant ON mt_property_portal_logs(tenant_id);

ALTER TABLE mt_property_portal_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_portal_logs_select" ON mt_property_portal_logs FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_portal_logs_insert" ON mt_property_portal_logs FOR INSERT
WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id());

-- ───────────────────────────────────────────
-- EMAIL MARKETING IMOBILIÁRIO
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_property_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  nome VARCHAR(200) NOT NULL,
  assunto_template VARCHAR(300),
  html_template TEXT,
  categoria VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mt_property_email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_email_tpl_select" ON mt_property_email_templates FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_email_tpl_insert" ON mt_property_email_templates FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_email_tpl_update" ON mt_property_email_templates FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_email_tpl_delete" ON mt_property_email_templates FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

CREATE TABLE IF NOT EXISTS mt_property_email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  template_id UUID REFERENCES mt_property_email_templates(id),
  nome VARCHAR(200) NOT NULL,
  assunto VARCHAR(300),
  imagem_url TEXT,
  html_body TEXT,
  -- Envio
  status VARCHAR(30) DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'agendada', 'enviando', 'enviada', 'cancelada')),
  tipo_envio VARCHAR(30) DEFAULT 'todos',
  filtros JSONB DEFAULT '{}',
  agendada_para TIMESTAMPTZ,
  enviada_em TIMESTAMPTZ,
  -- Métricas
  total_destinatarios INTEGER DEFAULT 0,
  total_enviados INTEGER DEFAULT 0,
  total_entregues INTEGER DEFAULT 0,
  total_abertos INTEGER DEFAULT 0,
  total_clicados INTEGER DEFAULT 0,
  total_bounces INTEGER DEFAULT 0,
  -- Auditoria
  created_by UUID REFERENCES mt_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mt_email_campaigns_tenant ON mt_property_email_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_email_campaigns_status ON mt_property_email_campaigns(status);

ALTER TABLE mt_property_email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_email_camp_select" ON mt_property_email_campaigns FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_email_camp_insert" ON mt_property_email_campaigns FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_email_camp_update" ON mt_property_email_campaigns FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

CREATE TABLE IF NOT EXISTS mt_property_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  campaign_id UUID NOT NULL REFERENCES mt_property_email_campaigns(id),
  client_id UUID REFERENCES mt_property_clients(id),
  email VARCHAR(200) NOT NULL,
  status VARCHAR(30) DEFAULT 'enviado',
  evento_em TIMESTAMPTZ DEFAULT NOW(),
  link_clicado TEXT
);

CREATE INDEX IF NOT EXISTS idx_mt_email_logs_campaign ON mt_property_email_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_mt_email_logs_tenant ON mt_property_email_logs(tenant_id);

ALTER TABLE mt_property_email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_email_logs_select" ON mt_property_email_logs FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_email_logs_insert" ON mt_property_email_logs FOR INSERT
WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id());

CREATE TABLE IF NOT EXISTS mt_property_newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  email VARCHAR(200) NOT NULL,
  nome VARCHAR(200),
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  UNIQUE(tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_mt_newsletters_tenant ON mt_property_newsletters(tenant_id);

ALTER TABLE mt_property_newsletters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_newsletters_select" ON mt_property_newsletters FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_newsletters_insert" ON mt_property_newsletters FOR INSERT
WITH CHECK (true); -- qualquer um pode se inscrever

-- ───────────────────────────────────────────
-- CONTEÚDO / CMS
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mt_property_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  titulo VARCHAR(300) NOT NULL,
  slug VARCHAR(300),
  conteudo TEXT,
  resumo TEXT,
  imagem_url TEXT,
  autor VARCHAR(200),
  status VARCHAR(20) DEFAULT 'rascunho',
  publicado_em TIMESTAMPTZ,
  seo_title VARCHAR(200),
  seo_descricao TEXT,
  seo_palavras_chave TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mt_prop_news_tenant ON mt_property_news(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_prop_news_slug ON mt_property_news(tenant_id, slug);

ALTER TABLE mt_property_news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_prop_news_select" ON mt_property_news FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_prop_news_insert" ON mt_property_news FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_prop_news_update" ON mt_property_news FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_prop_news_delete" ON mt_property_news FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

CREATE TABLE IF NOT EXISTS mt_property_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  titulo VARCHAR(300) NOT NULL,
  slug VARCHAR(300),
  conteudo TEXT,
  status VARCHAR(20) DEFAULT 'rascunho',
  ordem INTEGER DEFAULT 0,
  seo_title VARCHAR(200),
  seo_descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mt_prop_pages_tenant ON mt_property_pages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_prop_pages_slug ON mt_property_pages(tenant_id, slug);

ALTER TABLE mt_property_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_prop_pages_select" ON mt_property_pages FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "mt_prop_pages_insert" ON mt_property_pages FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_prop_pages_update" ON mt_property_pages FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));
CREATE POLICY "mt_prop_pages_delete" ON mt_property_pages FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

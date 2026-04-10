-- ═══════════════════════════════════════════════════════════
-- Migration: REGISTRO DOS 15 MÓDULOS DO ECOSSISTEMA IMOBILIÁRIO
-- + Sub-features via mt_module_features
-- + Habilitação para todos os tenants
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────
-- 15 MÓDULOS
-- ───────────────────────────────────────────
INSERT INTO mt_modules (codigo, nome, descricao, icone, categoria, ordem, is_core, is_active, rota_base, depends_on) VALUES
-- Infraestrutura
('localizacoes', 'Localizações', 'Gestão de estados, cidades, bairros e CEPs', 'MapPin', 'sistema', 50, true, true, '/configuracoes/localizacoes', NULL),
('edificios', 'Edifícios', 'Gestão de edifícios, condomínios, síndicos e porteiros', 'Building', 'imobiliario', 51, false, true, '/edificios', '{"localizacoes"}'),
('construtoras', 'Construtoras', 'Gestão de construtoras e incorporadoras', 'HardHat', 'imobiliario', 52, false, true, '/construtoras', '{"edificios"}'),
-- Core Imobiliário
('imoveis', 'Imóveis', 'Gestão completa de imóveis com tipos, finalidades, fotos e busca', 'Building2', 'imobiliario', 53, false, true, '/imoveis', '{"localizacoes"}'),
('tabelas_preco', 'Tabelas de Preço', 'Tabelas de preço e condições comerciais de imóveis', 'Table2', 'imobiliario', 54, false, true, '/imoveis/tabelas-preco', '{"imoveis"}'),
-- Pessoas
('proprietarios_imoveis', 'Proprietários', 'Gestão de proprietários, convites e portal self-service', 'UserCheck', 'imobiliario', 55, false, true, '/proprietarios', '{"imoveis"}'),
('captacao', 'Captação', 'Gestão de captadores de imóveis e comissões', 'Search', 'imobiliario', 56, false, true, '/captacao', '{"imoveis"}'),
('corretores', 'Corretores', 'Gestão de corretores, CRECI e performance de vendas', 'Briefcase', 'imobiliario', 57, false, true, '/corretores', '{"imoveis"}'),
('clientes_imoveis', 'Clientes Imobiliários', 'CRM de clientes, atendimentos e ficha de atendimento', 'Users', 'imobiliario', 58, false, true, '/clientes-imoveis', '{"imoveis"}'),
-- Operação
('consultas_imoveis', 'Consultas de Imóveis', 'Leads, consultas, encomendas, desbloqueios e analytics', 'MessageSquare', 'imobiliario', 59, false, true, '/imoveis/consultas', '{"imoveis","leads"}'),
('portais_imoveis', 'Portais Imobiliários', 'Exportação XML para OLX, VivaReal, ImovelWeb e 7+ portais', 'Globe', 'imobiliario', 60, false, true, '/imoveis/portais', '{"imoveis"}'),
('pedidos_imoveis', 'Pedidos', 'Gestão de pedidos e solicitações de clientes', 'ShoppingCart', 'imobiliario', 61, false, true, '/imoveis/pedidos', '{"clientes_imoveis"}'),
-- Marketing & Conteúdo
('email_marketing_imoveis', 'Email Marketing Imobiliário', 'Campanhas, templates, envios e newsletter de imóveis', 'Mail', 'imobiliario', 62, false, true, '/imoveis/email-marketing', '{"clientes_imoveis"}'),
('conteudo_imoveis', 'Conteúdo Imobiliário', 'Notícias, páginas institucionais e descrição de bairros', 'FileText', 'imobiliario', 63, false, true, '/imoveis/conteudo', '{"localizacoes"}'),
-- Análise
('relatorios_imoveis', 'Relatórios Imobiliários', 'Relatórios de acesso, conversões, cadastros e email marketing', 'BarChart3', 'imobiliario', 64, false, true, '/imoveis/relatorios', '{"imoveis","clientes_imoveis"}')
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  icone = EXCLUDED.icone,
  categoria = EXCLUDED.categoria,
  ordem = EXCLUDED.ordem,
  rota_base = EXCLUDED.rota_base,
  depends_on = EXCLUDED.depends_on;

-- ───────────────────────────────────────────
-- HABILITAR PARA TODOS OS TENANTS
-- ───────────────────────────────────────────
INSERT INTO mt_tenant_modules (tenant_id, module_id, is_active)
SELECT t.id, m.id, true
FROM mt_tenants t CROSS JOIN mt_modules m
WHERE m.codigo IN (
  'localizacoes','edificios','construtoras','imoveis','tabelas_preco',
  'proprietarios_imoveis','captacao','corretores','clientes_imoveis',
  'consultas_imoveis','portais_imoveis','pedidos_imoveis',
  'email_marketing_imoveis','conteudo_imoveis','relatorios_imoveis'
)
AND NOT EXISTS (
  SELECT 1 FROM mt_tenant_modules tm WHERE tm.tenant_id = t.id AND tm.module_id = m.id
);

-- ───────────────────────────────────────────
-- SUB-FEATURES (mt_module_features)
-- ───────────────────────────────────────────

-- Imoveis
INSERT INTO mt_module_features (module_id, codigo, nome, descricao, tipo, requires_plan, is_active) VALUES
((SELECT id FROM mt_modules WHERE codigo = 'imoveis'), 'busca_publica', 'Busca Pública', 'Página pública de busca de imóveis no site', 'feature', '{}', true),
((SELECT id FROM mt_modules WHERE codigo = 'imoveis'), 'financiamento_calc', 'Simulador Financiamento', 'Calculadora de financiamento Caixa/Construtora', 'feature', '{pro}', true),
((SELECT id FROM mt_modules WHERE codigo = 'imoveis'), 'tour_virtual', 'Tour Virtual', 'Suporte a tour virtual e vídeo 360', 'feature', '{pro}', true),
((SELECT id FROM mt_modules WHERE codigo = 'imoveis'), 'comparador', 'Comparador', 'Comparação lado-a-lado de imóveis', 'feature', '{pro}', true),
((SELECT id FROM mt_modules WHERE codigo = 'imoveis'), 'mapa', 'Mapa de Imóveis', 'Visualização de imóveis no Google Maps', 'feature', '{pro}', true),
-- Proprietários
((SELECT id FROM mt_modules WHERE codigo = 'proprietarios_imoveis'), 'portal_proprietario', 'Portal Self-Service', 'Dashboard, meus imóveis, leads, estatísticas', 'feature', '{pro}', true),
((SELECT id FROM mt_modules WHERE codigo = 'proprietarios_imoveis'), 'convites', 'Sistema de Convites', 'Convite por email/WhatsApp para proprietários', 'feature', '{}', true),
-- Consultas
((SELECT id FROM mt_modules WHERE codigo = 'consultas_imoveis'), 'encomendas', 'Encomendas de Imóveis', 'Clientes solicitam imóveis específicos', 'feature', '{}', true),
((SELECT id FROM mt_modules WHERE codigo = 'consultas_imoveis'), 'desbloqueio_fotos', 'Desbloqueio de Fotos', 'Captura lead para liberar fotos premium', 'feature', '{}', true),
((SELECT id FROM mt_modules WHERE codigo = 'consultas_imoveis'), 'analytics', 'Analytics de Views', 'Tracking de visualizações por imóvel', 'feature', '{pro}', true),
-- Email Marketing
((SELECT id FROM mt_modules WHERE codigo = 'email_marketing_imoveis'), 'envio_automatico', 'Envio Automático', 'Envio automático semanal de novos imóveis', 'feature', '{pro}', true),
((SELECT id FROM mt_modules WHERE codigo = 'email_marketing_imoveis'), 'newsletter', 'Newsletter', 'Gestão de newsletter e opt-in', 'feature', '{}', true),
-- Portais (integrações individuais)
((SELECT id FROM mt_modules WHERE codigo = 'portais_imoveis'), 'olx', 'OLX', 'Integração com OLX', 'integration', '{}', true),
((SELECT id FROM mt_modules WHERE codigo = 'portais_imoveis'), 'vivareal', 'VivaReal', 'Integração com VivaReal', 'integration', '{}', true),
((SELECT id FROM mt_modules WHERE codigo = 'portais_imoveis'), 'zapimoveis', 'ZAP Imóveis', 'Integração com ZAP Imóveis', 'integration', '{pro}', true),
((SELECT id FROM mt_modules WHERE codigo = 'portais_imoveis'), 'imovelweb', 'ImovelWeb', 'Integração com ImovelWeb', 'integration', '{}', true),
((SELECT id FROM mt_modules WHERE codigo = 'portais_imoveis'), 'crecisp', 'CRECI-SP', 'Integração com CRECI-SP', 'integration', '{}', true),
((SELECT id FROM mt_modules WHERE codigo = 'portais_imoveis'), 'properati', 'Properati', 'Integração com Properati', 'integration', '{}', true),
((SELECT id FROM mt_modules WHERE codigo = 'portais_imoveis'), 'imobox', 'ImoBox', 'Integração com ImoBox', 'integration', '{}', true),
((SELECT id FROM mt_modules WHERE codigo = 'portais_imoveis'), 'webcasas', 'WebCasas', 'Integração com WebCasas', 'integration', '{}', true)
ON CONFLICT (module_id, codigo) DO UPDATE SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao;

-- ───────────────────────────────────────────
-- SEED: Tipos de imóvel padrão (para todos os tenants)
-- ───────────────────────────────────────────
INSERT INTO mt_property_types (tenant_id, codigo, nome, icone, ordem)
SELECT t.id, v.codigo, v.nome, v.icone, v.ordem
FROM mt_tenants t
CROSS JOIN (VALUES
  ('apartamento', 'Apartamento', 'Building2', 1),
  ('casa', 'Casa', 'Home', 2),
  ('kitnet', 'Kitnet', 'DoorOpen', 3),
  ('sobrado', 'Sobrado', 'House', 4),
  ('cobertura', 'Cobertura', 'ArrowUpCircle', 5),
  ('terreno', 'Terreno', 'TreePine', 6),
  ('sala_comercial', 'Sala Comercial', 'Briefcase', 7),
  ('ponto_comercial', 'Ponto Comercial', 'Store', 8),
  ('galpao', 'Galpão', 'Warehouse', 9),
  ('chacara', 'Chácara', 'Fence', 10),
  ('mansao', 'Mansão', 'Castle', 11),
  ('country_club', 'Country Club', 'Mountain', 12)
) AS v(codigo, nome, icone, ordem)
WHERE NOT EXISTS (
  SELECT 1 FROM mt_property_types pt WHERE pt.tenant_id = t.id AND pt.codigo = v.codigo
);

-- ───────────────────────────────────────────
-- SEED: Finalidades padrão
-- ───────────────────────────────────────────
INSERT INTO mt_property_purposes (tenant_id, codigo, nome, ordem)
SELECT t.id, v.codigo, v.nome, v.ordem
FROM mt_tenants t
CROSS JOIN (VALUES
  ('venda', 'Venda', 1),
  ('aluguel', 'Aluguel', 2),
  ('temporada', 'Temporada', 3)
) AS v(codigo, nome, ordem)
WHERE NOT EXISTS (
  SELECT 1 FROM mt_property_purposes pp WHERE pp.tenant_id = t.id AND pp.codigo = v.codigo
);

-- ───────────────────────────────────────────
-- SEED: Fontes de clientes padrão
-- ───────────────────────────────────────────
INSERT INTO mt_client_sources (tenant_id, codigo, nome)
SELECT t.id, v.codigo, v.nome
FROM mt_tenants t
CROSS JOIN (VALUES
  ('google', 'Google'),
  ('indicacao', 'Indicação'),
  ('portal', 'Portal Imobiliário'),
  ('placa', 'Placa no Imóvel'),
  ('redes_sociais', 'Redes Sociais'),
  ('whatsapp', 'WhatsApp'),
  ('telefone', 'Telefone'),
  ('presencial', 'Presencial'),
  ('outro', 'Outro')
) AS v(codigo, nome)
WHERE NOT EXISTS (
  SELECT 1 FROM mt_client_sources cs WHERE cs.tenant_id = t.id AND cs.codigo = v.codigo
);

-- ───────────────────────────────────────────
-- SEED: Portais padrão
-- ───────────────────────────────────────────
INSERT INTO mt_property_portals (tenant_id, codigo, nome, url_portal)
SELECT t.id, v.codigo, v.nome, v.url
FROM mt_tenants t
CROSS JOIN (VALUES
  ('olx', 'OLX', 'https://www.olx.com.br'),
  ('vivareal', 'VivaReal', 'https://www.vivareal.com.br'),
  ('zapimoveis', 'ZAP Imóveis', 'https://www.zapimoveis.com.br'),
  ('imovelweb', 'ImovelWeb', 'https://www.imovelweb.com.br'),
  ('crecisp', 'CRECI-SP', 'https://www.crecisp.gov.br'),
  ('properati', 'Properati', 'https://www.properati.com.br'),
  ('imobox', 'ImoBox', 'https://www.imobox.com.br'),
  ('webcasas', 'WebCasas', 'https://www.webcasas.com.br')
) AS v(codigo, nome, url)
WHERE NOT EXISTS (
  SELECT 1 FROM mt_property_portals pp WHERE pp.tenant_id = t.id AND pp.codigo = v.codigo
);

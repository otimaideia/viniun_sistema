-- =============================================================================
-- MULTI-TENANT MIGRATION: Estoque, Vendas e Financeiro
-- Data: 09/03/2026
-- Descrição: 18 tabelas para controle de insumos/inventário, vendas com
--            precificação por faixa, e módulo financeiro completo.
--            Suporte a produtos fracionados (ex: Dysport 500UI = 5 pacientes)
-- =============================================================================

-- =============================================================================
-- PARTE 0: REGISTRAR MÓDULOS
-- =============================================================================

INSERT INTO mt_modules (codigo, nome, descricao, icone, categoria, ordem, is_core, is_active)
VALUES
    ('estoque', 'Estoque & Inventário', 'Controle de insumos, produtos e movimentações de estoque', 'Package', 'operacao', 14, false, true),
    ('vendas', 'Vendas', 'Gestão de vendas, tabela de preços e comissões', 'DollarSign', 'vendas', 5, false, true),
    ('financeiro', 'Financeiro', 'Controle financeiro, contas, lançamentos e relatórios', 'Wallet', 'gestao', 15, false, true)
ON CONFLICT (codigo) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    icone = EXCLUDED.icone,
    categoria = EXCLUDED.categoria,
    ordem = EXCLUDED.ordem;

-- Habilitar para todos os tenants
INSERT INTO mt_tenant_modules (tenant_id, module_id, is_active)
SELECT t.id, m.id, true
FROM mt_tenants t
CROSS JOIN mt_modules m
WHERE m.codigo IN ('estoque', 'vendas', 'financeiro')
AND NOT EXISTS (
    SELECT 1 FROM mt_tenant_modules tm
    WHERE tm.tenant_id = t.id AND tm.module_id = m.id
);

-- =============================================================================
-- PARTE 1: TABELAS DE ESTOQUE (7 tabelas)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1.1 mt_inventory_suppliers - Fornecedores
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_inventory_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    cnpj VARCHAR(18),
    telefone VARCHAR(20),
    email VARCHAR(255),
    contato_nome VARCHAR(100),
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(10),
    condicoes_pagamento TEXT,
    prazo_entrega_dias INTEGER,
    observacoes TEXT,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID
);

CREATE INDEX idx_mt_inventory_suppliers_tenant ON mt_inventory_suppliers(tenant_id);
CREATE INDEX idx_mt_inventory_suppliers_deleted ON mt_inventory_suppliers(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE mt_inventory_suppliers IS 'Fornecedores de insumos e produtos - multi-tenant';

-- -----------------------------------------------------------------------------
-- 1.2 mt_inventory_products - Catálogo de produtos/insumos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_inventory_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Identificação
    codigo VARCHAR(50),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,

    -- Classificação
    categoria VARCHAR(50) NOT NULL DEFAULT 'material',
    -- injetavel, descartavel, cosmetico, equipamento, medicamento, material
    subcategoria VARCHAR(100),
    unidade_medida VARCHAR(20) NOT NULL DEFAULT 'unidade',
    -- UI, ml, unidade, par, cx, frasco, g, kg

    -- Fracionamento (CRÍTICO para Botox/Dysport)
    is_fracionado BOOLEAN DEFAULT false,
    quantidade_total_unidade DECIMAL(12,4),  -- ex: 500 (UI por frasco)
    doses_por_unidade INTEGER,               -- ex: 5 (pacientes por frasco)
    dose_padrao DECIMAL(12,4),               -- ex: 100 (UI por aplicação)
    unidade_fracionamento VARCHAR(20),       -- ex: 'UI' quando frasco mede em UI

    -- Custos de referência
    custo_pix DECIMAL(12,2),
    custo_cartao DECIMAL(12,2),
    custo_unitario_fracionado DECIMAL(12,2), -- calculado: custo / doses_por_unidade

    -- Controle de estoque
    estoque_minimo DECIMAL(12,4) DEFAULT 0,
    estoque_ideal DECIMAL(12,4),

    -- Fabricante/Marca
    marca VARCHAR(100),
    fabricante VARCHAR(200),
    registro_anvisa VARCHAR(50),

    -- Visual
    imagem_url TEXT,

    -- Fornecedor padrão
    fornecedor_id UUID REFERENCES mt_inventory_suppliers(id) ON DELETE SET NULL,

    -- Controle
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,

    CONSTRAINT mt_inventory_products_unique_codigo UNIQUE(tenant_id, codigo)
);

CREATE INDEX idx_mt_inventory_products_tenant ON mt_inventory_products(tenant_id);
CREATE INDEX idx_mt_inventory_products_franchise ON mt_inventory_products(franchise_id);
CREATE INDEX idx_mt_inventory_products_categoria ON mt_inventory_products(tenant_id, categoria);
CREATE INDEX idx_mt_inventory_products_deleted ON mt_inventory_products(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE mt_inventory_products IS 'Catálogo de produtos e insumos com suporte a fracionamento - multi-tenant';

-- -----------------------------------------------------------------------------
-- 1.3 mt_inventory_stock - Estoque real por franquia (controle de lote)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_inventory_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID NOT NULL REFERENCES mt_franchises(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES mt_inventory_products(id) ON DELETE CASCADE,

    -- Lote e validade
    lote VARCHAR(100),
    data_validade DATE,

    -- Quantidades
    quantidade_atual DECIMAL(12,4) NOT NULL DEFAULT 0,
    quantidade_inicial DECIMAL(12,4) NOT NULL,

    -- Custo de aquisição deste lote
    custo_unitario DECIMAL(12,2) NOT NULL,
    forma_pagamento_compra VARCHAR(20), -- pix, cartao, boleto

    -- Fornecedor e NF
    fornecedor_id UUID REFERENCES mt_inventory_suppliers(id) ON DELETE SET NULL,
    nota_fiscal VARCHAR(50),
    data_entrada DATE DEFAULT CURRENT_DATE,

    -- Localização dentro da franquia
    localizacao VARCHAR(100),

    observacoes TEXT,

    -- Status
    status VARCHAR(20) DEFAULT 'disponivel',
    -- disponivel, em_uso, vencido, esgotado

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mt_inventory_stock_tenant ON mt_inventory_stock(tenant_id);
CREATE INDEX idx_mt_inventory_stock_franchise ON mt_inventory_stock(franchise_id);
CREATE INDEX idx_mt_inventory_stock_product ON mt_inventory_stock(product_id);
CREATE INDEX idx_mt_inventory_stock_franchise_product ON mt_inventory_stock(franchise_id, product_id);
CREATE INDEX idx_mt_inventory_stock_validade ON mt_inventory_stock(data_validade) WHERE data_validade IS NOT NULL;
CREATE INDEX idx_mt_inventory_stock_status ON mt_inventory_stock(status) WHERE status = 'disponivel';

COMMENT ON TABLE mt_inventory_stock IS 'Estoque real por franquia com rastreamento de lote e validade';

-- -----------------------------------------------------------------------------
-- 1.4 mt_service_products - Consumo padrão por serviço/procedimento
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_service_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES mt_services(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES mt_inventory_products(id) ON DELETE CASCADE,

    -- Quantidade padrão consumida
    quantidade DECIMAL(12,4) NOT NULL,
    unidade_consumo VARCHAR(20), -- pode diferir da unidade do produto (ex: UI vs frasco)

    is_obrigatorio BOOLEAN DEFAULT true,
    observacoes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT mt_service_products_unique UNIQUE(tenant_id, service_id, product_id)
);

CREATE INDEX idx_mt_service_products_tenant ON mt_service_products(tenant_id);
CREATE INDEX idx_mt_service_products_service ON mt_service_products(service_id);
CREATE INDEX idx_mt_service_products_product ON mt_service_products(product_id);

COMMENT ON TABLE mt_service_products IS 'Vínculo entre serviços e produtos com quantidade padrão de consumo';

-- -----------------------------------------------------------------------------
-- 1.5 mt_procedure_consumptions - Consumo REAL por atendimento
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_procedure_consumptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID NOT NULL REFERENCES mt_franchises(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL REFERENCES mt_appointments(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES mt_inventory_products(id) ON DELETE RESTRICT,
    stock_id UUID REFERENCES mt_inventory_stock(id) ON DELETE SET NULL,

    -- Quantidade realmente utilizada
    quantidade DECIMAL(12,4) NOT NULL,

    -- Custo calculado
    custo_unitario DECIMAL(12,2),
    custo_total DECIMAL(12,2),

    -- Profissional que realizou
    profissional_id UUID REFERENCES mt_users(id) ON DELETE SET NULL,

    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mt_procedure_consumptions_tenant ON mt_procedure_consumptions(tenant_id);
CREATE INDEX idx_mt_procedure_consumptions_franchise ON mt_procedure_consumptions(franchise_id);
CREATE INDEX idx_mt_procedure_consumptions_appointment ON mt_procedure_consumptions(appointment_id);
CREATE INDEX idx_mt_procedure_consumptions_product ON mt_procedure_consumptions(product_id);
CREATE INDEX idx_mt_procedure_consumptions_profissional ON mt_procedure_consumptions(profissional_id);
CREATE INDEX idx_mt_procedure_consumptions_created ON mt_procedure_consumptions(created_at DESC);

COMMENT ON TABLE mt_procedure_consumptions IS 'Registro do consumo real de insumos por atendimento/procedimento';

-- -----------------------------------------------------------------------------
-- 1.6 mt_inventory_movements - Toda movimentação de estoque
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID NOT NULL REFERENCES mt_franchises(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES mt_inventory_products(id) ON DELETE RESTRICT,
    stock_id UUID REFERENCES mt_inventory_stock(id) ON DELETE SET NULL,

    -- Tipo de movimentação
    tipo VARCHAR(20) NOT NULL,
    -- entrada, saida, ajuste, perda, transferencia

    -- Quantidade (positivo=entrada, negativo=saída)
    quantidade DECIMAL(12,4) NOT NULL,

    -- Custo
    custo_unitario DECIMAL(12,2),
    custo_total DECIMAL(12,2),

    -- Motivo/Justificativa
    motivo TEXT,

    -- Vínculos opcionais
    appointment_id UUID REFERENCES mt_appointments(id) ON DELETE SET NULL,
    consumption_id UUID REFERENCES mt_procedure_consumptions(id) ON DELETE SET NULL,
    transfer_franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    -- Responsável
    responsavel_id UUID REFERENCES mt_users(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mt_inventory_movements_tenant ON mt_inventory_movements(tenant_id);
CREATE INDEX idx_mt_inventory_movements_franchise ON mt_inventory_movements(franchise_id);
CREATE INDEX idx_mt_inventory_movements_product ON mt_inventory_movements(product_id);
CREATE INDEX idx_mt_inventory_movements_stock ON mt_inventory_movements(stock_id);
CREATE INDEX idx_mt_inventory_movements_tipo ON mt_inventory_movements(tipo);
CREATE INDEX idx_mt_inventory_movements_created ON mt_inventory_movements(created_at DESC);
CREATE INDEX idx_mt_inventory_movements_appointment ON mt_inventory_movements(appointment_id) WHERE appointment_id IS NOT NULL;

COMMENT ON TABLE mt_inventory_movements IS 'Histórico completo de movimentações de estoque';

-- -----------------------------------------------------------------------------
-- 1.7 mt_inventory_alerts - Alertas automáticos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_inventory_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,
    product_id UUID REFERENCES mt_inventory_products(id) ON DELETE SET NULL,

    -- Tipo de alerta
    tipo VARCHAR(30) NOT NULL,
    -- estoque_baixo, vencimento_proximo, divergencia, vencido

    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    severidade VARCHAR(10) DEFAULT 'media',
    -- baixa, media, alta, critica

    -- Dados extras do alerta
    dados JSONB,

    -- Status
    lido BOOLEAN DEFAULT false,
    resolvido BOOLEAN DEFAULT false,
    resolvido_em TIMESTAMPTZ,
    resolvido_por UUID REFERENCES mt_users(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mt_inventory_alerts_tenant ON mt_inventory_alerts(tenant_id);
CREATE INDEX idx_mt_inventory_alerts_franchise ON mt_inventory_alerts(franchise_id);
CREATE INDEX idx_mt_inventory_alerts_product ON mt_inventory_alerts(product_id);
CREATE INDEX idx_mt_inventory_alerts_pending ON mt_inventory_alerts(tenant_id, resolvido, created_at DESC) WHERE resolvido = false;
CREATE INDEX idx_mt_inventory_alerts_tipo ON mt_inventory_alerts(tipo);

COMMENT ON TABLE mt_inventory_alerts IS 'Alertas de estoque: baixo, vencimento, divergências';

-- =============================================================================
-- PARTE 2: TABELAS DE VENDAS (4 tabelas)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 2.1 mt_price_tables - Tabela de preços por serviço (3 faixas + 2 custos)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_price_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,
    service_id UUID NOT NULL REFERENCES mt_services(id) ON DELETE CASCADE,

    -- 3 faixas de preço
    preco_normal DECIMAL(12,2) NOT NULL,
    preco_desconto DECIMAL(12,2),
    preco_volume DECIMAL(12,2),
    volume_minimo INTEGER DEFAULT 3,

    -- 2 custos de aquisição
    custo_pix DECIMAL(12,2),
    custo_cartao DECIMAL(12,2),

    -- Margens calculadas
    margem_normal_pix DECIMAL(12,2),
    margem_normal_cartao DECIMAL(12,2),
    margem_desconto_pix DECIMAL(12,2),
    margem_desconto_cartao DECIMAL(12,2),

    -- Vigência
    vigencia_inicio DATE,
    vigencia_fim DATE,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_mt_price_tables_tenant ON mt_price_tables(tenant_id);
CREATE INDEX idx_mt_price_tables_franchise ON mt_price_tables(franchise_id);
CREATE INDEX idx_mt_price_tables_service ON mt_price_tables(service_id);
CREATE INDEX idx_mt_price_tables_active ON mt_price_tables(tenant_id, service_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_mt_price_tables_deleted ON mt_price_tables(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE mt_price_tables IS 'Tabela de preços com 3 faixas (normal, desconto, volume) e 2 custos (pix, cartão)';

-- -----------------------------------------------------------------------------
-- 2.2 mt_sales - Vendas/transações
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID NOT NULL REFERENCES mt_franchises(id) ON DELETE CASCADE,

    -- Número sequencial
    numero_venda VARCHAR(20),

    -- Cliente
    lead_id UUID REFERENCES mt_leads(id) ON DELETE SET NULL,
    cliente_nome VARCHAR(255) NOT NULL,
    cliente_telefone VARCHAR(20),
    cliente_email VARCHAR(255),

    -- Profissional
    profissional_id UUID REFERENCES mt_users(id) ON DELETE SET NULL,

    -- Pagamento
    forma_pagamento VARCHAR(20),
    -- pix, cartao_credito, cartao_debito, boleto, dinheiro, misto
    tabela_preco VARCHAR(20) DEFAULT 'normal',
    -- normal, desconto, volume
    parcelas INTEGER DEFAULT 1,

    -- Valores
    valor_bruto DECIMAL(12,2) NOT NULL,
    valor_desconto DECIMAL(12,2) DEFAULT 0,
    valor_total DECIMAL(12,2) NOT NULL,
    custo_total DECIMAL(12,2) DEFAULT 0,
    margem DECIMAL(12,2),
    margem_percentual DECIMAL(5,2),

    -- Status
    status VARCHAR(20) DEFAULT 'orcamento',
    -- orcamento, aprovado, concluido, cancelado

    -- Vínculo com agendamento
    appointment_id UUID REFERENCES mt_appointments(id) ON DELETE SET NULL,

    observacoes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID
);

CREATE INDEX idx_mt_sales_tenant ON mt_sales(tenant_id);
CREATE INDEX idx_mt_sales_franchise ON mt_sales(franchise_id);
CREATE INDEX idx_mt_sales_lead ON mt_sales(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX idx_mt_sales_profissional ON mt_sales(profissional_id) WHERE profissional_id IS NOT NULL;
CREATE INDEX idx_mt_sales_status ON mt_sales(tenant_id, status);
CREATE INDEX idx_mt_sales_created ON mt_sales(created_at DESC);
CREATE INDEX idx_mt_sales_appointment ON mt_sales(appointment_id) WHERE appointment_id IS NOT NULL;
CREATE INDEX idx_mt_sales_deleted ON mt_sales(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE mt_sales IS 'Vendas e orçamentos com precificação por faixa';

-- -----------------------------------------------------------------------------
-- 2.3 mt_sale_items - Itens de cada venda
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES mt_sales(id) ON DELETE CASCADE,

    -- Item (serviço ou produto)
    service_id UUID REFERENCES mt_services(id) ON DELETE SET NULL,
    product_id UUID REFERENCES mt_inventory_products(id) ON DELETE SET NULL,
    descricao VARCHAR(255) NOT NULL,

    -- Valores
    quantidade DECIMAL(12,4) DEFAULT 1,
    preco_unitario DECIMAL(12,2) NOT NULL,
    custo_unitario DECIMAL(12,2) DEFAULT 0,
    desconto_percentual DECIMAL(5,2) DEFAULT 0,
    desconto_valor DECIMAL(12,2) DEFAULT 0,
    valor_total DECIMAL(12,2) NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mt_sale_items_tenant ON mt_sale_items(tenant_id);
CREATE INDEX idx_mt_sale_items_sale ON mt_sale_items(sale_id);
CREATE INDEX idx_mt_sale_items_service ON mt_sale_items(service_id) WHERE service_id IS NOT NULL;

COMMENT ON TABLE mt_sale_items IS 'Itens individuais de cada venda (serviços e/ou produtos)';

-- -----------------------------------------------------------------------------
-- 2.4 mt_commissions - Comissões de profissionais
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID NOT NULL REFERENCES mt_franchises(id) ON DELETE CASCADE,

    profissional_id UUID NOT NULL REFERENCES mt_users(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES mt_sales(id) ON DELETE CASCADE,

    -- Tipo e valor
    tipo VARCHAR(20) DEFAULT 'percentual',
    -- percentual, fixo
    percentual DECIMAL(5,2),
    valor DECIMAL(12,2) NOT NULL,

    -- Status
    status VARCHAR(20) DEFAULT 'pendente',
    -- pendente, aprovado, pago
    data_aprovacao TIMESTAMPTZ,
    data_pagamento TIMESTAMPTZ,
    aprovado_por UUID REFERENCES mt_users(id) ON DELETE SET NULL,

    observacoes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mt_commissions_tenant ON mt_commissions(tenant_id);
CREATE INDEX idx_mt_commissions_franchise ON mt_commissions(franchise_id);
CREATE INDEX idx_mt_commissions_profissional ON mt_commissions(profissional_id);
CREATE INDEX idx_mt_commissions_sale ON mt_commissions(sale_id);
CREATE INDEX idx_mt_commissions_status ON mt_commissions(profissional_id, status);

COMMENT ON TABLE mt_commissions IS 'Comissões de profissionais por venda realizada';

-- =============================================================================
-- PARTE 3: TABELAS FINANCEIRAS (4 tabelas)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 3.1 mt_financial_categories - Plano de contas (hierárquico)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_financial_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES mt_financial_categories(id) ON DELETE SET NULL,

    codigo VARCHAR(20),
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(10) NOT NULL,
    -- receita, despesa
    descricao TEXT,

    is_active BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_mt_financial_categories_tenant ON mt_financial_categories(tenant_id);
CREATE INDEX idx_mt_financial_categories_parent ON mt_financial_categories(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_mt_financial_categories_tipo ON mt_financial_categories(tenant_id, tipo);
CREATE INDEX idx_mt_financial_categories_deleted ON mt_financial_categories(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE mt_financial_categories IS 'Plano de contas hierárquico para receitas e despesas';

-- -----------------------------------------------------------------------------
-- 3.2 mt_financial_accounts - Contas bancárias/caixa
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_financial_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES mt_franchises(id) ON DELETE SET NULL,

    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    -- caixa, banco, cartao, digital
    banco VARCHAR(100),
    agencia VARCHAR(20),
    conta VARCHAR(30),

    saldo_inicial DECIMAL(14,2) DEFAULT 0,
    saldo_atual DECIMAL(14,2) DEFAULT 0,

    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_mt_financial_accounts_tenant ON mt_financial_accounts(tenant_id);
CREATE INDEX idx_mt_financial_accounts_franchise ON mt_financial_accounts(franchise_id);
CREATE INDEX idx_mt_financial_accounts_deleted ON mt_financial_accounts(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE mt_financial_accounts IS 'Contas bancárias, caixa e carteiras digitais por franquia';

-- -----------------------------------------------------------------------------
-- 3.3 mt_financial_transactions - Toda movimentação financeira
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
    franchise_id UUID NOT NULL REFERENCES mt_franchises(id) ON DELETE CASCADE,

    -- Conta e categoria
    account_id UUID REFERENCES mt_financial_accounts(id) ON DELETE SET NULL,
    category_id UUID REFERENCES mt_financial_categories(id) ON DELETE SET NULL,

    -- Tipo
    tipo VARCHAR(10) NOT NULL,
    -- receita, despesa

    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(14,2) NOT NULL,

    -- Vínculos
    sale_id UUID REFERENCES mt_sales(id) ON DELETE SET NULL,
    movement_id UUID REFERENCES mt_inventory_movements(id) ON DELETE SET NULL,

    -- Datas
    data_competencia DATE NOT NULL,
    data_vencimento DATE,
    data_pagamento DATE,

    -- Status e pagamento
    status VARCHAR(20) DEFAULT 'pendente',
    -- pendente, pago, cancelado, atrasado
    forma_pagamento VARCHAR(20),
    parcela_atual INTEGER,
    parcela_total INTEGER,

    -- Documento
    documento VARCHAR(50),
    observacoes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID
);

CREATE INDEX idx_mt_financial_transactions_tenant ON mt_financial_transactions(tenant_id);
CREATE INDEX idx_mt_financial_transactions_franchise ON mt_financial_transactions(franchise_id);
CREATE INDEX idx_mt_financial_transactions_account ON mt_financial_transactions(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX idx_mt_financial_transactions_category ON mt_financial_transactions(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_mt_financial_transactions_tipo ON mt_financial_transactions(tenant_id, tipo);
CREATE INDEX idx_mt_financial_transactions_status ON mt_financial_transactions(status, data_vencimento);
CREATE INDEX idx_mt_financial_transactions_competencia ON mt_financial_transactions(data_competencia DESC);
CREATE INDEX idx_mt_financial_transactions_sale ON mt_financial_transactions(sale_id) WHERE sale_id IS NOT NULL;
CREATE INDEX idx_mt_financial_transactions_deleted ON mt_financial_transactions(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE mt_financial_transactions IS 'Movimentações financeiras: receitas e despesas com datas de competência e pagamento';

-- -----------------------------------------------------------------------------
-- 3.4 mt_cost_centers - Centros de custo
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mt_cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,

    codigo VARCHAR(20),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,

    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_mt_cost_centers_tenant ON mt_cost_centers(tenant_id);
CREATE INDEX idx_mt_cost_centers_deleted ON mt_cost_centers(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE mt_cost_centers IS 'Centros de custo para alocação de despesas';

-- =============================================================================
-- PARTE 4: ADICIONAR FK sale_id em mt_inventory_movements
-- =============================================================================

ALTER TABLE mt_inventory_movements
    ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES mt_sales(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mt_inventory_movements_sale ON mt_inventory_movements(sale_id) WHERE sale_id IS NOT NULL;

-- =============================================================================
-- PARTE 5: ROW LEVEL SECURITY (18 tabelas)
-- =============================================================================

-- ---- ESTOQUE ----

-- mt_inventory_suppliers
ALTER TABLE mt_inventory_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_inventory_suppliers_select" ON mt_inventory_suppliers FOR SELECT
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_inventory_suppliers_insert" ON mt_inventory_suppliers FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND tenant_id = current_tenant_id())
);
CREATE POLICY "mt_inventory_suppliers_update" ON mt_inventory_suppliers FOR UPDATE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);
CREATE POLICY "mt_inventory_suppliers_delete" ON mt_inventory_suppliers FOR DELETE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- mt_inventory_products
ALTER TABLE mt_inventory_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_inventory_products_select" ON mt_inventory_products FOR SELECT
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
    (tenant_id = current_tenant_id() AND (franchise_id IS NULL OR franchise_id = current_franchise_id()))
);
CREATE POLICY "mt_inventory_products_insert" ON mt_inventory_products FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND tenant_id = current_tenant_id())
);
CREATE POLICY "mt_inventory_products_update" ON mt_inventory_products FOR UPDATE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id())
);
CREATE POLICY "mt_inventory_products_delete" ON mt_inventory_products FOR DELETE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- mt_inventory_stock
ALTER TABLE mt_inventory_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_inventory_stock_select" ON mt_inventory_stock FOR SELECT
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
    (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_inventory_stock_insert" ON mt_inventory_stock FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id())
);
CREATE POLICY "mt_inventory_stock_update" ON mt_inventory_stock FOR UPDATE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id())
);
CREATE POLICY "mt_inventory_stock_delete" ON mt_inventory_stock FOR DELETE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- mt_service_products
ALTER TABLE mt_service_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_service_products_select" ON mt_service_products FOR SELECT
USING (
    is_platform_admin() OR
    (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_service_products_insert" ON mt_service_products FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND tenant_id = current_tenant_id())
);
CREATE POLICY "mt_service_products_update" ON mt_service_products FOR UPDATE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);
CREATE POLICY "mt_service_products_delete" ON mt_service_products FOR DELETE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- mt_procedure_consumptions
ALTER TABLE mt_procedure_consumptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_procedure_consumptions_select" ON mt_procedure_consumptions FOR SELECT
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
    (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_procedure_consumptions_insert" ON mt_procedure_consumptions FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
    (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_procedure_consumptions_update" ON mt_procedure_consumptions FOR UPDATE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id())
);
CREATE POLICY "mt_procedure_consumptions_delete" ON mt_procedure_consumptions FOR DELETE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- mt_inventory_movements
ALTER TABLE mt_inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_inventory_movements_select" ON mt_inventory_movements FOR SELECT
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
    (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_inventory_movements_insert" ON mt_inventory_movements FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
    (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_inventory_movements_update" ON mt_inventory_movements FOR UPDATE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id())
);
CREATE POLICY "mt_inventory_movements_delete" ON mt_inventory_movements FOR DELETE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- mt_inventory_alerts
ALTER TABLE mt_inventory_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_inventory_alerts_select" ON mt_inventory_alerts FOR SELECT
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
    (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_inventory_alerts_insert" ON mt_inventory_alerts FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);
CREATE POLICY "mt_inventory_alerts_update" ON mt_inventory_alerts FOR UPDATE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id())
);
CREATE POLICY "mt_inventory_alerts_delete" ON mt_inventory_alerts FOR DELETE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- ---- VENDAS ----

-- mt_price_tables
ALTER TABLE mt_price_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_price_tables_select" ON mt_price_tables FOR SELECT
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND (franchise_id IS NULL OR franchise_id = current_franchise_id())) OR
    (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_price_tables_insert" ON mt_price_tables FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id())
);
CREATE POLICY "mt_price_tables_update" ON mt_price_tables FOR UPDATE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id())
);
CREATE POLICY "mt_price_tables_delete" ON mt_price_tables FOR DELETE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- mt_sales
ALTER TABLE mt_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_sales_select" ON mt_sales FOR SELECT
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
    (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_sales_insert" ON mt_sales FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
    (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_sales_update" ON mt_sales FOR UPDATE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id())
);
CREATE POLICY "mt_sales_delete" ON mt_sales FOR DELETE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- mt_sale_items
ALTER TABLE mt_sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_sale_items_select" ON mt_sale_items FOR SELECT
USING (
    is_platform_admin() OR
    (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_sale_items_insert" ON mt_sale_items FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_sale_items_update" ON mt_sale_items FOR UPDATE
USING (
    is_platform_admin() OR
    (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_sale_items_delete" ON mt_sale_items FOR DELETE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- mt_commissions
ALTER TABLE mt_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_commissions_select" ON mt_commissions FOR SELECT
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
    (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_commissions_insert" ON mt_commissions FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id())
);
CREATE POLICY "mt_commissions_update" ON mt_commissions FOR UPDATE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id())
);
CREATE POLICY "mt_commissions_delete" ON mt_commissions FOR DELETE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- ---- FINANCEIRO ----

-- mt_financial_categories
ALTER TABLE mt_financial_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_financial_categories_select" ON mt_financial_categories FOR SELECT
USING (
    is_platform_admin() OR
    (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_financial_categories_insert" ON mt_financial_categories FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);
CREATE POLICY "mt_financial_categories_update" ON mt_financial_categories FOR UPDATE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);
CREATE POLICY "mt_financial_categories_delete" ON mt_financial_categories FOR DELETE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- mt_financial_accounts
ALTER TABLE mt_financial_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_financial_accounts_select" ON mt_financial_accounts FOR SELECT
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND (franchise_id IS NULL OR franchise_id = current_franchise_id())) OR
    (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_financial_accounts_insert" ON mt_financial_accounts FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);
CREATE POLICY "mt_financial_accounts_update" ON mt_financial_accounts FOR UPDATE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);
CREATE POLICY "mt_financial_accounts_delete" ON mt_financial_accounts FOR DELETE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- mt_financial_transactions
ALTER TABLE mt_financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_financial_transactions_select" ON mt_financial_transactions FOR SELECT
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
    (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_financial_transactions_insert" ON mt_financial_transactions FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id())
);
CREATE POLICY "mt_financial_transactions_update" ON mt_financial_transactions FOR UPDATE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
    (is_franchise_admin() AND franchise_id = current_franchise_id())
);
CREATE POLICY "mt_financial_transactions_delete" ON mt_financial_transactions FOR DELETE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- mt_cost_centers
ALTER TABLE mt_cost_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_cost_centers_select" ON mt_cost_centers FOR SELECT
USING (
    is_platform_admin() OR
    (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_cost_centers_insert" ON mt_cost_centers FOR INSERT
WITH CHECK (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);
CREATE POLICY "mt_cost_centers_update" ON mt_cost_centers FOR UPDATE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);
CREATE POLICY "mt_cost_centers_delete" ON mt_cost_centers FOR DELETE
USING (
    is_platform_admin() OR
    (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- =============================================================================
-- PARTE 6: TRIGGERS updated_at
-- =============================================================================

-- Criar função se não existir
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas com updated_at
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'mt_inventory_suppliers',
        'mt_inventory_products',
        'mt_inventory_stock',
        'mt_service_products',
        'mt_price_tables',
        'mt_sales',
        'mt_commissions',
        'mt_financial_categories',
        'mt_financial_accounts',
        'mt_financial_transactions',
        'mt_cost_centers'
    ] LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trigger_%s_updated_at ON %s;
            CREATE TRIGGER trigger_%s_updated_at
            BEFORE UPDATE ON %s
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ', tbl, tbl, tbl, tbl);
    END LOOP;
END $$;

-- =============================================================================
-- PARTE 7: SEED DATA - Categorias Financeiras Padrão
-- =============================================================================

-- Inserir categorias financeiras padrão para todos os tenants
DO $$
DECLARE
    t_id UUID;
BEGIN
    FOR t_id IN SELECT id FROM mt_tenants LOOP
        -- Receitas
        INSERT INTO mt_financial_categories (tenant_id, codigo, nome, tipo, ordem)
        VALUES
            (t_id, 'R01', 'Procedimentos', 'receita', 1),
            (t_id, 'R02', 'Venda de Produtos', 'receita', 2),
            (t_id, 'R03', 'Pacotes', 'receita', 3),
            (t_id, 'R04', 'Avaliações', 'receita', 4),
            (t_id, 'R99', 'Outras Receitas', 'receita', 99)
        ON CONFLICT DO NOTHING;

        -- Despesas
        INSERT INTO mt_financial_categories (tenant_id, codigo, nome, tipo, ordem)
        VALUES
            (t_id, 'D01', 'Insumos e Materiais', 'despesa', 1),
            (t_id, 'D02', 'Aluguel', 'despesa', 2),
            (t_id, 'D03', 'Salários e Encargos', 'despesa', 3),
            (t_id, 'D04', 'Comissões', 'despesa', 4),
            (t_id, 'D05', 'Marketing e Publicidade', 'despesa', 5),
            (t_id, 'D06', 'Impostos e Taxas', 'despesa', 6),
            (t_id, 'D07', 'Energia e Água', 'despesa', 7),
            (t_id, 'D08', 'Manutenção e Equipamentos', 'despesa', 8),
            (t_id, 'D09', 'Software e Tecnologia', 'despesa', 9),
            (t_id, 'D99', 'Outras Despesas', 'despesa', 99)
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

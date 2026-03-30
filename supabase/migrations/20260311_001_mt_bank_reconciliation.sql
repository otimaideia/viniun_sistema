-- Migration: 20260311_001_mt_bank_reconciliation.sql
-- Purpose: Conciliação bancária - importar extratos e reconciliar com lançamentos
-- Tables: mt_bank_statements, mt_bank_statement_entries, mt_reconciliation_rules

-- =============================================================================
-- TABLE: mt_bank_statements (extratos bancários importados)
-- =============================================================================

CREATE TABLE IF NOT EXISTS mt_bank_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  account_id UUID NOT NULL REFERENCES mt_financial_accounts(id),

  -- File metadata
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT,
  file_format VARCHAR(10) NOT NULL CHECK (file_format IN ('ofx', 'xls', 'xlsx', 'pdf')),
  file_size_bytes INTEGER,

  -- Statement period
  periodo_inicio DATE,
  periodo_fim DATE,

  -- Parsed totals
  total_entries INTEGER DEFAULT 0,
  total_entradas NUMERIC(15,2) DEFAULT 0,
  total_saidas NUMERIC(15,2) DEFAULT 0,
  saldo_inicial_extrato NUMERIC(15,2),
  saldo_final_extrato NUMERIC(15,2),

  -- Reconciliation progress
  status VARCHAR(20) DEFAULT 'importado' CHECK (status IN ('importado', 'em_conciliacao', 'conciliado', 'cancelado')),
  entries_matched INTEGER DEFAULT 0,
  entries_unmatched INTEGER DEFAULT 0,
  entries_created INTEGER DEFAULT 0,
  conciliado_em TIMESTAMPTZ,
  conciliado_por UUID REFERENCES mt_users(id),

  -- Standard MT fields
  created_by UUID REFERENCES mt_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_mt_bank_statements_tenant ON mt_bank_statements(tenant_id);
CREATE INDEX idx_mt_bank_statements_franchise ON mt_bank_statements(franchise_id);
CREATE INDEX idx_mt_bank_statements_account ON mt_bank_statements(account_id);
CREATE INDEX idx_mt_bank_statements_status ON mt_bank_statements(status);
CREATE INDEX idx_mt_bank_statements_deleted ON mt_bank_statements(deleted_at) WHERE deleted_at IS NULL;

-- =============================================================================
-- TABLE: mt_bank_statement_entries (linhas do extrato)
-- =============================================================================

CREATE TABLE IF NOT EXISTS mt_bank_statement_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  statement_id UUID NOT NULL REFERENCES mt_bank_statements(id) ON DELETE CASCADE,

  -- Raw data from bank file
  data_transacao DATE NOT NULL,
  descricao_banco TEXT NOT NULL,
  valor NUMERIC(15,2) NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  saldo_apos NUMERIC(15,2),

  -- OFX-specific fields
  fitid VARCHAR(100),
  ref_num VARCHAR(100),
  memo TEXT,

  -- Reconciliation
  match_status VARCHAR(20) DEFAULT 'pendente' CHECK (match_status IN ('pendente', 'auto_matched', 'manual_matched', 'created', 'ignored')),
  match_confidence NUMERIC(3,2),
  transaction_id UUID REFERENCES mt_financial_transactions(id),

  matched_at TIMESTAMPTZ,
  matched_by UUID REFERENCES mt_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_mt_bank_statement_entries_tenant ON mt_bank_statement_entries(tenant_id);
CREATE INDEX idx_mt_bank_statement_entries_statement ON mt_bank_statement_entries(statement_id);
CREATE INDEX idx_mt_bank_statement_entries_status ON mt_bank_statement_entries(match_status);
CREATE INDEX idx_mt_bank_statement_entries_date ON mt_bank_statement_entries(data_transacao);
CREATE INDEX idx_mt_bank_statement_entries_transaction ON mt_bank_statement_entries(transaction_id) WHERE transaction_id IS NOT NULL;
CREATE UNIQUE INDEX idx_mt_bank_statement_entries_fitid_unique
  ON mt_bank_statement_entries(tenant_id, fitid) WHERE fitid IS NOT NULL;

-- =============================================================================
-- TABLE: mt_reconciliation_rules (regras automáticas - fase 2)
-- =============================================================================

CREATE TABLE IF NOT EXISTS mt_reconciliation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),

  nome VARCHAR(100) NOT NULL,
  descricao_pattern TEXT NOT NULL,
  category_id UUID REFERENCES mt_financial_categories(id),
  tipo VARCHAR(10) CHECK (tipo IN ('receita', 'despesa')),
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_mt_reconciliation_rules_tenant ON mt_reconciliation_rules(tenant_id);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE mt_bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_bank_statement_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_reconciliation_rules ENABLE ROW LEVEL SECURITY;

-- mt_bank_statements policies
CREATE POLICY "mt_bank_statements_select" ON mt_bank_statements FOR SELECT USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id()) OR
  (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_bank_statements_insert" ON mt_bank_statements FOR INSERT WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);
CREATE POLICY "mt_bank_statements_update" ON mt_bank_statements FOR UPDATE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND franchise_id = current_franchise_id())
);
CREATE POLICY "mt_bank_statements_delete" ON mt_bank_statements FOR DELETE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- mt_bank_statement_entries policies
CREATE POLICY "mt_bank_statement_entries_select" ON mt_bank_statement_entries FOR SELECT USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_bank_statement_entries_insert" ON mt_bank_statement_entries FOR INSERT WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_bank_statement_entries_update" ON mt_bank_statement_entries FOR UPDATE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_bank_statement_entries_delete" ON mt_bank_statement_entries FOR DELETE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- mt_reconciliation_rules policies
CREATE POLICY "mt_reconciliation_rules_select" ON mt_reconciliation_rules FOR SELECT USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (tenant_id = current_tenant_id())
);
CREATE POLICY "mt_reconciliation_rules_insert" ON mt_reconciliation_rules FOR INSERT WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);
CREATE POLICY "mt_reconciliation_rules_update" ON mt_reconciliation_rules FOR UPDATE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);
CREATE POLICY "mt_reconciliation_rules_delete" ON mt_reconciliation_rules FOR DELETE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

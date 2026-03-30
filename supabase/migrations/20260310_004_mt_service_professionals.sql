-- Migration: 20260310_004_mt_service_professionals.sql
-- Purpose: Criar tabela de vínculo profissional↔serviço para cálculo de custo de mão de obra
-- Date: 2026-03-10

-- =============================================================================
-- 1. Tabela mt_service_professionals
-- =============================================================================

CREATE TABLE IF NOT EXISTS mt_service_professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  service_id UUID NOT NULL REFERENCES mt_services(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES mt_payroll_employees(id) ON DELETE CASCADE,

  -- Horas de trabalho mensais (para cálculo de custo/hora)
  horas_mes NUMERIC(6,2) NOT NULL DEFAULT 220, -- CLT padrão = 220h/mês

  -- Custo/hora calculado: (salario_base + encargos) / horas_mes
  custo_hora_calculado NUMERIC(10,2) DEFAULT 0,

  -- Override manual do custo/hora (se preenchido, ignora cálculo automático)
  custo_hora_manual NUMERIC(10,2),

  -- Tempo de execução deste profissional neste serviço (minutos)
  -- Se NULL, usa duracao_minutos do serviço
  tempo_execucao_minutos INTEGER,

  -- Custo mão de obra deste profissional por sessão
  -- (custo_hora × tempo_execucao / 60)
  custo_por_sessao NUMERIC(10,2) DEFAULT 0,

  -- Papel do profissional no serviço
  papel VARCHAR(50) DEFAULT 'executor', -- executor, auxiliar, supervisor

  observacoes TEXT,

  -- Timestamps e soft delete
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Um profissional por serviço (pode ter vários papéis)
  UNIQUE(tenant_id, service_id, employee_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_mt_service_professionals_tenant ON mt_service_professionals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_service_professionals_service ON mt_service_professionals(service_id);
CREATE INDEX IF NOT EXISTS idx_mt_service_professionals_employee ON mt_service_professionals(employee_id);
CREATE INDEX IF NOT EXISTS idx_mt_service_professionals_deleted ON mt_service_professionals(deleted_at) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE mt_service_professionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_service_professionals_select" ON mt_service_professionals FOR SELECT
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND tenant_id = current_tenant_id()) OR
  (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_service_professionals_insert" ON mt_service_professionals FOR INSERT
WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_service_professionals_update" ON mt_service_professionals FOR UPDATE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_service_professionals_delete" ON mt_service_professionals FOR DELETE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- =============================================================================
-- 2. Adicionar campos de custo em mt_services
-- =============================================================================

ALTER TABLE mt_services ADD COLUMN IF NOT EXISTS custo_mao_obra NUMERIC(10,2) DEFAULT 0;
ALTER TABLE mt_services ADD COLUMN IF NOT EXISTS custo_fixo_rateado NUMERIC(10,2) DEFAULT 0;
ALTER TABLE mt_services ADD COLUMN IF NOT EXISTS custo_total_sessao NUMERIC(10,2) DEFAULT 0;

-- custo_total_sessao = custo_insumos + custo_mao_obra + custo_fixo_rateado

COMMENT ON COLUMN mt_services.custo_insumos IS 'Custo dos insumos/materiais consumidos por sessão (ficha técnica)';
COMMENT ON COLUMN mt_services.custo_mao_obra IS 'Custo de mão de obra por sessão (soma dos profissionais vinculados)';
COMMENT ON COLUMN mt_services.custo_fixo_rateado IS 'Rateio de custos fixos por sessão (aluguel, energia, etc.)';
COMMENT ON COLUMN mt_services.custo_total_sessao IS 'Custo total por sessão = insumos + mão de obra + fixos';

-- Migration: 20260316_001_mt_influencer_login_history.sql
-- Purpose: Histórico de login de influenciadoras para auditoria e reativação
-- Date: 2026-03-16

-- =============================================================================
-- Tabela: mt_influencer_login_history
-- =============================================================================

CREATE TABLE IF NOT EXISTS mt_influencer_login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE,
  influencer_id UUID NOT NULL REFERENCES mt_influencers(id) ON DELETE CASCADE,
  success BOOLEAN NOT NULL DEFAULT false,
  failure_reason VARCHAR(100),
  identifier_type VARCHAR(20),
  verification_method VARCHAR(20),
  user_agent TEXT,
  screen_resolution VARCHAR(20),
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mt_inf_login_hist_tenant ON mt_influencer_login_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_inf_login_hist_influencer ON mt_influencer_login_history(influencer_id);
CREATE INDEX IF NOT EXISTS idx_mt_inf_login_hist_created ON mt_influencer_login_history(created_at DESC);

-- RLS
ALTER TABLE mt_influencer_login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_inf_login_hist_select" ON mt_influencer_login_history FOR SELECT
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (is_franchise_admin() AND tenant_id = current_tenant_id())
);

-- =============================================================================
-- RPC: record_influencer_login (SECURITY DEFINER para anon)
-- =============================================================================

CREATE OR REPLACE FUNCTION record_influencer_login(
  p_tenant_id UUID,
  p_influencer_id UUID,
  p_success BOOLEAN,
  p_failure_reason VARCHAR DEFAULT NULL,
  p_identifier_type VARCHAR DEFAULT NULL,
  p_verification_method VARCHAR DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_screen_resolution VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO mt_influencer_login_history (
    tenant_id, influencer_id, success, failure_reason,
    identifier_type, verification_method, user_agent, screen_resolution
  ) VALUES (
    p_tenant_id, p_influencer_id, p_success, p_failure_reason,
    p_identifier_type, p_verification_method, p_user_agent, p_screen_resolution
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

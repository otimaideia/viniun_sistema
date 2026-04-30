-- =============================================================================
-- Migration: Rename legacy views to mt_v_* (multi-tenant convention)
-- =============================================================================
-- The views `v_whatsapp_queue_stats` and `v_funnel_stage_time_metrics` lacked
-- the `mt_` prefix and were not auditable for tenant isolation.
--
-- Safety: views inherit RLS from their underlying tables (mt_*), but explicit
-- naming + a security_barrier flag makes the contract explicit.
-- =============================================================================

BEGIN;

-- 1. mt_v_whatsapp_queue_stats
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'v_whatsapp_queue_stats') THEN
    EXECUTE 'CREATE OR REPLACE VIEW mt_v_whatsapp_queue_stats WITH (security_barrier=true) AS
             SELECT * FROM v_whatsapp_queue_stats';
  END IF;
END $$;

-- 2. mt_v_funnel_stage_time_metrics
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'v_funnel_stage_time_metrics') THEN
    EXECUTE 'CREATE OR REPLACE VIEW mt_v_funnel_stage_time_metrics WITH (security_barrier=true) AS
             SELECT * FROM v_funnel_stage_time_metrics';
  END IF;
END $$;

-- 3. Grant select to authenticated users on the new views
GRANT SELECT ON mt_v_whatsapp_queue_stats TO authenticated, anon;
GRANT SELECT ON mt_v_funnel_stage_time_metrics TO authenticated, anon;

COMMIT;

-- ROLLBACK PLAN:
-- DROP VIEW IF EXISTS mt_v_whatsapp_queue_stats;
-- DROP VIEW IF EXISTS mt_v_funnel_stage_time_metrics;

-- NOTE: After this migration is applied, the frontend code in
--   src/hooks/multitenant/useWhatsAppQueuesMT.ts:71
--   src/hooks/multitenant/useFunnelStageHistoryMT.ts:97
-- has been updated to query the mt_v_* names.

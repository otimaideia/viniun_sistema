-- ═══════════════════════════════════════════════════════════
-- Migration FIX: RLS policies faltantes + indexes faltantes
-- Corrige 12 tabelas com policies incompletas
-- ═══════════════════════════════════════════════════════════

-- Policies (DROP + CREATE para idempotência)

-- 1. mt_property_feature_links: UPDATE
DROP POLICY IF EXISTS "mt_pflinks_update" ON mt_property_feature_links;
CREATE POLICY "mt_pflinks_update" ON mt_property_feature_links FOR UPDATE
USING (is_platform_admin() OR tenant_id = current_tenant_id());

-- 2. mt_property_owner_invites: UPDATE + DELETE (CRÍTICO - convites)
DROP POLICY IF EXISTS "mt_prop_invites_update" ON mt_property_owner_invites;
CREATE POLICY "mt_prop_invites_update" ON mt_property_owner_invites FOR UPDATE
USING (is_platform_admin() OR tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "mt_prop_invites_delete" ON mt_property_owner_invites;
CREATE POLICY "mt_prop_invites_delete" ON mt_property_owner_invites FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- 3. mt_corretor_imovel: DELETE
DROP POLICY IF EXISTS "mt_corretor_imovel_delete" ON mt_corretor_imovel;
CREATE POLICY "mt_corretor_imovel_delete" ON mt_corretor_imovel FOR DELETE
USING (is_platform_admin() OR tenant_id = current_tenant_id());

-- 4. mt_property_price_items: UPDATE
DROP POLICY IF EXISTS "mt_price_items_update" ON mt_property_price_items;
CREATE POLICY "mt_price_items_update" ON mt_property_price_items FOR UPDATE
USING (is_platform_admin() OR tenant_id = current_tenant_id());

-- 5. mt_price_table_owners: UPDATE + DELETE
DROP POLICY IF EXISTS "mt_ptowners_update" ON mt_price_table_owners;
CREATE POLICY "mt_ptowners_update" ON mt_price_table_owners FOR UPDATE
USING (is_platform_admin() OR tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "mt_ptowners_delete" ON mt_price_table_owners;
CREATE POLICY "mt_ptowners_delete" ON mt_price_table_owners FOR DELETE
USING (is_platform_admin() OR tenant_id = current_tenant_id());

-- 6. mt_client_sources: UPDATE + DELETE
DROP POLICY IF EXISTS "mt_client_sources_update" ON mt_client_sources;
CREATE POLICY "mt_client_sources_update" ON mt_client_sources FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

DROP POLICY IF EXISTS "mt_client_sources_delete" ON mt_client_sources;
CREATE POLICY "mt_client_sources_delete" ON mt_client_sources FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- 7. mt_property_favorites: DELETE (CRÍTICO - desfavoritar)
DROP POLICY IF EXISTS "mt_prop_favs_delete" ON mt_property_favorites;
CREATE POLICY "mt_prop_favs_delete" ON mt_property_favorites FOR DELETE
USING (is_platform_admin() OR tenant_id = current_tenant_id());

-- 8. mt_property_newsletters: UPDATE + DELETE (CRÍTICO - unsubscribe)
DROP POLICY IF EXISTS "mt_newsletters_update" ON mt_property_newsletters;
CREATE POLICY "mt_newsletters_update" ON mt_property_newsletters FOR UPDATE
USING (is_platform_admin() OR tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "mt_newsletters_delete" ON mt_property_newsletters;
CREATE POLICY "mt_newsletters_delete" ON mt_property_newsletters FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- 9. mt_property_orders: DELETE
DROP POLICY IF EXISTS "mt_prop_orders_delete" ON mt_property_orders;
CREATE POLICY "mt_prop_orders_delete" ON mt_property_orders FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- 10. mt_property_portals: DELETE
DROP POLICY IF EXISTS "mt_prop_portals_delete" ON mt_property_portals;
CREATE POLICY "mt_prop_portals_delete" ON mt_property_portals FOR DELETE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- ───────────────────────────────────────────
-- INDEXES FALTANTES
-- ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mt_prop_inquiries_deleted ON mt_property_inquiries(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mt_prop_orders_deleted ON mt_property_orders(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mt_property_types_deleted ON mt_property_types(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mt_captadores_franchise ON mt_captadores(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_corretores_franchise ON mt_corretores(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_price_tables_franchise ON mt_property_price_tables(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_price_tables_deleted ON mt_property_price_tables(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mt_email_tpl_tenant ON mt_property_email_templates(tenant_id);

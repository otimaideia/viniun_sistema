-- Fix: RLS de escrita das tabelas de rede dependia de current_tenant_id(),
-- que lê a variável de sessão app.current_tenant_id — NÃO persistida no pool de
-- conexões do PostgREST → retornava NULL → INSERT/UPDATE/DELETE bloqueados para
-- tenant_admin (erro 42501 "violates row-level security policy").
--
-- Correção: helper SECURITY DEFINER auth_tenant_id() que resolve o tenant do
-- usuário autenticado (auth.uid() → mt_users) BYPASSANDO a RLS de mt_users.
-- (Uma subquery direta na policy falharia, pois também é filtrada pela RLS de mt_users.)
--
-- Afeta apenas a ESCRITA de mt_network_tables e mt_network_table_items. SELECT inalterado.

-- Helper estável que retorna o tenant do usuário logado (ignora a RLS de mt_users)
CREATE OR REPLACE FUNCTION public.auth_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM mt_users
  WHERE auth_user_id = auth.uid() AND status = 'ativo'
  LIMIT 1;
$$;

-- Helper: o usuário logado é tenant_admin (ou platform_admin)?
CREATE OR REPLACE FUNCTION public.auth_is_tenant_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM mt_users
    WHERE auth_user_id = auth.uid() AND status = 'ativo'
      AND access_level IN ('tenant_admin', 'platform_admin')
  );
$$;

-- ── mt_network_tables ────────────────────────────────────────────────────
DROP POLICY IF EXISTS mt_network_tables_insert ON mt_network_tables;
CREATE POLICY mt_network_tables_insert ON mt_network_tables FOR INSERT
WITH CHECK (is_platform_admin() OR tenant_id = auth_tenant_id());

DROP POLICY IF EXISTS mt_network_tables_update ON mt_network_tables;
CREATE POLICY mt_network_tables_update ON mt_network_tables FOR UPDATE
USING (is_platform_admin() OR tenant_id = auth_tenant_id());

DROP POLICY IF EXISTS mt_network_tables_delete ON mt_network_tables;
CREATE POLICY mt_network_tables_delete ON mt_network_tables FOR DELETE
USING (is_platform_admin() OR (auth_is_tenant_admin() AND tenant_id = auth_tenant_id()));

-- SELECT precisa do MESMO fix: o PostgREST insere com return=representation
-- (INSERT ... RETURNING) → o Postgres aplica a policy de SELECT na linha nova.
-- Se a policy de SELECT só usa current_tenant_id() (NULL), o RETURNING falha
-- com "violates row-level security policy" mesmo com o WITH CHECK do INSERT OK.
DROP POLICY IF EXISTS mt_network_tables_select ON mt_network_tables;
CREATE POLICY mt_network_tables_select ON mt_network_tables FOR SELECT
USING (
  is_platform_admin()
  OR tenant_id = auth_tenant_id()
  OR tenant_id = current_tenant_id()
  OR (visibilidade = 'publica' AND is_active = true AND deleted_at IS NULL)
  OR (visibilidade = 'parceiros' AND is_active = true AND deleted_at IS NULL AND EXISTS (
    SELECT 1 FROM mt_network_partnerships p
    WHERE p.status = 'ativa' AND p.deleted_at IS NULL
      AND ((p.tenant_origin_id = mt_network_tables.tenant_id AND p.tenant_partner_id = auth_tenant_id())
        OR (p.tenant_partner_id = mt_network_tables.tenant_id AND p.tenant_origin_id = auth_tenant_id()))
  ))
);

-- ── mt_network_table_items ───────────────────────────────────────────────
DROP POLICY IF EXISTS mt_network_table_items_select ON mt_network_table_items;
CREATE POLICY mt_network_table_items_select ON mt_network_table_items FOR SELECT
USING (
  is_platform_admin()
  OR tenant_id = auth_tenant_id()
  OR tenant_id = current_tenant_id()
  OR EXISTS (
    SELECT 1 FROM mt_network_tables t
    WHERE t.id = mt_network_table_items.table_id AND t.is_active = true AND t.deleted_at IS NULL
      AND (t.visibilidade = 'publica' OR (t.visibilidade = 'parceiros' AND EXISTS (
        SELECT 1 FROM mt_network_partnerships p
        WHERE p.status = 'ativa' AND p.deleted_at IS NULL
          AND ((p.tenant_origin_id = t.tenant_id AND p.tenant_partner_id = auth_tenant_id())
            OR (p.tenant_partner_id = t.tenant_id AND p.tenant_origin_id = auth_tenant_id()))
      )))
  )
);

DROP POLICY IF EXISTS mt_network_table_items_insert ON mt_network_table_items;
CREATE POLICY mt_network_table_items_insert ON mt_network_table_items FOR INSERT
WITH CHECK (is_platform_admin() OR tenant_id = auth_tenant_id());

DROP POLICY IF EXISTS mt_network_table_items_update ON mt_network_table_items;
CREATE POLICY mt_network_table_items_update ON mt_network_table_items FOR UPDATE
USING (is_platform_admin() OR tenant_id = auth_tenant_id());

DROP POLICY IF EXISTS mt_network_table_items_delete ON mt_network_table_items;
CREATE POLICY mt_network_table_items_delete ON mt_network_table_items FOR DELETE
USING (is_platform_admin() OR tenant_id = auth_tenant_id());

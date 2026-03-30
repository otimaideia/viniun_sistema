-- =============================================================================
-- MULTI-TENANT MIGRATION: Row Level Security (RLS)
-- Data: 01/02/2026
-- Descrição: Funções auxiliares e políticas RLS para isolamento de dados
-- =============================================================================

-- =============================================================================
-- FUNÇÕES AUXILIARES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- current_user_id: Retorna o ID do usuário atual
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION current_user_id() IS 'Retorna o UUID do usuário atual da sessão';

-- -----------------------------------------------------------------------------
-- current_tenant_id: Retorna o ID do tenant atual
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION current_tenant_id() IS 'Retorna o UUID do tenant atual da sessão';

-- -----------------------------------------------------------------------------
-- current_franchise_id: Retorna o ID da franquia atual
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_franchise_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_franchise_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION current_franchise_id() IS 'Retorna o UUID da franquia atual da sessão';

-- -----------------------------------------------------------------------------
-- current_access_level: Retorna o nível de acesso do usuário atual
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_access_level()
RETURNS TEXT AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_access_level', true), '');
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION current_access_level() IS 'Retorna o nível de acesso do usuário atual';

-- -----------------------------------------------------------------------------
-- is_platform_admin: Verifica se é administrador da plataforma
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_access_level() = 'platform_admin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_platform_admin() IS 'Verifica se o usuário atual é Platform Admin';

-- -----------------------------------------------------------------------------
-- is_tenant_admin: Verifica se é administrador do tenant
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_tenant_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_access_level() IN ('platform_admin', 'tenant_admin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_tenant_admin() IS 'Verifica se o usuário atual é Tenant Admin ou superior';

-- -----------------------------------------------------------------------------
-- is_franchise_admin: Verifica se é administrador da franquia
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_franchise_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_access_level() IN ('platform_admin', 'tenant_admin', 'franchise_admin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_franchise_admin() IS 'Verifica se o usuário atual é Franchise Admin ou superior';

-- -----------------------------------------------------------------------------
-- can_access_tenant: Verifica se pode acessar um tenant específico
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_access_tenant(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Platform admin acessa todos
    IF is_platform_admin() THEN
        RETURN true;
    END IF;

    -- Outros usuários só acessam seu próprio tenant
    RETURN p_tenant_id = current_tenant_id();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION can_access_tenant(UUID) IS 'Verifica se o usuário pode acessar um tenant específico';

-- -----------------------------------------------------------------------------
-- can_access_franchise: Verifica se pode acessar uma franquia específica
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_access_franchise(p_franchise_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_franchise_tenant_id UUID;
BEGIN
    -- Platform admin acessa todas
    IF is_platform_admin() THEN
        RETURN true;
    END IF;

    -- Busca o tenant da franquia
    SELECT tenant_id INTO v_franchise_tenant_id
    FROM mt_franchises
    WHERE id = p_franchise_id;

    -- Verifica se é do mesmo tenant
    IF v_franchise_tenant_id != current_tenant_id() THEN
        RETURN false;
    END IF;

    -- Tenant admin acessa todas as franquias do tenant
    IF is_tenant_admin() THEN
        RETURN true;
    END IF;

    -- Franchise admin e users só acessam sua própria franquia
    RETURN p_franchise_id = current_franchise_id() OR current_franchise_id() IS NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION can_access_franchise(UUID) IS 'Verifica se o usuário pode acessar uma franquia específica';

-- -----------------------------------------------------------------------------
-- set_session_context: Define o contexto da sessão
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_session_context(
    p_user_id UUID,
    p_tenant_id UUID,
    p_franchise_id UUID DEFAULT NULL,
    p_access_level TEXT DEFAULT 'user'
)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', COALESCE(p_user_id::TEXT, ''), false);
    PERFORM set_config('app.current_tenant_id', COALESCE(p_tenant_id::TEXT, ''), false);
    PERFORM set_config('app.current_franchise_id', COALESCE(p_franchise_id::TEXT, ''), false);
    PERFORM set_config('app.current_access_level', COALESCE(p_access_level, 'user'), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_session_context(UUID, UUID, UUID, TEXT) IS 'Define o contexto da sessão para RLS';

-- =============================================================================
-- HABILITAR RLS EM TODAS AS TABELAS mt_*
-- =============================================================================

-- Platform tables (sem tenant_id - apenas platform_admin pode acessar)
ALTER TABLE mt_platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_integration_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_platform_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_modules ENABLE ROW LEVEL SECURITY;

-- Tenant tables
ALTER TABLE mt_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_tenant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_tenant_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_tenant_integrations ENABLE ROW LEVEL SECURITY;

-- Franchise tables
ALTER TABLE mt_franchises ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_franchise_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_franchise_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_franchise_settings ENABLE ROW LEVEL SECURITY;

-- User tables
ALTER TABLE mt_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_user_module_access ENABLE ROW LEVEL SECURITY;

-- Business tables
ALTER TABLE mt_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_lead_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_funnel_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_funnel_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_influencer_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_job_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_interviews ENABLE ROW LEVEL SECURITY;

-- Chatbot tables
ALTER TABLE mt_chatbot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_chatbot_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_chatbot_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_chatbot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_chatbot_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_chatbot_training ENABLE ROW LEVEL SECURITY;

-- Automation tables
ALTER TABLE mt_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_workflow_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_workflow_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_workflow_schedules ENABLE ROW LEVEL SECURITY;

-- API tables
ALTER TABLE mt_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_webhook_incoming ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Security tables
ALTER TABLE mt_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_ip_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_password_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_2fa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_consent_logs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- POLÍTICAS RLS - TABELAS DE PLATAFORMA
-- =============================================================================

-- mt_platform_settings: Apenas platform_admin
CREATE POLICY mt_platform_settings_select ON mt_platform_settings
    FOR SELECT USING (is_platform_admin() OR is_public = true);

CREATE POLICY mt_platform_settings_all ON mt_platform_settings
    FOR ALL USING (is_platform_admin());

-- mt_integration_types: Leitura para todos autenticados
CREATE POLICY mt_integration_types_select ON mt_integration_types
    FOR SELECT USING (true);

CREATE POLICY mt_integration_types_modify ON mt_integration_types
    FOR ALL USING (is_platform_admin());

-- mt_modules: Leitura para todos autenticados
CREATE POLICY mt_modules_select ON mt_modules
    FOR SELECT USING (true);

CREATE POLICY mt_modules_modify ON mt_modules
    FOR ALL USING (is_platform_admin());

-- mt_permissions: Leitura para todos autenticados
CREATE POLICY mt_permissions_select ON mt_permissions
    FOR SELECT USING (true);

CREATE POLICY mt_permissions_modify ON mt_permissions
    FOR ALL USING (is_platform_admin());

-- mt_workflow_templates: Templates do sistema são públicos
CREATE POLICY mt_workflow_templates_select ON mt_workflow_templates
    FOR SELECT USING (is_system = true OR is_platform_admin());

CREATE POLICY mt_workflow_templates_modify ON mt_workflow_templates
    FOR ALL USING (is_platform_admin());

-- =============================================================================
-- POLÍTICAS RLS - TABELAS DE TENANT
-- =============================================================================

-- mt_tenants
CREATE POLICY mt_tenants_select ON mt_tenants
    FOR SELECT USING (is_platform_admin() OR id = current_tenant_id());

CREATE POLICY mt_tenants_insert ON mt_tenants
    FOR INSERT WITH CHECK (is_platform_admin());

CREATE POLICY mt_tenants_update ON mt_tenants
    FOR UPDATE USING (is_platform_admin() OR (id = current_tenant_id() AND is_tenant_admin()));

CREATE POLICY mt_tenants_delete ON mt_tenants
    FOR DELETE USING (is_platform_admin());

-- mt_tenant_branding
CREATE POLICY mt_tenant_branding_all ON mt_tenant_branding
    FOR ALL USING (can_access_tenant(tenant_id));

-- mt_tenant_settings
CREATE POLICY mt_tenant_settings_select ON mt_tenant_settings
    FOR SELECT USING (can_access_tenant(tenant_id));

CREATE POLICY mt_tenant_settings_modify ON mt_tenant_settings
    FOR ALL USING (can_access_tenant(tenant_id) AND is_tenant_admin());

-- mt_tenant_modules
CREATE POLICY mt_tenant_modules_select ON mt_tenant_modules
    FOR SELECT USING (can_access_tenant(tenant_id));

CREATE POLICY mt_tenant_modules_modify ON mt_tenant_modules
    FOR ALL USING (is_platform_admin());

-- mt_tenant_integrations
CREATE POLICY mt_tenant_integrations_select ON mt_tenant_integrations
    FOR SELECT USING (can_access_tenant(tenant_id));

CREATE POLICY mt_tenant_integrations_modify ON mt_tenant_integrations
    FOR ALL USING (can_access_tenant(tenant_id) AND is_tenant_admin());

-- =============================================================================
-- POLÍTICAS RLS - TABELAS DE FRANQUIA
-- =============================================================================

-- mt_franchises
CREATE POLICY mt_franchises_select ON mt_franchises
    FOR SELECT USING (can_access_tenant(tenant_id));

CREATE POLICY mt_franchises_insert ON mt_franchises
    FOR INSERT WITH CHECK (can_access_tenant(tenant_id) AND is_tenant_admin());

CREATE POLICY mt_franchises_update ON mt_franchises
    FOR UPDATE USING (can_access_franchise(id));

CREATE POLICY mt_franchises_delete ON mt_franchises
    FOR DELETE USING (can_access_tenant(tenant_id) AND is_tenant_admin());

-- mt_franchise_modules
CREATE POLICY mt_franchise_modules_select ON mt_franchise_modules
    FOR SELECT USING (can_access_franchise(franchise_id));

CREATE POLICY mt_franchise_modules_modify ON mt_franchise_modules
    FOR ALL USING (can_access_tenant(tenant_id) AND is_tenant_admin());

-- mt_franchise_integrations
CREATE POLICY mt_franchise_integrations_select ON mt_franchise_integrations
    FOR SELECT USING (can_access_franchise(franchise_id));

CREATE POLICY mt_franchise_integrations_modify ON mt_franchise_integrations
    FOR ALL USING (can_access_franchise(franchise_id) AND is_franchise_admin());

-- mt_franchise_settings
CREATE POLICY mt_franchise_settings_select ON mt_franchise_settings
    FOR SELECT USING (can_access_franchise(franchise_id));

CREATE POLICY mt_franchise_settings_modify ON mt_franchise_settings
    FOR ALL USING (can_access_franchise(franchise_id) AND is_franchise_admin());

-- =============================================================================
-- POLÍTICAS RLS - TABELAS DE USUÁRIO
-- =============================================================================

-- mt_users
CREATE POLICY mt_users_select ON mt_users
    FOR SELECT USING (
        is_platform_admin() OR
        id = current_user_id() OR
        (can_access_tenant(tenant_id) AND (
            is_tenant_admin() OR
            (franchise_id IS NULL OR can_access_franchise(franchise_id))
        ))
    );

CREATE POLICY mt_users_insert ON mt_users
    FOR INSERT WITH CHECK (
        is_platform_admin() OR
        (can_access_tenant(tenant_id) AND is_tenant_admin())
    );

CREATE POLICY mt_users_update ON mt_users
    FOR UPDATE USING (
        is_platform_admin() OR
        id = current_user_id() OR
        (can_access_tenant(tenant_id) AND is_tenant_admin())
    );

CREATE POLICY mt_users_delete ON mt_users
    FOR DELETE USING (
        is_platform_admin() OR
        (can_access_tenant(tenant_id) AND is_tenant_admin())
    );

-- mt_roles
CREATE POLICY mt_roles_select ON mt_roles
    FOR SELECT USING (tenant_id IS NULL OR can_access_tenant(tenant_id));

CREATE POLICY mt_roles_modify ON mt_roles
    FOR ALL USING (
        (tenant_id IS NULL AND is_platform_admin()) OR
        (tenant_id IS NOT NULL AND can_access_tenant(tenant_id) AND is_tenant_admin() AND NOT is_system)
    );

-- mt_user_roles
CREATE POLICY mt_user_roles_select ON mt_user_roles
    FOR SELECT USING (can_access_tenant(tenant_id));

CREATE POLICY mt_user_roles_modify ON mt_user_roles
    FOR ALL USING (can_access_tenant(tenant_id) AND is_tenant_admin());

-- mt_user_permissions
CREATE POLICY mt_user_permissions_select ON mt_user_permissions
    FOR SELECT USING (can_access_tenant(tenant_id));

CREATE POLICY mt_user_permissions_modify ON mt_user_permissions
    FOR ALL USING (can_access_tenant(tenant_id) AND is_tenant_admin());

-- mt_user_module_access
CREATE POLICY mt_user_module_access_select ON mt_user_module_access
    FOR SELECT USING (can_access_tenant(tenant_id));

CREATE POLICY mt_user_module_access_modify ON mt_user_module_access
    FOR ALL USING (can_access_tenant(tenant_id) AND is_tenant_admin());

-- =============================================================================
-- POLÍTICAS RLS - TABELAS DE NEGÓCIO (Padrão: tenant + franchise)
-- =============================================================================

-- Macro para tabelas com tenant_id e franchise_id opcional
-- Acesso: tenant_admin vê tudo do tenant, outros veem só sua franquia

-- mt_leads
CREATE POLICY mt_leads_select ON mt_leads
    FOR SELECT USING (
        can_access_tenant(tenant_id) AND
        (is_tenant_admin() OR franchise_id IS NULL OR can_access_franchise(franchise_id))
    );

CREATE POLICY mt_leads_insert ON mt_leads
    FOR INSERT WITH CHECK (can_access_tenant(tenant_id));

CREATE POLICY mt_leads_update ON mt_leads
    FOR UPDATE USING (
        can_access_tenant(tenant_id) AND
        (is_tenant_admin() OR franchise_id IS NULL OR can_access_franchise(franchise_id))
    );

CREATE POLICY mt_leads_delete ON mt_leads
    FOR DELETE USING (
        can_access_tenant(tenant_id) AND is_franchise_admin()
    );

-- Aplicar política padrão para demais tabelas de negócio
-- (Usando DO block para evitar repetição)

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'mt_lead_activities',
        'mt_lead_scoring_rules',
        'mt_funnels',
        'mt_funnel_stages',
        'mt_funnel_leads',
        'mt_appointments',
        'mt_forms',
        'mt_form_fields',
        'mt_form_submissions',
        'mt_whatsapp_sessions',
        'mt_whatsapp_conversations',
        'mt_whatsapp_messages',
        'mt_whatsapp_templates',
        'mt_services',
        'mt_campaigns',
        'mt_influencers',
        'mt_influencer_contracts',
        'mt_partnerships',
        'mt_goals',
        'mt_job_positions',
        'mt_candidates',
        'mt_interviews',
        'mt_chatbot_config',
        'mt_chatbot_knowledge',
        'mt_chatbot_intents',
        'mt_chatbot_conversations',
        'mt_chatbot_messages',
        'mt_chatbot_analytics',
        'mt_chatbot_training',
        'mt_workflows',
        'mt_workflow_steps',
        'mt_workflow_conditions',
        'mt_workflow_executions',
        'mt_workflow_execution_logs',
        'mt_workflow_schedules',
        'mt_api_keys',
        'mt_api_logs',
        'mt_webhooks',
        'mt_webhook_logs',
        'mt_webhook_incoming',
        'mt_api_rate_limits',
        'mt_audit_logs',
        'mt_user_sessions',
        'mt_login_attempts',
        'mt_ip_whitelist',
        'mt_password_policies',
        'mt_2fa_settings',
        'mt_security_alerts',
        'mt_data_exports',
        'mt_consent_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        -- Policy de SELECT
        EXECUTE format('
            CREATE POLICY %I_tenant_select ON %I
            FOR SELECT USING (can_access_tenant(tenant_id))',
            tbl, tbl
        );

        -- Policy de INSERT
        EXECUTE format('
            CREATE POLICY %I_tenant_insert ON %I
            FOR INSERT WITH CHECK (can_access_tenant(tenant_id))',
            tbl, tbl
        );

        -- Policy de UPDATE
        EXECUTE format('
            CREATE POLICY %I_tenant_update ON %I
            FOR UPDATE USING (can_access_tenant(tenant_id))',
            tbl, tbl
        );

        -- Policy de DELETE
        EXECUTE format('
            CREATE POLICY %I_tenant_delete ON %I
            FOR DELETE USING (can_access_tenant(tenant_id) AND is_franchise_admin())',
            tbl, tbl
        );
    END LOOP;
END $$;

-- =============================================================================
-- POLÍTICAS ESPECIAIS
-- =============================================================================

-- mt_platform_integrations: Apenas platform_admin
CREATE POLICY mt_platform_integrations_all ON mt_platform_integrations
    FOR ALL USING (is_platform_admin());

-- mt_integration_logs: Filtrar por contexto
CREATE POLICY mt_integration_logs_select ON mt_integration_logs
    FOR SELECT USING (
        is_platform_admin() OR
        (tenant_id IS NOT NULL AND can_access_tenant(tenant_id))
    );

-- mt_role_permissions: Herda de roles
CREATE POLICY mt_role_permissions_select ON mt_role_permissions
    FOR SELECT USING (true); -- Permissões são públicas para leitura

CREATE POLICY mt_role_permissions_modify ON mt_role_permissions
    FOR ALL USING (is_platform_admin());

-- =============================================================================
-- FIM DA MIGRATION 011
-- =============================================================================

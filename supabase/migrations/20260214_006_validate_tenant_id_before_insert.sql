-- =============================================================================
-- FIX: Validar tenant_id antes de insert
-- Data: 14/02/2026
-- =============================================================================

-- Função genérica para validar tenant_id em qualquer tabela MT
CREATE OR REPLACE FUNCTION validate_tenant_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar que tenant_id não é NULL
    IF NEW.tenant_id IS NULL THEN
        RAISE EXCEPTION 'tenant_id não pode ser NULL em tabela %', TG_TABLE_NAME;
    END IF;

    -- Validar que tenant existe e está ativo
    IF NOT EXISTS (
        SELECT 1 FROM mt_tenants
        WHERE id = NEW.tenant_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Tenant % não encontrado ou inativo', NEW.tenant_id;
    END IF;

    -- Validar que tenant_id corresponde ao contexto do usuário
    -- (exceto para platform admins que podem inserir em qualquer tenant)
    IF NOT is_platform_admin() THEN
        IF NEW.tenant_id != current_tenant_id() THEN
            RAISE EXCEPTION 'Não é permitido inserir dados em outro tenant. Esperado: %, Recebido: %',
                current_tenant_id(), NEW.tenant_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger nas tabelas críticas de WhatsApp
DROP TRIGGER IF EXISTS validate_tenant_before_insert ON mt_whatsapp_queues;
CREATE TRIGGER validate_tenant_before_insert
    BEFORE INSERT ON mt_whatsapp_queues
    FOR EACH ROW EXECUTE FUNCTION validate_tenant_id_on_insert();

DROP TRIGGER IF EXISTS validate_tenant_before_insert ON mt_whatsapp_queue_users;
CREATE TRIGGER validate_tenant_before_insert
    BEFORE INSERT ON mt_whatsapp_queue_users
    FOR EACH ROW EXECUTE FUNCTION validate_tenant_id_on_insert();

DROP TRIGGER IF EXISTS validate_tenant_before_insert ON mt_whatsapp_transfers;
CREATE TRIGGER validate_tenant_before_insert
    BEFORE INSERT ON mt_whatsapp_transfers
    FOR EACH ROW EXECUTE FUNCTION validate_tenant_id_on_insert();

DROP TRIGGER IF EXISTS validate_tenant_before_insert ON mt_whatsapp_notes;
CREATE TRIGGER validate_tenant_before_insert
    BEFORE INSERT ON mt_whatsapp_notes
    FOR EACH ROW EXECUTE FUNCTION validate_tenant_id_on_insert();

DROP TRIGGER IF EXISTS validate_tenant_before_insert ON mt_whatsapp_bot_config;
CREATE TRIGGER validate_tenant_before_insert
    BEFORE INSERT ON mt_whatsapp_bot_config
    FOR EACH ROW EXECUTE FUNCTION validate_tenant_id_on_insert();

DROP TRIGGER IF EXISTS validate_tenant_before_insert ON mt_whatsapp_agent_metrics;
CREATE TRIGGER validate_tenant_before_insert
    BEFORE INSERT ON mt_whatsapp_agent_metrics
    FOR EACH ROW EXECUTE FUNCTION validate_tenant_id_on_insert();

COMMENT ON FUNCTION validate_tenant_id_on_insert IS
'Trigger function que valida tenant_id em todas as tabelas MT antes de insert. Garante que: (1) tenant_id não é NULL, (2) tenant existe e está ativo, (3) usuário tem permissão para inserir neste tenant.';

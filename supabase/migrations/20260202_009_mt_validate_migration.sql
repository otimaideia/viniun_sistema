-- =============================================================================
-- VALIDAÇÃO DA MIGRAÇÃO
-- Data: 2026-02-02
-- Executar APÓS todos os scripts de migração
-- =============================================================================

-- =============================================================================
-- RELATÓRIO DE MIGRAÇÃO
-- =============================================================================

DO $$
DECLARE
    v_tenant_id UUID;
    v_tenant_name TEXT;
    v_count_legacy INT;
    v_count_mt INT;
    v_resultado TEXT := '';
BEGIN
    RAISE NOTICE '=============================================================';
    RAISE NOTICE 'RELATÓRIO DE VALIDAÇÃO DA MIGRAÇÃO MULTI-TENANT';
    RAISE NOTICE '=============================================================';
    RAISE NOTICE '';

    -- =======================================================================
    -- YESLASER
    -- =======================================================================
    v_tenant_id := 'ebf87fe2-093a-4fba-bb56-c6835cbc1465'::uuid;
    v_tenant_name := 'YESlaser';

    RAISE NOTICE '--- % ---', v_tenant_name;

    -- Franquias
    SELECT COUNT(*) INTO v_count_legacy FROM yeslaser_franqueados;
    SELECT COUNT(*) INTO v_count_mt FROM mt_franchises WHERE tenant_id = v_tenant_id;
    RAISE NOTICE 'Franquias: Legacy=%, MT=%, Status=%',
        v_count_legacy, v_count_mt,
        CASE WHEN v_count_mt >= v_count_legacy THEN '✅ OK' ELSE '⚠️ VERIFICAR' END;

    -- Leads
    SELECT COUNT(*) INTO v_count_legacy FROM sistema_leads_yeslaser;
    SELECT COUNT(*) INTO v_count_mt FROM mt_leads WHERE tenant_id = v_tenant_id;
    RAISE NOTICE 'Leads: Legacy=%, MT=%, Status=%',
        v_count_legacy, v_count_mt,
        CASE WHEN v_count_mt >= v_count_legacy THEN '✅ OK' ELSE '⚠️ VERIFICAR' END;

    -- Serviços
    SELECT COUNT(*) INTO v_count_legacy FROM yeslaser_servicos;
    SELECT COUNT(*) INTO v_count_mt FROM mt_services WHERE tenant_id = v_tenant_id;
    RAISE NOTICE 'Serviços: Legacy=%, MT=%, Status=%',
        v_count_legacy, v_count_mt,
        CASE WHEN v_count_mt >= v_count_legacy THEN '✅ OK' ELSE '⚠️ VERIFICAR' END;

    -- Formulários
    SELECT COUNT(*) INTO v_count_legacy FROM yeslaser_formularios;
    SELECT COUNT(*) INTO v_count_mt FROM mt_forms WHERE tenant_id = v_tenant_id;
    RAISE NOTICE 'Formulários: Legacy=%, MT=%, Status=%',
        v_count_legacy, v_count_mt,
        CASE WHEN v_count_mt >= v_count_legacy THEN '✅ OK' ELSE '⚠️ VERIFICAR' END;

    -- Influenciadoras
    SELECT COUNT(*) INTO v_count_legacy FROM yeslaser_influenciadoras;
    SELECT COUNT(*) INTO v_count_mt FROM mt_influencers WHERE tenant_id = v_tenant_id;
    RAISE NOTICE 'Influenciadoras: Legacy=%, MT=%, Status=%',
        v_count_legacy, v_count_mt,
        CASE WHEN v_count_mt >= v_count_legacy THEN '✅ OK' ELSE '⚠️ VERIFICAR' END;

    -- Parcerias
    SELECT COUNT(*) INTO v_count_legacy FROM yeslaser_parcerias;
    SELECT COUNT(*) INTO v_count_mt FROM mt_partnerships WHERE tenant_id = v_tenant_id;
    RAISE NOTICE 'Parcerias: Legacy=%, MT=%, Status=%',
        v_count_legacy, v_count_mt,
        CASE WHEN v_count_mt >= v_count_legacy THEN '✅ OK' ELSE '⚠️ VERIFICAR' END;

    -- Funis
    SELECT COUNT(*) INTO v_count_legacy FROM yeslaser_funis;
    SELECT COUNT(*) INTO v_count_mt FROM mt_funnels WHERE tenant_id = v_tenant_id;
    RAISE NOTICE 'Funis: Legacy=%, MT=%, Status=%',
        v_count_legacy, v_count_mt,
        CASE WHEN v_count_mt >= v_count_legacy THEN '✅ OK' ELSE '⚠️ VERIFICAR' END;

    -- WhatsApp Sessões
    SELECT COUNT(*) INTO v_count_legacy FROM yeslaser_whatsapp_sessoes;
    SELECT COUNT(*) INTO v_count_mt FROM mt_whatsapp_sessions WHERE tenant_id = v_tenant_id;
    RAISE NOTICE 'WhatsApp Sessões: Legacy=%, MT=%, Status=%',
        v_count_legacy, v_count_mt,
        CASE WHEN v_count_mt >= v_count_legacy THEN '✅ OK' ELSE '⚠️ VERIFICAR' END;

    -- Vagas
    SELECT COUNT(*) INTO v_count_legacy FROM yeslaser_vagas;
    SELECT COUNT(*) INTO v_count_mt FROM mt_job_positions WHERE tenant_id = v_tenant_id;
    RAISE NOTICE 'Vagas: Legacy=%, MT=%, Status=%',
        v_count_legacy, v_count_mt,
        CASE WHEN v_count_mt >= v_count_legacy THEN '✅ OK' ELSE '⚠️ VERIFICAR' END;

    RAISE NOTICE '';

    -- =======================================================================
    -- POPDENTS
    -- =======================================================================
    v_tenant_id := 'c1c6fcb8-7c52-4441-9609-45a3312f1477'::uuid;
    v_tenant_name := 'PopDents';

    RAISE NOTICE '--- % ---', v_tenant_name;

    -- Franquias
    SELECT COUNT(*) INTO v_count_legacy FROM popdents_franqueados;
    SELECT COUNT(*) INTO v_count_mt FROM mt_franchises WHERE tenant_id = v_tenant_id;
    RAISE NOTICE 'Franquias: Legacy=%, MT=%, Status=%',
        v_count_legacy, v_count_mt,
        CASE WHEN v_count_mt >= v_count_legacy THEN '✅ OK' ELSE '⚠️ VERIFICAR' END;

    -- Leads
    SELECT COUNT(*) INTO v_count_legacy FROM popdents_leads;
    SELECT COUNT(*) INTO v_count_mt FROM mt_leads WHERE tenant_id = v_tenant_id;
    RAISE NOTICE 'Leads: Legacy=%, MT=%, Status=%',
        v_count_legacy, v_count_mt,
        CASE WHEN v_count_mt >= v_count_legacy THEN '✅ OK' ELSE '⚠️ VERIFICAR' END;

    -- Serviços
    SELECT COUNT(*) INTO v_count_legacy FROM popdents_servicos;
    SELECT COUNT(*) INTO v_count_mt FROM mt_services WHERE tenant_id = v_tenant_id;
    RAISE NOTICE 'Serviços: Legacy=%, MT=%, Status=%',
        v_count_legacy, v_count_mt,
        CASE WHEN v_count_mt >= v_count_legacy THEN '✅ OK' ELSE '⚠️ VERIFICAR' END;

    -- Formulários
    SELECT COUNT(*) INTO v_count_legacy FROM popdents_formularios;
    SELECT COUNT(*) INTO v_count_mt FROM mt_forms WHERE tenant_id = v_tenant_id;
    RAISE NOTICE 'Formulários: Legacy=%, MT=%, Status=%',
        v_count_legacy, v_count_mt,
        CASE WHEN v_count_mt >= v_count_legacy THEN '✅ OK' ELSE '⚠️ VERIFICAR' END;

    -- WhatsApp Sessões
    SELECT COUNT(*) INTO v_count_legacy FROM popdents_whatsapp_sessions;
    SELECT COUNT(*) INTO v_count_mt FROM mt_whatsapp_sessions WHERE tenant_id = v_tenant_id;
    RAISE NOTICE 'WhatsApp Sessões: Legacy=%, MT=%, Status=%',
        v_count_legacy, v_count_mt,
        CASE WHEN v_count_mt >= v_count_legacy THEN '✅ OK' ELSE '⚠️ VERIFICAR' END;

    -- WhatsApp Conversas
    SELECT COUNT(*) INTO v_count_legacy FROM popdents_whatsapp_conversations;
    SELECT COUNT(*) INTO v_count_mt FROM mt_whatsapp_conversations WHERE tenant_id = v_tenant_id;
    RAISE NOTICE 'WhatsApp Conversas: Legacy=%, MT=%, Status=%',
        v_count_legacy, v_count_mt,
        CASE WHEN v_count_mt >= v_count_legacy THEN '✅ OK' ELSE '⚠️ VERIFICAR' END;

    -- WhatsApp Mensagens
    SELECT COUNT(*) INTO v_count_legacy FROM popdents_whatsapp_messages;
    SELECT COUNT(*) INTO v_count_mt FROM mt_whatsapp_messages WHERE tenant_id = v_tenant_id;
    RAISE NOTICE 'WhatsApp Mensagens: Legacy=%, MT=%, Status=%',
        v_count_legacy, v_count_mt,
        CASE WHEN v_count_mt >= v_count_legacy THEN '✅ OK' ELSE '⚠️ VERIFICAR' END;

    RAISE NOTICE '';
    RAISE NOTICE '=============================================================';
    RAISE NOTICE 'TABELA DE MAPEAMENTO';
    RAISE NOTICE '=============================================================';

    -- Resumo do mapeamento
    FOR v_tenant_name, v_count_mt IN
        SELECT tenant_slug, COUNT(*)
        FROM mt_migration_mapping
        GROUP BY tenant_slug
        ORDER BY tenant_slug
    LOOP
        RAISE NOTICE '%: % registros mapeados', v_tenant_name, v_count_mt;
    END LOOP;

    -- Por tipo de entidade
    RAISE NOTICE '';
    RAISE NOTICE 'Por tipo de entidade:';
    FOR v_tenant_name, v_count_mt IN
        SELECT entity_type, COUNT(*)
        FROM mt_migration_mapping
        GROUP BY entity_type
        ORDER BY entity_type
    LOOP
        RAISE NOTICE '  %: %', v_tenant_name, v_count_mt;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '=============================================================';
    RAISE NOTICE 'MIGRAÇÃO CONCLUÍDA!';
    RAISE NOTICE '=============================================================';

END $$;

-- =============================================================================
-- CONSULTAS DE VERIFICAÇÃO MANUAL
-- =============================================================================

-- Verificar leads por tenant
SELECT
    t.nome_fantasia as tenant,
    COUNT(l.id) as total_leads
FROM mt_tenants t
LEFT JOIN mt_leads l ON l.tenant_id = t.id
GROUP BY t.id, t.nome_fantasia
ORDER BY total_leads DESC;

-- Verificar franquias por tenant
SELECT
    t.nome_fantasia as tenant,
    COUNT(f.id) as total_franquias
FROM mt_tenants t
LEFT JOIN mt_franchises f ON f.tenant_id = t.id
GROUP BY t.id, t.nome_fantasia
ORDER BY total_franquias DESC;

-- Verificar mapeamento de franquias
SELECT
    mm.tenant_slug,
    mm.old_table,
    COUNT(*) as mapeados
FROM mt_migration_mapping mm
WHERE mm.entity_type = 'franchise'
GROUP BY mm.tenant_slug, mm.old_table;

-- Verificar leads que ficaram sem franchise_id
SELECT
    t.nome_fantasia,
    COUNT(*) as leads_sem_franquia
FROM mt_leads l
JOIN mt_tenants t ON t.id = l.tenant_id
WHERE l.franchise_id IS NULL
GROUP BY t.nome_fantasia;

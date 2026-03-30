-- =============================================================================
-- MIGRAÇÃO: FUNIS DE VENDAS (yeslaser_funis → mt_funnels)
-- Data: 2026-02-02
-- =============================================================================

BEGIN;

-- =============================================================================
-- MIGRAR FUNIS YESLASER
-- =============================================================================

INSERT INTO mt_funnels (
    id,
    tenant_id,
    franchise_id,
    nome,
    descricao,
    tipo,
    is_default,
    is_active,
    config,
    created_at,
    updated_at
)
SELECT
    f.id,
    'ebf87fe2-093a-4fba-bb56-c6835cbc1465'::uuid as tenant_id,
    COALESCE(
        (SELECT new_id FROM mt_migration_mapping
         WHERE entity_type = 'franchise' AND old_id = f.franqueado_id),
        NULL
    ) as franchise_id,
    f.nome,
    f.descricao,
    COALESCE(f.tipo, 'vendas') as tipo,
    COALESCE(f.is_default, false) as is_default,
    COALESCE(f.ativo, true) as is_active,
    COALESCE(f.configuracoes, '{}'::jsonb) as config,
    f.created_at,
    f.updated_at
FROM yeslaser_funis f
WHERE NOT EXISTS (
    SELECT 1 FROM mt_funnels mf WHERE mf.id = f.id
);

-- Registrar mapeamento
INSERT INTO mt_migration_mapping (entity_type, tenant_slug, old_table, old_id, new_id)
SELECT 'funnel', 'yeslaser', 'yeslaser_funis', f.id, f.id
FROM yeslaser_funis f
WHERE EXISTS (SELECT 1 FROM mt_funnels mf WHERE mf.id = f.id)
ON CONFLICT (entity_type, old_id) DO NOTHING;

-- =============================================================================
-- MIGRAR ETAPAS DO FUNIL YESLASER
-- =============================================================================

INSERT INTO mt_funnel_stages (
    id,
    funnel_id,
    nome,
    descricao,
    cor,
    ordem,
    is_final,
    is_won,
    automacoes,
    created_at,
    updated_at
)
SELECT
    e.id,
    e.funil_id as funnel_id,
    e.nome,
    e.descricao,
    e.cor,
    e.ordem,
    COALESCE(e.is_final, false) as is_final,
    COALESCE(e.is_won, false) as is_won,
    COALESCE(e.automacoes, '{}'::jsonb) as automacoes,
    e.created_at,
    e.updated_at
FROM yeslaser_funil_etapas e
WHERE EXISTS (SELECT 1 FROM mt_funnels f WHERE f.id = e.funil_id)
AND NOT EXISTS (
    SELECT 1 FROM mt_funnel_stages fs WHERE fs.id = e.id
);

-- =============================================================================
-- MIGRAR LEADS NO FUNIL
-- =============================================================================

INSERT INTO mt_funnel_leads (
    id,
    funnel_id,
    stage_id,
    lead_id,
    tenant_id,
    franchise_id,
    entered_at,
    moved_at,
    valor_estimado,
    probabilidade,
    metadata,
    created_at,
    updated_at
)
SELECT
    fl.id,
    fl.funil_id as funnel_id,
    fl.etapa_id as stage_id,
    fl.lead_id,
    'ebf87fe2-093a-4fba-bb56-c6835cbc1465'::uuid as tenant_id,
    (SELECT franchise_id FROM mt_leads WHERE id = fl.lead_id) as franchise_id,
    fl.entrada_em as entered_at,
    fl.movido_em as moved_at,
    fl.valor_estimado,
    fl.probabilidade,
    COALESCE(fl.metadata, '{}'::jsonb) as metadata,
    fl.created_at,
    fl.updated_at
FROM yeslaser_funil_leads fl
WHERE EXISTS (SELECT 1 FROM mt_funnels f WHERE f.id = fl.funil_id)
AND EXISTS (SELECT 1 FROM mt_leads l WHERE l.id = fl.lead_id)
AND NOT EXISTS (
    SELECT 1 FROM mt_funnel_leads mfl WHERE mfl.id = fl.id
);

-- =============================================================================
-- MIGRAR FUNIS POPDENTS
-- =============================================================================

INSERT INTO mt_funnels (
    id,
    tenant_id,
    franchise_id,
    nome,
    descricao,
    tipo,
    is_default,
    is_active,
    config,
    created_at,
    updated_at
)
SELECT
    f.id,
    'c1c6fcb8-7c52-4441-9609-45a3312f1477'::uuid as tenant_id,
    COALESCE(
        (SELECT new_id FROM mt_migration_mapping
         WHERE entity_type = 'franchise' AND old_id = f.franqueado_id),
        NULL
    ) as franchise_id,
    f.nome,
    f.descricao,
    COALESCE(f.tipo, 'vendas') as tipo,
    COALESCE(f.is_default, false) as is_default,
    COALESCE(f.ativo, true) as is_active,
    COALESCE(f.config, '{}'::jsonb) as config,
    f.created_at,
    f.updated_at
FROM popdents_sales_funnels f
WHERE NOT EXISTS (
    SELECT 1 FROM mt_funnels mf WHERE mf.id = f.id
);

-- Etapas PopDents
INSERT INTO mt_funnel_stages (
    id,
    funnel_id,
    nome,
    descricao,
    cor,
    ordem,
    is_final,
    is_won,
    automacoes,
    created_at,
    updated_at
)
SELECT
    e.id,
    e.funnel_id,
    e.nome,
    e.descricao,
    e.cor,
    e.ordem,
    COALESCE(e.is_final, false) as is_final,
    COALESCE(e.is_won, false) as is_won,
    COALESCE(e.automacoes, '{}'::jsonb) as automacoes,
    e.created_at,
    e.updated_at
FROM popdents_funnel_stages e
WHERE EXISTS (SELECT 1 FROM mt_funnels f WHERE f.id = e.funnel_id)
AND NOT EXISTS (
    SELECT 1 FROM mt_funnel_stages fs WHERE fs.id = e.id
);

-- =============================================================================
-- MIGRAR ATIVIDADES DE LEADS YESLASER
-- =============================================================================

INSERT INTO mt_lead_activities (
    id,
    tenant_id,
    lead_id,
    user_id,
    tipo,
    descricao,
    metadata,
    created_at
)
SELECT
    a.id,
    'ebf87fe2-093a-4fba-bb56-c6835cbc1465'::uuid as tenant_id,
    a.lead_id,
    a.user_id,
    a.tipo,
    a.descricao,
    COALESCE(a.metadata, '{}'::jsonb) as metadata,
    a.created_at
FROM yeslaser_lead_activities a
WHERE EXISTS (SELECT 1 FROM mt_leads l WHERE l.id = a.lead_id)
AND NOT EXISTS (
    SELECT 1 FROM mt_lead_activities la WHERE la.id = a.id
);

-- Atividades PopDents
INSERT INTO mt_lead_activities (
    id,
    tenant_id,
    lead_id,
    user_id,
    tipo,
    descricao,
    metadata,
    created_at
)
SELECT
    a.id,
    'c1c6fcb8-7c52-4441-9609-45a3312f1477'::uuid as tenant_id,
    a.lead_id,
    a.user_id,
    a.tipo,
    a.descricao,
    COALESCE(a.metadata, '{}'::jsonb) as metadata,
    a.created_at
FROM popdents_lead_activities a
WHERE EXISTS (SELECT 1 FROM mt_leads l WHERE l.id = a.lead_id)
AND NOT EXISTS (
    SELECT 1 FROM mt_lead_activities la WHERE la.id = a.id
);

-- =============================================================================
-- MIGRAR CAMPANHAS YESLASER
-- =============================================================================

INSERT INTO mt_campaigns (
    id,
    tenant_id,
    franchise_id,
    nome,
    descricao,
    tipo,
    status,
    data_inicio,
    data_fim,
    orcamento,
    gasto,
    meta_leads,
    meta_conversoes,
    leads_gerados,
    conversoes,
    config,
    created_at,
    updated_at
)
SELECT
    c.id,
    'ebf87fe2-093a-4fba-bb56-c6835cbc1465'::uuid as tenant_id,
    COALESCE(
        (SELECT new_id FROM mt_migration_mapping
         WHERE entity_type = 'franchise' AND old_id = c.franqueado_id),
        NULL
    ) as franchise_id,
    c.nome,
    c.descricao,
    COALESCE(c.tipo, 'marketing') as tipo,
    COALESCE(c.status, 'ativa') as status,
    c.data_inicio,
    c.data_fim,
    c.orcamento,
    c.gasto,
    c.meta_leads,
    c.meta_conversoes,
    c.leads_gerados,
    c.conversoes,
    COALESCE(c.config, '{}'::jsonb) as config,
    c.created_at,
    c.updated_at
FROM yeslaser_campanhas c
WHERE NOT EXISTS (
    SELECT 1 FROM mt_campaigns mc WHERE mc.id = c.id
);

-- Campanhas PopDents
INSERT INTO mt_campaigns (
    id,
    tenant_id,
    franchise_id,
    nome,
    descricao,
    tipo,
    status,
    data_inicio,
    data_fim,
    orcamento,
    gasto,
    meta_leads,
    meta_conversoes,
    leads_gerados,
    conversoes,
    config,
    created_at,
    updated_at
)
SELECT
    c.id,
    'c1c6fcb8-7c52-4441-9609-45a3312f1477'::uuid as tenant_id,
    COALESCE(
        (SELECT new_id FROM mt_migration_mapping
         WHERE entity_type = 'franchise' AND old_id = c.franqueado_id),
        NULL
    ) as franchise_id,
    c.nome,
    c.descricao,
    COALESCE(c.tipo, 'marketing') as tipo,
    COALESCE(c.status, 'ativa') as status,
    c.data_inicio,
    c.data_fim,
    c.orcamento,
    c.gasto,
    c.meta_leads,
    c.meta_conversoes,
    c.leads_gerados,
    c.conversoes,
    COALESCE(c.config, '{}'::jsonb) as config,
    c.created_at,
    c.updated_at
FROM popdents_campanhas c
WHERE NOT EXISTS (
    SELECT 1 FROM mt_campaigns mc WHERE mc.id = c.id
);

COMMIT;

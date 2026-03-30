-- =============================================================================
-- MIGRAÇÃO: FORMULÁRIOS (yeslaser_formularios → mt_forms)
-- Data: 2026-02-02
-- =============================================================================

BEGIN;

-- =============================================================================
-- MIGRAR FORMULÁRIOS YESLASER
-- =============================================================================

INSERT INTO mt_forms (
    id,
    tenant_id,
    franchise_id,
    nome,
    slug,
    descricao,
    tipo,
    status,
    config,
    estilos,
    is_public,
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
    f.slug,
    f.descricao,
    COALESCE(f.tipo, 'lead') as tipo,
    COALESCE(f.status, 'ativo') as status,
    COALESCE(f.configuracoes, '{}'::jsonb) as config,
    COALESCE(f.estilos, '{}'::jsonb) as estilos,
    COALESCE(f.publico, true) as is_public,
    f.created_at,
    f.updated_at
FROM yeslaser_formularios f
WHERE NOT EXISTS (
    SELECT 1 FROM mt_forms mf WHERE mf.id = f.id
);

-- Registrar mapeamento
INSERT INTO mt_migration_mapping (entity_type, tenant_slug, old_table, old_id, new_id)
SELECT 'form', 'yeslaser', 'yeslaser_formularios', f.id, f.id
FROM yeslaser_formularios f
WHERE EXISTS (SELECT 1 FROM mt_forms mf WHERE mf.id = f.id)
ON CONFLICT (entity_type, old_id) DO NOTHING;

-- =============================================================================
-- MIGRAR CAMPOS DOS FORMULÁRIOS YESLASER
-- =============================================================================

INSERT INTO mt_form_fields (
    id,
    form_id,
    nome,
    label,
    tipo,
    placeholder,
    validacao,
    opcoes,
    obrigatorio,
    ordem,
    config,
    created_at,
    updated_at
)
SELECT
    c.id,
    c.formulario_id as form_id,
    c.nome,
    c.label,
    c.tipo,
    c.placeholder,
    c.validacao,
    c.opcoes,
    COALESCE(c.obrigatorio, false) as obrigatorio,
    c.ordem,
    COALESCE(c.config, '{}'::jsonb) as config,
    c.created_at,
    c.updated_at
FROM yeslaser_formulario_campos c
WHERE EXISTS (SELECT 1 FROM mt_forms f WHERE f.id = c.formulario_id)
AND NOT EXISTS (
    SELECT 1 FROM mt_form_fields ff WHERE ff.id = c.id
);

-- =============================================================================
-- MIGRAR SUBMISSÕES DOS FORMULÁRIOS YESLASER
-- =============================================================================

INSERT INTO mt_form_submissions (
    id,
    form_id,
    tenant_id,
    franchise_id,
    lead_id,
    dados,
    ip_address,
    user_agent,
    created_at
)
SELECT
    s.id,
    s.formulario_id as form_id,
    'ebf87fe2-093a-4fba-bb56-c6835cbc1465'::uuid as tenant_id,
    (SELECT franchise_id FROM mt_forms WHERE id = s.formulario_id) as franchise_id,
    s.lead_id,
    COALESCE(s.dados, '{}'::jsonb) as dados,
    s.ip_address,
    s.user_agent,
    s.created_at
FROM yeslaser_formulario_submissoes s
WHERE EXISTS (SELECT 1 FROM mt_forms f WHERE f.id = s.formulario_id)
AND NOT EXISTS (
    SELECT 1 FROM mt_form_submissions fs WHERE fs.id = s.id
);

-- =============================================================================
-- MIGRAR FORMULÁRIOS POPDENTS
-- =============================================================================

INSERT INTO mt_forms (
    id,
    tenant_id,
    franchise_id,
    nome,
    slug,
    descricao,
    tipo,
    status,
    config,
    estilos,
    is_public,
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
    f.slug,
    f.descricao,
    COALESCE(f.tipo, 'lead') as tipo,
    COALESCE(f.status, 'ativo') as status,
    COALESCE(f.configuracoes, '{}'::jsonb) as config,
    COALESCE(f.estilos, '{}'::jsonb) as estilos,
    COALESCE(f.publico, true) as is_public,
    f.created_at,
    f.updated_at
FROM popdents_formularios f
WHERE NOT EXISTS (
    SELECT 1 FROM mt_forms mf WHERE mf.id = f.id
);

-- Registrar mapeamento
INSERT INTO mt_migration_mapping (entity_type, tenant_slug, old_table, old_id, new_id)
SELECT 'form', 'popdents', 'popdents_formularios', f.id, f.id
FROM popdents_formularios f
WHERE EXISTS (SELECT 1 FROM mt_forms mf WHERE mf.id = f.id)
ON CONFLICT (entity_type, old_id) DO NOTHING;

-- Campos PopDents
INSERT INTO mt_form_fields (
    id,
    form_id,
    nome,
    label,
    tipo,
    placeholder,
    validacao,
    opcoes,
    obrigatorio,
    ordem,
    config,
    created_at,
    updated_at
)
SELECT
    c.id,
    c.formulario_id as form_id,
    c.nome,
    c.label,
    c.tipo,
    c.placeholder,
    c.validacao,
    c.opcoes,
    COALESCE(c.obrigatorio, false) as obrigatorio,
    c.ordem,
    COALESCE(c.config, '{}'::jsonb) as config,
    c.created_at,
    c.updated_at
FROM popdents_formulario_campos c
WHERE EXISTS (SELECT 1 FROM mt_forms f WHERE f.id = c.formulario_id)
AND NOT EXISTS (
    SELECT 1 FROM mt_form_fields ff WHERE ff.id = c.id
);

-- Submissões PopDents
INSERT INTO mt_form_submissions (
    id,
    form_id,
    tenant_id,
    franchise_id,
    lead_id,
    dados,
    ip_address,
    user_agent,
    created_at
)
SELECT
    s.id,
    s.formulario_id as form_id,
    'c1c6fcb8-7c52-4441-9609-45a3312f1477'::uuid as tenant_id,
    (SELECT franchise_id FROM mt_forms WHERE id = s.formulario_id) as franchise_id,
    s.lead_id,
    COALESCE(s.dados, '{}'::jsonb) as dados,
    s.ip_address,
    s.user_agent,
    s.created_at
FROM popdents_formulario_submissoes s
WHERE EXISTS (SELECT 1 FROM mt_forms f WHERE f.id = s.formulario_id)
AND NOT EXISTS (
    SELECT 1 FROM mt_form_submissions fs WHERE fs.id = s.id
);

COMMIT;

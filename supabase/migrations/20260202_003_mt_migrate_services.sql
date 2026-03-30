-- =============================================================================
-- MIGRAÇÃO: SERVIÇOS (yeslaser_servicos → mt_services)
-- Data: 2026-02-02
-- =============================================================================

BEGIN;

-- =============================================================================
-- MIGRAR SERVIÇOS YESLASER
-- =============================================================================

INSERT INTO mt_services (
    id,
    tenant_id,
    nome,
    descricao,
    categoria,
    preco,
    preco_promocional,
    duracao_minutos,
    is_active,
    metadata,
    created_at,
    updated_at
)
SELECT
    s.id,
    'ebf87fe2-093a-4fba-bb56-c6835cbc1465'::uuid as tenant_id,
    s.nome,
    s.descricao,
    s.categoria,
    s.preco,
    s.preco_promocional,
    s.duracao_minutos,
    COALESCE(s.ativo, true) as is_active,
    jsonb_build_object(
        'legacy_table', 'yeslaser_servicos',
        'sessoes', s.sessoes,
        'imagem_url', s.imagem_url
    ) as metadata,
    s.created_at,
    s.updated_at
FROM yeslaser_servicos s
WHERE NOT EXISTS (
    SELECT 1 FROM mt_services ms WHERE ms.id = s.id
);

-- Registrar mapeamento
INSERT INTO mt_migration_mapping (entity_type, tenant_slug, old_table, old_id, new_id)
SELECT 'service', 'yeslaser', 'yeslaser_servicos', s.id, s.id
FROM yeslaser_servicos s
WHERE EXISTS (SELECT 1 FROM mt_services ms WHERE ms.id = s.id)
ON CONFLICT (entity_type, old_id) DO NOTHING;

-- =============================================================================
-- MIGRAR SERVIÇOS POPDENTS
-- =============================================================================

INSERT INTO mt_services (
    id,
    tenant_id,
    nome,
    descricao,
    categoria,
    preco,
    preco_promocional,
    duracao_minutos,
    is_active,
    metadata,
    created_at,
    updated_at
)
SELECT
    s.id,
    'c1c6fcb8-7c52-4441-9609-45a3312f1477'::uuid as tenant_id,
    s.nome,
    s.descricao,
    s.categoria,
    s.preco,
    s.preco_promocional,
    s.duracao_minutos,
    COALESCE(s.ativo, true) as is_active,
    jsonb_build_object('legacy_table', 'popdents_servicos') as metadata,
    s.created_at,
    s.updated_at
FROM popdents_servicos s
WHERE NOT EXISTS (
    SELECT 1 FROM mt_services ms WHERE ms.id = s.id
);

-- Registrar mapeamento
INSERT INTO mt_migration_mapping (entity_type, tenant_slug, old_table, old_id, new_id)
SELECT 'service', 'popdents', 'popdents_servicos', s.id, s.id
FROM popdents_servicos s
WHERE EXISTS (SELECT 1 FROM mt_services ms WHERE ms.id = s.id)
ON CONFLICT (entity_type, old_id) DO NOTHING;

COMMIT;

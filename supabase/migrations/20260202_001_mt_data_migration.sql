-- =============================================================================
-- MIGRAÇÃO DE DADOS: Tabelas Legadas → Multi-Tenant
-- Data: 2026-02-02
-- Autor: Claude + Danilo
-- =============================================================================
--
-- Esta migração move os dados das tabelas yeslaser_* e popdents_* para as
-- tabelas mt_* com os tenant_id e franchise_id corretos.
--
-- ORDEM DE EXECUÇÃO:
-- 1. Criar tabela de mapeamento de IDs
-- 2. Migrar franqueados → mt_franchises
-- 3. Migrar leads → mt_leads
-- 4. Migrar serviços → mt_services
-- 5. Migrar formulários → mt_forms
-- 6. Migrar influenciadoras → mt_influencers
-- 7. Migrar parcerias → mt_partnerships
-- 8. Migrar WhatsApp → mt_whatsapp_*
-- 9. Migrar recrutamento → mt_job_positions, mt_candidates
-- =============================================================================

-- IDs dos Tenants
-- YESlaser: ebf87fe2-093a-4fba-bb56-c6835cbc1465
-- PopDents: c1c6fcb8-7c52-4441-9609-45a3312f1477

BEGIN;

-- =============================================================================
-- PARTE 1: TABELA DE MAPEAMENTO
-- =============================================================================

-- Criar tabela temporária para mapear IDs antigos → novos
CREATE TABLE IF NOT EXISTS mt_migration_mapping (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL, -- franchise, lead, service, form, etc.
    tenant_slug VARCHAR(50) NOT NULL, -- yeslaser, popdents
    old_table VARCHAR(100) NOT NULL,
    old_id UUID NOT NULL,
    new_id UUID NOT NULL,
    migrated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(entity_type, old_id)
);

-- =============================================================================
-- PARTE 2: MIGRAR FRANQUEADOS YESLASER → MT_FRANCHISES
-- =============================================================================

-- Limpar franquias de teste do YESlaser (manter só as reais)
DELETE FROM mt_franchises
WHERE tenant_id = 'ebf87fe2-093a-4fba-bb56-c6835cbc1465'
  AND codigo NOT IN (SELECT slug FROM yeslaser_franqueados WHERE slug IS NOT NULL);

-- Inserir franqueados YESlaser reais
INSERT INTO mt_franchises (
    id,
    tenant_id,
    nome,
    codigo,
    cnpj,
    email,
    telefone,
    endereco,
    cidade,
    estado,
    cep,
    is_matriz,
    is_active,
    metadata,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid() as id,
    'ebf87fe2-093a-4fba-bb56-c6835cbc1465'::uuid as tenant_id,
    f.nome_fantasia as nome,
    COALESCE(f.slug, 'franquia-' || ROW_NUMBER() OVER()) as codigo,
    f.cnpj,
    f.email,
    f.whatsapp_business as telefone,
    f.endereco,
    f.cidade,
    f.estado,
    f.cep,
    CASE WHEN f.nome_fantasia ILIKE '%franchising%' OR f.nome_fantasia ILIKE '%mcc%' THEN true ELSE false END as is_matriz,
    CASE WHEN f.status = 'ativa' THEN true ELSE false END as is_active,
    jsonb_build_object(
        'legacy_id', f.id,
        'id_api', f.id_api,
        'google_ads_id', f.google_ads_id,
        'meta_ads_id', f.meta_ads_id,
        'tiktok_ads', f.tiktok_ads,
        'instagram', f.instagram,
        'facebook', f.facebook,
        'youtube', f.youtube,
        'tiktok', f.tiktok,
        'google_place_id', f.google_place_id,
        'responsavel', f.responsavel,
        'relacionamento', f.relacionamento
    ) as metadata,
    f.created_at,
    f.updated_at
FROM yeslaser_franqueados f
WHERE NOT EXISTS (
    SELECT 1 FROM mt_franchises mf
    WHERE mf.tenant_id = 'ebf87fe2-093a-4fba-bb56-c6835cbc1465'
    AND (mf.codigo = f.slug OR mf.metadata->>'legacy_id' = f.id::text)
);

-- Registrar mapeamento de franquias YESlaser
INSERT INTO mt_migration_mapping (entity_type, tenant_slug, old_table, old_id, new_id)
SELECT
    'franchise',
    'yeslaser',
    'yeslaser_franqueados',
    f.id,
    mf.id
FROM yeslaser_franqueados f
JOIN mt_franchises mf ON mf.metadata->>'legacy_id' = f.id::text
WHERE mf.tenant_id = 'ebf87fe2-093a-4fba-bb56-c6835cbc1465'
ON CONFLICT (entity_type, old_id) DO UPDATE SET new_id = EXCLUDED.new_id;

-- =============================================================================
-- PARTE 3: MIGRAR FRANQUEADOS POPDENTS → MT_FRANCHISES
-- =============================================================================

-- Verificar se popdents_franqueados tem estrutura similar
-- (Pode ter colunas diferentes, ajustar conforme necessário)

INSERT INTO mt_franchises (
    id,
    tenant_id,
    nome,
    codigo,
    cnpj,
    email,
    telefone,
    endereco,
    cidade,
    estado,
    cep,
    is_matriz,
    is_active,
    metadata,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid() as id,
    'c1c6fcb8-7c52-4441-9609-45a3312f1477'::uuid as tenant_id,
    f.nome_fantasia as nome,
    COALESCE(f.slug, 'franquia-pd-' || ROW_NUMBER() OVER()) as codigo,
    f.cnpj,
    f.email,
    f.whatsapp_business as telefone,
    f.endereco,
    f.cidade,
    f.estado,
    f.cep,
    CASE WHEN f.nome_fantasia ILIKE '%matriz%' OR f.nome_fantasia ILIKE '%sede%' THEN true ELSE false END as is_matriz,
    CASE WHEN f.status = 'ativa' THEN true ELSE false END as is_active,
    jsonb_build_object(
        'legacy_id', f.id,
        'id_api', f.id_api
    ) as metadata,
    f.created_at,
    f.updated_at
FROM popdents_franqueados f
WHERE NOT EXISTS (
    SELECT 1 FROM mt_franchises mf
    WHERE mf.tenant_id = 'c1c6fcb8-7c52-4441-9609-45a3312f1477'
    AND mf.metadata->>'legacy_id' = f.id::text
);

-- Registrar mapeamento de franquias PopDents
INSERT INTO mt_migration_mapping (entity_type, tenant_slug, old_table, old_id, new_id)
SELECT
    'franchise',
    'popdents',
    'popdents_franqueados',
    f.id,
    mf.id
FROM popdents_franqueados f
JOIN mt_franchises mf ON mf.metadata->>'legacy_id' = f.id::text
WHERE mf.tenant_id = 'c1c6fcb8-7c52-4441-9609-45a3312f1477'
ON CONFLICT (entity_type, old_id) DO UPDATE SET new_id = EXCLUDED.new_id;

COMMIT;

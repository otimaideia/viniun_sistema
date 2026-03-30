-- =============================================================================
-- MIGRAÇÃO: LEADS (sistema_leads_yeslaser → mt_leads)
-- Data: 2026-02-02
-- IMPORTANTE: NÃO deleta dados originais - apenas copia para tabelas MT
-- =============================================================================

BEGIN;

-- =============================================================================
-- MIGRAR LEADS YESLASER
-- =============================================================================

INSERT INTO mt_leads (
    id,
    tenant_id,
    franchise_id,
    codigo,
    nome,
    email,
    telefone,
    telefone_secundario,
    whatsapp,
    cpf,
    rg,
    data_nascimento,
    genero,
    estado_civil,
    cep,
    endereco,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    pais,
    latitude,
    longitude,
    profissao,
    servico_interesse,
    origem,
    campanha,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    gclid,
    fbclid,
    referrer_url,
    landing_page,
    indicado_por_id,
    codigo_indicacao,
    parceria_id,
    status,
    etapa_funil,
    observacoes,
    dados_extras,
    created_at,
    updated_at
)
SELECT
    l.id, -- Manter o mesmo ID para preservar relacionamentos
    'ebf87fe2-093a-4fba-bb56-c6835cbc1465'::uuid as tenant_id,
    -- Buscar franchise_id do mapeamento
    COALESCE(
        (SELECT new_id FROM mt_migration_mapping
         WHERE entity_type = 'franchise'
         AND old_id = l.franqueado_id),
        -- Se não encontrar, usar a primeira franquia do tenant
        (SELECT id FROM mt_franchises
         WHERE tenant_id = 'ebf87fe2-093a-4fba-bb56-c6835cbc1465'
         AND is_matriz = true
         LIMIT 1)
    ) as franchise_id,
    l.id_api as codigo,
    COALESCE(l.nome, '') || COALESCE(' ' || l.sobrenome, '') as nome,
    l.email,
    l.telefone,
    l.telefone_secundario,
    l.whatsapp,
    l.cpf,
    l.rg,
    l.data_nascimento,
    l.genero,
    l.estado_civil,
    l.cep,
    COALESCE(l.endereco, l.rua) as endereco,
    l.numero,
    l.complemento,
    l.bairro,
    l.cidade,
    l.estado,
    COALESCE(l.pais, 'Brasil') as pais,
    l.latitude,
    l.longitude,
    l.profissao,
    l.interesse as servico_interesse,
    l.origem,
    l.campanha,
    l.utm_source,
    l.utm_medium,
    l.utm_campaign,
    l.utm_term,
    l.utm_content,
    l.gclid,
    l.fbclid,
    l.referrer_url,
    l.landing_page,
    l.indicado_por_id,
    l.codigo_indicacao,
    l.parceria_id,
    COALESCE(l.status, 'novo') as status,
    COALESCE(l.fase, l.status_funil) as etapa_funil,
    l.observacoes,
    jsonb_build_object(
        'legacy_table', 'sistema_leads_yeslaser',
        'consentimento', l.consentimento,
        'aceita_contato', l.aceita_contato,
        'aceita_marketing', l.aceita_marketing,
        'id_giga', l.id_giga,
        'unidade', l.unidade,
        'como_conheceu', l.como_conheceu,
        'instagram', l.instagram,
        'facebook', l.facebook,
        'tipo_pele', l.tipo_pele,
        'areas_interesse', l.areas_interesse,
        'preferencia_contato', l.preferencia_contato,
        'melhor_horario_contato', l.melhor_horario_contato,
        'franquias_vinculadas', l.franquias_vinculadas
    ) as dados_extras,
    l.created_at,
    COALESCE(l.updated_at, l.created_at) as updated_at
FROM sistema_leads_yeslaser l
WHERE NOT EXISTS (
    SELECT 1 FROM mt_leads ml WHERE ml.id = l.id
);

-- Registrar mapeamento de leads YESlaser
INSERT INTO mt_migration_mapping (entity_type, tenant_slug, old_table, old_id, new_id)
SELECT
    'lead',
    'yeslaser',
    'sistema_leads_yeslaser',
    l.id,
    l.id -- Mesmo ID pois mantemos o original
FROM sistema_leads_yeslaser l
WHERE EXISTS (SELECT 1 FROM mt_leads ml WHERE ml.id = l.id)
ON CONFLICT (entity_type, old_id) DO NOTHING;

-- =============================================================================
-- MIGRAR LEADS POPDENTS
-- =============================================================================

INSERT INTO mt_leads (
    id,
    tenant_id,
    franchise_id,
    codigo,
    nome,
    email,
    telefone,
    whatsapp,
    cpf,
    data_nascimento,
    genero,
    cep,
    endereco,
    bairro,
    cidade,
    estado,
    servico_interesse,
    origem,
    campanha,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    gclid,
    fbclid,
    referrer_url,
    landing_page,
    status,
    observacoes,
    dados_extras,
    created_at,
    updated_at
)
SELECT
    l.id,
    'c1c6fcb8-7c52-4441-9609-45a3312f1477'::uuid as tenant_id,
    COALESCE(
        (SELECT new_id FROM mt_migration_mapping
         WHERE entity_type = 'franchise'
         AND old_id = l.franqueado_id),
        (SELECT id FROM mt_franchises
         WHERE tenant_id = 'c1c6fcb8-7c52-4441-9609-45a3312f1477'
         AND is_matriz = true
         LIMIT 1)
    ) as franchise_id,
    l.codigo,
    l.nome,
    l.email,
    l.telefone,
    l.whatsapp,
    l.cpf,
    l.data_nascimento,
    l.genero,
    l.cep,
    l.endereco,
    l.bairro,
    l.cidade,
    l.estado,
    l.servico_interesse,
    l.origem,
    l.campanha,
    l.utm_source,
    l.utm_medium,
    l.utm_campaign,
    l.utm_term,
    l.utm_content,
    l.gclid,
    l.fbclid,
    l.referrer_url,
    l.landing_page,
    COALESCE(l.status, 'novo') as status,
    l.observacoes,
    jsonb_build_object(
        'legacy_table', 'popdents_leads'
    ) as dados_extras,
    l.created_at,
    COALESCE(l.updated_at, l.created_at) as updated_at
FROM popdents_leads l
WHERE NOT EXISTS (
    SELECT 1 FROM mt_leads ml WHERE ml.id = l.id
);

-- Registrar mapeamento de leads PopDents
INSERT INTO mt_migration_mapping (entity_type, tenant_slug, old_table, old_id, new_id)
SELECT
    'lead',
    'popdents',
    'popdents_leads',
    l.id,
    l.id
FROM popdents_leads l
WHERE EXISTS (SELECT 1 FROM mt_leads ml WHERE ml.id = l.id)
ON CONFLICT (entity_type, old_id) DO NOTHING;

COMMIT;

-- =============================================================================
-- VALIDAÇÃO
-- =============================================================================
-- Executar após a migração para verificar:
-- SELECT tenant_id, COUNT(*) FROM mt_leads GROUP BY tenant_id;
-- SELECT COUNT(*) FROM sistema_leads_yeslaser;
-- SELECT COUNT(*) FROM popdents_leads;

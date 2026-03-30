-- =============================================================================
-- MIGRAÇÃO: INFLUENCIADORAS (yeslaser_influenciadoras → mt_influencers)
-- Data: 2026-02-02
-- =============================================================================

BEGIN;

-- =============================================================================
-- MIGRAR INFLUENCIADORAS YESLASER
-- =============================================================================

INSERT INTO mt_influencers (
    id,
    tenant_id,
    franchise_id,
    nome,
    email,
    telefone,
    whatsapp,
    cpf,
    instagram,
    tiktok,
    youtube,
    cidade,
    estado,
    codigo_indicacao,
    status,
    tipo_contrato,
    valor_mensal,
    percentual_comissao,
    total_indicacoes,
    total_conversoes,
    total_ganhos,
    metadata,
    created_at,
    updated_at
)
SELECT
    i.id,
    'ebf87fe2-093a-4fba-bb56-c6835cbc1465'::uuid as tenant_id,
    COALESCE(
        (SELECT new_id FROM mt_migration_mapping
         WHERE entity_type = 'franchise' AND old_id = i.franqueado_id),
        NULL
    ) as franchise_id,
    i.nome,
    i.email,
    i.telefone,
    i.whatsapp,
    i.cpf,
    i.instagram,
    i.tiktok,
    i.youtube,
    i.cidade,
    i.estado,
    i.codigo_indicacao,
    COALESCE(i.status, 'ativa') as status,
    i.tipo_contrato,
    i.valor_mensal,
    i.percentual_comissao,
    COALESCE(i.total_indicacoes, 0) as total_indicacoes,
    COALESCE(i.total_conversoes, 0) as total_conversoes,
    COALESCE(i.total_ganhos, 0) as total_ganhos,
    jsonb_build_object(
        'legacy_table', 'yeslaser_influenciadoras',
        'foto_url', i.foto_url,
        'bio', i.bio,
        'observacoes', i.observacoes,
        'data_contrato', i.data_contrato,
        'chave_pix', i.chave_pix,
        'tipo_chave_pix', i.tipo_chave_pix,
        'banco', i.banco,
        'agencia', i.agencia,
        'conta', i.conta
    ) as metadata,
    i.created_at,
    i.updated_at
FROM yeslaser_influenciadoras i
WHERE NOT EXISTS (
    SELECT 1 FROM mt_influencers mi WHERE mi.id = i.id
);

-- Registrar mapeamento
INSERT INTO mt_migration_mapping (entity_type, tenant_slug, old_table, old_id, new_id)
SELECT 'influencer', 'yeslaser', 'yeslaser_influenciadoras', i.id, i.id
FROM yeslaser_influenciadoras i
WHERE EXISTS (SELECT 1 FROM mt_influencers mi WHERE mi.id = i.id)
ON CONFLICT (entity_type, old_id) DO NOTHING;

-- =============================================================================
-- MIGRAR CONTRATOS DE INFLUENCIADORAS
-- =============================================================================

INSERT INTO mt_influencer_contracts (
    id,
    tenant_id,
    influencer_id,
    tipo,
    valor,
    data_inicio,
    data_fim,
    status,
    metadata,
    created_at,
    updated_at
)
SELECT
    c.id,
    'ebf87fe2-093a-4fba-bb56-c6835cbc1465'::uuid as tenant_id,
    c.influenciadora_id as influencer_id,
    c.modalidade as tipo,
    c.valor,
    c.data_inicio,
    c.data_fim,
    COALESCE(c.status, 'ativo') as status,
    jsonb_build_object(
        'legacy_table', 'yeslaser_influenciadora_contratos',
        'descricao', c.descricao,
        'entregas', c.entregas,
        'observacoes', c.observacoes
    ) as metadata,
    c.created_at,
    c.updated_at
FROM yeslaser_influenciadora_contratos c
WHERE EXISTS (SELECT 1 FROM mt_influencers i WHERE i.id = c.influenciadora_id)
AND NOT EXISTS (
    SELECT 1 FROM mt_influencer_contracts ic WHERE ic.id = c.id
);

-- =============================================================================
-- MIGRAR PARCERIAS YESLASER
-- =============================================================================

INSERT INTO mt_partnerships (
    id,
    tenant_id,
    franchise_id,
    nome,
    tipo,
    contato_nome,
    contato_email,
    contato_telefone,
    codigo_parceria,
    comissao_percentual,
    comissao_fixa,
    status,
    total_indicacoes,
    total_conversoes,
    total_receita,
    metadata,
    created_at,
    updated_at
)
SELECT
    p.id,
    'ebf87fe2-093a-4fba-bb56-c6835cbc1465'::uuid as tenant_id,
    COALESCE(
        (SELECT new_id FROM mt_migration_mapping
         WHERE entity_type = 'franchise' AND old_id = p.franqueado_id),
        NULL
    ) as franchise_id,
    p.nome,
    COALESCE(p.tipo, 'empresa') as tipo,
    p.contato_nome,
    p.contato_email,
    p.contato_telefone,
    p.codigo_parceria,
    p.comissao_percentual,
    p.comissao_fixa,
    COALESCE(p.status, 'ativa') as status,
    COALESCE(p.total_indicacoes, 0) as total_indicacoes,
    COALESCE(p.total_conversoes, 0) as total_conversoes,
    COALESCE(p.total_receita, 0) as total_receita,
    jsonb_build_object(
        'legacy_table', 'yeslaser_parcerias',
        'endereco', p.endereco,
        'cidade', p.cidade,
        'estado', p.estado,
        'cnpj', p.cnpj,
        'observacoes', p.observacoes,
        'logo_url', p.logo_url
    ) as metadata,
    p.created_at,
    p.updated_at
FROM yeslaser_parcerias p
WHERE NOT EXISTS (
    SELECT 1 FROM mt_partnerships mp WHERE mp.id = p.id
);

-- Registrar mapeamento
INSERT INTO mt_migration_mapping (entity_type, tenant_slug, old_table, old_id, new_id)
SELECT 'partnership', 'yeslaser', 'yeslaser_parcerias', p.id, p.id
FROM yeslaser_parcerias p
WHERE EXISTS (SELECT 1 FROM mt_partnerships mp WHERE mp.id = p.id)
ON CONFLICT (entity_type, old_id) DO NOTHING;

COMMIT;

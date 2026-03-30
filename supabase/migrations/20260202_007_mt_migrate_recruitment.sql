-- =============================================================================
-- MIGRAÇÃO: RECRUTAMENTO (yeslaser_vagas → mt_job_positions)
-- Data: 2026-02-02
-- =============================================================================

BEGIN;

-- =============================================================================
-- MIGRAR VAGAS YESLASER
-- =============================================================================

INSERT INTO mt_job_positions (
    id,
    tenant_id,
    franchise_id,
    titulo,
    descricao,
    requisitos,
    beneficios,
    salario_min,
    salario_max,
    tipo_contrato,
    modalidade,
    carga_horaria,
    cidade,
    estado,
    status,
    vagas_disponiveis,
    data_limite,
    metadata,
    created_at,
    updated_at
)
SELECT
    v.id,
    'ebf87fe2-093a-4fba-bb56-c6835cbc1465'::uuid as tenant_id,
    COALESCE(
        (SELECT new_id FROM mt_migration_mapping
         WHERE entity_type = 'franchise' AND old_id = v.franqueado_id),
        NULL
    ) as franchise_id,
    v.titulo,
    v.descricao,
    v.requisitos,
    v.beneficios,
    v.salario_min,
    v.salario_max,
    v.tipo_contrato,
    v.modalidade,
    v.carga_horaria,
    v.cidade,
    v.estado,
    COALESCE(v.status, 'aberta') as status,
    COALESCE(v.vagas_disponiveis, 1) as vagas_disponiveis,
    v.data_limite,
    jsonb_build_object(
        'legacy_table', 'yeslaser_vagas',
        'setor', v.setor,
        'nivel', v.nivel,
        'areas_atuacao', v.areas_atuacao
    ) as metadata,
    v.created_at,
    v.updated_at
FROM yeslaser_vagas v
WHERE NOT EXISTS (
    SELECT 1 FROM mt_job_positions jp WHERE jp.id = v.id
);

-- Registrar mapeamento
INSERT INTO mt_migration_mapping (entity_type, tenant_slug, old_table, old_id, new_id)
SELECT 'job_position', 'yeslaser', 'yeslaser_vagas', v.id, v.id
FROM yeslaser_vagas v
WHERE EXISTS (SELECT 1 FROM mt_job_positions jp WHERE jp.id = v.id)
ON CONFLICT (entity_type, old_id) DO NOTHING;

-- =============================================================================
-- MIGRAR CANDIDATOS YESLASER
-- =============================================================================

INSERT INTO mt_candidates (
    id,
    tenant_id,
    franchise_id,
    job_position_id,
    nome,
    email,
    telefone,
    cpf,
    data_nascimento,
    cidade,
    estado,
    linkedin,
    curriculo_url,
    carta_apresentacao,
    pretensao_salarial,
    disponibilidade,
    status,
    score,
    metadata,
    created_at,
    updated_at
)
SELECT
    c.id,
    'ebf87fe2-093a-4fba-bb56-c6835cbc1465'::uuid as tenant_id,
    (SELECT franchise_id FROM mt_job_positions WHERE id = c.vaga_id) as franchise_id,
    c.vaga_id as job_position_id,
    c.nome,
    c.email,
    c.telefone,
    c.cpf,
    c.data_nascimento,
    c.cidade,
    c.estado,
    c.linkedin,
    c.curriculo_url,
    c.carta_apresentacao,
    c.pretensao_salarial,
    c.disponibilidade,
    COALESCE(c.status, 'novo') as status,
    c.score,
    jsonb_build_object(
        'legacy_table', 'yeslaser_candidatos',
        'formacao', c.formacao,
        'experiencia', c.experiencia,
        'habilidades', c.habilidades,
        'idiomas', c.idiomas,
        'observacoes', c.observacoes
    ) as metadata,
    c.created_at,
    c.updated_at
FROM yeslaser_candidatos c
WHERE EXISTS (SELECT 1 FROM mt_job_positions jp WHERE jp.id = c.vaga_id)
AND NOT EXISTS (
    SELECT 1 FROM mt_candidates mc WHERE mc.id = c.id
);

-- =============================================================================
-- MIGRAR ENTREVISTAS YESLASER
-- =============================================================================

INSERT INTO mt_interviews (
    id,
    tenant_id,
    candidate_id,
    job_position_id,
    entrevistador_id,
    data_hora,
    tipo,
    local,
    link_video,
    status,
    feedback,
    nota,
    metadata,
    created_at,
    updated_at
)
SELECT
    e.id,
    'ebf87fe2-093a-4fba-bb56-c6835cbc1465'::uuid as tenant_id,
    e.candidato_id as candidate_id,
    (SELECT job_position_id FROM mt_candidates WHERE id = e.candidato_id) as job_position_id,
    e.entrevistador_id,
    e.data_hora,
    COALESCE(e.tipo, 'presencial') as tipo,
    e.local,
    e.link_video,
    COALESCE(e.status, 'agendada') as status,
    e.feedback,
    e.nota,
    jsonb_build_object(
        'legacy_table', 'yeslaser_entrevistas',
        'observacoes', e.observacoes
    ) as metadata,
    e.created_at,
    e.updated_at
FROM yeslaser_entrevistas e
WHERE EXISTS (SELECT 1 FROM mt_candidates c WHERE c.id = e.candidato_id)
AND NOT EXISTS (
    SELECT 1 FROM mt_interviews mi WHERE mi.id = e.id
);

COMMIT;

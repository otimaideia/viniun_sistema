-- =============================================================================
-- MULTI-TENANT MIGRATION: Seed Data
-- Data: 01/02/2026
-- Descrição: Dados iniciais - 9 Tenants com branding e módulos
-- =============================================================================

-- =============================================================================
-- INSERIR 9 TENANTS
-- =============================================================================

INSERT INTO mt_tenants (
    slug,
    nome_fantasia,
    razao_social,
    cnpj,
    cidade,
    estado,
    email,
    telefone,
    whatsapp,
    status,
    plano,
    max_franquias,
    max_usuarios,
    data_ativacao
) VALUES
-- 1. YESlaser (Principal - 37 franquias)
(
    'yeslaser',
    'YESlaser',
    'YESlaser Franchising Ltda',
    '12.345.678/0001-90',
    'São Paulo',
    'SP',
    'contato@yeslaser.com.br',
    '+5511999999901',
    '+5511999999901',
    'ativo',
    'enterprise',
    50,
    500,
    '2024-01-01'
),
-- 2. PopDents (25 franquias)
(
    'popdents',
    'PopDents',
    'PopDents Odontologia Ltda',
    '23.456.789/0001-01',
    'Rio de Janeiro',
    'RJ',
    'contato@popdents.com.br',
    '+5521999999902',
    '+5521999999902',
    'ativo',
    'enterprise',
    40,
    400,
    '2024-02-01'
),
-- 3. NovaLaser (15 franquias)
(
    'novalaser',
    'NovaLaser',
    'NovaLaser Estética Ltda',
    '34.567.890/0001-12',
    'Belo Horizonte',
    'MG',
    'contato@novalaser.com.br',
    '+5531999999903',
    '+5531999999903',
    'ativo',
    'professional',
    25,
    250,
    '2024-03-01'
),
-- 4. IntimaCenter (18 franquias)
(
    'intimacenter',
    'IntimaCenter',
    'IntimaCenter Saúde Ltda',
    '45.678.901/0001-23',
    'Curitiba',
    'PR',
    'contato@intimacenter.com.br',
    '+5541999999904',
    '+5541999999904',
    'ativo',
    'professional',
    30,
    300,
    '2024-04-01'
),
-- 5. OralRecife (12 franquias)
(
    'oralrecife',
    'OralRecife',
    'OralRecife Odontologia Ltda',
    '56.789.012/0001-34',
    'Recife',
    'PE',
    'contato@oralrecife.com.br',
    '+5581999999905',
    '+5581999999905',
    'ativo',
    'professional',
    20,
    200,
    '2024-05-01'
),
-- 6. M1 Company (8 franquias)
(
    'm1company',
    'M1 Company',
    'M1 Company Marketing Ltda',
    '67.890.123/0001-45',
    'Porto Alegre',
    'RS',
    'contato@m1company.com.br',
    '+5551999999906',
    '+5551999999906',
    'ativo',
    'starter',
    15,
    150,
    '2024-06-01'
),
-- 7. Amor Implantes (10 franquias)
(
    'amorimplantes',
    'Amor Implantes',
    'Amor Implantes Odontologia Ltda',
    '78.901.234/0001-56',
    'Fortaleza',
    'CE',
    'contato@amorimplantes.com.br',
    '+5585999999907',
    '+5585999999907',
    'ativo',
    'professional',
    20,
    200,
    '2024-07-01'
),
-- 8. Confia Crédito (5 franquias)
(
    'confiacredito',
    'Confia Crédito',
    'Confia Crédito Financeira Ltda',
    '89.012.345/0001-67',
    'Brasília',
    'DF',
    'contato@confiacredito.com.br',
    '+5561999999908',
    '+5561999999908',
    'ativo',
    'starter',
    10,
    100,
    '2024-08-01'
),
-- 9. Franqueadora (Ótima Ideia - plataforma principal)
(
    'franqueadora',
    'Sistema Ótima Ideia',
    'Ótima Ideia Comunicação e Marketing Ltda',
    '90.123.456/0001-78',
    'São Paulo',
    'SP',
    'contato@franqueadora.com.br',
    '+5511999999909',
    '+5511999999909',
    'ativo',
    'enterprise',
    100,
    1000,
    '2024-01-01'
)
ON CONFLICT (cnpj) DO UPDATE SET
    nome_fantasia = EXCLUDED.nome_fantasia,
    status = EXCLUDED.status,
    updated_at = NOW();

-- =============================================================================
-- INSERIR BRANDING PARA CADA TENANT
-- =============================================================================

-- Função auxiliar para inserir branding
CREATE OR REPLACE FUNCTION insert_tenant_branding(
    p_slug TEXT,
    p_cor_primaria TEXT,
    p_cor_secundaria TEXT,
    p_logo_url TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT id INTO v_tenant_id FROM mt_tenants WHERE slug = p_slug;

    IF v_tenant_id IS NOT NULL THEN
        INSERT INTO mt_tenant_branding (
            tenant_id,
            logo_url,
            cor_primaria,
            cor_primaria_hover,
            cor_secundaria,
            cor_secundaria_hover,
            texto_login_titulo,
            texto_boas_vindas
        ) VALUES (
            v_tenant_id,
            p_logo_url,
            p_cor_primaria,
            p_cor_primaria,
            p_cor_secundaria,
            p_cor_secundaria,
            'Bem-vindo ao ' || (SELECT nome_fantasia FROM mt_tenants WHERE id = v_tenant_id),
            'Gerencie seu negócio de forma inteligente'
        )
        ON CONFLICT (tenant_id) DO UPDATE SET
            cor_primaria = EXCLUDED.cor_primaria,
            cor_secundaria = EXCLUDED.cor_secundaria,
            updated_at = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Aplicar branding para cada tenant
SELECT insert_tenant_branding('yeslaser', '#E91E63', '#9C27B0', 'https://yeslaser.com.br/logo.png');
SELECT insert_tenant_branding('popdents', '#2196F3', '#00BCD4', 'https://popdents.com.br/logo.png');
SELECT insert_tenant_branding('novalaser', '#4CAF50', '#8BC34A', NULL);
SELECT insert_tenant_branding('intimacenter', '#FF9800', '#FF5722', NULL);
SELECT insert_tenant_branding('oralrecife', '#3F51B5', '#673AB7', NULL);
SELECT insert_tenant_branding('m1company', '#607D8B', '#9E9E9E', NULL);
SELECT insert_tenant_branding('amorimplantes', '#E91E63', '#F44336', NULL);
SELECT insert_tenant_branding('confiacredito', '#009688', '#00BCD4', NULL);
SELECT insert_tenant_branding('franqueadora', '#1976D2', '#0D47A1', NULL);

-- Remover função auxiliar
DROP FUNCTION insert_tenant_branding;

-- =============================================================================
-- LIBERAR MÓDULOS PARA CADA TENANT
-- =============================================================================

-- Função para liberar módulos CORE para um tenant
CREATE OR REPLACE FUNCTION liberar_modulos_core(p_tenant_slug TEXT)
RETURNS VOID AS $$
DECLARE
    v_tenant_id UUID;
    v_module_id UUID;
BEGIN
    SELECT id INTO v_tenant_id FROM mt_tenants WHERE slug = p_tenant_slug;

    IF v_tenant_id IS NOT NULL THEN
        -- Liberar todos os módulos CORE
        FOR v_module_id IN
            SELECT id FROM mt_modules WHERE is_core = true
        LOOP
            INSERT INTO mt_tenant_modules (tenant_id, module_id, is_active)
            VALUES (v_tenant_id, v_module_id, true)
            ON CONFLICT (tenant_id, module_id) DO NOTHING;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Função para liberar módulos adicionais
CREATE OR REPLACE FUNCTION liberar_modulo(p_tenant_slug TEXT, p_module_codigo TEXT)
RETURNS VOID AS $$
DECLARE
    v_tenant_id UUID;
    v_module_id UUID;
BEGIN
    SELECT id INTO v_tenant_id FROM mt_tenants WHERE slug = p_tenant_slug;
    SELECT id INTO v_module_id FROM mt_modules WHERE codigo = p_module_codigo;

    IF v_tenant_id IS NOT NULL AND v_module_id IS NOT NULL THEN
        INSERT INTO mt_tenant_modules (tenant_id, module_id, is_active)
        VALUES (v_tenant_id, v_module_id, true)
        ON CONFLICT (tenant_id, module_id) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Liberar módulos CORE para todos os tenants
SELECT liberar_modulos_core('yeslaser');
SELECT liberar_modulos_core('popdents');
SELECT liberar_modulos_core('novalaser');
SELECT liberar_modulos_core('intimacenter');
SELECT liberar_modulos_core('oralrecife');
SELECT liberar_modulos_core('m1company');
SELECT liberar_modulos_core('amorimplantes');
SELECT liberar_modulos_core('confiacredito');
SELECT liberar_modulos_core('franqueadora');

-- Liberar módulos adicionais para YESlaser (todos)
SELECT liberar_modulo('yeslaser', 'funil');
SELECT liberar_modulo('yeslaser', 'whatsapp');
SELECT liberar_modulo('yeslaser', 'formularios');
SELECT liberar_modulo('yeslaser', 'influenciadoras');
SELECT liberar_modulo('yeslaser', 'parcerias');
SELECT liberar_modulo('yeslaser', 'campanhas');
SELECT liberar_modulo('yeslaser', 'recrutamento');
SELECT liberar_modulo('yeslaser', 'metas');
SELECT liberar_modulo('yeslaser', 'servicos');
SELECT liberar_modulo('yeslaser', 'integracoes');

-- Liberar módulos adicionais para PopDents
SELECT liberar_modulo('popdents', 'funil');
SELECT liberar_modulo('popdents', 'whatsapp');
SELECT liberar_modulo('popdents', 'formularios');
SELECT liberar_modulo('popdents', 'campanhas');
SELECT liberar_modulo('popdents', 'metas');
SELECT liberar_modulo('popdents', 'servicos');

-- Liberar módulos adicionais para demais tenants
SELECT liberar_modulo('novalaser', 'funil');
SELECT liberar_modulo('novalaser', 'whatsapp');
SELECT liberar_modulo('novalaser', 'servicos');

SELECT liberar_modulo('intimacenter', 'funil');
SELECT liberar_modulo('intimacenter', 'whatsapp');
SELECT liberar_modulo('intimacenter', 'servicos');

SELECT liberar_modulo('oralrecife', 'funil');
SELECT liberar_modulo('oralrecife', 'whatsapp');
SELECT liberar_modulo('oralrecife', 'servicos');

SELECT liberar_modulo('m1company', 'funil');
SELECT liberar_modulo('m1company', 'whatsapp');
SELECT liberar_modulo('m1company', 'campanhas');
SELECT liberar_modulo('m1company', 'influenciadoras');

SELECT liberar_modulo('amorimplantes', 'funil');
SELECT liberar_modulo('amorimplantes', 'whatsapp');
SELECT liberar_modulo('amorimplantes', 'servicos');

SELECT liberar_modulo('confiacredito', 'funil');
SELECT liberar_modulo('confiacredito', 'whatsapp');

-- Franqueadora tem acesso total
SELECT liberar_modulo('franqueadora', 'funil');
SELECT liberar_modulo('franqueadora', 'whatsapp');
SELECT liberar_modulo('franqueadora', 'formularios');
SELECT liberar_modulo('franqueadora', 'influenciadoras');
SELECT liberar_modulo('franqueadora', 'parcerias');
SELECT liberar_modulo('franqueadora', 'campanhas');
SELECT liberar_modulo('franqueadora', 'recrutamento');
SELECT liberar_modulo('franqueadora', 'metas');
SELECT liberar_modulo('franqueadora', 'servicos');
SELECT liberar_modulo('franqueadora', 'integracoes');

-- Limpar funções auxiliares
DROP FUNCTION liberar_modulos_core;
DROP FUNCTION liberar_modulo;

-- =============================================================================
-- INSERIR FRANQUIAS DE EXEMPLO (Apenas 2-3 por tenant)
-- =============================================================================

-- YESlaser - 3 franquias de exemplo
INSERT INTO mt_franchises (tenant_id, codigo, nome, cidade, estado, telefone, whatsapp, status)
SELECT
    t.id,
    'YL001',
    'YESlaser Paulista',
    'São Paulo',
    'SP',
    '+5511999990001',
    '+5511999990001',
    'ativo'
FROM mt_tenants t WHERE t.slug = 'yeslaser'
ON CONFLICT DO NOTHING;

INSERT INTO mt_franchises (tenant_id, codigo, nome, cidade, estado, telefone, whatsapp, status)
SELECT
    t.id,
    'YL002',
    'YESlaser Moema',
    'São Paulo',
    'SP',
    '+5511999990002',
    '+5511999990002',
    'ativo'
FROM mt_tenants t WHERE t.slug = 'yeslaser'
ON CONFLICT DO NOTHING;

INSERT INTO mt_franchises (tenant_id, codigo, nome, cidade, estado, telefone, whatsapp, status)
SELECT
    t.id,
    'YL003',
    'YESlaser Campinas',
    'Campinas',
    'SP',
    '+5519999990003',
    '+5519999990003',
    'ativo'
FROM mt_tenants t WHERE t.slug = 'yeslaser'
ON CONFLICT DO NOTHING;

-- PopDents - 2 franquias de exemplo
INSERT INTO mt_franchises (tenant_id, codigo, nome, cidade, estado, telefone, whatsapp, status)
SELECT
    t.id,
    'PD001',
    'PopDents Copacabana',
    'Rio de Janeiro',
    'RJ',
    '+5521999990001',
    '+5521999990001',
    'ativo'
FROM mt_tenants t WHERE t.slug = 'popdents'
ON CONFLICT DO NOTHING;

INSERT INTO mt_franchises (tenant_id, codigo, nome, cidade, estado, telefone, whatsapp, status)
SELECT
    t.id,
    'PD002',
    'PopDents Barra',
    'Rio de Janeiro',
    'RJ',
    '+5521999990002',
    '+5521999990002',
    'ativo'
FROM mt_tenants t WHERE t.slug = 'popdents'
ON CONFLICT DO NOTHING;

-- NovaLaser - 1 franquia de exemplo
INSERT INTO mt_franchises (tenant_id, codigo, nome, cidade, estado, telefone, whatsapp, status)
SELECT
    t.id,
    'NL001',
    'NovaLaser Savassi',
    'Belo Horizonte',
    'MG',
    '+5531999990001',
    '+5531999990001',
    'ativo'
FROM mt_tenants t WHERE t.slug = 'novalaser'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- INSERIR USUÁRIO PLATFORM ADMIN
-- =============================================================================

INSERT INTO mt_users (
    email,
    nome,
    access_level,
    status,
    notificacoes_email,
    notificacoes_push
) VALUES (
    'admin@plataforma.com.br',
    'Administrador da Plataforma',
    'platform_admin',
    'ativo',
    true,
    true
)
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- INSERIR USUÁRIOS TENANT ADMIN PARA CADA EMPRESA
-- =============================================================================

-- Função auxiliar para criar tenant admin
CREATE OR REPLACE FUNCTION criar_tenant_admin(
    p_tenant_slug TEXT,
    p_email TEXT,
    p_nome TEXT
) RETURNS VOID AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT id INTO v_tenant_id FROM mt_tenants WHERE slug = p_tenant_slug;

    IF v_tenant_id IS NOT NULL THEN
        INSERT INTO mt_users (
            tenant_id,
            email,
            nome,
            access_level,
            status
        ) VALUES (
            v_tenant_id,
            p_email,
            p_nome,
            'tenant_admin',
            'ativo'
        )
        ON CONFLICT (email) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Criar admins para cada tenant
SELECT criar_tenant_admin('yeslaser', 'admin@yeslaser.com.br', 'Admin YESlaser');
SELECT criar_tenant_admin('popdents', 'admin@popdents.com.br', 'Admin PopDents');
SELECT criar_tenant_admin('novalaser', 'admin@novalaser.com.br', 'Admin NovaLaser');
SELECT criar_tenant_admin('intimacenter', 'admin@intimacenter.com.br', 'Admin IntimaCenter');
SELECT criar_tenant_admin('oralrecife', 'admin@oralrecife.com.br', 'Admin OralRecife');
SELECT criar_tenant_admin('m1company', 'admin@m1company.com.br', 'Admin M1 Company');
SELECT criar_tenant_admin('amorimplantes', 'admin@amorimplantes.com.br', 'Admin Amor Implantes');
SELECT criar_tenant_admin('confiacredito', 'admin@confiacredito.com.br', 'Admin Confia Crédito');
SELECT criar_tenant_admin('franqueadora', 'admin@franqueadora.com.br', 'Admin Franqueadora');

DROP FUNCTION criar_tenant_admin;

-- =============================================================================
-- INSERIR INTEGRAÇÕES DE EXEMPLO (WhatsApp para YESlaser)
-- =============================================================================

INSERT INTO mt_tenant_integrations (
    tenant_id,
    integration_type_id,
    nome,
    descricao,
    credentials,
    is_active,
    status
)
SELECT
    t.id,
    it.id,
    'WhatsApp Business YESlaser',
    'Integração WhatsApp via WAHA',
    '{"waha_url": "https://waha.yeslaser.com.br", "api_key": "encrypted_key"}',
    true,
    'connected'
FROM mt_tenants t, mt_integration_types it
WHERE t.slug = 'yeslaser' AND it.codigo = 'whatsapp'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- INSERIR TEMPLATES DE WHATSAPP PADRÃO
-- =============================================================================

INSERT INTO mt_whatsapp_templates (tenant_id, nome, categoria, conteudo, variaveis, is_active)
SELECT
    t.id,
    'Boas-vindas',
    'saudacao',
    'Olá {nome}! 👋 Seja bem-vindo(a) à {empresa}! Como posso ajudar você hoje?',
    ARRAY['nome', 'empresa'],
    true
FROM mt_tenants t WHERE t.slug = 'yeslaser'
ON CONFLICT DO NOTHING;

INSERT INTO mt_whatsapp_templates (tenant_id, nome, categoria, conteudo, variaveis, is_active)
SELECT
    t.id,
    'Confirmação de Agendamento',
    'confirmacao',
    'Olá {nome}! ✅ Seu agendamento está confirmado para {data} às {hora} na unidade {unidade}. Até lá!',
    ARRAY['nome', 'data', 'hora', 'unidade'],
    true
FROM mt_tenants t WHERE t.slug = 'yeslaser'
ON CONFLICT DO NOTHING;

INSERT INTO mt_whatsapp_templates (tenant_id, nome, categoria, conteudo, variaveis, is_active)
SELECT
    t.id,
    'Lembrete 24h',
    'lembrete',
    'Oi {nome}! 📅 Lembrete: amanhã você tem um agendamento às {hora} na {unidade}. Confirma sua presença? Responda SIM ou NÃO.',
    ARRAY['nome', 'hora', 'unidade'],
    true
FROM mt_tenants t WHERE t.slug = 'yeslaser'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- ESTATÍSTICAS FINAIS
-- =============================================================================

DO $$
DECLARE
    v_tenants INTEGER;
    v_franchises INTEGER;
    v_users INTEGER;
    v_modules INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_tenants FROM mt_tenants;
    SELECT COUNT(*) INTO v_franchises FROM mt_franchises;
    SELECT COUNT(*) INTO v_users FROM mt_users;
    SELECT COUNT(*) INTO v_modules FROM mt_modules;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'SEED DATA COMPLETO';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tenants criados: %', v_tenants;
    RAISE NOTICE 'Franquias criadas: %', v_franchises;
    RAISE NOTICE 'Usuários criados: %', v_users;
    RAISE NOTICE 'Módulos disponíveis: %', v_modules;
    RAISE NOTICE '========================================';
END $$;

-- =============================================================================
-- FIM DA MIGRATION 012
-- =============================================================================

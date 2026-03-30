-- =====================================================
-- Migration: Criar Módulo de Parcerias Empresariais
-- Data: 2025-01-29
-- Descrição: Sistema completo de gestão de parcerias com
--            código de indicação, benefícios e tracking
-- =====================================================

-- =====================================================
-- 1. TABELA PRINCIPAL: yeslaser_parcerias
-- =====================================================

CREATE TABLE IF NOT EXISTS yeslaser_parcerias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Dados da Empresa
  razao_social varchar(255) NOT NULL,
  nome_fantasia varchar(255) NOT NULL,
  cnpj varchar(18) UNIQUE,
  inscricao_estadual varchar(20),

  -- Ramo de Atividade
  ramo_atividade varchar(100) NOT NULL,
  segmento varchar(100),
  porte varchar(20) CHECK (porte IN ('MEI', 'ME', 'EPP', 'Médio', 'Grande')),

  -- Endereço
  cep varchar(9),
  endereco varchar(255),
  numero varchar(20),
  complemento varchar(100),
  bairro varchar(100),
  cidade varchar(100),
  estado varchar(2),

  -- Responsável/Contato Principal
  responsavel_nome varchar(255) NOT NULL,
  responsavel_cargo varchar(100),
  responsavel_email varchar(255),
  responsavel_telefone varchar(20),
  responsavel_whatsapp varchar(20),

  -- Código de Indicação (gerado automaticamente via trigger)
  codigo_indicacao varchar(10) UNIQUE,
  quantidade_indicacoes integer DEFAULT 0,

  -- Branding
  logo_url text,
  logo_path text,
  descricao_curta varchar(500),
  descricao_completa text,

  -- Links e Redes Sociais
  website varchar(255),
  instagram varchar(100),
  facebook varchar(255),
  linkedin varchar(255),
  outras_redes jsonb DEFAULT '[]'::jsonb,

  -- Vinculação (híbrido: global ou por franqueado)
  franqueado_id uuid REFERENCES yeslaser_franqueados(id) ON DELETE SET NULL,
  unidade_id uuid REFERENCES yeslaser_unidades(id) ON DELETE SET NULL,

  -- Status e Controle
  status varchar(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'pendente', 'suspenso')),
  data_inicio_parceria date,
  data_fim_parceria date,
  observacoes text,

  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

-- Comentários da tabela
COMMENT ON TABLE yeslaser_parcerias IS 'Cadastro de empresas parceiras com código de indicação';
COMMENT ON COLUMN yeslaser_parcerias.codigo_indicacao IS 'Código único de 6-8 caracteres gerado automaticamente';
COMMENT ON COLUMN yeslaser_parcerias.quantidade_indicacoes IS 'Contador atualizado via trigger ao inserir/deletar indicações';
COMMENT ON COLUMN yeslaser_parcerias.outras_redes IS 'JSON array com redes sociais adicionais [{tipo, url}]';

-- Índices
CREATE INDEX IF NOT EXISTS idx_parcerias_codigo ON yeslaser_parcerias(codigo_indicacao);
CREATE INDEX IF NOT EXISTS idx_parcerias_cnpj ON yeslaser_parcerias(cnpj);
CREATE INDEX IF NOT EXISTS idx_parcerias_franqueado ON yeslaser_parcerias(franqueado_id);
CREATE INDEX IF NOT EXISTS idx_parcerias_status ON yeslaser_parcerias(status);
CREATE INDEX IF NOT EXISTS idx_parcerias_ramo ON yeslaser_parcerias(ramo_atividade);
CREATE INDEX IF NOT EXISTS idx_parcerias_cidade_estado ON yeslaser_parcerias(cidade, estado);


-- =====================================================
-- 2. TABELA DE BENEFÍCIOS: yeslaser_parceria_beneficios
-- =====================================================

CREATE TABLE IF NOT EXISTS yeslaser_parceria_beneficios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parceria_id uuid NOT NULL REFERENCES yeslaser_parcerias(id) ON DELETE CASCADE,

  -- Dados do Benefício
  titulo varchar(100) NOT NULL,
  descricao text,
  tipo varchar(50) NOT NULL CHECK (tipo IN (
    'desconto_percentual',
    'desconto_valor',
    'sessoes_gratis',
    'procedimento_gratis',
    'brinde',
    'pacote_especial',
    'avaliacao_gratis',
    'outro'
  )),
  valor varchar(100), -- Ex: "10%", "R$ 50", "10 sessões", "1 procedimento"

  -- Aplicabilidade
  servicos_aplicaveis text[], -- IDs ou nomes dos serviços onde se aplica
  areas_corporais text[], -- Áreas do corpo (se aplicável a laser)

  -- Validade
  validade_inicio date,
  validade_fim date,
  ativo boolean DEFAULT true,

  -- Controle de exibição
  ordem integer DEFAULT 0, -- Para ordenar na exibição
  destaque boolean DEFAULT false, -- Benefício principal/destaque

  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE yeslaser_parceria_beneficios IS 'Benefícios/descontos oferecidos por cada parceria';
COMMENT ON COLUMN yeslaser_parceria_beneficios.tipo IS 'Tipo do benefício: desconto_percentual, desconto_valor, sessoes_gratis, procedimento_gratis, brinde, pacote_especial, avaliacao_gratis, outro';
COMMENT ON COLUMN yeslaser_parceria_beneficios.valor IS 'Valor descritivo do benefício (ex: 10%, R$ 50, 10 sessões)';
COMMENT ON COLUMN yeslaser_parceria_beneficios.destaque IS 'Se é o benefício principal a ser exibido';

CREATE INDEX IF NOT EXISTS idx_parceria_beneficios_parceria ON yeslaser_parceria_beneficios(parceria_id);
CREATE INDEX IF NOT EXISTS idx_parceria_beneficios_ativo ON yeslaser_parceria_beneficios(ativo);
CREATE INDEX IF NOT EXISTS idx_parceria_beneficios_tipo ON yeslaser_parceria_beneficios(tipo);


-- =====================================================
-- 3. TABELA DE INDICAÇÕES: yeslaser_parceria_indicacoes
-- =====================================================

CREATE TABLE IF NOT EXISTS yeslaser_parceria_indicacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parceria_id uuid NOT NULL REFERENCES yeslaser_parcerias(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES sistema_leads_yeslaser(id) ON DELETE SET NULL,

  -- Tracking
  codigo_usado varchar(10),
  landing_page varchar(255),
  campanha varchar(255),

  -- UTM Parameters
  utm_source varchar(100),
  utm_medium varchar(100),
  utm_campaign varchar(255),
  utm_content varchar(255),
  utm_term varchar(255),

  -- Status de Conversão
  status varchar(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'convertido', 'perdido', 'cancelado')),
  data_indicacao timestamp with time zone DEFAULT now(),
  data_conversao timestamp with time zone,

  -- Financeiro (comissão parceria - se aplicável)
  valor_comissao decimal(10,2),
  comissao_paga boolean DEFAULT false,
  data_pagamento_comissao date,

  -- Observações
  observacoes text,

  -- Timestamps
  created_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE yeslaser_parceria_indicacoes IS 'Registro de leads indicados por parcerias';
COMMENT ON COLUMN yeslaser_parceria_indicacoes.status IS 'Status da indicação: pendente, convertido, perdido, cancelado';
COMMENT ON COLUMN yeslaser_parceria_indicacoes.codigo_usado IS 'Código de indicação usado pelo lead';

CREATE INDEX IF NOT EXISTS idx_parceria_indicacoes_parceria ON yeslaser_parceria_indicacoes(parceria_id);
CREATE INDEX IF NOT EXISTS idx_parceria_indicacoes_lead ON yeslaser_parceria_indicacoes(lead_id);
CREATE INDEX IF NOT EXISTS idx_parceria_indicacoes_status ON yeslaser_parceria_indicacoes(status);
CREATE INDEX IF NOT EXISTS idx_parceria_indicacoes_data ON yeslaser_parceria_indicacoes(data_indicacao);


-- =====================================================
-- 4. TABELA DE CONTATOS: yeslaser_parceria_contatos
-- =====================================================

CREATE TABLE IF NOT EXISTS yeslaser_parceria_contatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parceria_id uuid NOT NULL REFERENCES yeslaser_parcerias(id) ON DELETE CASCADE,

  nome varchar(255) NOT NULL,
  cargo varchar(100),
  email varchar(255),
  telefone varchar(20),
  whatsapp varchar(20),
  is_principal boolean DEFAULT false,
  observacoes text,

  created_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE yeslaser_parceria_contatos IS 'Contatos adicionais de cada parceria';

CREATE INDEX IF NOT EXISTS idx_parceria_contatos_parceria ON yeslaser_parceria_contatos(parceria_id);


-- =====================================================
-- 5. FUNÇÃO: Gerar código de indicação
-- =====================================================

CREATE OR REPLACE FUNCTION gerar_codigo_parceria()
RETURNS TRIGGER AS $$
DECLARE
  novo_codigo varchar(10);
  tentativas integer := 0;
BEGIN
  -- Só gera código se não foi fornecido
  IF NEW.codigo_indicacao IS NULL OR NEW.codigo_indicacao = '' THEN
    LOOP
      -- Gera código de 6 caracteres alfanuméricos (maiúsculos)
      novo_codigo := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT || tentativas::TEXT) FROM 1 FOR 6));

      -- Verifica unicidade
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM yeslaser_parcerias WHERE codigo_indicacao = novo_codigo
      );

      tentativas := tentativas + 1;

      -- Após 100 tentativas, usa 8 caracteres para evitar colisões
      IF tentativas > 100 THEN
        novo_codigo := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT || tentativas::TEXT) FROM 1 FOR 8));
        EXIT;
      END IF;
    END LOOP;

    NEW.codigo_indicacao := novo_codigo;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar código automaticamente
DROP TRIGGER IF EXISTS trigger_gerar_codigo_parceria ON yeslaser_parcerias;
CREATE TRIGGER trigger_gerar_codigo_parceria
  BEFORE INSERT ON yeslaser_parcerias
  FOR EACH ROW EXECUTE FUNCTION gerar_codigo_parceria();


-- =====================================================
-- 6. FUNÇÃO: Atualizar contador de indicações
-- =====================================================

CREATE OR REPLACE FUNCTION atualizar_contador_parceria()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE yeslaser_parcerias
    SET quantidade_indicacoes = COALESCE(quantidade_indicacoes, 0) + 1
    WHERE id = NEW.parceria_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE yeslaser_parcerias
    SET quantidade_indicacoes = GREATEST(COALESCE(quantidade_indicacoes, 0) - 1, 0)
    WHERE id = OLD.parceria_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar contador
DROP TRIGGER IF EXISTS trigger_atualizar_contador_parceria ON yeslaser_parceria_indicacoes;
CREATE TRIGGER trigger_atualizar_contador_parceria
  AFTER INSERT OR DELETE ON yeslaser_parceria_indicacoes
  FOR EACH ROW EXECUTE FUNCTION atualizar_contador_parceria();


-- =====================================================
-- 7. TRIGGERS: updated_at automático
-- =====================================================

-- Usar função existente ou criar se não existir
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_parcerias_updated_at ON yeslaser_parcerias;
CREATE TRIGGER trigger_parcerias_updated_at
  BEFORE UPDATE ON yeslaser_parcerias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_parceria_beneficios_updated_at ON yeslaser_parceria_beneficios;
CREATE TRIGGER trigger_parceria_beneficios_updated_at
  BEFORE UPDATE ON yeslaser_parceria_beneficios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- 8. RLS POLICIES
-- =====================================================

-- Habilitar RLS
ALTER TABLE yeslaser_parcerias ENABLE ROW LEVEL SECURITY;
ALTER TABLE yeslaser_parceria_beneficios ENABLE ROW LEVEL SECURITY;
ALTER TABLE yeslaser_parceria_indicacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE yeslaser_parceria_contatos ENABLE ROW LEVEL SECURITY;

-- Policies para yeslaser_parcerias
DROP POLICY IF EXISTS "parcerias_select_authenticated" ON yeslaser_parcerias;
CREATE POLICY "parcerias_select_authenticated" ON yeslaser_parcerias
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "parcerias_insert_authenticated" ON yeslaser_parcerias;
CREATE POLICY "parcerias_insert_authenticated" ON yeslaser_parcerias
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "parcerias_update_authenticated" ON yeslaser_parcerias;
CREATE POLICY "parcerias_update_authenticated" ON yeslaser_parcerias
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "parcerias_delete_authenticated" ON yeslaser_parcerias;
CREATE POLICY "parcerias_delete_authenticated" ON yeslaser_parcerias
  FOR DELETE TO authenticated USING (true);

-- Policies para anon (necessário para validar código no formulário público)
DROP POLICY IF EXISTS "parcerias_select_anon" ON yeslaser_parcerias;
CREATE POLICY "parcerias_select_anon" ON yeslaser_parcerias
  FOR SELECT TO anon USING (status = 'ativo');

-- Policies para benefícios
DROP POLICY IF EXISTS "beneficios_all_authenticated" ON yeslaser_parceria_beneficios;
CREATE POLICY "beneficios_all_authenticated" ON yeslaser_parceria_beneficios
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "beneficios_select_anon" ON yeslaser_parceria_beneficios;
CREATE POLICY "beneficios_select_anon" ON yeslaser_parceria_beneficios
  FOR SELECT TO anon USING (ativo = true);

-- Policies para indicações
DROP POLICY IF EXISTS "indicacoes_all_authenticated" ON yeslaser_parceria_indicacoes;
CREATE POLICY "indicacoes_all_authenticated" ON yeslaser_parceria_indicacoes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "indicacoes_insert_anon" ON yeslaser_parceria_indicacoes;
CREATE POLICY "indicacoes_insert_anon" ON yeslaser_parceria_indicacoes
  FOR INSERT TO anon WITH CHECK (true);

-- Policies para contatos
DROP POLICY IF EXISTS "contatos_all_authenticated" ON yeslaser_parceria_contatos;
CREATE POLICY "contatos_all_authenticated" ON yeslaser_parceria_contatos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- =====================================================
-- 9. ATUALIZAÇÃO DA TABELA DE LEADS
-- =====================================================

-- Adicionar campo parceria_id na tabela de leads
ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS parceria_id uuid REFERENCES yeslaser_parcerias(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_parceria ON sistema_leads_yeslaser(parceria_id);

COMMENT ON COLUMN sistema_leads_yeslaser.parceria_id IS 'Parceria que indicou este lead';


-- =====================================================
-- 10. REGISTRO DO MÓDULO
-- =====================================================

-- Inserir módulo na tabela de módulos do sistema
INSERT INTO yeslaser_modulos (codigo, nome, descricao, icone, categoria, ordem, is_core)
VALUES (
  'parcerias',
  'Parcerias',
  'Gestão de parcerias empresariais com código de indicação, benefícios e tracking de leads',
  'Building2',
  'marketing',
  17,
  false
)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  icone = EXCLUDED.icone,
  categoria = EXCLUDED.categoria,
  ordem = EXCLUDED.ordem;


-- =====================================================
-- 11. VERIFICAÇÃO FINAL
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Módulo de Parcerias criado com sucesso!';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Tabelas criadas:';
  RAISE NOTICE '  - yeslaser_parcerias';
  RAISE NOTICE '  - yeslaser_parceria_beneficios';
  RAISE NOTICE '  - yeslaser_parceria_indicacoes';
  RAISE NOTICE '  - yeslaser_parceria_contatos';
  RAISE NOTICE '';
  RAISE NOTICE 'Triggers configurados:';
  RAISE NOTICE '  - gerar_codigo_parceria (auto-gera código 6-8 chars)';
  RAISE NOTICE '  - atualizar_contador_parceria (incrementa/decrementa)';
  RAISE NOTICE '  - updated_at automático';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS habilitado em todas as tabelas';
  RAISE NOTICE 'Campo parceria_id adicionado em sistema_leads_yeslaser';
  RAISE NOTICE '=====================================================';
END $$;

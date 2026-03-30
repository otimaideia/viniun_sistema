-- Migration: 20250127_create_influenciadoras_system.sql
-- Purpose: Sistema completo de Influenciadoras YESlaser
-- Author: Claude + Danilo
-- Date: 2025-01-27

-- ROLLBACK PLAN:
-- BEGIN;
-- DROP TABLE IF EXISTS yeslaser_influenciadora_posts CASCADE;
-- DROP TABLE IF EXISTS yeslaser_influenciadora_permutas CASCADE;
-- DROP TABLE IF EXISTS yeslaser_influenciadora_pagamentos CASCADE;
-- DROP TABLE IF EXISTS yeslaser_influenciadora_contratos CASCADE;
-- DROP TABLE IF EXISTS yeslaser_influenciadora_mensagens CASCADE;
-- DROP TABLE IF EXISTS yeslaser_influenciadora_promocoes CASCADE;
-- DROP TABLE IF EXISTS yeslaser_influenciadora_indicacoes CASCADE;
-- DROP TABLE IF EXISTS yeslaser_influenciadora_valores CASCADE;
-- DROP TABLE IF EXISTS yeslaser_influenciadora_redes_sociais CASCADE;
-- DROP TABLE IF EXISTS yeslaser_influenciadoras CASCADE;
-- DROP FUNCTION IF EXISTS gerar_codigo_influenciadora();
-- DROP FUNCTION IF EXISTS atualizar_contador_influenciadora();
-- DROP FUNCTION IF EXISTS atualizar_updated_at_influenciadora();
-- DROP TYPE IF EXISTS influenciadora_tipo;
-- DROP TYPE IF EXISTS influenciadora_tamanho;
-- DROP TYPE IF EXISTS influenciadora_status;
-- DROP TYPE IF EXISTS rede_social_plataforma;
-- DROP TYPE IF EXISTS contrato_tipo;
-- DROP TYPE IF EXISTS contrato_status;
-- DROP TYPE IF EXISTS pagamento_tipo;
-- DROP TYPE IF EXISTS pagamento_status;
-- DROP TYPE IF EXISTS pagamento_forma;
-- DROP TYPE IF EXISTS permuta_status;
-- DROP TYPE IF EXISTS post_plataforma;
-- DROP TYPE IF EXISTS post_tipo_conteudo;
-- DROP TYPE IF EXISTS post_status;
-- DROP TYPE IF EXISTS promocao_status;
-- DROP TYPE IF EXISTS mensagem_status;
-- DROP TYPE IF EXISTS indicacao_status;
-- COMMIT;

BEGIN;

-- ============================================
-- STEP 1: Create ENUM Types
-- ============================================

-- Tipo de influenciadora
DO $$ BEGIN
  CREATE TYPE influenciadora_tipo AS ENUM ('influenciador', 'ugc_creator', 'ambos');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tamanho (quantidade de seguidores)
DO $$ BEGIN
  CREATE TYPE influenciadora_tamanho AS ENUM ('nano', 'micro', 'medio', 'macro', 'mega');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Status de aprovação
DO $$ BEGIN
  CREATE TYPE influenciadora_status AS ENUM ('pendente', 'aprovado', 'rejeitado', 'suspenso');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Plataformas de redes sociais
DO $$ BEGIN
  CREATE TYPE rede_social_plataforma AS ENUM ('instagram', 'tiktok', 'youtube', 'facebook', 'twitter', 'kwai', 'linkedin', 'pinterest');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tipo de contrato
DO $$ BEGIN
  CREATE TYPE contrato_tipo AS ENUM ('mensal', 'por_post', 'comissao', 'permuta', 'misto');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Status do contrato
DO $$ BEGIN
  CREATE TYPE contrato_status AS ENUM ('rascunho', 'ativo', 'pausado', 'encerrado', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tipo de pagamento
DO $$ BEGIN
  CREATE TYPE pagamento_tipo AS ENUM ('mensal', 'post', 'comissao', 'bonus', 'ajuste');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Status do pagamento
DO $$ BEGIN
  CREATE TYPE pagamento_status AS ENUM ('pendente', 'aprovado', 'pago', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Forma de pagamento
DO $$ BEGIN
  CREATE TYPE pagamento_forma AS ENUM ('pix', 'transferencia', 'permuta', 'dinheiro');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Status da permuta
DO $$ BEGIN
  CREATE TYPE permuta_status AS ENUM ('disponivel', 'agendado', 'realizado', 'cancelado', 'expirado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Plataforma do post
DO $$ BEGIN
  CREATE TYPE post_plataforma AS ENUM ('instagram', 'tiktok', 'youtube', 'facebook', 'stories', 'reels');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tipo de conteúdo do post
DO $$ BEGIN
  CREATE TYPE post_tipo_conteudo AS ENUM ('post_feed', 'stories', 'reels', 'video', 'live', 'carrossel', 'ugc_video', 'ugc_foto', 'review', 'unboxing');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Status do post
DO $$ BEGIN
  CREATE TYPE post_status AS ENUM ('pendente', 'publicado', 'aprovado', 'rejeitado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Status da promoção
DO $$ BEGIN
  CREATE TYPE promocao_status AS ENUM ('rascunho', 'agendada', 'enviada', 'cancelada');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Status da mensagem WAHA
DO $$ BEGIN
  CREATE TYPE mensagem_status AS ENUM ('pendente', 'enviado', 'entregue', 'lido', 'erro');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Status da indicação
DO $$ BEGIN
  CREATE TYPE indicacao_status AS ENUM ('pendente', 'convertido', 'perdido', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- STEP 2: Create Main Table - yeslaser_influenciadoras
-- ============================================

CREATE TABLE IF NOT EXISTS yeslaser_influenciadoras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Dados Pessoais
  nome_completo varchar(200) NOT NULL,
  nome_artistico varchar(100),
  email varchar(200),
  telefone varchar(20),
  whatsapp varchar(20) NOT NULL,
  cpf varchar(14),
  data_nascimento date,

  -- Código de Indicação (igual sistema de indicações)
  codigo_indicacao varchar(10) UNIQUE,
  quantidade_indicacoes integer DEFAULT 0,

  -- Localização
  cidade varchar(100),
  estado varchar(2),
  cep varchar(9),
  bairro varchar(100),

  -- Perfil
  foto_perfil text,
  biografia text,
  tipo influenciadora_tipo DEFAULT 'influenciador',
  tamanho influenciadora_tamanho,

  -- Métricas Consolidadas
  total_seguidores integer DEFAULT 0,
  taxa_engajamento_media decimal(5,2) DEFAULT 0,

  -- Status
  status influenciadora_status DEFAULT 'pendente',
  ativo boolean DEFAULT true,

  -- Autenticação Portal
  codigo_verificacao varchar(6),
  codigo_expira_em timestamp with time zone,
  ultimo_login timestamp with time zone,
  aceite_termos boolean DEFAULT false,
  aceite_termos_at timestamp with time zone,

  -- Relacionamentos (vinculação híbrida)
  franqueado_id uuid REFERENCES yeslaser_franqueados(id) ON DELETE SET NULL,
  unidade_id uuid REFERENCES yeslaser_franqueados(id) ON DELETE SET NULL,

  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_influenciadoras_codigo ON yeslaser_influenciadoras(codigo_indicacao);
CREATE INDEX IF NOT EXISTS idx_influenciadoras_status ON yeslaser_influenciadoras(status);
CREATE INDEX IF NOT EXISTS idx_influenciadoras_ativo ON yeslaser_influenciadoras(ativo);
CREATE INDEX IF NOT EXISTS idx_influenciadoras_whatsapp ON yeslaser_influenciadoras(whatsapp);
CREATE INDEX IF NOT EXISTS idx_influenciadoras_franqueado ON yeslaser_influenciadoras(franqueado_id);
CREATE INDEX IF NOT EXISTS idx_influenciadoras_unidade ON yeslaser_influenciadoras(unidade_id);

-- RLS
ALTER TABLE yeslaser_influenciadoras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON yeslaser_influenciadoras
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy para cadastro público (anon)
CREATE POLICY "Allow insert for anon" ON yeslaser_influenciadoras
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy para login (anon pode ler próprio registro para validar código)
CREATE POLICY "Allow select for anon" ON yeslaser_influenciadoras
  FOR SELECT
  TO anon
  USING (true);

-- Policy para update (anon pode atualizar código_verificacao)
CREATE POLICY "Allow update for anon" ON yeslaser_influenciadoras
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE yeslaser_influenciadoras IS 'Cadastro de influenciadoras e UGC creators para campanhas YESlaser';

-- ============================================
-- STEP 3: Create Table - yeslaser_influenciadora_redes_sociais
-- ============================================

CREATE TABLE IF NOT EXISTS yeslaser_influenciadora_redes_sociais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influenciadora_id uuid NOT NULL REFERENCES yeslaser_influenciadoras(id) ON DELETE CASCADE,
  plataforma rede_social_plataforma NOT NULL,
  username varchar(100),
  url varchar(500),
  seguidores integer DEFAULT 0,
  taxa_engajamento decimal(5,2) DEFAULT 0,
  verificado boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  UNIQUE(influenciadora_id, plataforma)
);

CREATE INDEX IF NOT EXISTS idx_redes_sociais_influenciadora ON yeslaser_influenciadora_redes_sociais(influenciadora_id);

ALTER TABLE yeslaser_influenciadora_redes_sociais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON yeslaser_influenciadora_redes_sociais
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow insert for anon" ON yeslaser_influenciadora_redes_sociais
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow select for anon" ON yeslaser_influenciadora_redes_sociais
  FOR SELECT TO anon USING (true);

COMMENT ON TABLE yeslaser_influenciadora_redes_sociais IS 'Redes sociais vinculadas a cada influenciadora';

-- ============================================
-- STEP 4: Create Table - yeslaser_influenciadora_valores
-- ============================================

CREATE TABLE IF NOT EXISTS yeslaser_influenciadora_valores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influenciadora_id uuid NOT NULL REFERENCES yeslaser_influenciadoras(id) ON DELETE CASCADE,
  plataforma post_plataforma NOT NULL,
  tipo_conteudo post_tipo_conteudo NOT NULL,
  valor decimal(10,2) NOT NULL,
  moeda varchar(3) DEFAULT 'BRL',
  descricao text,
  negociavel boolean DEFAULT true,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  UNIQUE(influenciadora_id, plataforma, tipo_conteudo)
);

CREATE INDEX IF NOT EXISTS idx_valores_influenciadora ON yeslaser_influenciadora_valores(influenciadora_id);

ALTER TABLE yeslaser_influenciadora_valores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON yeslaser_influenciadora_valores
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow insert for anon" ON yeslaser_influenciadora_valores
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow select for anon" ON yeslaser_influenciadora_valores
  FOR SELECT TO anon USING (true);

COMMENT ON TABLE yeslaser_influenciadora_valores IS 'Tabela de preços por tipo de conteúdo e plataforma';

-- ============================================
-- STEP 5: Create Table - yeslaser_influenciadora_indicacoes
-- ============================================

CREATE TABLE IF NOT EXISTS yeslaser_influenciadora_indicacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influenciadora_id uuid NOT NULL REFERENCES yeslaser_influenciadoras(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES sistema_leads_yeslaser(id) ON DELETE SET NULL,
  codigo_usado varchar(10),
  campanha varchar(100),
  landing_page varchar(255),
  status indicacao_status DEFAULT 'pendente',
  data_indicacao timestamp with time zone DEFAULT now(),
  data_conversao timestamp with time zone,
  valor_comissao decimal(10,2),
  observacoes text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_indicacoes_influenciadora ON yeslaser_influenciadora_indicacoes(influenciadora_id);
CREATE INDEX IF NOT EXISTS idx_indicacoes_lead ON yeslaser_influenciadora_indicacoes(lead_id);
CREATE INDEX IF NOT EXISTS idx_indicacoes_status ON yeslaser_influenciadora_indicacoes(status);
CREATE INDEX IF NOT EXISTS idx_indicacoes_data ON yeslaser_influenciadora_indicacoes(data_indicacao);

ALTER TABLE yeslaser_influenciadora_indicacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON yeslaser_influenciadora_indicacoes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow insert for anon" ON yeslaser_influenciadora_indicacoes
  FOR INSERT TO anon WITH CHECK (true);

COMMENT ON TABLE yeslaser_influenciadora_indicacoes IS 'Histórico de leads indicados por influenciadoras';

-- ============================================
-- STEP 6: Create Table - yeslaser_influenciadora_contratos
-- ============================================

CREATE TABLE IF NOT EXISTS yeslaser_influenciadora_contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influenciadora_id uuid NOT NULL REFERENCES yeslaser_influenciadoras(id) ON DELETE CASCADE,
  numero_contrato varchar(30) UNIQUE,

  -- Tipo de Contrato
  tipo_contrato contrato_tipo NOT NULL,

  -- Valores
  valor_mensal decimal(10,2),
  valor_por_post decimal(10,2),
  percentual_comissao decimal(5,2),
  valor_fixo_comissao decimal(10,2),

  -- Permuta
  credito_permuta decimal(10,2),
  credito_permuta_usado decimal(10,2) DEFAULT 0,
  procedimentos_permitidos text[],

  -- Vigência
  data_inicio date NOT NULL,
  data_fim date,
  renovacao_automatica boolean DEFAULT false,

  -- Status
  status contrato_status DEFAULT 'rascunho',
  observacoes text,

  -- Metadata
  created_by uuid REFERENCES yeslaser_profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contratos_influenciadora ON yeslaser_influenciadora_contratos(influenciadora_id);
CREATE INDEX IF NOT EXISTS idx_contratos_status ON yeslaser_influenciadora_contratos(status);

ALTER TABLE yeslaser_influenciadora_contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON yeslaser_influenciadora_contratos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE yeslaser_influenciadora_contratos IS 'Contratos de parceria com influenciadoras';

-- ============================================
-- STEP 7: Create Table - yeslaser_influenciadora_pagamentos
-- ============================================

CREATE TABLE IF NOT EXISTS yeslaser_influenciadora_pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influenciadora_id uuid NOT NULL REFERENCES yeslaser_influenciadoras(id) ON DELETE CASCADE,
  contrato_id uuid REFERENCES yeslaser_influenciadora_contratos(id) ON DELETE SET NULL,

  -- Detalhes do Pagamento
  tipo pagamento_tipo NOT NULL,
  descricao varchar(255),
  referencia_mes varchar(7),

  -- Valores
  valor_bruto decimal(10,2) NOT NULL,
  descontos decimal(10,2) DEFAULT 0,
  valor_liquido decimal(10,2) NOT NULL,

  -- Status
  status pagamento_status DEFAULT 'pendente',
  data_vencimento date,
  data_pagamento date,
  comprovante_url text,

  -- Forma de Pagamento
  forma_pagamento pagamento_forma DEFAULT 'pix',

  -- Dados bancários (snapshot)
  dados_bancarios jsonb,

  -- Metadata
  aprovado_por uuid REFERENCES yeslaser_profiles(id),
  aprovado_at timestamp with time zone,
  created_by uuid REFERENCES yeslaser_profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_influenciadora ON yeslaser_influenciadora_pagamentos(influenciadora_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_contrato ON yeslaser_influenciadora_pagamentos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON yeslaser_influenciadora_pagamentos(status);
CREATE INDEX IF NOT EXISTS idx_pagamentos_referencia ON yeslaser_influenciadora_pagamentos(referencia_mes);

ALTER TABLE yeslaser_influenciadora_pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON yeslaser_influenciadora_pagamentos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE yeslaser_influenciadora_pagamentos IS 'Histórico de pagamentos para influenciadoras';

-- ============================================
-- STEP 8: Create Table - yeslaser_influenciadora_permutas
-- ============================================

CREATE TABLE IF NOT EXISTS yeslaser_influenciadora_permutas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influenciadora_id uuid NOT NULL REFERENCES yeslaser_influenciadoras(id) ON DELETE CASCADE,
  contrato_id uuid REFERENCES yeslaser_influenciadora_contratos(id) ON DELETE SET NULL,

  -- Procedimento
  servico_id uuid REFERENCES yeslaser_servicos(id) ON DELETE SET NULL,
  servico_nome varchar(200) NOT NULL,
  valor_servico decimal(10,2) NOT NULL,

  -- Agendamento
  agendamento_id uuid REFERENCES yeslaser_agendamentos(id) ON DELETE SET NULL,
  data_realizacao date,
  unidade_id uuid REFERENCES yeslaser_franqueados(id) ON DELETE SET NULL,

  -- Status
  status permuta_status DEFAULT 'disponivel',
  observacoes text,

  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_permutas_influenciadora ON yeslaser_influenciadora_permutas(influenciadora_id);
CREATE INDEX IF NOT EXISTS idx_permutas_contrato ON yeslaser_influenciadora_permutas(contrato_id);
CREATE INDEX IF NOT EXISTS idx_permutas_status ON yeslaser_influenciadora_permutas(status);

ALTER TABLE yeslaser_influenciadora_permutas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON yeslaser_influenciadora_permutas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE yeslaser_influenciadora_permutas IS 'Procedimentos realizados como permuta';

-- ============================================
-- STEP 9: Create Table - yeslaser_influenciadora_posts
-- ============================================

CREATE TABLE IF NOT EXISTS yeslaser_influenciadora_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influenciadora_id uuid NOT NULL REFERENCES yeslaser_influenciadoras(id) ON DELETE CASCADE,
  contrato_id uuid REFERENCES yeslaser_influenciadora_contratos(id) ON DELETE SET NULL,

  -- Detalhes do Post
  plataforma post_plataforma NOT NULL,
  tipo_conteudo post_tipo_conteudo NOT NULL,
  url_post varchar(500),
  descricao text,
  screenshot_url text,

  -- Métricas
  views integer DEFAULT 0,
  likes integer DEFAULT 0,
  comentarios integer DEFAULT 0,
  compartilhamentos integer DEFAULT 0,
  alcance integer DEFAULT 0,
  engajamento decimal(5,2) DEFAULT 0,

  -- Valor
  valor_acordado decimal(10,2),
  pagamento_id uuid REFERENCES yeslaser_influenciadora_pagamentos(id) ON DELETE SET NULL,

  -- Status
  status post_status DEFAULT 'pendente',
  data_publicacao timestamp with time zone,
  data_aprovacao timestamp with time zone,
  motivo_rejeicao text,

  -- Metadata
  aprovado_por uuid REFERENCES yeslaser_profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_influenciadora ON yeslaser_influenciadora_posts(influenciadora_id);
CREATE INDEX IF NOT EXISTS idx_posts_contrato ON yeslaser_influenciadora_posts(contrato_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON yeslaser_influenciadora_posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_data ON yeslaser_influenciadora_posts(data_publicacao);

ALTER TABLE yeslaser_influenciadora_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON yeslaser_influenciadora_posts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policy para influenciadora registrar seus próprios posts
CREATE POLICY "Allow insert for anon" ON yeslaser_influenciadora_posts
  FOR INSERT TO anon WITH CHECK (true);

COMMENT ON TABLE yeslaser_influenciadora_posts IS 'Posts publicados por influenciadoras';

-- ============================================
-- STEP 10: Create Table - yeslaser_influenciadora_promocoes
-- ============================================

CREATE TABLE IF NOT EXISTS yeslaser_influenciadora_promocoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo varchar(200) NOT NULL,
  descricao text,
  imagem_url text,
  link_promo varchar(500),
  data_inicio date,
  data_fim date,
  status promocao_status DEFAULT 'rascunho',
  total_destinatarios integer DEFAULT 0,
  total_enviados integer DEFAULT 0,
  total_entregues integer DEFAULT 0,
  total_lidos integer DEFAULT 0,
  created_by uuid REFERENCES yeslaser_profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promocoes_status ON yeslaser_influenciadora_promocoes(status);
CREATE INDEX IF NOT EXISTS idx_promocoes_data ON yeslaser_influenciadora_promocoes(data_inicio, data_fim);

ALTER TABLE yeslaser_influenciadora_promocoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON yeslaser_influenciadora_promocoes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE yeslaser_influenciadora_promocoes IS 'Promoções enviadas para influenciadoras via WAHA';

-- ============================================
-- STEP 11: Create Table - yeslaser_influenciadora_mensagens
-- ============================================

CREATE TABLE IF NOT EXISTS yeslaser_influenciadora_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promocao_id uuid REFERENCES yeslaser_influenciadora_promocoes(id) ON DELETE CASCADE,
  influenciadora_id uuid NOT NULL REFERENCES yeslaser_influenciadoras(id) ON DELETE CASCADE,
  sessao_waha varchar(100),
  mensagem text,
  status mensagem_status DEFAULT 'pendente',
  erro_mensagem text,
  message_id_waha varchar(100),
  enviado_at timestamp with time zone,
  entregue_at timestamp with time zone,
  lido_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mensagens_promocao ON yeslaser_influenciadora_mensagens(promocao_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_influenciadora ON yeslaser_influenciadora_mensagens(influenciadora_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_status ON yeslaser_influenciadora_mensagens(status);

ALTER TABLE yeslaser_influenciadora_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON yeslaser_influenciadora_mensagens
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE yeslaser_influenciadora_mensagens IS 'Log de mensagens WAHA enviadas para influenciadoras';

-- ============================================
-- STEP 12: Create Triggers
-- ============================================

-- Function: Gerar código de indicação automaticamente
CREATE OR REPLACE FUNCTION gerar_codigo_influenciadora()
RETURNS TRIGGER AS $$
DECLARE
  novo_codigo varchar(6);
  tentativas integer := 0;
BEGIN
  IF NEW.codigo_indicacao IS NULL THEN
    LOOP
      tentativas := tentativas + 1;
      novo_codigo := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT || tentativas::TEXT) FROM 1 FOR 6));

      -- Verificar se já existe
      IF NOT EXISTS (SELECT 1 FROM yeslaser_influenciadoras WHERE codigo_indicacao = novo_codigo) THEN
        NEW.codigo_indicacao := novo_codigo;
        EXIT;
      END IF;

      -- Evitar loop infinito (máximo 100 tentativas)
      IF tentativas >= 100 THEN
        -- Usar código maior se houver muitas colisões
        NEW.codigo_indicacao := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 8));
        EXIT;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_gerar_codigo_influenciadora
  BEFORE INSERT ON yeslaser_influenciadoras
  FOR EACH ROW
  EXECUTE FUNCTION gerar_codigo_influenciadora();

-- Function: Atualizar contador de indicações
CREATE OR REPLACE FUNCTION atualizar_contador_influenciadora()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE yeslaser_influenciadoras
    SET quantidade_indicacoes = COALESCE(quantidade_indicacoes, 0) + 1
    WHERE id = NEW.influenciadora_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE yeslaser_influenciadoras
    SET quantidade_indicacoes = GREATEST(COALESCE(quantidade_indicacoes, 0) - 1, 0)
    WHERE id = OLD.influenciadora_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_contador_indicacoes_influenciadora
  AFTER INSERT OR DELETE ON yeslaser_influenciadora_indicacoes
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_contador_influenciadora();

-- Function: Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION atualizar_updated_at_influenciadora()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de updated_at para todas as tabelas
CREATE TRIGGER trigger_updated_at_influenciadoras
  BEFORE UPDATE ON yeslaser_influenciadoras
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_updated_at_influenciadora();

CREATE TRIGGER trigger_updated_at_redes_sociais
  BEFORE UPDATE ON yeslaser_influenciadora_redes_sociais
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_updated_at_influenciadora();

CREATE TRIGGER trigger_updated_at_valores
  BEFORE UPDATE ON yeslaser_influenciadora_valores
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_updated_at_influenciadora();

CREATE TRIGGER trigger_updated_at_contratos
  BEFORE UPDATE ON yeslaser_influenciadora_contratos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_updated_at_influenciadora();

CREATE TRIGGER trigger_updated_at_pagamentos
  BEFORE UPDATE ON yeslaser_influenciadora_pagamentos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_updated_at_influenciadora();

CREATE TRIGGER trigger_updated_at_permutas
  BEFORE UPDATE ON yeslaser_influenciadora_permutas
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_updated_at_influenciadora();

CREATE TRIGGER trigger_updated_at_posts
  BEFORE UPDATE ON yeslaser_influenciadora_posts
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_updated_at_influenciadora();

CREATE TRIGGER trigger_updated_at_promocoes
  BEFORE UPDATE ON yeslaser_influenciadora_promocoes
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_updated_at_influenciadora();

-- Function: Gerar número de contrato automaticamente
CREATE OR REPLACE FUNCTION gerar_numero_contrato()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero_contrato IS NULL THEN
    NEW.numero_contrato := 'CTR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                           LPAD(NEXTVAL('contrato_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sequence para número de contrato
CREATE SEQUENCE IF NOT EXISTS contrato_seq START 1;

CREATE TRIGGER trigger_gerar_numero_contrato
  BEFORE INSERT ON yeslaser_influenciadora_contratos
  FOR EACH ROW
  EXECUTE FUNCTION gerar_numero_contrato();

-- Function: Atualizar crédito de permuta usado
CREATE OR REPLACE FUNCTION atualizar_credito_permuta()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'realizado' THEN
    UPDATE yeslaser_influenciadora_contratos
    SET credito_permuta_usado = COALESCE(credito_permuta_usado, 0) + NEW.valor_servico
    WHERE id = NEW.contrato_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Se mudou para realizado
    IF OLD.status != 'realizado' AND NEW.status = 'realizado' THEN
      UPDATE yeslaser_influenciadora_contratos
      SET credito_permuta_usado = COALESCE(credito_permuta_usado, 0) + NEW.valor_servico
      WHERE id = NEW.contrato_id;
    -- Se mudou de realizado para outro status (cancelamento)
    ELSIF OLD.status = 'realizado' AND NEW.status != 'realizado' THEN
      UPDATE yeslaser_influenciadora_contratos
      SET credito_permuta_usado = GREATEST(COALESCE(credito_permuta_usado, 0) - OLD.valor_servico, 0)
      WHERE id = OLD.contrato_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_credito_permuta
  AFTER INSERT OR UPDATE ON yeslaser_influenciadora_permutas
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_credito_permuta();

COMMIT;

-- ============================================
-- POST-MIGRATION VALIDATION
-- ============================================

-- Verificar tabelas criadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'yeslaser_influenciadora%'
ORDER BY table_name;

-- Verificar triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%influenciadora%'
ORDER BY trigger_name;

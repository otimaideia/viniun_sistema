-- Migration: 20250129_add_international_phone_support.sql
-- Purpose: Adicionar suporte a telefones internacionais em todo o sistema
-- Author: Claude + Danilo
-- Date: 2025-01-29

-- =====================================================
-- SISTEMA LEADS YESLASER
-- =====================================================

-- Adicionar campos de código de país para telefones
ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS telefone_codigo_pais varchar(5) DEFAULT '55',
ADD COLUMN IF NOT EXISTS whatsapp_codigo_pais varchar(5) DEFAULT '55',
ADD COLUMN IF NOT EXISTS telefone_secundario_codigo_pais varchar(5) DEFAULT '55',
ADD COLUMN IF NOT EXISTS contato_emergencia_telefone_codigo_pais varchar(5) DEFAULT '55';

-- Comentários explicativos
COMMENT ON COLUMN sistema_leads_yeslaser.telefone_codigo_pais IS 'Código do país para telefone principal (ex: 55 para Brasil, 1 para USA)';
COMMENT ON COLUMN sistema_leads_yeslaser.whatsapp_codigo_pais IS 'Código do país para WhatsApp';
COMMENT ON COLUMN sistema_leads_yeslaser.telefone_secundario_codigo_pais IS 'Código do país para telefone secundário';
COMMENT ON COLUMN sistema_leads_yeslaser.contato_emergencia_telefone_codigo_pais IS 'Código do país para contato de emergência';

-- =====================================================
-- INFLUENCIADORAS
-- =====================================================

ALTER TABLE yeslaser_influenciadoras
ADD COLUMN IF NOT EXISTS telefone_codigo_pais varchar(5) DEFAULT '55',
ADD COLUMN IF NOT EXISTS whatsapp_codigo_pais varchar(5) DEFAULT '55';

COMMENT ON COLUMN yeslaser_influenciadoras.telefone_codigo_pais IS 'Código do país para telefone';
COMMENT ON COLUMN yeslaser_influenciadoras.whatsapp_codigo_pais IS 'Código do país para WhatsApp';

-- =====================================================
-- PARCERIAS EMPRESARIAIS
-- =====================================================

ALTER TABLE yeslaser_parcerias
ADD COLUMN IF NOT EXISTS responsavel_telefone_codigo_pais varchar(5) DEFAULT '55',
ADD COLUMN IF NOT EXISTS responsavel_whatsapp_codigo_pais varchar(5) DEFAULT '55';

COMMENT ON COLUMN yeslaser_parcerias.responsavel_telefone_codigo_pais IS 'Código do país para telefone do responsável';
COMMENT ON COLUMN yeslaser_parcerias.responsavel_whatsapp_codigo_pais IS 'Código do país para WhatsApp do responsável';

-- =====================================================
-- CONTATOS DE PARCERIAS
-- =====================================================

ALTER TABLE yeslaser_parceria_contatos
ADD COLUMN IF NOT EXISTS telefone_codigo_pais varchar(5) DEFAULT '55',
ADD COLUMN IF NOT EXISTS whatsapp_codigo_pais varchar(5) DEFAULT '55';

COMMENT ON COLUMN yeslaser_parceria_contatos.telefone_codigo_pais IS 'Código do país para telefone do contato';
COMMENT ON COLUMN yeslaser_parceria_contatos.whatsapp_codigo_pais IS 'Código do país para WhatsApp do contato';

-- =====================================================
-- FRANQUEADOS (caso exista campo de telefone)
-- =====================================================

-- Verificar se a tabela tem campo de telefone antes de adicionar
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'yeslaser_franqueados' AND column_name = 'whatsapp_business'
  ) THEN
    ALTER TABLE yeslaser_franqueados
    ADD COLUMN IF NOT EXISTS whatsapp_business_codigo_pais varchar(5) DEFAULT '55';

    COMMENT ON COLUMN yeslaser_franqueados.whatsapp_business_codigo_pais IS 'Código do país para WhatsApp Business';
  END IF;
END $$;

-- =====================================================
-- CANDIDATOS (Recrutamento)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'yeslaser_candidatos'
  ) THEN
    ALTER TABLE yeslaser_candidatos
    ADD COLUMN IF NOT EXISTS telefone_codigo_pais varchar(5) DEFAULT '55',
    ADD COLUMN IF NOT EXISTS whatsapp_codigo_pais varchar(5) DEFAULT '55';

    COMMENT ON COLUMN yeslaser_candidatos.telefone_codigo_pais IS 'Código do país para telefone';
    COMMENT ON COLUMN yeslaser_candidatos.whatsapp_codigo_pais IS 'Código do país para WhatsApp';
  END IF;
END $$;

-- =====================================================
-- AGENDAMENTOS (se tiver campo de telefone)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'yeslaser_agendamentos' AND column_name = 'telefone_contato'
  ) THEN
    ALTER TABLE yeslaser_agendamentos
    ADD COLUMN IF NOT EXISTS telefone_contato_codigo_pais varchar(5) DEFAULT '55';

    COMMENT ON COLUMN yeslaser_agendamentos.telefone_contato_codigo_pais IS 'Código do país para telefone de contato';
  END IF;
END $$;

-- =====================================================
-- TABELA DE REFERÊNCIA DE PAÍSES (opcional mas útil)
-- =====================================================

CREATE TABLE IF NOT EXISTS yeslaser_paises (
  codigo varchar(5) PRIMARY KEY,
  nome varchar(100) NOT NULL,
  nome_en varchar(100),
  bandeira varchar(10), -- Emoji da bandeira
  formato_telefone varchar(50), -- Formato esperado ex: "(XX) XXXXX-XXXX"
  digitos_min int DEFAULT 8,
  digitos_max int DEFAULT 11,
  ativo boolean DEFAULT true,
  ordem int DEFAULT 999,
  created_at timestamp with time zone DEFAULT now()
);

-- Inserir países mais comuns (se não existirem)
INSERT INTO yeslaser_paises (codigo, nome, nome_en, bandeira, formato_telefone, digitos_min, digitos_max, ativo, ordem)
VALUES
  ('55', 'Brasil', 'Brazil', '🇧🇷', '(XX) XXXXX-XXXX', 10, 11, true, 1),
  ('1', 'Estados Unidos', 'United States', '🇺🇸', '(XXX) XXX-XXXX', 10, 10, true, 2),
  ('351', 'Portugal', 'Portugal', '🇵🇹', 'XXX XXX XXX', 9, 9, true, 3),
  ('34', 'Espanha', 'Spain', '🇪🇸', 'XXX XXX XXX', 9, 9, true, 4),
  ('33', 'França', 'France', '🇫🇷', 'X XX XX XX XX', 9, 9, true, 5),
  ('49', 'Alemanha', 'Germany', '🇩🇪', 'XXXX XXXXXXX', 10, 11, true, 6),
  ('39', 'Itália', 'Italy', '🇮🇹', 'XXX XXX XXXX', 9, 10, true, 7),
  ('44', 'Reino Unido', 'United Kingdom', '🇬🇧', 'XXXX XXXXXX', 10, 10, true, 8),
  ('81', 'Japão', 'Japan', '🇯🇵', 'XX-XXXX-XXXX', 10, 10, true, 9),
  ('86', 'China', 'China', '🇨🇳', 'XXX XXXX XXXX', 11, 11, true, 10),
  ('54', 'Argentina', 'Argentina', '🇦🇷', '(XX) XXXX-XXXX', 10, 10, true, 11),
  ('56', 'Chile', 'Chile', '🇨🇱', 'X XXXX XXXX', 9, 9, true, 12),
  ('57', 'Colômbia', 'Colombia', '🇨🇴', 'XXX XXX XXXX', 10, 10, true, 13),
  ('52', 'México', 'Mexico', '🇲🇽', '(XX) XXXX XXXX', 10, 10, true, 14),
  ('51', 'Peru', 'Peru', '🇵🇪', 'XXX XXX XXX', 9, 9, true, 15),
  ('598', 'Uruguai', 'Uruguay', '🇺🇾', 'X XXX XXXX', 8, 8, true, 16),
  ('595', 'Paraguai', 'Paraguay', '🇵🇾', 'XXX XXX XXX', 9, 9, true, 17),
  ('591', 'Bolívia', 'Bolivia', '🇧🇴', 'X XXX XXXX', 8, 8, true, 18),
  ('593', 'Equador', 'Ecuador', '🇪🇨', 'XX XXX XXXX', 9, 9, true, 19),
  ('58', 'Venezuela', 'Venezuela', '🇻🇪', 'XXX XXX XXXX', 10, 10, true, 20),
  ('41', 'Suíça', 'Switzerland', '🇨🇭', 'XX XXX XX XX', 9, 9, true, 21),
  ('31', 'Holanda', 'Netherlands', '🇳🇱', 'X XX XX XX XX', 9, 9, true, 22),
  ('32', 'Bélgica', 'Belgium', '🇧🇪', 'XXX XX XX XX', 9, 9, true, 23),
  ('43', 'Áustria', 'Austria', '🇦🇹', 'XXXX XXXXXX', 10, 13, true, 24),
  ('48', 'Polônia', 'Poland', '🇵🇱', 'XXX XXX XXX', 9, 9, true, 25),
  ('7', 'Rússia', 'Russia', '🇷🇺', 'XXX XXX-XX-XX', 10, 10, true, 26),
  ('91', 'Índia', 'India', '🇮🇳', 'XXXXX XXXXX', 10, 10, true, 27),
  ('82', 'Coreia do Sul', 'South Korea', '🇰🇷', 'XX-XXXX-XXXX', 9, 10, true, 28),
  ('61', 'Austrália', 'Australia', '🇦🇺', 'XXXX XXX XXX', 9, 9, true, 29),
  ('64', 'Nova Zelândia', 'New Zealand', '🇳🇿', 'XX XXX XXXX', 8, 9, true, 30),
  ('27', 'África do Sul', 'South Africa', '🇿🇦', 'XX XXX XXXX', 9, 9, true, 31),
  ('971', 'Emirados Árabes', 'United Arab Emirates', '🇦🇪', 'XX XXX XXXX', 9, 9, true, 32),
  ('972', 'Israel', 'Israel', '🇮🇱', 'XX-XXX-XXXX', 9, 9, true, 33),
  ('90', 'Turquia', 'Turkey', '🇹🇷', 'XXX XXX XXXX', 10, 10, true, 34),
  ('20', 'Egito', 'Egypt', '🇪🇬', 'XXX XXX XXXX', 10, 10, true, 35),
  ('212', 'Marrocos', 'Morocco', '🇲🇦', 'XX XXX XXXX', 9, 9, true, 36),
  ('234', 'Nigéria', 'Nigeria', '🇳🇬', 'XXX XXX XXXX', 10, 10, true, 37),
  ('254', 'Quênia', 'Kenya', '🇰🇪', 'XXX XXX XXX', 9, 9, true, 38),
  ('66', 'Tailândia', 'Thailand', '🇹🇭', 'XX XXX XXXX', 9, 9, true, 39),
  ('84', 'Vietnã', 'Vietnam', '🇻🇳', 'XXX XXX XXX', 9, 10, true, 40),
  ('63', 'Filipinas', 'Philippines', '🇵🇭', 'XXX XXX XXXX', 10, 10, true, 41),
  ('62', 'Indonésia', 'Indonesia', '🇮🇩', 'XXX-XXX-XXXX', 10, 12, true, 42),
  ('60', 'Malásia', 'Malaysia', '🇲🇾', 'XX-XXX XXXX', 9, 10, true, 43),
  ('65', 'Singapura', 'Singapore', '🇸🇬', 'XXXX XXXX', 8, 8, true, 44),
  ('353', 'Irlanda', 'Ireland', '🇮🇪', 'XX XXX XXXX', 9, 9, true, 45),
  ('354', 'Islândia', 'Iceland', '🇮🇸', 'XXX XXXX', 7, 7, true, 46),
  ('47', 'Noruega', 'Norway', '🇳🇴', 'XXX XX XXX', 8, 8, true, 47),
  ('46', 'Suécia', 'Sweden', '🇸🇪', 'XX-XXX XX XX', 9, 9, true, 48),
  ('45', 'Dinamarca', 'Denmark', '🇩🇰', 'XX XX XX XX', 8, 8, true, 49),
  ('358', 'Finlândia', 'Finland', '🇫🇮', 'XX XXX XXXX', 9, 10, true, 50)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  nome_en = EXCLUDED.nome_en,
  bandeira = EXCLUDED.bandeira,
  formato_telefone = EXCLUDED.formato_telefone,
  digitos_min = EXCLUDED.digitos_min,
  digitos_max = EXCLUDED.digitos_max;

-- Habilitar RLS na tabela de países
ALTER TABLE yeslaser_paises ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública para países
CREATE POLICY IF NOT EXISTS "Paises são publicos para leitura"
  ON yeslaser_paises FOR SELECT
  USING (true);

-- =====================================================
-- FUNÇÃO AUXILIAR: Formatar telefone internacional
-- =====================================================

CREATE OR REPLACE FUNCTION format_international_phone(
  phone text,
  country_code text DEFAULT '55'
) RETURNS text AS $$
DECLARE
  clean_phone text;
  formatted text;
BEGIN
  -- Limpar telefone (apenas números)
  clean_phone := regexp_replace(phone, '[^0-9]', '', 'g');

  -- Se vazio, retornar vazio
  IF clean_phone IS NULL OR clean_phone = '' THEN
    RETURN '';
  END IF;

  -- Formatar baseado no país
  CASE country_code
    WHEN '55' THEN
      -- Brasil: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
      IF length(clean_phone) = 11 THEN
        formatted := '(' || substring(clean_phone, 1, 2) || ') ' ||
                     substring(clean_phone, 3, 5) || '-' ||
                     substring(clean_phone, 8, 4);
      ELSIF length(clean_phone) = 10 THEN
        formatted := '(' || substring(clean_phone, 1, 2) || ') ' ||
                     substring(clean_phone, 3, 4) || '-' ||
                     substring(clean_phone, 7, 4);
      ELSE
        formatted := clean_phone;
      END IF;
    WHEN '1' THEN
      -- USA: (XXX) XXX-XXXX
      IF length(clean_phone) = 10 THEN
        formatted := '(' || substring(clean_phone, 1, 3) || ') ' ||
                     substring(clean_phone, 4, 3) || '-' ||
                     substring(clean_phone, 7, 4);
      ELSE
        formatted := clean_phone;
      END IF;
    WHEN '351' THEN
      -- Portugal: XXX XXX XXX
      IF length(clean_phone) = 9 THEN
        formatted := substring(clean_phone, 1, 3) || ' ' ||
                     substring(clean_phone, 4, 3) || ' ' ||
                     substring(clean_phone, 7, 3);
      ELSE
        formatted := clean_phone;
      END IF;
    ELSE
      -- Outros países: retornar apenas os números limpos
      formatted := clean_phone;
  END CASE;

  RETURN '+' || country_code || ' ' || formatted;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- FUNÇÃO AUXILIAR: Formatar para WhatsApp API
-- =====================================================

CREATE OR REPLACE FUNCTION format_phone_for_whatsapp(
  phone text,
  country_code text DEFAULT '55'
) RETURNS text AS $$
DECLARE
  clean_phone text;
BEGIN
  -- Limpar telefone (apenas números)
  clean_phone := regexp_replace(phone, '[^0-9]', '', 'g');

  -- Se vazio, retornar vazio
  IF clean_phone IS NULL OR clean_phone = '' THEN
    RETURN '';
  END IF;

  -- Retornar no formato WAHA: código_país + número + @c.us
  RETURN country_code || clean_phone || '@c.us';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_leads_telefone_codigo_pais ON sistema_leads_yeslaser(telefone_codigo_pais);
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp_codigo_pais ON sistema_leads_yeslaser(whatsapp_codigo_pais);
CREATE INDEX IF NOT EXISTS idx_influenciadoras_whatsapp_codigo_pais ON yeslaser_influenciadoras(whatsapp_codigo_pais);
CREATE INDEX IF NOT EXISTS idx_parcerias_responsavel_whatsapp_codigo_pais ON yeslaser_parcerias(responsavel_whatsapp_codigo_pais);
CREATE INDEX IF NOT EXISTS idx_paises_ativo ON yeslaser_paises(ativo, ordem);

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration concluída com sucesso!';
  RAISE NOTICE 'Campos adicionados:';
  RAISE NOTICE '  - sistema_leads_yeslaser: telefone_codigo_pais, whatsapp_codigo_pais, telefone_secundario_codigo_pais, contato_emergencia_telefone_codigo_pais';
  RAISE NOTICE '  - yeslaser_influenciadoras: telefone_codigo_pais, whatsapp_codigo_pais';
  RAISE NOTICE '  - yeslaser_parcerias: responsavel_telefone_codigo_pais, responsavel_whatsapp_codigo_pais';
  RAISE NOTICE '  - yeslaser_parceria_contatos: telefone_codigo_pais, whatsapp_codigo_pais';
  RAISE NOTICE 'Tabela criada: yeslaser_paises (50 países)';
  RAISE NOTICE 'Funções criadas: format_international_phone(), format_phone_for_whatsapp()';
END $$;

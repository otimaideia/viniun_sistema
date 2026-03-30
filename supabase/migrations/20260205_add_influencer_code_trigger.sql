-- =============================================================================
-- Migration: Adicionar trigger para gerar código de indicação automático
-- Data: 2026-02-05
-- Descrição: Cria função e trigger para gerar código único ao criar influenciadora
-- =============================================================================

-- Função para gerar código de indicação único
CREATE OR REPLACE FUNCTION generate_influencer_code()
RETURNS TRIGGER AS $$
DECLARE
  base_code TEXT;
  final_code TEXT;
  attempt INT := 0;
  max_attempts INT := 10;
BEGIN
  -- Se já tem código, não gera
  IF NEW.codigo IS NOT NULL AND NEW.codigo != '' THEN
    RETURN NEW;
  END IF;

  -- Gera código base a partir do nome artístico ou nome completo
  IF NEW.nome_artistico IS NOT NULL AND NEW.nome_artistico != '' THEN
    -- Remove @ se houver, pega primeiras letras
    base_code := UPPER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(NEW.nome_artistico, '^@', ''),
        '[^A-Za-z0-9]',
        ''
      )
    );
  ELSE
    -- Usa nome completo
    base_code := UPPER(
      REGEXP_REPLACE(
        SPLIT_PART(NEW.nome, ' ', 1),
        '[^A-Za-z0-9]',
        ''
      )
    );
  END IF;

  -- Limita a 6 caracteres
  base_code := SUBSTRING(base_code FROM 1 FOR 6);

  -- Tenta gerar código único
  WHILE attempt < max_attempts LOOP
    IF attempt = 0 THEN
      final_code := base_code;
    ELSE
      -- Adiciona número sequencial
      final_code := base_code || LPAD(attempt::TEXT, 2, '0');
    END IF;

    -- Verifica se código já existe no mesmo tenant
    IF NOT EXISTS (
      SELECT 1 FROM mt_influencers
      WHERE codigo = final_code
      AND tenant_id = NEW.tenant_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    ) THEN
      NEW.codigo := final_code;
      RETURN NEW;
    END IF;

    attempt := attempt + 1;
  END LOOP;

  -- Se não conseguiu gerar código único, usa random
  NEW.codigo := base_code || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar código antes do INSERT
DROP TRIGGER IF EXISTS trigger_generate_influencer_code ON mt_influencers;
CREATE TRIGGER trigger_generate_influencer_code
  BEFORE INSERT ON mt_influencers
  FOR EACH ROW
  EXECUTE FUNCTION generate_influencer_code();

-- Comentários
COMMENT ON FUNCTION generate_influencer_code() IS 'Gera código de indicação único para influenciadoras baseado no nome artístico ou nome completo';

-- Gerar códigos para influenciadoras existentes que não têm código
WITH numbered AS (
  SELECT
    id,
    UPPER(
      SUBSTRING(
        REGEXP_REPLACE(
          COALESCE(
            REGEXP_REPLACE(nome_artistico, '^@', ''),
            SPLIT_PART(nome, ' ', 1)
          ),
          '[^A-Za-z0-9]',
          ''
        )
        FROM 1 FOR 6
      )
    ) || LPAD((ROW_NUMBER() OVER (ORDER BY created_at))::TEXT, 2, '0') as new_code
  FROM mt_influencers
  WHERE codigo IS NULL OR codigo = ''
)
UPDATE mt_influencers
SET codigo = numbered.new_code
FROM numbered
WHERE mt_influencers.id = numbered.id;

-- Verificar se há códigos duplicados
DO $$
DECLARE
  dup_count INT;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT codigo, COUNT(*) as cnt
    FROM mt_influencers
    WHERE codigo IS NOT NULL
    GROUP BY codigo
    HAVING COUNT(*) > 1
  ) dups;

  IF dup_count > 0 THEN
    RAISE WARNING 'Existem % códigos duplicados. Execute UPDATE manual para corrigir.', dup_count;
  ELSE
    RAISE NOTICE 'Todos os códigos são únicos. Trigger instalado com sucesso!';
  END IF;
END $$;

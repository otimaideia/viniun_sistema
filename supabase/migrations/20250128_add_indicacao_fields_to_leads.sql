-- Migration: 20250128_add_indicacao_fields_to_leads.sql
-- Purpose: Adicionar campos para sistema de indicacao em cadeia (modelo Wise Up)
-- Author: Claude + Danilo
-- Date: 2025-01-28

-- ROLLBACK PLAN:
-- BEGIN;
-- DROP TRIGGER IF EXISTS trigger_gerar_codigo_indicacao ON sistema_leads_yeslaser;
-- DROP TRIGGER IF EXISTS trigger_contador_indicacoes ON sistema_leads_yeslaser;
-- DROP FUNCTION IF EXISTS gerar_codigo_indicacao();
-- DROP FUNCTION IF EXISTS atualizar_contador_indicacoes();
-- DROP INDEX IF EXISTS idx_leads_indicado_por;
-- DROP INDEX IF EXISTS idx_leads_codigo_indicacao;
-- ALTER TABLE sistema_leads_yeslaser DROP COLUMN IF EXISTS indicado_por_id;
-- ALTER TABLE sistema_leads_yeslaser DROP COLUMN IF EXISTS quantidade_indicacoes;
-- ALTER TABLE sistema_leads_yeslaser DROP COLUMN IF EXISTS codigo_indicacao;
-- ALTER TABLE sistema_leads_yeslaser DROP COLUMN IF EXISTS aceita_contato;
-- ALTER TABLE sistema_leads_yeslaser DROP COLUMN IF EXISTS campanha;
-- ALTER TABLE sistema_leads_yeslaser DROP COLUMN IF EXISTS landing_page;
-- COMMIT;

-- AFFECTED TABLES: sistema_leads_yeslaser

-- CHANGES:
-- 1. Add indicado_por_id (self-reference FK) for chain tracking
-- 2. Add quantidade_indicacoes counter
-- 3. Add codigo_indicacao unique code for sharing
-- 4. Add aceita_contato boolean
-- 5. Add campanha and landing_page for tracking
-- 6. Create triggers for auto-generating code and updating counter

BEGIN;

-- Step 1: Add indication fields
ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS indicado_por_id uuid REFERENCES sistema_leads_yeslaser(id) ON DELETE SET NULL;

ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS quantidade_indicacoes integer DEFAULT 0;

ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS codigo_indicacao varchar(10) UNIQUE;

ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS aceita_contato boolean DEFAULT true;

ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS campanha varchar(100);

ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS landing_page varchar(255);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_indicado_por
ON sistema_leads_yeslaser(indicado_por_id)
WHERE indicado_por_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_codigo_indicacao
ON sistema_leads_yeslaser(codigo_indicacao)
WHERE codigo_indicacao IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_campanha
ON sistema_leads_yeslaser(campanha)
WHERE campanha IS NOT NULL;

-- Step 3: Create function to generate unique indication code
CREATE OR REPLACE FUNCTION gerar_codigo_indicacao()
RETURNS TRIGGER AS $$
DECLARE
  novo_codigo varchar(10);
  tentativas integer := 0;
BEGIN
  -- Only generate if not provided and it's a new record
  IF NEW.codigo_indicacao IS NULL THEN
    LOOP
      -- Generate 6-character alphanumeric code
      novo_codigo := UPPER(SUBSTR(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 6));

      -- Check if code already exists
      IF NOT EXISTS (SELECT 1 FROM sistema_leads_yeslaser WHERE codigo_indicacao = novo_codigo) THEN
        NEW.codigo_indicacao := novo_codigo;
        EXIT;
      END IF;

      tentativas := tentativas + 1;
      IF tentativas > 100 THEN
        -- Fallback: use 8 characters
        NEW.codigo_indicacao := UPPER(SUBSTR(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 8));
        EXIT;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger for code generation
DROP TRIGGER IF EXISTS trigger_gerar_codigo_indicacao ON sistema_leads_yeslaser;
CREATE TRIGGER trigger_gerar_codigo_indicacao
BEFORE INSERT ON sistema_leads_yeslaser
FOR EACH ROW EXECUTE FUNCTION gerar_codigo_indicacao();

-- Step 5: Create function to update indication counter
CREATE OR REPLACE FUNCTION atualizar_contador_indicacoes()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT: increment counter of the person who referred
  IF TG_OP = 'INSERT' AND NEW.indicado_por_id IS NOT NULL THEN
    UPDATE sistema_leads_yeslaser
    SET quantidade_indicacoes = quantidade_indicacoes + 1
    WHERE id = NEW.indicado_por_id;
  END IF;

  -- On UPDATE: handle reference changes
  IF TG_OP = 'UPDATE' THEN
    -- If reference was removed
    IF OLD.indicado_por_id IS NOT NULL AND NEW.indicado_por_id IS NULL THEN
      UPDATE sistema_leads_yeslaser
      SET quantidade_indicacoes = GREATEST(quantidade_indicacoes - 1, 0)
      WHERE id = OLD.indicado_por_id;
    -- If reference was changed
    ELSIF OLD.indicado_por_id IS DISTINCT FROM NEW.indicado_por_id THEN
      -- Decrement old referrer
      IF OLD.indicado_por_id IS NOT NULL THEN
        UPDATE sistema_leads_yeslaser
        SET quantidade_indicacoes = GREATEST(quantidade_indicacoes - 1, 0)
        WHERE id = OLD.indicado_por_id;
      END IF;
      -- Increment new referrer
      IF NEW.indicado_por_id IS NOT NULL THEN
        UPDATE sistema_leads_yeslaser
        SET quantidade_indicacoes = quantidade_indicacoes + 1
        WHERE id = NEW.indicado_por_id;
      END IF;
    END IF;
  END IF;

  -- On DELETE: decrement counter
  IF TG_OP = 'DELETE' AND OLD.indicado_por_id IS NOT NULL THEN
    UPDATE sistema_leads_yeslaser
    SET quantidade_indicacoes = GREATEST(quantidade_indicacoes - 1, 0)
    WHERE id = OLD.indicado_por_id;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger for counter updates
DROP TRIGGER IF EXISTS trigger_contador_indicacoes ON sistema_leads_yeslaser;
CREATE TRIGGER trigger_contador_indicacoes
AFTER INSERT OR UPDATE OR DELETE ON sistema_leads_yeslaser
FOR EACH ROW EXECUTE FUNCTION atualizar_contador_indicacoes();

-- Step 7: Add comments for documentation
COMMENT ON COLUMN sistema_leads_yeslaser.indicado_por_id IS 'ID do lead que fez a indicacao (self-reference para cadeia)';
COMMENT ON COLUMN sistema_leads_yeslaser.quantidade_indicacoes IS 'Quantidade de leads indicados por este lead';
COMMENT ON COLUMN sistema_leads_yeslaser.codigo_indicacao IS 'Codigo unico de 6 caracteres para compartilhamento de indicacao';
COMMENT ON COLUMN sistema_leads_yeslaser.aceita_contato IS 'Se o lead aceita ser contatado';
COMMENT ON COLUMN sistema_leads_yeslaser.campanha IS 'Nome da campanha/promocao de origem';
COMMENT ON COLUMN sistema_leads_yeslaser.landing_page IS 'URL da landing page de origem';

COMMIT;

-- Post-migration validation
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'sistema_leads_yeslaser'
AND column_name IN ('indicado_por_id', 'quantidade_indicacoes', 'codigo_indicacao', 'aceita_contato', 'campanha', 'landing_page')
ORDER BY ordinal_position;

-- Verify triggers
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'sistema_leads_yeslaser'
AND trigger_name LIKE '%indicacao%';

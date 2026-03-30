-- Migration: 20250127_add_slug_to_franqueados.sql
-- Purpose: Adicionar campo slug para URLs amigaveis do totem/portal
-- Author: Claude + Danilo
-- Date: 2025-01-27

-- ROLLBACK PLAN:
-- BEGIN;
-- DROP INDEX IF EXISTS idx_franqueados_slug;
-- ALTER TABLE yeslaser_franqueados DROP COLUMN IF EXISTS slug;
-- COMMIT;

BEGIN;

-- Step 1: Add slug column
ALTER TABLE yeslaser_franqueados
ADD COLUMN IF NOT EXISTS slug varchar(100) DEFAULT NULL;

-- Step 2: Create unique index for slug lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_franqueados_slug
ON yeslaser_franqueados(slug)
WHERE slug IS NOT NULL;

-- Step 3: Populate slugs from nome_fantasia (remove acentos e caracteres especiais)
UPDATE yeslaser_franqueados
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      TRANSLATE(nome_fantasia,
        'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖØòóôõöøÙÚÛÜùúûüÇçÑñ',
        'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOOooooooUUUUuuuuCcNn'
      ),
      '[^a-zA-Z0-9]+', '-', 'g'
    ),
    '(^-|-$)', '', 'g'
  )
)
WHERE slug IS NULL AND nome_fantasia IS NOT NULL;

-- Step 4: Add comment for documentation
COMMENT ON COLUMN yeslaser_franqueados.slug IS 'Slug para URL amigavel (ex: yeslaser-altamira) usado no totem e portal';

COMMIT;

-- Post-migration validation
SELECT id, nome_fantasia, slug
FROM yeslaser_franqueados
ORDER BY nome_fantasia
LIMIT 10;

-- Migration: 20250127_add_cpf_to_leads.sql
-- Purpose: Adicionar campo CPF para identificacao de clientes no totem/portal
-- Author: Claude + Danilo
-- Date: 2025-01-27

-- ROLLBACK PLAN:
-- BEGIN;
-- DROP INDEX IF EXISTS idx_leads_cpf;
-- ALTER TABLE sistema_leads_yeslaser DROP COLUMN IF EXISTS cpf;
-- COMMIT;

BEGIN;

-- Step 1: Add CPF column
ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS cpf varchar(14) DEFAULT NULL;

-- Step 2: Create index for CPF lookup (performance)
CREATE INDEX IF NOT EXISTS idx_leads_cpf
ON sistema_leads_yeslaser(cpf)
WHERE cpf IS NOT NULL;

-- Step 3: Add comment for documentation
COMMENT ON COLUMN sistema_leads_yeslaser.cpf IS 'CPF do cliente (formato: 000.000.000-00) para identificacao no totem e portal';

COMMIT;

-- Post-migration validation
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sistema_leads_yeslaser' AND column_name = 'cpf';

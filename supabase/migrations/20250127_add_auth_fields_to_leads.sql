-- Migration: 20250127_add_auth_fields_to_leads.sql
-- Purpose: Adicionar campos para autenticacao do cliente no portal
-- Author: Claude + Danilo
-- Date: 2025-01-27

-- ROLLBACK PLAN:
-- BEGIN;
-- DROP INDEX IF EXISTS idx_leads_codigo_verificacao;
-- ALTER TABLE sistema_leads_yeslaser DROP COLUMN IF EXISTS codigo_verificacao;
-- ALTER TABLE sistema_leads_yeslaser DROP COLUMN IF EXISTS codigo_expira_em;
-- ALTER TABLE sistema_leads_yeslaser DROP COLUMN IF EXISTS ultimo_login;
-- COMMIT;

BEGIN;

-- Step 1: Add authentication fields
ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS codigo_verificacao varchar(6) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS codigo_expira_em timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ultimo_login timestamp with time zone DEFAULT NULL;

-- Step 2: Create index for verification code lookup
CREATE INDEX IF NOT EXISTS idx_leads_codigo_verificacao
ON sistema_leads_yeslaser(codigo_verificacao)
WHERE codigo_verificacao IS NOT NULL;

-- Step 3: Add comments for documentation
COMMENT ON COLUMN sistema_leads_yeslaser.codigo_verificacao IS 'Codigo de 6 digitos para autenticacao temporaria no portal';
COMMENT ON COLUMN sistema_leads_yeslaser.codigo_expira_em IS 'Data/hora de expiracao do codigo de verificacao (5 minutos)';
COMMENT ON COLUMN sistema_leads_yeslaser.ultimo_login IS 'Data/hora do ultimo login no portal do cliente';

COMMIT;

-- Post-migration validation
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sistema_leads_yeslaser'
  AND column_name IN ('codigo_verificacao', 'codigo_expira_em', 'ultimo_login')
ORDER BY column_name;

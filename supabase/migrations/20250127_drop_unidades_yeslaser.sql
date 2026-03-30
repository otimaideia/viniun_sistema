-- Migration: 20250127_drop_unidades_yeslaser.sql
-- Purpose: Remove tabela unidades_yeslaser (dados consolidados em yeslaser_franqueados)
-- Author: Claude + Danilo
-- Date: 2025-01-27

-- ROLLBACK PLAN:
-- Esta operação é destrutiva. Para reverter, seria necessário recriar a tabela
-- e reimportar os dados de um backup.
-- Se necessário, executar backup antes:
-- pg_dump -t unidades_yeslaser > backup_unidades_yeslaser.sql

-- Verificação: não há foreign keys apontando para esta tabela (verificado)

BEGIN;

-- Step 1: Drop the table
DROP TABLE IF EXISTS unidades_yeslaser CASCADE;

-- Step 2: Also drop yeslaser_unidades if it exists (alias/duplicate)
DROP TABLE IF EXISTS yeslaser_unidades CASCADE;

COMMIT;

-- Post-migration validation
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('unidades_yeslaser', 'yeslaser_unidades');
-- Expected result: empty (no rows)

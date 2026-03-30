-- Migration: 20260314_001_influencer_guardian.sql
-- Purpose: Adicionar campos de responsável legal para influenciadoras menores de idade
-- Date: 2026-03-14

-- Campos de menor de idade e responsável legal
ALTER TABLE mt_influencers ADD COLUMN IF NOT EXISTS eh_menor BOOLEAN DEFAULT false;
ALTER TABLE mt_influencers ADD COLUMN IF NOT EXISTS responsavel_legal_nome VARCHAR(255);
ALTER TABLE mt_influencers ADD COLUMN IF NOT EXISTS responsavel_legal_cpf VARCHAR(14);
ALTER TABLE mt_influencers ADD COLUMN IF NOT EXISTS responsavel_legal_rg VARCHAR(20);
ALTER TABLE mt_influencers ADD COLUMN IF NOT EXISTS responsavel_legal_email VARCHAR(255);
ALTER TABLE mt_influencers ADD COLUMN IF NOT EXISTS responsavel_legal_telefone VARCHAR(20);
ALTER TABLE mt_influencers ADD COLUMN IF NOT EXISTS responsavel_legal_parentesco VARCHAR(50);

-- Index parcial para consultas de menores
CREATE INDEX IF NOT EXISTS idx_mt_influencers_eh_menor ON mt_influencers(eh_menor) WHERE eh_menor = true;

-- ROLLBACK:
-- ALTER TABLE mt_influencers DROP COLUMN IF EXISTS eh_menor;
-- ALTER TABLE mt_influencers DROP COLUMN IF EXISTS responsavel_legal_nome;
-- ALTER TABLE mt_influencers DROP COLUMN IF EXISTS responsavel_legal_cpf;
-- ALTER TABLE mt_influencers DROP COLUMN IF EXISTS responsavel_legal_rg;
-- ALTER TABLE mt_influencers DROP COLUMN IF EXISTS responsavel_legal_email;
-- ALTER TABLE mt_influencers DROP COLUMN IF EXISTS responsavel_legal_telefone;
-- ALTER TABLE mt_influencers DROP COLUMN IF EXISTS responsavel_legal_parentesco;
-- DROP INDEX IF EXISTS idx_mt_influencers_eh_menor;

-- Migration: 20250126_add_duracao_imagem_servicos.sql
-- Purpose: Adicionar campos de duração e galeria de imagens para serviços
-- Author: Claude + Danilo
-- Date: 2025-01-26

-- ROLLBACK PLAN:
-- BEGIN;
-- DROP TABLE IF EXISTS yeslaser_servico_imagens;
-- ALTER TABLE yeslaser_servicos DROP COLUMN IF EXISTS duracao_minutos;
-- ALTER TABLE yeslaser_servicos DROP COLUMN IF EXISTS imagem_url;
-- COMMIT;

BEGIN;

-- Step 1: Add duracao_minutos column (tempo do procedimento em minutos)
ALTER TABLE yeslaser_servicos
ADD COLUMN IF NOT EXISTS duracao_minutos integer DEFAULT NULL;

-- Step 2: Add imagem_url column (URL da imagem principal/capa do serviço)
ALTER TABLE yeslaser_servicos
ADD COLUMN IF NOT EXISTS imagem_url text DEFAULT NULL;

-- Step 3: Create table for multiple images per service (gallery)
CREATE TABLE IF NOT EXISTS yeslaser_servico_imagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id uuid NOT NULL REFERENCES yeslaser_servicos(id) ON DELETE CASCADE,
  url text NOT NULL,
  ordem integer DEFAULT 0,
  legenda text,
  created_at timestamp with time zone DEFAULT now()
);

-- Step 4: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_servico_imagens_servico_id ON yeslaser_servico_imagens(servico_id);
CREATE INDEX IF NOT EXISTS idx_servico_imagens_ordem ON yeslaser_servico_imagens(servico_id, ordem);

-- Step 5: Enable RLS on the new table
ALTER TABLE yeslaser_servico_imagens ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policy (allow all authenticated users to read/write)
CREATE POLICY "Allow all operations for authenticated users" ON yeslaser_servico_imagens
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Step 7: Add comments for documentation
COMMENT ON TABLE yeslaser_servico_imagens IS 'Galeria de imagens para serviços (múltiplas fotos por serviço)';
COMMENT ON COLUMN yeslaser_servicos.duracao_minutos IS 'Tempo estimado do procedimento em minutos (controle interno)';
COMMENT ON COLUMN yeslaser_servicos.imagem_url IS 'URL da imagem principal/capa do serviço';
COMMENT ON COLUMN yeslaser_servico_imagens.url IS 'URL da imagem';
COMMENT ON COLUMN yeslaser_servico_imagens.ordem IS 'Ordem de exibição na galeria (0 = primeira)';
COMMENT ON COLUMN yeslaser_servico_imagens.legenda IS 'Legenda opcional da imagem';

COMMIT;

-- Post-migration validation
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'yeslaser_servicos'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'yeslaser_servico_imagens'
ORDER BY ordinal_position;

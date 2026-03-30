-- Migration: 20250128_create_indicacoes_historico.sql
-- Purpose: Criar tabela de historico de indicacoes para auditoria
-- Author: Claude + Danilo
-- Date: 2025-01-28

-- ROLLBACK PLAN:
-- BEGIN;
-- DROP TRIGGER IF EXISTS trigger_registrar_indicacao ON sistema_leads_yeslaser;
-- DROP FUNCTION IF EXISTS registrar_indicacao_historico();
-- DROP TABLE IF EXISTS yeslaser_indicacoes_historico;
-- COMMIT;

BEGIN;

-- Step 1: Create indication history table
CREATE TABLE IF NOT EXISTS yeslaser_indicacoes_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_indicador_id uuid NOT NULL REFERENCES sistema_leads_yeslaser(id) ON DELETE CASCADE,
  lead_indicado_id uuid NOT NULL REFERENCES sistema_leads_yeslaser(id) ON DELETE CASCADE,
  campanha varchar(100),
  landing_page varchar(255),
  data_indicacao timestamp DEFAULT now(),
  status varchar(50) DEFAULT 'pendente', -- pendente, convertido, perdido, cancelado
  data_conversao timestamp,
  observacoes text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),

  -- Prevent duplicate entries
  UNIQUE(lead_indicador_id, lead_indicado_id)
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_historico_indicador
ON yeslaser_indicacoes_historico(lead_indicador_id);

CREATE INDEX IF NOT EXISTS idx_historico_indicado
ON yeslaser_indicacoes_historico(lead_indicado_id);

CREATE INDEX IF NOT EXISTS idx_historico_status
ON yeslaser_indicacoes_historico(status);

CREATE INDEX IF NOT EXISTS idx_historico_campanha
ON yeslaser_indicacoes_historico(campanha)
WHERE campanha IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_historico_data
ON yeslaser_indicacoes_historico(data_indicacao);

-- Step 3: Create function to auto-register indication in history
CREATE OR REPLACE FUNCTION registrar_indicacao_historico()
RETURNS TRIGGER AS $$
BEGIN
  -- Only register if indicado_por_id is set
  IF NEW.indicado_por_id IS NOT NULL THEN
    -- Check if not already registered
    IF NOT EXISTS (
      SELECT 1 FROM yeslaser_indicacoes_historico
      WHERE lead_indicador_id = NEW.indicado_por_id
      AND lead_indicado_id = NEW.id
    ) THEN
      INSERT INTO yeslaser_indicacoes_historico (
        lead_indicador_id,
        lead_indicado_id,
        campanha,
        landing_page,
        data_indicacao,
        status
      ) VALUES (
        NEW.indicado_por_id,
        NEW.id,
        NEW.campanha,
        NEW.landing_page,
        now(),
        'pendente'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger to auto-register indications
DROP TRIGGER IF EXISTS trigger_registrar_indicacao ON sistema_leads_yeslaser;
CREATE TRIGGER trigger_registrar_indicacao
AFTER INSERT ON sistema_leads_yeslaser
FOR EACH ROW
WHEN (NEW.indicado_por_id IS NOT NULL)
EXECUTE FUNCTION registrar_indicacao_historico();

-- Step 5: Create function to update history on lead status change
CREATE OR REPLACE FUNCTION atualizar_historico_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When lead status changes to a "converted" state, update history
  IF NEW.status IN ('ganho', 'convertido', 'cliente', 'fechado')
     AND (OLD.status IS NULL OR OLD.status NOT IN ('ganho', 'convertido', 'cliente', 'fechado')) THEN
    UPDATE yeslaser_indicacoes_historico
    SET
      status = 'convertido',
      data_conversao = now(),
      updated_at = now()
    WHERE lead_indicado_id = NEW.id;
  END IF;

  -- When lead status changes to a "lost" state, update history
  IF NEW.status IN ('perdido', 'cancelado', 'desqualificado')
     AND (OLD.status IS NULL OR OLD.status NOT IN ('perdido', 'cancelado', 'desqualificado')) THEN
    UPDATE yeslaser_indicacoes_historico
    SET
      status = 'perdido',
      updated_at = now()
    WHERE lead_indicado_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger for status updates
DROP TRIGGER IF EXISTS trigger_atualizar_historico_status ON sistema_leads_yeslaser;
CREATE TRIGGER trigger_atualizar_historico_status
AFTER UPDATE OF status ON sistema_leads_yeslaser
FOR EACH ROW
EXECUTE FUNCTION atualizar_historico_status();

-- Step 7: Add comments for documentation
COMMENT ON TABLE yeslaser_indicacoes_historico IS 'Historico de indicacoes entre leads para auditoria e metricas';
COMMENT ON COLUMN yeslaser_indicacoes_historico.lead_indicador_id IS 'Lead que fez a indicacao';
COMMENT ON COLUMN yeslaser_indicacoes_historico.lead_indicado_id IS 'Lead que foi indicado';
COMMENT ON COLUMN yeslaser_indicacoes_historico.status IS 'Status da indicacao: pendente, convertido, perdido, cancelado';
COMMENT ON COLUMN yeslaser_indicacoes_historico.data_conversao IS 'Data em que o lead indicado foi convertido';

COMMIT;

-- Post-migration validation
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'yeslaser_indicacoes_historico'
ORDER BY ordinal_position;

-- Migration: 20250127_create_checkins.sql
-- Purpose: Criar tabela de historico de check-ins para totem e portal
-- Author: Claude + Danilo
-- Date: 2025-01-27

-- ROLLBACK PLAN:
-- BEGIN;
-- DROP TABLE IF EXISTS yeslaser_checkins;
-- COMMIT;

BEGIN;

-- Step 1: Create check-ins table
CREATE TABLE IF NOT EXISTS yeslaser_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id uuid NOT NULL REFERENCES yeslaser_agendamentos(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES sistema_leads_yeslaser(id) ON DELETE CASCADE,
  unidade_id uuid NOT NULL REFERENCES yeslaser_franqueados(id) ON DELETE CASCADE,
  data_checkin timestamp with time zone DEFAULT now(),
  metodo varchar(20) DEFAULT 'cpf', -- 'cpf', 'telefone', 'portal'
  ip_address varchar(45) DEFAULT NULL, -- IPv4 ou IPv6
  user_agent text DEFAULT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_checkins_agendamento ON yeslaser_checkins(agendamento_id);
CREATE INDEX IF NOT EXISTS idx_checkins_lead ON yeslaser_checkins(lead_id);
CREATE INDEX IF NOT EXISTS idx_checkins_unidade ON yeslaser_checkins(unidade_id);
CREATE INDEX IF NOT EXISTS idx_checkins_data ON yeslaser_checkins(data_checkin);

-- Step 3: Enable RLS
ALTER TABLE yeslaser_checkins ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
-- Permitir criar check-in publicamente (totem e portal)
CREATE POLICY "Checkins podem ser criados publicamente" ON yeslaser_checkins
  FOR INSERT
  WITH CHECK (true);

-- Leitura apenas para usuarios autenticados do painel
CREATE POLICY "Checkins lidos por autenticados" ON yeslaser_checkins
  FOR SELECT
  TO authenticated
  USING (true);

-- Step 5: Add comments for documentation
COMMENT ON TABLE yeslaser_checkins IS 'Historico de check-ins realizados no totem presencial ou portal do cliente';
COMMENT ON COLUMN yeslaser_checkins.metodo IS 'Metodo de identificacao usado: cpf, telefone, ou portal (autenticado)';
COMMENT ON COLUMN yeslaser_checkins.ip_address IS 'Endereco IP do dispositivo que realizou o check-in';
COMMENT ON COLUMN yeslaser_checkins.user_agent IS 'User agent do navegador/dispositivo';

COMMIT;

-- Post-migration validation
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'yeslaser_checkins'
ORDER BY ordinal_position;

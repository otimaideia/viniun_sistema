-- Migration: Add campanha_id to leads
-- Purpose: Link leads to marketing campaigns for tracking and analytics
-- Date: 2025-01-27

-- Step 1: Add campanha_id column to leads table
ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS campanha_id uuid REFERENCES yeslaser_marketing_campanhas(id) ON DELETE SET NULL;

-- Step 2: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_campanha_id ON sistema_leads_yeslaser(campanha_id);

-- Step 3: Add ROI tracking fields to campaigns table
ALTER TABLE yeslaser_marketing_campanhas
ADD COLUMN IF NOT EXISTS budget_real numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS leads_gerados integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS conversoes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS receita_gerada numeric(10,2) DEFAULT 0;

-- Step 4: Create function to auto-update lead count on campaigns
CREATE OR REPLACE FUNCTION update_campanha_lead_count()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT
  IF TG_OP = 'INSERT' AND NEW.campanha_id IS NOT NULL THEN
    UPDATE yeslaser_marketing_campanhas
    SET leads_gerados = (
      SELECT COUNT(*) FROM sistema_leads_yeslaser WHERE campanha_id = NEW.campanha_id
    )
    WHERE id = NEW.campanha_id;
  END IF;

  -- On UPDATE (when campanha_id changes)
  IF TG_OP = 'UPDATE' THEN
    -- Update old campaign count
    IF OLD.campanha_id IS NOT NULL THEN
      UPDATE yeslaser_marketing_campanhas
      SET leads_gerados = (
        SELECT COUNT(*) FROM sistema_leads_yeslaser WHERE campanha_id = OLD.campanha_id
      )
      WHERE id = OLD.campanha_id;
    END IF;
    -- Update new campaign count
    IF NEW.campanha_id IS NOT NULL THEN
      UPDATE yeslaser_marketing_campanhas
      SET leads_gerados = (
        SELECT COUNT(*) FROM sistema_leads_yeslaser WHERE campanha_id = NEW.campanha_id
      )
      WHERE id = NEW.campanha_id;
    END IF;
  END IF;

  -- On DELETE
  IF TG_OP = 'DELETE' AND OLD.campanha_id IS NOT NULL THEN
    UPDATE yeslaser_marketing_campanhas
    SET leads_gerados = (
      SELECT COUNT(*) FROM sistema_leads_yeslaser WHERE campanha_id = OLD.campanha_id
    )
    WHERE id = OLD.campanha_id;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to auto-update lead count
DROP TRIGGER IF EXISTS trg_update_campanha_lead_count ON sistema_leads_yeslaser;
CREATE TRIGGER trg_update_campanha_lead_count
AFTER INSERT OR UPDATE OF campanha_id OR DELETE ON sistema_leads_yeslaser
FOR EACH ROW
EXECUTE FUNCTION update_campanha_lead_count();

-- Step 6: Create function to auto-update conversion count
CREATE OR REPLACE FUNCTION update_campanha_conversao_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to 'Cliente Efetivo'
  IF TG_OP = 'UPDATE' AND NEW.campanha_id IS NOT NULL THEN
    IF NEW.status = 'Cliente Efetivo' AND (OLD.status IS NULL OR OLD.status != 'Cliente Efetivo') THEN
      UPDATE yeslaser_marketing_campanhas
      SET conversoes = (
        SELECT COUNT(*) FROM sistema_leads_yeslaser
        WHERE campanha_id = NEW.campanha_id AND status = 'Cliente Efetivo'
      )
      WHERE id = NEW.campanha_id;
    ELSIF NEW.status != 'Cliente Efetivo' AND OLD.status = 'Cliente Efetivo' THEN
      UPDATE yeslaser_marketing_campanhas
      SET conversoes = (
        SELECT COUNT(*) FROM sistema_leads_yeslaser
        WHERE campanha_id = NEW.campanha_id AND status = 'Cliente Efetivo'
      )
      WHERE id = NEW.campanha_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger for conversion tracking
DROP TRIGGER IF EXISTS trg_update_campanha_conversao_count ON sistema_leads_yeslaser;
CREATE TRIGGER trg_update_campanha_conversao_count
AFTER UPDATE OF status ON sistema_leads_yeslaser
FOR EACH ROW
EXECUTE FUNCTION update_campanha_conversao_count();

-- Step 8: Initialize lead counts for existing campaigns
UPDATE yeslaser_marketing_campanhas c
SET leads_gerados = (
  SELECT COUNT(*) FROM sistema_leads_yeslaser l WHERE l.campanha_id = c.id
);

-- Step 9: Initialize conversion counts for existing campaigns
UPDATE yeslaser_marketing_campanhas c
SET conversoes = (
  SELECT COUNT(*) FROM sistema_leads_yeslaser l
  WHERE l.campanha_id = c.id AND l.status = 'Cliente Efetivo'
);

-- Post-migration validation
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'sistema_leads_yeslaser' AND column_name = 'campanha_id';

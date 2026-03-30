-- Migration: Remove duplicate WhatsApp user session table
-- Date: 2025-01-26
-- Purpose: yeslaser_whatsapp_usuario_sessoes is a duplicate of yeslaser_whatsapp_usuario_sessao
-- The table is empty so it's safe to remove

-- Verify table is empty before dropping (safety check)
DO $$
DECLARE
    row_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO row_count FROM yeslaser_whatsapp_usuario_sessoes;
    IF row_count > 0 THEN
        RAISE EXCEPTION 'Table yeslaser_whatsapp_usuario_sessoes is not empty! Has % rows', row_count;
    END IF;
END $$;

-- Drop the duplicate table
DROP TABLE IF EXISTS yeslaser_whatsapp_usuario_sessoes;

-- Add comment to the correct table
COMMENT ON TABLE yeslaser_whatsapp_usuario_sessao IS 'Links users to WhatsApp sessions with permissions (can_send, can_manage)';

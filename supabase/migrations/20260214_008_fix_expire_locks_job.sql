-- =============================================================================
-- FIX: Corrigir função expire_conversation_locks e configurar job
-- Data: 14/02/2026
-- =============================================================================

-- Melhorar função (já existente, mas sem logs e índice)
CREATE OR REPLACE FUNCTION expire_conversation_locks()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Expirar locks vencidos (lock_expires_at < NOW())
    UPDATE mt_whatsapp_conversations
    SET
        locked_by = NULL,
        locked_at = NULL,
        lock_expires_at = NULL,
        updated_at = NOW()
    WHERE lock_expires_at IS NOT NULL
      AND lock_expires_at < NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;

    IF v_count > 0 THEN
        RAISE NOTICE 'Expirados % locks de conversas', v_count;
    END IF;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION expire_conversation_locks IS
'Expira locks de conversa vencidos (lock_expires_at < NOW()). Retorna quantidade de locks expirados. Executar periodicamente via pg_cron a cada 1-5 minutos.';

-- Criar índice para otimizar query de expiração
CREATE INDEX IF NOT EXISTS idx_conversations_lock_expires_at
ON mt_whatsapp_conversations(lock_expires_at)
WHERE lock_expires_at IS NOT NULL;

-- =============================================================================
-- CONFIGURAÇÃO DE JOBS AUTOMÁTICOS (pg_cron)
-- =============================================================================

-- IMPORTANTE: pg_cron precisa estar instalado no Supabase Self-Hosted
-- Para verificar se está disponível:
--   SELECT * FROM pg_available_extensions WHERE name = 'pg_cron';

-- Se disponível, executar os comandos abaixo no Supabase SQL Editor:

-- 1. Habilitar extensão (apenas uma vez):
--    CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Agendar expiração de locks (a cada 1 minuto):
--    SELECT cron.schedule(
--        'expire-conversation-locks',
--        '* * * * *',
--        $$SELECT expire_conversation_locks()$$
--    );

-- 3. Agendar timeout de conversas presas (a cada 15 minutos):
--    SELECT cron.schedule(
--        'timeout-stuck-conversations',
--        '*/15 * * * *',
--        $$SELECT timeout_stuck_conversations(120)$$
--    );

-- Para verificar jobs agendados:
--    SELECT * FROM cron.job;

-- Para remover job:
--    SELECT cron.unschedule('expire-conversation-locks');

-- =============================================================================
-- ALTERNATIVA: Executar via Edge Function (se pg_cron não disponível)
-- =============================================================================

-- Criar Edge Function que executa a cada minuto via HTTP cron:
-- 1. Criar função em: supabase/functions/cron-expire-locks/index.ts
-- 2. Configurar webhook no cron-job.org ou similar para chamar a função

-- Exemplo de Edge Function:
-- import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
-- import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
--
-- serve(async (req) => {
--   const supabase = createClient(
--     Deno.env.get('SUPABASE_URL')!,
--     Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
--   )
--
--   const { data, error } = await supabase.rpc('expire_conversation_locks')
--
--   return new Response(JSON.stringify({ expired: data }))
-- })

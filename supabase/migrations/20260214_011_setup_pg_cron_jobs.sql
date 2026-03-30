-- =============================================================================
-- SETUP: Configurar pg_cron e agendar jobs automáticos
-- Data: 14/02/2026
-- =============================================================================

-- 1. Habilitar extensão pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

COMMENT ON EXTENSION pg_cron IS 'Job scheduler para PostgreSQL - executa tarefas agendadas';

-- 2. Remover jobs existentes (se houver)
SELECT cron.unschedule('expire-conversation-locks') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'expire-conversation-locks'
);

SELECT cron.unschedule('timeout-stuck-conversations') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'timeout-stuck-conversations'
);

-- 3. Agendar job: Expirar locks de conversas (a cada 1 minuto)
SELECT cron.schedule(
    'expire-conversation-locks',           -- Nome do job
    '* * * * *',                          -- Cron: todo minuto
    $$SELECT expire_conversation_locks()$$ -- SQL a executar
);

-- 4. Agendar job: Timeout de conversas presas (a cada 15 minutos)
SELECT cron.schedule(
    'timeout-stuck-conversations',              -- Nome do job
    '*/15 * * * *',                            -- Cron: a cada 15 minutos
    $$SELECT timeout_stuck_conversations(120)$$ -- 120 minutos = 2 horas
);

-- 5. Verificar jobs agendados
SELECT
    jobid,
    jobname,
    schedule,
    command,
    active
FROM cron.job
ORDER BY jobname;

COMMENT ON SCHEMA cron IS 'Schema do pg_cron - contém jobs agendados e histórico de execução';

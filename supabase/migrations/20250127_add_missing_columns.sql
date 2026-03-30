-- Migration: 20250127_add_missing_columns.sql
-- Purpose: Adicionar colunas faltantes na tabela yeslaser_formularios
-- Author: Claude + Danilo
-- Date: 2025-01-27
--
-- INSTRUCOES: Execute este SQL no Supabase Studio > SQL Editor

-- Adicionar colunas faltantes (se não existirem)

-- CEP Auto-fill
ALTER TABLE yeslaser_formularios
ADD COLUMN IF NOT EXISTS cep_auto_fill boolean DEFAULT true;

-- WhatsApp incluir dados
ALTER TABLE yeslaser_formularios
ADD COLUMN IF NOT EXISTS whatsapp_incluir_dados boolean DEFAULT true;

-- Webhook retry
ALTER TABLE yeslaser_formularios
ADD COLUMN IF NOT EXISTS webhook_retry boolean DEFAULT true;

-- Mostrar progresso (wizard)
ALTER TABLE yeslaser_formularios
ADD COLUMN IF NOT EXISTS mostrar_progresso boolean DEFAULT true;

-- Permitir voltar (wizard)
ALTER TABLE yeslaser_formularios
ADD COLUMN IF NOT EXISTS permitir_voltar boolean DEFAULT true;

-- Honeypot
ALTER TABLE yeslaser_formularios
ADD COLUMN IF NOT EXISTS honeypot_ativo boolean DEFAULT true;

-- Captura de dados
ALTER TABLE yeslaser_formularios
ADD COLUMN IF NOT EXISTS capturar_utms boolean DEFAULT true;

ALTER TABLE yeslaser_formularios
ADD COLUMN IF NOT EXISTS capturar_ip boolean DEFAULT false;

ALTER TABLE yeslaser_formularios
ADD COLUMN IF NOT EXISTS capturar_user_agent boolean DEFAULT false;

-- Verificar colunas adicionadas
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'yeslaser_formularios'
ORDER BY ordinal_position;

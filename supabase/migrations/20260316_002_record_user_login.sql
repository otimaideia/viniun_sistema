-- =====================================================
-- Migration: record_user_login RPC
-- Purpose: Registrar tentativas de login em mt_login_attempts
--          e atualizar campos de mt_users (ultimo_login, login_count, etc.)
-- Date: 2026-03-16
-- =====================================================

CREATE OR REPLACE FUNCTION record_user_login(
  p_email VARCHAR,
  p_user_id UUID DEFAULT NULL,
  p_tenant_id UUID DEFAULT NULL,
  p_success BOOLEAN DEFAULT false,
  p_failure_reason VARCHAR DEFAULT NULL,
  p_auth_method VARCHAR DEFAULT 'password',
  p_ip_address VARCHAR DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_country VARCHAR DEFAULT NULL,
  p_city VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_resolved_user_id UUID;
  v_resolved_tenant_id UUID;
BEGIN
  v_resolved_user_id := p_user_id;
  v_resolved_tenant_id := p_tenant_id;

  -- Resolver user_id e tenant_id pelo email se não fornecidos
  IF v_resolved_user_id IS NULL AND p_email IS NOT NULL THEN
    SELECT id, tenant_id INTO v_resolved_user_id, v_resolved_tenant_id
    FROM mt_users WHERE email = p_email AND status = 'ativo' LIMIT 1;
  END IF;

  -- 1. Inserir em mt_login_attempts
  INSERT INTO mt_login_attempts (
    email, user_id, tenant_id, success, failure_reason,
    auth_method, ip_address, user_agent, country, city
  ) VALUES (
    p_email, v_resolved_user_id, v_resolved_tenant_id, p_success, p_failure_reason,
    p_auth_method, p_ip_address, p_user_agent, p_country, p_city
  ) RETURNING id INTO v_id;

  -- 2. Se sucesso, atualizar mt_users
  IF p_success AND v_resolved_user_id IS NOT NULL THEN
    UPDATE mt_users SET
      ultimo_login = NOW(),
      login_count = COALESCE(login_count, 0) + 1,
      failed_login_count = 0,
      locked_until = NULL
    WHERE id = v_resolved_user_id;
  END IF;

  -- 3. Se falha, incrementar failed_login_count e bloquear após 10 tentativas
  IF NOT p_success AND v_resolved_user_id IS NOT NULL THEN
    UPDATE mt_users SET
      failed_login_count = COALESCE(failed_login_count, 0) + 1,
      locked_until = CASE
        WHEN COALESCE(failed_login_count, 0) + 1 >= 10
        THEN NOW() + INTERVAL '30 minutes'
        ELSE locked_until
      END
    WHERE id = v_resolved_user_id;
  END IF;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

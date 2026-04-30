-- =============================================================================
-- Migration: Server-side rate limit for public form submissions
-- =============================================================================
-- Mitigates the client-side rate limit bypass (frontend rate limiter is
-- trivially defeated by disabling JavaScript or calling Supabase directly).
--
-- Rule: max 5 submissions per IP per form per 60 seconds.
-- Implementation: BEFORE INSERT trigger that auto-stamps the request IP from
-- PostgREST headers and counts recent rows.
-- =============================================================================

BEGIN;

-- 1. Ensure ip_address column exists
ALTER TABLE mt_form_submissions
  ADD COLUMN IF NOT EXISTS ip_address text;

CREATE INDEX IF NOT EXISTS idx_mt_form_submissions_form_ip_time
  ON mt_form_submissions (form_id, ip_address, created_at DESC);

-- 2. Rate limit trigger function
CREATE OR REPLACE FUNCTION mt_form_submissions_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  recent_count integer;
  window_seconds integer := 60;
  max_in_window integer := 5;
  request_headers jsonb;
  derived_ip text;
BEGIN
  -- Try to derive IP from PostgREST request headers (X-Forwarded-For chain).
  -- Fallback to whatever the row carried; finally to inet_client_addr() (likely proxy).
  BEGIN
    request_headers := current_setting('request.headers', true)::jsonb;
    derived_ip := split_part(coalesce(request_headers->>'x-forwarded-for', ''), ',', 1);
    derived_ip := trim(derived_ip);
  EXCEPTION WHEN OTHERS THEN
    derived_ip := NULL;
  END;

  IF derived_ip IS NULL OR derived_ip = '' THEN
    derived_ip := NEW.ip_address;
  END IF;

  IF derived_ip IS NULL OR derived_ip = '' THEN
    derived_ip := host(inet_client_addr());
  END IF;

  -- Stamp the row with the derived IP (overwrites any client-supplied value)
  NEW.ip_address := derived_ip;

  -- If we still couldn't get an IP (e.g. local psql session), allow the insert
  IF derived_ip IS NULL OR derived_ip = '' OR derived_ip = 'unknown' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO recent_count
  FROM mt_form_submissions
  WHERE form_id = NEW.form_id
    AND ip_address = derived_ip
    AND created_at >= now() - (window_seconds || ' seconds')::interval;

  IF recent_count >= max_in_window THEN
    RAISE EXCEPTION 'rate_limit_exceeded'
      USING ERRCODE = '54000',
            HINT = 'Too many submissions from this IP. Wait 60s and retry.';
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Attach trigger
DROP TRIGGER IF EXISTS trg_mt_form_submissions_rate_limit ON mt_form_submissions;
CREATE TRIGGER trg_mt_form_submissions_rate_limit
  BEFORE INSERT ON mt_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION mt_form_submissions_rate_limit();

COMMIT;

-- ROLLBACK PLAN:
-- DROP TRIGGER IF EXISTS trg_mt_form_submissions_rate_limit ON mt_form_submissions;
-- DROP FUNCTION IF EXISTS mt_form_submissions_rate_limit();

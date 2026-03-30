// Edge Function: group-operations-scheduler
// Triggered by pg_cron every minute to auto-start scheduled group operations
// that have next_run_after <= now and status = 'pending'

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://supabase-app.yeslaserpraiagrande.com.br';
const SERVICE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MDc4MTc0MCwiZXhwIjo0OTI2NDU1MzQwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.K1j07Xd07FuQHNNXqnwXnWvakPBfUirpKXqB5sZmkTE';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const now = new Date().toISOString();

  console.log(`[scheduler] Running at ${now}`);

  // Find pending operations whose scheduled time has passed
  const { data: pendingOps, error: fetchError } = await supabase
    .from('mt_group_operations')
    .select('id, session_name, group_id, tenant_id')
    .eq('status', 'pending')
    .not('next_run_after', 'is', null)
    .lte('next_run_after', now);

  if (fetchError) {
    console.error('[scheduler] Error fetching pending ops:', fetchError);
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!pendingOps || pendingOps.length === 0) {
    console.log('[scheduler] No pending operations to start');
    return new Response(JSON.stringify({ triggered: 0, message: 'No pending operations' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(`[scheduler] Found ${pendingOps.length} operations to trigger`);

  const results: { id: string; status: string; error?: string }[] = [];

  for (const op of pendingOps) {
    console.log(`[scheduler] Triggering operation ${op.id}`);

    try {
      // Call the group-bulk-add function to start processing this operation
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/group-bulk-add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY,
        },
        body: JSON.stringify({ operation_id: op.id }),
      });

      if (!resp.ok) {
        const body = await resp.text();
        console.error(`[scheduler] Failed to trigger op ${op.id}: ${resp.status} ${body}`);
        results.push({ id: op.id, status: 'error', error: `HTTP ${resp.status}: ${body}` });
      } else {
        const body = await resp.json();
        console.log(`[scheduler] Started op ${op.id}:`, body);
        results.push({ id: op.id, status: 'triggered' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[scheduler] Exception triggering op ${op.id}:`, msg);
      results.push({ id: op.id, status: 'error', error: msg });
    }
  }

  const triggered = results.filter(r => r.status === 'triggered').length;
  const errors = results.filter(r => r.status === 'error').length;

  return new Response(JSON.stringify({ triggered, errors, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

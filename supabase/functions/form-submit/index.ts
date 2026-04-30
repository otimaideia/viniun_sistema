// =============================================================================
// EDGE FUNCTION: form-submit
// =============================================================================
// Server-side form submission with IP-based rate limiting.
// Bypass-resistant alternative to client-only rate limit (which is trivially
// circumvented by disabling JS).
//
// Recebe: { formId: string, tenantId: string, payload: object }
// Aplica: rate limit per IP+formId via mt_form_submissions counts
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SubmitBody {
  formId: string;
  tenantId: string;
  payload: Record<string, unknown>;
}

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_PER_WINDOW = 5;

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Server misconfigured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json()) as SubmitBody;
    const { formId, tenantId, payload } = body || ({} as SubmitBody);

    if (!formId || !tenantId || typeof payload !== "object") {
      return new Response(
        JSON.stringify({ success: false, error: "Missing fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!/^[0-9a-f-]{36}$/i.test(formId) || !/^[0-9a-f-]{36}$/i.test(tenantId)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ip = getClientIp(req);
    const admin = createClient(supabaseUrl, serviceKey);

    // Verify form is published and belongs to tenant
    const { data: form, error: formErr } = await admin
      .from("mt_forms")
      .select("id, tenant_id, status")
      .eq("id", formId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (formErr || !form) {
      return new Response(
        JSON.stringify({ success: false, error: "Form not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (form.status !== "publicado" && form.status !== "published" && form.status !== "active") {
      return new Response(
        JSON.stringify({ success: false, error: "Form is not accepting submissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit: count submissions from this IP for this form in the window
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();
    const { count, error: countErr } = await admin
      .from("mt_form_submissions")
      .select("*", { count: "exact", head: true })
      .eq("form_id", formId)
      .eq("ip_address", ip)
      .gte("created_at", since);

    if (countErr) {
      // If the column doesn't exist or query fails, fall through (don't lock out users) but log
      console.warn("[form-submit] rate-limit query failed:", countErr.message);
    } else if ((count ?? 0) >= RATE_LIMIT_MAX_PER_WINDOW) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Limite excedido. Aguarde ${RATE_LIMIT_WINDOW_SECONDS}s e tente novamente.`,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert submission (RLS bypassed via service_role, but we tightly scope by tenant_id/form_id)
    const { data: inserted, error: insertErr } = await admin
      .from("mt_form_submissions")
      .insert({
        form_id: formId,
        tenant_id: tenantId,
        dados: payload,
        ip_address: ip,
        user_agent: req.headers.get("user-agent") || null,
      })
      .select("id")
      .single();

    if (insertErr) {
      return new Response(
        JSON.stringify({ success: false, error: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, submissionId: inserted.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

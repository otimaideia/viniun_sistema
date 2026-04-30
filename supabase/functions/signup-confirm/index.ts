// =============================================================================
// EDGE FUNCTION: signup-confirm
// =============================================================================
// Confirma o email de um usuário recém-cadastrado via signup público.
// Substitui o uso direto de SERVICE_ROLE_KEY no frontend (CRÍTICO de segurança).
//
// Recebe: { userId: string }
// Valida: que o usuário foi criado nos últimos 60 segundos (limita abuso) e
//          ainda não tem email_confirmed_at preenchido.
// Retorna: { success: boolean, error?: string }
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ConfirmRequest {
  userId: string;
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

    const body = (await req.json()) as ConfirmRequest;
    const { userId } = body;

    if (!userId || typeof userId !== "string" || !/^[0-9a-f-]{36}$/i.test(userId)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Validate: user exists, was created recently, not yet confirmed
    const { data: userRes, error: getErr } = await admin.auth.admin.getUserById(userId);
    if (getErr || !userRes?.user) {
      return new Response(
        JSON.stringify({ success: false, error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = userRes.user;
    const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0;
    const ageSeconds = (Date.now() - createdAt) / 1000;

    if (ageSeconds > 120) {
      return new Response(
        JSON.stringify({ success: false, error: "User too old to auto-confirm" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (user.email_confirmed_at) {
      return new Response(
        JSON.stringify({ success: true, alreadyConfirmed: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    if (updErr) {
      return new Response(
        JSON.stringify({ success: false, error: updErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
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

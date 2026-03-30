import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método não permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Get franqueado ID from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const franqueadoId = pathParts[pathParts.length - 1];

    if (!franqueadoId) {
      return new Response(
        JSON.stringify({ error: "ID do franqueado não informado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate authorization token
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Token de autorização não informado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate token against franqueado
    const { data: franqueado, error: franqueadoError } = await supabase
      .from("mt_franchises")
      .select("id, nome_fantasia, api_token")
      .eq("id", franqueadoId)
      .single();

    if (franqueadoError || !franqueado) {
      return new Response(
        JSON.stringify({ error: "Franqueado não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (franqueado.api_token !== token) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();

    // Validate required fields
    if (!body.nome) {
      return new Response(
        JSON.stringify({ error: "Campo 'nome' é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create lead
    const leadData = {
      nome: body.nome,
      telefone: body.telefone || null,
      email: body.email || null,
      servico: body.servico || null,
      origem: body.origem || "Landing Page",
      observacao: body.observacao || null,
      franqueado_id: franqueadoId,
      unidade: franqueado.nome_fantasia,
      status: "Novo",
      landing_page: body.landing_page || url.origin,
      source: body.source || "api_webhook",
      medium: body.medium || "landing_page",
      campaign: body.campaign || null,
    };

    const { data: lead, error: leadError } = await supabase
      .from("mt_leads")
      .insert(leadData)
      .select("id")
      .single();

    if (leadError) {
      console.error("Error creating lead:", leadError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar lead", details: leadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log atividade: Lead criado via webhook API
    try {
      // Buscar tenant_id do lead criado (inserido via RLS default ou franqueado)
      const { data: createdLead } = await supabase.from("mt_leads").select("tenant_id").eq("id", lead.id).single();
      if (createdLead?.tenant_id) {
        await supabase.from('mt_lead_activities').insert({
          tenant_id: createdLead.tenant_id,
          lead_id: lead.id,
          tipo: 'cadastro',
          titulo: 'Lead Criado via API/Webhook',
          descricao: `Lead "${body.nome}" criado via webhook API. Origem: ${body.origem || 'Landing Page'}`,
          dados: { origem: body.origem, landing_page: body.landing_page, source: body.source, medium: body.medium, campaign: body.campaign },
          user_nome: 'Sistema (Webhook)',
        });
      }
    } catch (actErr) { console.error('[Webhook] Erro log atividade:', actErr); }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Lead criado com sucesso",
        lead_id: lead.id,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

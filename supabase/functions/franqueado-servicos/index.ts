import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Método não permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Extract franqueado_id from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const franqueadoId = pathParts[pathParts.length - 1];

    if (!franqueadoId || franqueadoId === "franqueado-servicos") {
      return new Response(
        JSON.stringify({ error: "ID do franqueado não fornecido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Token de autorização não fornecido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate token and get franqueado
    const { data: franqueado, error: franqueadoError } = await supabase
      .from("mt_franchises")
      .select("id, id_api, nome_fantasia, endereco, cidade, estado, whatsapp_business, api_token")
      .eq("id", franqueadoId)
      .maybeSingle();

    if (franqueadoError) {
      console.error("Error fetching franqueado:", franqueadoError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar franqueado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!franqueado) {
      return new Response(
        JSON.stringify({ error: "Franqueado não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate API token
    if (!franqueado.api_token || franqueado.api_token !== token) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get linked services
    const { data: vinculos, error: vinculosError } = await supabase
      .from("mt_franchise_services")
      .select("servico_id")
      .eq("franqueado_id", franqueadoId)
      .eq("ativo", true);

    if (vinculosError) {
      console.error("Error fetching vinculos:", vinculosError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar serviços vinculados" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const servicoIds = vinculos?.map((v) => v.servico_id) || [];

    // Get service details
    let servicos: any[] = [];
    if (servicoIds.length > 0) {
      const { data: servicosData, error: servicosError } = await supabase
        .from("mt_services")
        .select("id, nome, descricao, categoria")
        .in("id", servicoIds)
        .eq("ativo", true)
        .order("categoria")
        .order("nome");

      if (servicosError) {
        console.error("Error fetching servicos:", servicosError);
        return new Response(
          JSON.stringify({ error: "Erro ao buscar detalhes dos serviços" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      servicos = servicosData || [];
    }

    // Category labels
    const categoriaLabels: Record<string, string> = {
      feminino: "Depilação Feminina",
      masculino: "Depilação Masculina",
      estetica_facial: "Estética Facial",
      estetica_corporal: "Estética Corporal",
    };

    // Build response
    const response = {
      franqueado: {
        id: franqueado.id,
        id_api: franqueado.id_api,
        nome: franqueado.nome_fantasia,
        endereco: franqueado.endereco,
        cidade: franqueado.cidade,
        estado: franqueado.estado,
        whatsapp: franqueado.whatsapp_business,
      },
      servicos: servicos.map((s) => ({
        id: s.id,
        nome: s.nome,
        descricao: s.descricao,
        categoria: s.categoria,
        categoria_label: s.categoria ? categoriaLabels[s.categoria] || s.categoria : null,
      })),
      total_servicos: servicos.length,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

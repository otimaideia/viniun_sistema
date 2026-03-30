import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface VerificarCodigoRequest {
  lead_id: string;
  codigo: string;
}

interface LeadData {
  id: string;
  nome: string | null;
  telefone: string | null;
  email: string | null;
  cpf: string | null;
  unidade_id: string | null;
}

async function gerarJWT(lead: LeadData, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    true,
    ["sign", "verify"]
  );

  const payload = {
    lead_id: lead.id,
    nome: lead.nome,
    telefone: lead.telefone,
    email: lead.email,
    iat: getNumericDate(0),
    exp: getNumericDate(60 * 60 * 24 * 7), // 7 dias
  };

  return await create({ alg: "HS256", typ: "JWT" }, payload, key);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Metodo nao permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: VerificarCodigoRequest = await req.json();

    if (!body.lead_id || !body.codigo) {
      return new Response(
        JSON.stringify({ error: "Lead ID e codigo sao obrigatorios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar lead com codigo de verificacao
    const { data: lead, error: leadError } = await supabase
      .from("mt_leads")
      .select("id, nome, telefone, email, cpf, unidade_id, codigo_verificacao, codigo_expira_em")
      .eq("id", body.lead_id)
      .single();

    if (leadError || !lead) {
      return new Response(
        JSON.stringify({ error: "Cliente nao encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se codigo existe
    if (!lead.codigo_verificacao) {
      return new Response(
        JSON.stringify({ error: "Codigo de verificacao nao encontrado. Solicite um novo codigo." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se codigo expirou
    if (lead.codigo_expira_em) {
      const expiraEm = new Date(lead.codigo_expira_em);
      if (expiraEm < new Date()) {
        // Limpar codigo expirado
        await supabase
          .from("mt_leads")
          .update({ codigo_verificacao: null, codigo_expira_em: null })
          .eq("id", lead.id);

        return new Response(
          JSON.stringify({ error: "Codigo expirado. Solicite um novo codigo." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Verificar se codigo esta correto
    if (lead.codigo_verificacao !== body.codigo) {
      return new Response(
        JSON.stringify({ error: "Codigo incorreto" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Codigo correto - limpar codigo e atualizar ultimo_login
    const { error: updateError } = await supabase
      .from("mt_leads")
      .update({
        codigo_verificacao: null,
        codigo_expira_em: null,
        ultimo_login: new Date().toISOString(),
      })
      .eq("id", lead.id);

    if (updateError) {
      console.error("Erro ao atualizar lead:", updateError);
    }

    // Gerar JWT
    const jwtSecret = Deno.env.get("JWT_SECRET") || Deno.env.get("SUPABASE_JWT_SECRET") || "yeslaser-cliente-secret-key";
    const token = await gerarJWT(
      {
        id: lead.id,
        nome: lead.nome,
        telefone: lead.telefone,
        email: lead.email,
        cpf: lead.cpf,
        unidade_id: lead.unidade_id,
      },
      jwtSecret
    );

    return new Response(
      JSON.stringify({
        success: true,
        token,
        lead: {
          id: lead.id,
          nome: lead.nome,
          telefone: lead.telefone,
          email: lead.email,
          cpf: lead.cpf,
          unidade_id: lead.unidade_id,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro inesperado:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface EnviarCodigoRequest {
  cpf_ou_telefone: string;
  metodo: "whatsapp" | "email";
}

function gerarCodigo(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function limparCPF(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

function limparTelefone(telefone: string): string {
  return telefone.replace(/\D/g, "");
}

function detectarTipoInput(valor: string): "cpf" | "telefone" {
  const limpo = valor.replace(/\D/g, "");
  // CPF tem 11 digitos e segue formato específico
  // Telefone pode ter 10 ou 11 digitos
  // Se começa com 0-6, provavelmente é CPF
  if (limpo.length === 11) {
    const primeiroDigito = parseInt(limpo[0]);
    if (primeiroDigito <= 6) {
      return "cpf";
    }
  }
  return "telefone";
}

async function enviarWhatsApp(
  wahaConfig: { api_url: string; api_key: string },
  sessionName: string,
  telefone: string,
  codigo: string,
  nomeCliente: string
): Promise<boolean> {
  try {
    const chatId = `${telefone}@c.us`;
    const mensagem = `Ola ${nomeCliente}! Seu codigo de verificacao Viniun e: *${codigo}*\n\nEste codigo expira em 5 minutos.`;

    const response = await fetch(`${wahaConfig.api_url}/api/sendText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": wahaConfig.api_key,
      },
      body: JSON.stringify({
        session: sessionName,
        chatId,
        text: mensagem,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Erro ao enviar WhatsApp:", error);
    return false;
  }
}

async function enviarEmail(
  supabase: any,
  email: string,
  codigo: string,
  nomeCliente: string
): Promise<boolean> {
  // TODO: Implementar envio de email via Resend ou outro provider
  // Por enquanto, simula sucesso e loga o codigo
  console.log(`[EMAIL] Codigo ${codigo} para ${email} (${nomeCliente})`);
  return true;
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
    const body: EnviarCodigoRequest = await req.json();

    if (!body.cpf_ou_telefone || !body.metodo) {
      return new Response(
        JSON.stringify({ error: "CPF/Telefone e metodo sao obrigatorios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Detectar tipo de input e limpar
    const tipoInput = detectarTipoInput(body.cpf_ou_telefone);
    const valorLimpo = tipoInput === "cpf"
      ? limparCPF(body.cpf_ou_telefone)
      : limparTelefone(body.cpf_ou_telefone);

    // Buscar lead por CPF ou telefone
    let query = supabase
      .from("mt_leads")
      .select("id, nome, telefone, email, cpf, unidade_id");

    if (tipoInput === "cpf") {
      query = query.eq("cpf", valorLimpo);
    } else {
      // Buscar por telefone - pode estar com ou sem DDD
      query = query.or(`telefone.eq.${valorLimpo},telefone.ilike.%${valorLimpo}`);
    }

    const { data: lead, error: leadError } = await query.maybeSingle();

    if (leadError) {
      console.error("Erro ao buscar lead:", leadError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar cliente" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!lead) {
      return new Response(
        JSON.stringify({ error: "Cliente nao encontrado. Verifique seu CPF ou telefone." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Gerar codigo de verificacao
    const codigo = gerarCodigo();
    const expiraEm = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutos

    // Salvar codigo no lead
    const { error: updateError } = await supabase
      .from("mt_leads")
      .update({
        codigo_verificacao: codigo,
        codigo_expira_em: expiraEm,
      })
      .eq("id", lead.id);

    if (updateError) {
      console.error("Erro ao salvar codigo:", updateError);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar codigo de verificacao" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enviar codigo pelo metodo escolhido
    let enviado = false;
    let destino = "";

    if (body.metodo === "whatsapp") {
      // Buscar configuracao WAHA
      const { data: config } = await supabase
        .from("mt_waha_config")
        .select("api_url, api_key")
        .single();

      if (!config || !config.api_url || !config.api_key) {
        return new Response(
          JSON.stringify({ error: "WhatsApp nao configurado. Tente por email." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar sessao ativa da unidade do lead ou sessao default
      const { data: sessao } = await supabase
        .from("mt_whatsapp_sessions")
        .select("session_name")
        .eq("status", "working")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!sessao) {
        return new Response(
          JSON.stringify({ error: "Nenhuma sessao WhatsApp ativa. Tente por email." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const telefone = limparTelefone(lead.telefone);
      enviado = await enviarWhatsApp(
        { api_url: config.api_url, api_key: config.api_key },
        sessao.session_name,
        telefone,
        codigo,
        lead.nome?.split(" ")[0] || "Cliente"
      );
      destino = `${telefone.substring(0, 2)} *****-${telefone.substring(telefone.length - 4)}`;
    } else {
      // Email
      if (!lead.email) {
        return new Response(
          JSON.stringify({ error: "Email nao cadastrado. Tente por WhatsApp." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      enviado = await enviarEmail(
        supabase,
        lead.email,
        codigo,
        lead.nome?.split(" ")[0] || "Cliente"
      );
      destino = lead.email.replace(/(.{2})(.*)(@.*)/, "$1****$3");
    }

    if (!enviado) {
      return new Response(
        JSON.stringify({ error: "Erro ao enviar codigo. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Codigo enviado para ${destino}`,
        metodo: body.metodo,
        destino,
        lead_id: lead.id,
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { tenantId, voice = "coral", instructions } = body;

    // Get OpenAI API key — try DB first, then env, then mt_whatsapp_bot_config
    let openaiKey = "";

    if (tenantId) {
      const { data: config } = await supabase
        .from("mt_ai_config")
        .select("openai_api_key_encrypted")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (config?.openai_api_key_encrypted) {
        openaiKey = config.openai_api_key_encrypted;
      }
    }

    if (!openaiKey) {
      openaiKey = Deno.env.get("OPENAI_API_KEY") || "";
    }

    if (!openaiKey && tenantId) {
      // Fallback: mt_whatsapp_bot_config
      const { data: botCfg } = await supabase
        .from("mt_whatsapp_bot_config")
        .select("openai_api_key")
        .eq("tenant_id", tenantId)
        .not("openai_api_key", "is", null)
        .limit(1)
        .maybeSingle();
      if (botCfg?.openai_api_key) openaiKey = botCfg.openai_api_key;
    }

    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user info for personalized instructions
    let userName = "usuário";
    if (tenantId) {
      const { data: mtUser } = await supabase
        .from("mt_users")
        .select("nome")
        .eq("auth_user_id", user.id)
        .single();
      if (mtUser?.nome) {
        userName = mtUser.nome.split(" ")[0];
      }
    }

    const defaultInstructions = `Você é a YESia, assistente de IA da empresa. Você está conversando por voz com ${userName}. Seja natural, amigável e direta. Responda sempre em português brasileiro. Você ajuda com leads, vendas, agendamentos, metas, equipe e qualquer assunto do dia a dia da empresa. Seja concisa nas respostas de voz - frases curtas e diretas.`;

    // Create ephemeral token via OpenAI Realtime Sessions API
    const sessionResp = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: voice,
        instructions: instructions || defaultInstructions,
        modalities: ["text", "audio"],
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: {
          model: "whisper-1",
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 600,
          create_response: true,
        },
      }),
    });

    if (!sessionResp.ok) {
      const errText = await sessionResp.text();
      console.error("[ai-realtime-session] OpenAI error:", errText);
      return new Response(
        JSON.stringify({ error: "Failed to create realtime session", details: errText }),
        { status: sessionResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sessionData = await sessionResp.json();

    return new Response(
      JSON.stringify({
        success: true,
        client_secret: sessionData.client_secret,
        session_id: sessionData.id,
        model: sessionData.model,
        voice: sessionData.voice,
        expires_at: sessionData.expires_at,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[ai-realtime-session] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

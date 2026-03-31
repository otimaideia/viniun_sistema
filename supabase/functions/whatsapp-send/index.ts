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
    const { phone, message, tenant_id, session_name } = await req.json();

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: "phone and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const chatId = cleanPhone.includes("@") ? cleanPhone : `${cleanPhone}@c.us`;

    // Get WAHA config from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("API_EXTERNAL_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get WAHA config
    let wahaUrl = "";
    let wahaApiKey = "";
    let wahaSession = session_name || "";

    // Try mt_waha_config first
    const { data: wahaConfig } = await supabase
      .from("mt_waha_config")
      .select("api_url, api_key")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (wahaConfig) {
      wahaUrl = wahaConfig.api_url || "";
      wahaApiKey = wahaConfig.api_key || "";
    }

    // Get session from mt_whatsapp_sessions
    if (!wahaSession) {
      let sessionQuery = supabase
        .from("mt_whatsapp_sessions")
        .select("session_name")
        .eq("status", "working")
        .order("created_at", { ascending: true })
        .limit(1);

      if (tenant_id) {
        sessionQuery = sessionQuery.eq("tenant_id", tenant_id);
      }

      const { data: sessions } = await sessionQuery.maybeSingle();
      if (sessions) {
        wahaSession = sessions.session_name;
      }
    }

    // Fallback defaults
    if (!wahaUrl) wahaUrl = "https://waha.otimaideia.com.br";
    if (!wahaApiKey) wahaApiKey = "sitema-crm@2025";

    if (!wahaSession) {
      return new Response(
        JSON.stringify({ error: "No active WhatsApp session found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send message via WAHA
    const wahaResponse = await fetch(`${wahaUrl}/api/sendText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": wahaApiKey,
      },
      body: JSON.stringify({
        session: wahaSession,
        chatId: chatId,
        text: message,
      }),
    });

    const wahaResult = await wahaResponse.json();

    if (!wahaResponse.ok) {
      console.error("WAHA error:", wahaResult);
      return new Response(
        JSON.stringify({ error: "Failed to send WhatsApp message", details: wahaResult }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the message in mt_whatsapp_messages if we have a conversation
    try {
      const { data: conversation } = await supabase
        .from("mt_whatsapp_conversations")
        .select("id")
        .eq("session_id", wahaSession)
        .eq("chat_id", chatId)
        .maybeSingle();

      if (conversation) {
        await supabase.from("mt_whatsapp_messages").insert({
          conversation_id: conversation.id,
          session_id: wahaSession,
          message_id: wahaResult.key?.id || `sent_${Date.now()}`,
          from_me: true,
          body: message,
          type: "chat",
          timestamp: Math.floor(Date.now() / 1000),
          ack: 1,
        });
      }
    } catch (logErr) {
      console.warn("Failed to log message:", logErr);
    }

    return new Response(
      JSON.stringify({ success: true, messageId: wahaResult.key?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("whatsapp-send error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeObjectForJSON, createSanitizedFetch } from "../_shared/unicodeSanitizer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

interface WahaConfig {
  api_url: string;
  api_key: string;
}

interface ChatData {
  id: string;
  name: string;
  isGroup: boolean;
  timestamp: number;
  unreadCount: number;
  lastMessage?: {
    body: string;
    fromMe: boolean;
    timestamp: number;
  };
  profilePicture?: string;
}

interface MessageData {
  id: string;
  body: string;
  from: string;
  to: string;
  fromMe: boolean;
  timestamp: number;
  hasMedia: boolean;
  mediaUrl?: string;
  type: string;
  ack?: number;
}

async function getWahaConfig(supabase: any): Promise<WahaConfig | null> {
  const { data, error } = await supabase
    .from("mt_waha_config")
    .select("api_url, api_key")
    .single();

  if (error || !data) {
    console.error("Error fetching WAHA config:", error);
    return null;
  }

  return {
    api_url: data.api_url,
    api_key: data.api_key,
  };
}

async function proxyToWaha(
  config: WahaConfig,
  endpoint: string,
  method: string = "GET",
  body?: any
): Promise<Response> {
  const url = `${config.api_url.replace(/\/$/, "")}${endpoint}`;
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-Api-Key": config.api_key,
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method !== "GET") {
    // Sanitizar body para prevenir erros com caracteres Unicode inválidos
    const sanitizedBody = sanitizeObjectForJSON(body);
    options.body = JSON.stringify(sanitizedBody);
  }

  return fetch(url, options);
}

async function syncChatsToDatabase(
  supabase: any,
  sessaoId: string,
  chats: ChatData[]
): Promise<void> {
  // Upsert conversations
  for (const chat of chats) {
    const phoneNumber = chat.id.replace("@c.us", "").replace("@g.us", "");
    
    await supabase
      .from("mt_whatsapp_conversations")
      .upsert({
        sessao_id: sessaoId,
        chat_id: chat.id,
        contact_name: chat.name,
        contact_phone: phoneNumber,
        ultima_mensagem_texto: chat.lastMessage?.body || null,
        ultima_mensagem: chat.timestamp ? new Date(chat.timestamp * 1000).toISOString() : null,
        unread_count: chat.unreadCount,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "sessao_id,chat_id",
      });
  }
}

async function syncMessagesToDatabase(
  supabase: any,
  sessaoId: string,
  chatId: string,
  messages: MessageData[]
): Promise<void> {
  // First get the conversa_id
  const { data: conversa } = await supabase
    .from("mt_whatsapp_conversations")
    .select("id")
    .eq("sessao_id", sessaoId)
    .eq("chat_id", chatId)
    .single();

  if (!conversa) {
    console.log("Conversa not found, creating...");
    // Create conversa if it doesn't exist
    const phoneNumber = chatId.replace("@c.us", "").replace("@g.us", "");
    const { data: newConversa, error } = await supabase
      .from("mt_whatsapp_conversations")
      .insert({
        sessao_id: sessaoId,
        chat_id: chatId,
        contact_name: phoneNumber,
        contact_phone: phoneNumber,
      })
      .select("id")
      .single();
    
    if (error) {
      console.error("Error creating conversa:", error);
      return;
    }
  }

  const conversaId = conversa?.id;
  if (!conversaId) return;

  // Upsert messages
  for (const msg of messages) {
    await supabase
      .from("mt_whatsapp_messages")
      .upsert({
        conversa_id: conversaId,
        sessao_id: sessaoId,
        message_id: msg.id,
        body: msg.body,
        direction: msg.fromMe ? 'outbound' : 'inbound',
        type: msg.type,
        timestamp: new Date(msg.timestamp * 1000).toISOString(),
        media_url: msg.mediaUrl || null,
        is_read: msg.fromMe ? true : false,
        raw_payload: msg,
      }, {
        onConflict: "conversa_id,message_id",
      });
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    
    // Expected: /waha-proxy/{action}
    // Actions: chats, messages, send-text
    const action = pathParts[pathParts.length - 1];

    // Validate Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Token de autorização não fornecido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Initialize Supabase client with user token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sanitizedFetch = createSanitizedFetch();
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
        fetch: sanitizedFetch,
      }
    });

    // Also create service role client for syncing data
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      global: { fetch: sanitizedFetch },
    });

    // Get WAHA config
    const wahaConfig = await getWahaConfig(supabaseAdmin);
    if (!wahaConfig || !wahaConfig.api_url || !wahaConfig.api_key) {
      return new Response(
        JSON.stringify({ error: "Configuração WAHA não encontrada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body if present
    let body: any = null;
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
        // No body or invalid JSON
      }
    }

    // Handle different actions
    switch (action) {
      case "chats": {
        // GET /waha-proxy/chats?session=xxx&sessaoId=yyy
        const sessionName = url.searchParams.get("session");
        const sessaoId = url.searchParams.get("sessaoId");
        
        if (!sessionName) {
          return new Response(
            JSON.stringify({ error: "Session name não fornecido" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const response = await proxyToWaha(wahaConfig, `/api/${sessionName}/chats`);
        
        if (!response.ok) {
          const errorText = await response.text();
          return new Response(
            JSON.stringify({ error: `WAHA Error: ${errorText}` }),
            { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const chats = await response.json() as ChatData[];
        
        // Sync to database if sessaoId provided
        if (sessaoId) {
          try {
            await syncChatsToDatabase(supabaseAdmin, sessaoId, chats);
          } catch (err) {
            console.error("Error syncing chats:", err);
          }
        }

        return new Response(JSON.stringify(chats), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "messages": {
        // GET /waha-proxy/messages?session=xxx&chatId=yyy&limit=100&sessaoId=zzz
        const sessionName = url.searchParams.get("session");
        const chatId = url.searchParams.get("chatId");
        const limit = url.searchParams.get("limit") || "100";
        const sessaoId = url.searchParams.get("sessaoId");
        
        if (!sessionName || !chatId) {
          return new Response(
            JSON.stringify({ error: "Session name ou chatId não fornecido" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const response = await proxyToWaha(
          wahaConfig, 
          `/api/${sessionName}/chats/${encodeURIComponent(chatId)}/messages?limit=${limit}`
        );
        
        if (!response.ok) {
          const errorText = await response.text();
          return new Response(
            JSON.stringify({ error: `WAHA Error: ${errorText}` }),
            { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const messages = await response.json() as MessageData[];
        
        // Sync to database if sessaoId provided
        if (sessaoId) {
          try {
            await syncMessagesToDatabase(supabaseAdmin, sessaoId, chatId, messages);
          } catch (err) {
            console.error("Error syncing messages:", err);
          }
        }

        return new Response(JSON.stringify(messages), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "send-text": {
        // POST /waha-proxy/send-text
        // Body: { session, chatId, text, sessaoId }
        if (!body || !body.session || !body.chatId || !body.text) {
          return new Response(
            JSON.stringify({ error: "Dados incompletos para enviar mensagem" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const response = await proxyToWaha(wahaConfig, "/api/sendText", "POST", {
          session: body.session,
          chatId: body.chatId,
          text: body.text,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          return new Response(
            JSON.stringify({ error: `WAHA Error: ${errorText}` }),
            { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Create optimistic message in database
        if (body.sessaoId) {
          try {
            const { data: conversa } = await supabaseAdmin
              .from("mt_whatsapp_conversations")
              .select("id")
              .eq("sessao_id", body.sessaoId)
              .eq("chat_id", body.chatId)
              .single();

            if (conversa) {
              await supabaseAdmin
                .from("mt_whatsapp_messages")
                .insert({
                  conversa_id: conversa.id,
                  sessao_id: body.sessaoId,
                  message_id: `sent-${Date.now()}`,
                  body: body.text,
                  direction: 'outbound',
                  type: "chat",
                  timestamp: new Date().toISOString(),
                  is_read: true,
                });
            }
          } catch (err) {
            console.error("Error saving sent message:", err);
          }
        }

        let result = {};
        try {
          result = await response.json();
        } catch {
          // Empty response
        }

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "backup-chats": {
        // GET /waha-proxy/backup-chats?sessaoId=xxx
        // Returns chats from database (backup)
        const sessaoId = url.searchParams.get("sessaoId");
        
        if (!sessaoId) {
          return new Response(
            JSON.stringify({ error: "sessaoId não fornecido" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: conversas, error } = await supabase
          .from("mt_whatsapp_conversations")
          .select("*")
          .eq("sessao_id", sessaoId)
          .order("ultima_mensagem", { ascending: false });

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify(conversas || []), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "backup-messages": {
        // GET /waha-proxy/backup-messages?conversaId=xxx
        // Returns messages from database (backup)
        const conversaId = url.searchParams.get("conversaId");
        
        if (!conversaId) {
          return new Response(
            JSON.stringify({ error: "conversaId não fornecido" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: mensagens, error } = await supabase
          .from("mt_whatsapp_messages")
          .select("*")
          .eq("conversa_id", conversaId)
          .order("timestamp", { ascending: true });

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify(mensagens || []), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(
          JSON.stringify({ error: `Ação desconhecida: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendViaWaha(
  wahaUrl: string,
  apiKey: string,
  session: string,
  phone: string,
  text: string,
  mediaUrl: string | null,
  messageType: string | null,
  sendSeparate: boolean,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const chatId = `${phone}@c.us`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
    };

    if (mediaUrl && messageType === "image") {
      const caption = sendSeparate ? "" : text;
      const res = await fetch(`${wahaUrl}/api/sendImage`, {
        method: "POST",
        headers,
        body: JSON.stringify({ chatId, session, file: { url: mediaUrl, mimetype: "image/jpeg" }, caption }),
      });
      if (!res.ok) return { success: false, error: `WAHA ${res.status}` };
      const data = await res.json();

      if (sendSeparate && text) {
        await sleep(1000);
        await fetch(`${wahaUrl}/api/sendText`, {
          method: "POST",
          headers,
          body: JSON.stringify({ chatId, session, text }),
        });
      }
      return { success: true, messageId: data?.key?.id };
    } else if (mediaUrl && (messageType === "video" || messageType === "document")) {
      const endpoint = messageType === "video" ? "sendVideo" : "sendFile";
      const mime = messageType === "video" ? "video/mp4" : undefined;
      const fileObj: Record<string, unknown> = { url: mediaUrl };
      if (mime) fileObj.mimetype = mime;
      const caption = sendSeparate ? "" : text;
      const res = await fetch(`${wahaUrl}/api/${endpoint}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ chatId, session, file: fileObj, caption }),
      });
      if (!res.ok) return { success: false, error: `WAHA ${res.status}` };
      const data = await res.json();

      if (sendSeparate && text) {
        await sleep(1000);
        await fetch(`${wahaUrl}/api/sendText`, {
          method: "POST",
          headers,
          body: JSON.stringify({ chatId, session, text }),
        });
      }
      return { success: true, messageId: data?.key?.id };
    } else {
      const res = await fetch(`${wahaUrl}/api/sendText`, {
        method: "POST",
        headers,
        body: JSON.stringify({ chatId, session, text }),
      });
      if (!res.ok) return { success: false, error: `WAHA ${res.status}` };
      const data = await res.json();
      return { success: true, messageId: data?.key?.id };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: msg };
  }
}

// Normaliza telefone para formato 55DDNXXXXXXXX (13 digitos)
function normalizePhone(phone: string): string | null {
  // Remove tudo que nao e digito
  let clean = phone.replace(/\D/g, "");

  // Se comeca com +, ja foi removido acima
  // Remover zero inicial (0XX)
  if (clean.startsWith("0")) clean = clean.slice(1);

  // 11 digitos: DDNXXXXXXXX -> adicionar 55
  if (clean.length === 11) clean = "55" + clean;
  // 10 digitos: DDXXXXXXXX -> adicionar 55 + 9
  if (clean.length === 10) clean = "55" + clean.slice(0, 2) + "9" + clean.slice(2);
  // 12 digitos: 55DDXXXXXXXX -> adicionar 9 apos DDD
  if (clean.length === 12 && clean.startsWith("55")) {
    clean = clean.slice(0, 4) + "9" + clean.slice(4);
  }

  // Validar: deve ter 13 digitos e comecar com 55
  if (clean.length === 13 && clean.startsWith("55")) return clean;

  // Numero invalido
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonRes({ error: "Method not allowed" }, 405);
  }

  // IMPORTANT: Env vars do container estao ERRADAS. Usar valores hardcoded.
  const supabase = createClient(
    "https://supabase.viniun.com.br",
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MDc4MTc0MCwiZXhwIjo0OTI2NDU1MzQwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.K1j07Xd07FuQHNNXqnwXnWvakPBfUirpKXqB5sZmkTE",
  );

  let campaignId: string;
  try {
    const body = await req.json();
    campaignId = body.broadcast_campaign_id;
    if (!campaignId) return jsonRes({ error: "broadcast_campaign_id is required" }, 400);
  } catch {
    return jsonRes({ error: "Invalid JSON" }, 400);
  }

  try {
    // Load campaign
    const { data: camp, error: campErr } = await supabase
      .from("mt_broadcast_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campErr || !camp) return jsonRes({ error: "Campaign not found" }, 404);

    if (!["draft", "scheduled", "processing", "paused"].includes(camp.status)) {
      return jsonRes({ error: `Campaign status is ${camp.status}`, status: camp.status });
    }

    // Check scheduled_at
    if (camp.status === "scheduled" && camp.scheduled_at) {
      if (Date.now() < new Date(camp.scheduled_at).getTime()) {
        return jsonRes({ status: "scheduled", scheduled_at: camp.scheduled_at });
      }
    }

    // Update to processing
    await supabase
      .from("mt_broadcast_campaigns")
      .update({ status: "processing", started_at: camp.started_at || new Date().toISOString() })
      .eq("id", camp.id);

    // Load WAHA config
    let wahaUrl = "";
    let wahaApiKey = "";
    let sessionName = "";

    if (camp.provider_type === "waha" && camp.session_id) {
      const { data: session } = await supabase
        .from("mt_whatsapp_sessions")
        .select("session_name, waha_url, waha_api_key")
        .eq("id", camp.session_id)
        .single();

      sessionName = session?.session_name || "";

      if (session?.waha_url && session?.waha_api_key) {
        wahaUrl = session.waha_url;
        wahaApiKey = session.waha_api_key;
      } else {
        const { data: config } = await supabase
          .from("mt_waha_config")
          .select("api_url, api_key")
          .eq("tenant_id", camp.tenant_id)
          .eq("is_active", true)
          .limit(1)
          .single();

        wahaUrl = config?.api_url || "";
        wahaApiKey = config?.api_key || "";
      }

      if (!wahaUrl || !sessionName) {
        return jsonRes({ error: "WAHA config not found" }, 400);
      }
    }

    // Load opt-outs
    const { data: optOuts } = await supabase
      .from("mt_broadcast_opt_outs")
      .select("phone")
      .eq("tenant_id", camp.tenant_id);

    const optOutSet = new Set((optOuts || []).map((o: { phone: string }) => o.phone));

    // Load pending messages
    const { data: messages, error: msgsErr } = await supabase
      .from("mt_broadcast_messages")
      .select("*")
      .eq("broadcast_campaign_id", camp.id)
      .in("status", ["pending", "retry"])
      .order("queued_at", { ascending: true })
      .limit(500);

    console.log("[broadcast] Messages query:", { count: messages?.length, error: msgsErr?.message, campaignId: camp.id });

    if (!messages || messages.length === 0) {
      await supabase
        .from("mt_broadcast_campaigns")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", camp.id);
      return jsonRes({ status: "completed", sent: camp.sent_count });
    }

    // Process messages
    const delayMs = camp.delay_between_messages_ms || 3000;
    const waveSize = camp.wave_size || 100;
    const wavePauseMin = camp.wave_pause_minutes || 30;
    let waveCount = 0;
    let sentCount = camp.sent_count || 0;
    let failedCount = camp.failed_count || 0;
    const startTime = Date.now();

    for (const msg of messages) {
      // Time limit (110s to stay under edge function timeout)
      if (Date.now() - startTime > 110_000) {
        await supabase
          .from("mt_broadcast_campaigns")
          .update({ sent_count: sentCount, failed_count: failedCount })
          .eq("id", camp.id);

        // Self-reinvoke
        try {
          // Self-reinvoke via internal Supabase URL (bypasses Cloudflare timeout)
          const internalUrl = Deno.env.get("SUPABASE_URL") || "https://supabase.viniun.com.br";
          const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MDc4MTc0MCwiZXhwIjo0OTI2NDU1MzQwLCJyb2xlIjoiYW5vbiJ9.fPIz99uMBXqwF9vwupAtYO_mGLlrGdeBoHofmjWg1L4";
          fetch(`${internalUrl}/functions/v1/broadcast-processor`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${anonKey}`,
              "apikey": anonKey,
            },
            body: JSON.stringify({ broadcast_campaign_id: camp.id }),
          }).catch(() => {});
        } catch { /* ignore */ }
        return jsonRes({ status: "continuing", sent: sentCount });
      }

      // Opt-out check
      if (optOutSet.has(msg.phone)) {
        await supabase
          .from("mt_broadcast_messages")
          .update({ status: "opted_out" })
          .eq("id", msg.id);
        continue;
      }

      // Wave pause
      if (waveSize > 0 && waveCount >= waveSize) {
        const nextWaveAt = new Date(Date.now() + wavePauseMin * 60000).toISOString();
        await supabase
          .from("mt_broadcast_campaigns")
          .update({
            status: "paused",
            sent_count: sentCount,
            failed_count: failedCount,
            current_wave: (camp.current_wave || 0) + 1,
            next_wave_at: nextWaveAt,
            paused_at: new Date().toISOString(),
          })
          .eq("id", camp.id);
        return jsonRes({ status: "wave_pause", sent: sentCount, next_wave_at: nextWaveAt });
      }

      // Normalize phone
      const cleanPhone = normalizePhone(msg.phone);
      if (!cleanPhone) {
        await supabase
          .from("mt_broadcast_messages")
          .update({ status: "failed", error_message: `Telefone invalido: ${msg.phone}`, failed_at: new Date().toISOString() })
          .eq("id", msg.id);
        failedCount++;
        continue;
      }

      // Mark as sending
      await supabase
        .from("mt_broadcast_messages")
        .update({ status: "sending" })
        .eq("id", msg.id);

      // Personalize
      let text = camp.message_text || "";
      text = text.replace(/\{nome\}/gi, msg.nome || "");
      text = text.replace(/\{telefone\}/gi, cleanPhone || "");

      // Send
      const result = await sendViaWaha(
        wahaUrl, wahaApiKey, sessionName,
        cleanPhone, text,
        camp.media_url, camp.message_type,
        camp.send_text_separate || false,
      );

      if (result.success) {
        await supabase
          .from("mt_broadcast_messages")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            waha_message_id: result.messageId || null,
          })
          .eq("id", msg.id);
        sentCount++;
        waveCount++;
      } else {
        const retryCount = (msg.retry_count || 0) + 1;
        const maxRetries = msg.max_retries || 3;
        await supabase
          .from("mt_broadcast_messages")
          .update({
            status: retryCount >= maxRetries ? "failed" : "retry",
            error_message: result.error,
            retry_count: retryCount,
            failed_at: retryCount >= maxRetries ? new Date().toISOString() : null,
          })
          .eq("id", msg.id);
        if (retryCount >= maxRetries) failedCount++;
      }

      // Delay
      if (delayMs > 0) await sleep(delayMs);

      // Update counters every 10 messages
      if (waveCount % 10 === 0) {
        await supabase
          .from("mt_broadcast_campaigns")
          .update({ sent_count: sentCount, failed_count: failedCount })
          .eq("id", camp.id);
      }
    }

    // Check if more pending messages
    const { count } = await supabase
      .from("mt_broadcast_messages")
      .select("id", { count: "exact", head: true })
      .eq("broadcast_campaign_id", camp.id)
      .in("status", ["pending", "retry"]);

    if ((count || 0) > 0) {
      await supabase
        .from("mt_broadcast_campaigns")
        .update({ sent_count: sentCount, failed_count: failedCount })
        .eq("id", camp.id);

      try {
        await supabase.functions.invoke("broadcast-processor", {
          body: { broadcast_campaign_id: camp.id },
        });
      } catch { /* ignore */ }
      return jsonRes({ status: "continuing", sent: sentCount, remaining: count });
    }

    // Completed
    await supabase
      .from("mt_broadcast_campaigns")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        sent_count: sentCount,
        failed_count: failedCount,
      })
      .eq("id", camp.id);

    return jsonRes({ status: "completed", sent: sentCount, failed: failedCount });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[broadcast] Error:", msg);
    return jsonRes({ error: msg }, 500);
  }
});

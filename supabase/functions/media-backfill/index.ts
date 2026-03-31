import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://supabase.viniun.com.br";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MDc4MTc0MCwiZXhwIjo0OTI2NDU1MzQwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.K1j07Xd07FuQHNNXqnwXnWvakPBfUirpKXqB5sZmkTE";

const MEDIA_BUCKET = "whatsapp-media";
const MAX_MEDIA_SIZE = 50 * 1024 * 1024; // 50MB

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/gif": "gif",
  "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm",
  "audio/ogg": "ogg", "audio/opus": "opus", "audio/mpeg": "mp3", "audio/mp4": "m4a",
  "audio/wav": "wav", "audio/aac": "aac",
  "application/pdf": "pdf", "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Parse params
    const body = await req.json().catch(() => ({}));
    const batchSize = body.batch_size || 20;
    const dryRun = body.dry_run || false;

    console.log(`[MediaBackfill] Starting batch=${batchSize} dryRun=${dryRun}`);

    // 1. Find messages with media_url but no storage_path
    const { data: messages, error: queryError } = await supabase
      .from("mt_whatsapp_messages")
      .select(`
        id, message_id, tipo, media_url, media_mimetype, storage_path,
        conversation_id,
        conversation:mt_whatsapp_conversations!inner(
          session_id, tenant_id,
          session:mt_whatsapp_sessions!inner(session_name, waha_url, waha_api_key)
        )
      `)
      .is("storage_path", null)
      .not("media_url", "is", null)
      .not("media_url", "eq", "")
      .in("tipo", ["image", "audio", "video", "document", "sticker", "ptt"])
      .order("created_at", { ascending: false })
      .limit(batchSize);

    if (queryError) {
      console.error("[MediaBackfill] Query error:", queryError);
      return new Response(JSON.stringify({ error: queryError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({
        success: true, message: "No messages to backfill", processed: 0, failed: 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`[MediaBackfill] Found ${messages.length} messages to process`);

    if (dryRun) {
      return new Response(JSON.stringify({
        success: true, message: "Dry run", found: messages.length,
        samples: messages.slice(0, 3).map(m => ({
          id: m.id, tipo: m.tipo, media_url: m.media_url?.substring(0, 80),
        })),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const msg of messages) {
      try {
        const conv = msg.conversation as any;
        const session = conv?.session;
        const tenantId = conv?.tenant_id;

        if (!tenantId || !msg.media_url) {
          console.log(`[MediaBackfill] Skip ${msg.id}: no tenant or media_url`);
          failed++;
          continue;
        }

        // Resolve full media URL
        let fullMediaUrl = msg.media_url;
        const wahaUrl = session?.waha_url || "https://waha.otimaideia.com.br";
        const wahaApiKey = session?.waha_api_key || "sitema-crm@2025";

        if (fullMediaUrl.startsWith("/api/files/")) {
          fullMediaUrl = `${wahaUrl}${fullMediaUrl}`;
        }

        // Use configured API key
        const apiKey = wahaApiKey || Deno.env.get("WAHA_API_KEY") || "";

        console.log(`[MediaBackfill] Downloading: ${fullMediaUrl.substring(0, 80)}...`);

        // Download from WAHA
        const response = await fetch(fullMediaUrl, {
          headers: { "X-Api-Key": apiKey },
          signal: AbortSignal.timeout(15000), // 15s timeout per file
        });

        if (!response.ok) {
          console.error(`[MediaBackfill] Download failed ${msg.id}: ${response.status}`);
          failed++;
          errors.push(`${msg.id}: HTTP ${response.status}`);

          // Mark as failed so we don't retry (set storage_path to 'failed')
          if (response.status === 404) {
            await supabase.from("mt_whatsapp_messages")
              .update({ storage_path: "media_unavailable" })
              .eq("id", msg.id);
          }
          continue;
        }

        const blob = await response.blob();
        if (blob.size > MAX_MEDIA_SIZE || blob.size === 0) {
          console.error(`[MediaBackfill] Invalid size ${msg.id}: ${blob.size}`);
          failed++;
          continue;
        }

        // Determine extension
        const mimetype = msg.media_mimetype || blob.type || "application/octet-stream";
        const ext = MIME_TO_EXT[mimetype] ||
          fullMediaUrl.split(".").pop()?.replace(/\?.*/,"")?.toLowerCase() || "bin";

        // Safe message ID for filename
        const safeMsgId = (msg.message_id || msg.id).replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 80);
        const storagePath = `${tenantId}/${msg.conversation_id}/${safeMsgId}_${Date.now()}.${ext}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from(MEDIA_BUCKET)
          .upload(storagePath, blob, {
            contentType: mimetype,
            cacheControl: "31536000",
            upsert: true,
          });

        if (uploadError) {
          console.error(`[MediaBackfill] Upload failed ${msg.id}:`, uploadError);
          failed++;
          errors.push(`${msg.id}: upload ${uploadError.message}`);
          continue;
        }

        // Build public URL using external hostname (edge runtime may use internal hostname)
        const EXTERNAL_URL = "https://supabase.viniun.com.br";
        const publicUrl = `${EXTERNAL_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${storagePath}`;

        // Update message record
        const { error: updateError, data: updateData } = await supabase.from("mt_whatsapp_messages")
          .update({
            storage_path: publicUrl,
            media_url: publicUrl,
          })
          .eq("id", msg.id)
          .select("id, storage_path")
          .single();

        if (updateError) {
          console.error(`[MediaBackfill] UPDATE FAILED ${msg.id}:`, updateError);
          failed++;
          errors.push(`${msg.id}: update ${updateError.message}`);
          continue;
        }

        console.log(`[MediaBackfill] ✅ ${msg.id} updated=${!!updateData} sp=${updateData?.storage_path?.substring(0,40)}`);
        processed++;

      } catch (err) {
        console.error(`[MediaBackfill] Error processing ${msg.id}:`, err);
        failed++;
        errors.push(`${msg.id}: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }

    // Count remaining
    const { count } = await supabase
      .from("mt_whatsapp_messages")
      .select("id", { count: "exact", head: true })
      .is("storage_path", null)
      .not("media_url", "is", null)
      .not("media_url", "eq", "")
      .in("tipo", ["image", "audio", "video", "document", "sticker", "ptt"]);

    console.log(`[MediaBackfill] Done: ${processed} processed, ${failed} failed, ${count} remaining`);

    return new Response(JSON.stringify({
      success: true,
      processed,
      failed,
      remaining: count,
      errors: errors.slice(0, 10),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("[MediaBackfill] Fatal error:", err);
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : "Unknown error",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

// Edge Function: AI Learning Batch
// Nightly batch learning from WhatsApp conversations, memory consolidation
// v1.0 - Mar 2026

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

    const body = await req.json().catch(() => ({}));
    const { tenantId, jobType = "whatsapp_conversations", dateRange } = body;

    // Create learning job record
    const { data: job, error: jobError } = await supabase
      .from("mt_ai_learning_jobs")
      .insert({
        tenant_id: tenantId,
        job_type: jobType,
        status: "processing",
        config: { date_range: dateRange || new Date().toISOString().split("T")[0], batch_size: 50 },
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError) throw jobError;

    const yesterday = dateRange || new Date(Date.now() - 86400000).toISOString().split("T")[0];

    let itemsProcessed = 0;
    let knowledgeItemsAdded = 0;
    let memoriesCreated = 0;
    const patternsDetected: any[] = [];

    if (jobType === "whatsapp_conversations") {
      // Fetch yesterday's WhatsApp conversations
      let convQuery = supabase
        .from("mt_whatsapp_conversations")
        .select("id, phone_number, contact_name, last_message_at, metadata")
        .gte("last_message_at", `${yesterday}T00:00:00`)
        .lte("last_message_at", `${yesterday}T23:59:59`)
        .limit(100);

      if (tenantId) convQuery = convQuery.eq("tenant_id", tenantId);

      const { data: conversations, error: convError } = await convQuery;
      if (convError) throw convError;

      for (const conv of conversations || []) {
        // Fetch messages for each conversation
        const { data: messages } = await supabase
          .from("mt_whatsapp_messages")
          .select("content, from_me, message_type, created_at")
          .eq("conversation_id", conv.id)
          .gte("created_at", `${yesterday}T00:00:00`)
          .order("created_at", { ascending: true })
          .limit(50);

        if (!messages || messages.length < 2) continue;

        itemsProcessed++;

        // Extract patterns from conversation
        const clientMessages = messages.filter((m: any) => !m.from_me).map((m: any) => m.content).filter(Boolean);
        const agentMessages = messages.filter((m: any) => m.from_me).map((m: any) => m.content).filter(Boolean);

        // Detect FAQ patterns (questions asked by clients)
        for (const msg of clientMessages) {
          if (msg && msg.includes("?") && msg.length > 10) {
            patternsDetected.push({
              pattern: "client_question",
              content: msg.substring(0, 200),
              conversation_id: conv.id,
            });
          }
        }

        // Detect price-related conversations
        const priceKeywords = ["preço", "valor", "quanto", "custa", "promoção", "desconto"];
        const hasPriceQuestion = clientMessages.some((m: string) =>
          priceKeywords.some(k => m.toLowerCase().includes(k))
        );

        if (hasPriceQuestion) {
          patternsDetected.push({
            pattern: "price_inquiry",
            frequency: 1,
            conversation_id: conv.id,
          });
        }
      }

      // Aggregate patterns
      const patternCounts: Record<string, number> = {};
      for (const p of patternsDetected) {
        const key = p.pattern;
        patternCounts[key] = (patternCounts[key] || 0) + 1;
      }
    }

    if (jobType === "memory_consolidation") {
      // Decay importance of old memories via SQL function
      if (tenantId) {
        await supabase.rpc("decay_memory_importance", { p_tenant_id: tenantId, decay_factor: 0.95 }).catch(() => {});
      }

      memoriesCreated = 0;
    }

    // Update job as completed
    const totalTokens = itemsProcessed * 500; // Estimate
    const estimatedCost = totalTokens * 0.000015; // gpt-4o-mini pricing

    await supabase
      .from("mt_ai_learning_jobs")
      .update({
        status: "completed",
        items_processed: itemsProcessed,
        items_created: knowledgeItemsAdded + memoriesCreated,
        knowledge_items_added: knowledgeItemsAdded,
        memories_created: memoriesCreated,
        patterns_detected: patternsDetected.slice(0, 50),
        total_tokens: totalTokens,
        estimated_cost_usd: estimatedCost,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    // Update config last_learning_at
    if (tenantId) {
      await supabase
        .from("mt_ai_config")
        .update({ last_learning_at: new Date().toISOString() })
        .eq("tenant_id", tenantId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        job_id: job.id,
        items_processed: itemsProcessed,
        knowledge_items_added: knowledgeItemsAdded,
        memories_created: memoriesCreated,
        patterns_detected: patternsDetected.length,
        estimated_cost_usd: estimatedCost,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[ai-learning-batch] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

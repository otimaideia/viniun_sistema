import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

interface WahaConfig {
  api_url: string;
  api_key: string;
}

interface GroupOperation {
  id: string;
  tenant_id: string;
  session_id: string;
  session_name: string;
  group_id: string | null;
  group_name: string | null;
  operation_type: string;
  status: string;
  batch_size: number;
  delay_between_batches_ms: number;
  total_numbers: number;
  added_count: number;
  failed_count: number;
  already_member_count: number;
  invalid_count: number;
  last_processed_index: number;
  started_at: string | null;
  completed_at: string | null;
}

interface OperationItem {
  id: string;
  phone: string;
  status: string;
  nome: string | null;
}

async function getWahaConfig(supabase: any): Promise<WahaConfig | null> {
  const { data, error } = await supabase
    .from("mt_waha_config")
    .select("api_url, api_key")
    .single();

  if (error || !data) {
    console.error("[group-bulk-add] Error fetching WAHA config:", error);
    return null;
  }

  return { api_url: data.api_url, api_key: data.api_key };
}

async function createWhatsAppGroup(
  config: WahaConfig,
  sessionName: string,
  groupName: string,
  initialParticipants: string[]
): Promise<{ success: boolean; groupId?: string; error?: string }> {
  try {
    const url = `${config.api_url}/api/${sessionName}/groups`;
    console.log(`[group-bulk-add] Creating group "${groupName}" via ${url}`);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": config.api_key,
      },
      body: JSON.stringify({
        name: groupName,
        participants: initialParticipants,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[group-bulk-add] Create group failed (${res.status}): ${text}`);
      return { success: false, error: `WAHA ${res.status}: ${text}` };
    }

    const data = await res.json();
    const groupId = data.id || data.gid?._serialized || data.groupId;
    console.log(`[group-bulk-add] Group created: ${groupId}`);
    return { success: true, groupId };
  } catch (err) {
    console.error("[group-bulk-add] Create group error:", err);
    return { success: false, error: String(err) };
  }
}

async function addParticipantsToGroup(
  config: WahaConfig,
  sessionName: string,
  groupId: string,
  participants: string[]
): Promise<{ status: number; data: any; error?: string }> {
  try {
    const encodedGroupId = encodeURIComponent(groupId);
    const url = `${config.api_url}/api/${sessionName}/groups/${encodedGroupId}/participants/add`;
    console.log(`[group-bulk-add] Adding ${participants.length} participants to ${groupId}`);

    // WAHA expects participants as array of objects [{id: "phone@c.us"}]
    const participantObjects = participants.map((p) => ({ id: p }));

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": config.api_key,
      },
      body: JSON.stringify({ participants: participantObjects }),
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return { status: res.status, data };
  } catch (err) {
    console.error("[group-bulk-add] Add participants error:", err);
    return { status: 0, data: null, error: String(err) };
  }
}

function resolveParticipantStatus(
  phone: string,
  wahaResponse: any
): "added" | "failed" | "already_member" | "invalid" {
  if (!wahaResponse) return "failed";

  // WAHA timeout - assumed success (WAHA processes the addition async)
  if (wahaResponse.timeout === true) {
    return "added";
  }

  // WAHA NOWEB returns array of per-participant results:
  // [{status: "200", jid: "xxx@lid", content: {attrs: {phone_number: "phone@s.whatsapp.net"}}}]
  if (Array.isArray(wahaResponse)) {
    // Empty array [] = success with no details
    if (wahaResponse.length === 0) return "added";

    // Find match by phone number in the response array
    const phoneClean = phone.replace(/\D/g, "");
    const match = wahaResponse.find((p: any) => {
      // Match by phone_number in content.attrs
      const pPhone = p?.content?.attrs?.phone_number || "";
      if (pPhone.includes(phoneClean)) return true;
      // Match by jid
      const pJid = p?.jid || p?.id || "";
      if (pJid.includes(phoneClean)) return true;
      return false;
    });

    // If we found a match, check its status
    if (match) {
      const code = String(match.status || match.code || "");
      if (code === "200") return "added";
      if (code === "409") return "already_member";
      // 403 with add_request = invitation sent (group requires approval)
      const hasAddRequest = JSON.stringify(match.content || "").includes("add_request");
      if (code === "403" && hasAddRequest) return "added"; // invitation sent = success
      if (code === "403") return "failed";
      if (code === "400" || code === "404") return "invalid";
      return "failed";
    }

    // No match found - if only 1 item in response and 1 item in batch, assume it's ours
    if (wahaResponse.length === 1) {
      const code = String(wahaResponse[0].status || wahaResponse[0].code || "");
      if (code === "200") return "added";
      if (code === "409") return "already_member";
      const hasAddRequest = JSON.stringify(wahaResponse[0].content || "").includes("add_request");
      if (code === "403" && hasAddRequest) return "added";
    }
  }

  // Object response formats
  if (wahaResponse.success === true || wahaResponse.status === "success") {
    return "added";
  }

  // Fallback: check error message
  const errorMsg = JSON.stringify(wahaResponse).toLowerCase();
  if (errorMsg.includes("already")) return "already_member";
  if (errorMsg.includes("invalid") || errorMsg.includes("not registered")) return "invalid";

  return "failed";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function reinvokeSelf(
  supabaseUrl: string,
  anonKey: string,
  groupOperationId: string
): Promise<void> {
  try {
    const url = `${supabaseUrl}/functions/v1/group-bulk-add`;
    console.log(`[group-bulk-add] Re-invoking self for operation ${groupOperationId}`);
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify({ group_operation_id: groupOperationId }),
    });
  } catch (err) {
    console.error("[group-bulk-add] Re-invoke error:", err);
  }
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { group_operation_id } = await req.json();

    if (!group_operation_id) {
      return new Response(
        JSON.stringify({ success: false, error: "group_operation_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[group-bulk-add] Starting operation ${group_operation_id}`);

    // Create supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || supabaseServiceKey;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Load operation
    const { data: operation, error: opError } = await supabase
      .from("mt_group_operations")
      .select("*")
      .eq("id", group_operation_id)
      .single();

    if (opError || !operation) {
      console.error("[group-bulk-add] Operation not found:", opError);
      return new Response(
        JSON.stringify({ success: false, error: "Operation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const op = operation as GroupOperation;

    // Check if operation is scheduled for a future time
    if ((op as any).scheduled_at) {
      const scheduledTime = new Date((op as any).scheduled_at).getTime();
      const waitMs = scheduledTime - Date.now();
      if (waitMs > 0) {
        console.log(`[group-bulk-add] Operation scheduled for ${(op as any).scheduled_at} (${Math.round(waitMs / 60000)}min from now)`);

        // Store as next_run_after and clear scheduled_at (so it only triggers once)
        await supabase
          .from("mt_group_operations")
          .update({
            next_run_after: (op as any).scheduled_at,
            scheduled_at: null,
            status: "pending",
          })
          .eq("id", op.id);

        // Re-invoke self (will handle next_run_after delay)
        reinvokeSelf(supabaseUrl, supabaseAnonKey, op.id);

        return new Response(
          JSON.stringify({
            success: true,
            status: "scheduled",
            scheduled_at: (op as any).scheduled_at,
            starts_in_minutes: Math.round(waitMs / 60000),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Scheduled time already passed, clear and proceed
      await supabase
        .from("mt_group_operations")
        .update({ scheduled_at: null })
        .eq("id", op.id);
    }

    // Check if we need to wait (delay between batches across invocations)
    if ((op as any).next_run_after) {
      const nextRun = new Date((op as any).next_run_after).getTime();
      const waitMs = nextRun - Date.now();
      if (waitMs > 0) {
        // Sleep in chunks of max 50s to stay within gateway timeout
        const cappedWait = Math.min(waitMs, 50000);
        console.log(`[group-bulk-add] Waiting ${cappedWait}ms of ${waitMs}ms remaining (next_run_after delay)...`);
        await sleep(cappedWait);

        // If still need to wait more, re-invoke with updated time
        if (waitMs > cappedWait) {
          console.log(`[group-bulk-add] Still ${waitMs - cappedWait}ms remaining, re-invoking...`);
          reinvokeSelf(supabaseUrl, supabaseAnonKey, op.id);
          return new Response(
            JSON.stringify({ success: true, status: "waiting", remaining_delay_ms: waitMs - cappedWait }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Clear next_run_after
      await supabase
        .from("mt_group_operations")
        .update({ next_run_after: null })
        .eq("id", op.id);
    }

    // Validate status
    if (op.status !== "pending" && op.status !== "processing") {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Operation status is '${op.status}', expected 'pending' or 'processing'`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status to processing
    const updateData: any = { status: "processing" };
    if (!op.started_at) {
      updateData.started_at = new Date().toISOString();
    }
    await supabase.from("mt_group_operations").update(updateData).eq("id", op.id);

    // Load WAHA config
    const wahaConfig = await getWahaConfig(supabase);
    if (!wahaConfig) {
      console.error("[group-bulk-add] WAHA config not found, pausing operation");
      await supabase
        .from("mt_group_operations")
        .update({ status: "paused" })
        .eq("id", op.id);

      return new Response(
        JSON.stringify({ success: false, error: "WAHA config not found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle create_and_add: create group first if no group_id
    let groupId = op.group_id;

    if (op.operation_type === "create_and_add" && !groupId) {
      if (!op.group_name) {
        console.error("[group-bulk-add] group_name required for create_and_add");
        await supabase
          .from("mt_group_operations")
          .update({ status: "failed" })
          .eq("id", op.id);

        return new Response(
          JSON.stringify({ success: false, error: "group_name is required for create_and_add" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create group with the session's own number as initial participant
      const createResult = await createWhatsAppGroup(
        wahaConfig,
        op.session_name,
        op.group_name,
        []
      );

      if (!createResult.success || !createResult.groupId) {
        console.error(`[group-bulk-add] Failed to create group: ${createResult.error}`);
        await supabase
          .from("mt_group_operations")
          .update({ status: "failed" })
          .eq("id", op.id);

        return new Response(
          JSON.stringify({ success: false, error: `Failed to create group: ${createResult.error}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      groupId = createResult.groupId;
      await supabase
        .from("mt_group_operations")
        .update({ group_id: groupId })
        .eq("id", op.id);

      console.log(`[group-bulk-add] Group created with ID: ${groupId}`);

      // Small delay after group creation
      await sleep(3000);
    }

    if (!groupId) {
      console.error("[group-bulk-add] No group_id available");
      await supabase
        .from("mt_group_operations")
        .update({ status: "failed" })
        .eq("id", op.id);

      return new Response(
        JSON.stringify({ success: false, error: "No group_id available" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load pending items
    const { data: items, error: itemsError } = await supabase
      .from("mt_group_operation_items")
      .select("id, phone, status, nome")
      .eq("operation_id", op.id)
      .eq("status", "pending")
      .order("id", { ascending: true })
      .limit(500);

    if (itemsError) {
      console.error(`[group-bulk-add] Error loading items: ${itemsError.message}`);
      await supabase
        .from("mt_group_operations")
        .update({ status: "paused" })
        .eq("id", op.id);

      return new Response(
        JSON.stringify({ success: false, error: "Error loading items" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pendingItems = (items || []) as OperationItem[];

    if (pendingItems.length === 0) {
      // No more pending items - operation complete
      await supabase
        .from("mt_group_operations")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", op.id);

      console.log(`[group-bulk-add] Operation ${op.id} completed (no pending items)`);

      return new Response(
        JSON.stringify({ success: true, processed: 0, remaining: 0, status: "completed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process in batches
    const batchSize = op.batch_size || 5;
    let currentDelay = op.delay_between_batches_ms || 10000;
    let consecutiveErrors = 0;
    let totalProcessed = 0;
    let batchIndex = 0;

    while (batchIndex * batchSize < pendingItems.length) {
      const elapsed = Date.now() - startTime;

      // Resume pattern: if running > 50s and items remaining, checkpoint and re-invoke
      // Keep well under gateway timeout (typically 60-100s)
      if (elapsed > 50000 && (batchIndex * batchSize + batchSize) < pendingItems.length) {
        console.log(
          `[group-bulk-add] Elapsed ${elapsed}ms, checkpointing. Processed ${totalProcessed} this invocation.`
        );

        await supabase
          .from("mt_group_operations")
          .update({
            last_processed_index: op.last_processed_index + totalProcessed,
          })
          .eq("id", op.id);

        // Re-invoke self
        reinvokeSelf(supabaseUrl, supabaseAnonKey, op.id);

        return new Response(
          JSON.stringify({
            success: true,
            processed: totalProcessed,
            remaining: pendingItems.length - batchIndex * batchSize,
            status: "processing",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Re-check operation status between batches
      if (batchIndex > 0) {
        const { data: freshOp } = await supabase
          .from("mt_group_operations")
          .select("status")
          .eq("id", op.id)
          .single();

        if (freshOp && freshOp.status !== "processing") {
          console.log(`[group-bulk-add] Operation status changed to '${freshOp.status}', stopping.`);
          return new Response(
            JSON.stringify({
              success: true,
              processed: totalProcessed,
              remaining: pendingItems.length - batchIndex * batchSize,
              status: freshOp.status,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const batchStart = batchIndex * batchSize;
      const batch = pendingItems.slice(batchStart, batchStart + batchSize);

      if (batch.length === 0) break;

      // Process ONE BY ONE with delay (WAHA NOWEB times out with multiple participants)
      const DELAY_BETWEEN_ADDS_MS = 5000; // 5s between each add
      let batchSuccess = 0;
      let batchFailed = 0;
      let batchAlreadyMember = 0;
      let batchInvalid = 0;

      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        const cleanPhone = item.phone.replace(/\D/g, "");
        const participant = `${cleanPhone}@c.us`;

        // Update item to 'adding'
        await supabase
          .from("mt_group_operation_items")
          .update({ status: "adding", processed_at: new Date().toISOString() })
          .eq("id", item.id);

        // Call WAHA API for single participant
        const result = await addParticipantsToGroup(
          wahaConfig,
          op.session_name,
          groupId,
          [participant]
        );

        // Handle rate limiting (429)
        if (result.status === 429) {
          console.warn(`[group-bulk-add] Rate limited on ${cleanPhone}. Waiting 60s...`);
          await supabase
            .from("mt_group_operation_items")
            .update({ status: "pending", processed_at: null })
            .eq("id", item.id);
          await sleep(60000);
          i--; // Retry same item
          continue;
        }

        // Handle forbidden (403) - pause operation
        if (result.status === 403) {
          console.error("[group-bulk-add] Forbidden (403). Pausing operation.");
          await supabase
            .from("mt_group_operation_items")
            .update({ status: "failed", error_message: "Forbidden (403)" })
            .eq("id", item.id);
          batchFailed++;

          await supabase
            .from("mt_group_operations")
            .update({
              status: "paused",
              added_count: op.added_count + batchSuccess,
              failed_count: op.failed_count + batchFailed,
              already_member_count: op.already_member_count + batchAlreadyMember,
              invalid_count: op.invalid_count + batchInvalid,
              last_processed_index: op.last_processed_index + totalProcessed + i + 1,
            })
            .eq("id", op.id);

          return new Response(
            JSON.stringify({ success: false, processed: totalProcessed + i + 1, status: "paused", error: "Forbidden (403)" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Handle network/unknown errors
        if (result.status === 0 || result.error) {
          consecutiveErrors++;
          console.error(`[group-bulk-add] Error on ${cleanPhone} (consecutive: ${consecutiveErrors}): ${result.error}`);
          await supabase
            .from("mt_group_operation_items")
            .update({ status: "pending", processed_at: null })
            .eq("id", item.id);

          if (consecutiveErrors > 5) {
            await supabase
              .from("mt_group_operations")
              .update({
                status: "paused",
                added_count: op.added_count + batchSuccess,
                failed_count: op.failed_count + batchFailed,
                already_member_count: op.already_member_count + batchAlreadyMember,
                invalid_count: op.invalid_count + batchInvalid,
                last_processed_index: op.last_processed_index + totalProcessed + i,
              })
              .eq("id", op.id);
            return new Response(
              JSON.stringify({ success: false, processed: totalProcessed + i, status: "paused", error: `${consecutiveErrors} consecutive errors` }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          await sleep(10000);
          i--; // Retry
          continue;
        }

        // Success - resolve status from WAHA response
        consecutiveErrors = 0;
        const itemStatus = resolveParticipantStatus(cleanPhone, result.data);
        const updatePayload: any = {
          status: itemStatus,
          processed_at: new Date().toISOString(),
        };
        if (itemStatus === "failed") {
          updatePayload.error_message = `WAHA: ${JSON.stringify(result.data).substring(0, 200)}`;
          batchFailed++;
        } else if (itemStatus === "already_member") {
          batchAlreadyMember++;
        } else if (itemStatus === "invalid") {
          batchInvalid++;
        } else {
          batchSuccess++;
        }
        await supabase
          .from("mt_group_operation_items")
          .update(updatePayload)
          .eq("id", item.id);

        console.log(`[group-bulk-add] ${cleanPhone}: ${itemStatus} (${i + 1}/${batch.length})`);

        // Delay between adds (skip on last item of batch)
        if (i < batch.length - 1) {
          await sleep(DELAY_BETWEEN_ADDS_MS);
        }

        // Check elapsed time - checkpoint if needed
        const elapsed = Date.now() - startTime;
        if (elapsed > 50000 && i < batch.length - 1) {
          console.log(`[group-bulk-add] Elapsed ${elapsed}ms mid-batch, checkpointing at item ${i + 1}/${batch.length}`);
          // Mark remaining items in this batch back to pending
          for (let j = i + 1; j < batch.length; j++) {
            await supabase
              .from("mt_group_operation_items")
              .update({ status: "pending" })
              .eq("id", batch[j].id);
          }
          totalProcessed += i + 1;
          await supabase
            .from("mt_group_operations")
            .update({
              added_count: op.added_count + batchSuccess,
              failed_count: op.failed_count + batchFailed,
              already_member_count: op.already_member_count + batchAlreadyMember,
              invalid_count: op.invalid_count + batchInvalid,
              last_processed_index: op.last_processed_index + totalProcessed,
            })
            .eq("id", op.id);
          reinvokeSelf(supabaseUrl, supabaseAnonKey, op.id);
          return new Response(
            JSON.stringify({ success: true, processed: totalProcessed, status: "processing" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      totalProcessed += batch.length;

      // Update operation counters
      await supabase
        .from("mt_group_operations")
        .update({
          added_count: op.added_count + batchSuccess,
          failed_count: op.failed_count + batchFailed,
          already_member_count: op.already_member_count + batchAlreadyMember,
          invalid_count: op.invalid_count + batchInvalid,
          last_processed_index: op.last_processed_index + totalProcessed,
        })
        .eq("id", op.id);

      console.log(
        `[group-bulk-add] Batch ${batchIndex + 1}: +${batchSuccess} added, +${batchFailed} failed, +${batchAlreadyMember} already, +${batchInvalid} invalid`
      );

      batchIndex++;

      // Delay between batches (skip if last batch)
      if (batchIndex * batchSize < pendingItems.length) {
        // Checkpoint progress and schedule re-invoke with delay
        // NEVER sleep here - return immediately to avoid gateway timeout (504)
        console.log(
          `[group-bulk-add] Batch done. Scheduling next batch in ${currentDelay}ms via re-invoke.`
        );

        await supabase
          .from("mt_group_operations")
          .update({
            last_processed_index: op.last_processed_index + totalProcessed,
          })
          .eq("id", op.id);

        // Store when the next batch should run
        const nextRunAfter = new Date(Date.now() + currentDelay).toISOString();
        await supabase
          .from("mt_group_operations")
          .update({ next_run_after: nextRunAfter })
          .eq("id", op.id);

        // Re-invoke self (will check next_run_after and sleep there)
        reinvokeSelf(supabaseUrl, supabaseAnonKey, op.id);

        return new Response(
          JSON.stringify({
            success: true,
            processed: totalProcessed,
            remaining: pendingItems.length - batchIndex * batchSize,
            status: "processing",
            next_batch_delay_ms: currentDelay,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if there are more pending items beyond the 500 we loaded
    const { count: remainingCount } = await supabase
      .from("mt_group_operation_items")
      .select("id", { count: "exact", head: true })
      .eq("operation_id", op.id)
      .eq("status", "pending");

    if (remainingCount && remainingCount > 0) {
      console.log(`[group-bulk-add] ${remainingCount} items still pending. Re-invoking.`);

      await supabase
        .from("mt_group_operations")
        .update({
          last_processed_index: op.last_processed_index + totalProcessed,
        })
        .eq("id", op.id);

      reinvokeSelf(supabaseUrl, supabaseAnonKey, op.id);

      return new Response(
        JSON.stringify({
          success: true,
          processed: totalProcessed,
          remaining: remainingCount,
          status: "processing",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // All done
    await supabase
      .from("mt_group_operations")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        last_processed_index: op.last_processed_index + totalProcessed,
      })
      .eq("id", op.id);

    console.log(
      `[group-bulk-add] Operation ${op.id} completed. Total processed this invocation: ${totalProcessed}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        remaining: 0,
        status: "completed",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[group-bulk-add] Unhandled error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://supabase.viniun.com.br";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const VAULT_ENCRYPTION_KEY = Deno.env.get("VAULT_ENCRYPTION_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Rate limiting: track decrypt requests per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

// Get user from JWT
async function getUserFromToken(authHeader: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const token = authHeader.replace("Bearer ", "");

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  // Get mt_users record
  const { data: mtUser } = await supabase
    .from("mt_users")
    .select("id, tenant_id, franchise_id, nome")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  return mtUser;
}

// Encrypt a value using pgcrypto
async function encryptValue(value: string): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase.rpc("vault_encrypt", {
    plaintext: value,
    encryption_key: VAULT_ENCRYPTION_KEY,
  });

  if (error) throw new Error(`Encryption failed: ${error.message}`);
  return data as string;
}

// Decrypt a value using pgcrypto
async function decryptValue(encryptedValue: string): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase.rpc("vault_decrypt", {
    ciphertext: encryptedValue,
    encryption_key: VAULT_ENCRYPTION_KEY,
  });

  if (error) throw new Error(`Decryption failed: ${error.message}`);
  return data as string;
}

// Log access to vault entry
async function logAccess(
  tenantId: string,
  entryId: string,
  userId: string,
  action: string,
  details?: Record<string, unknown>
) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  await supabase.from("mt_password_vault_access_log").insert({
    tenant_id: tenantId,
    vault_entry_id: entryId,
    user_id: userId,
    action,
    details,
  });

  // Update access tracking on the entry
  if (action === "reveal" || action === "copy") {
    // Increment access_count via raw SQL
    const now = new Date().toISOString();
    await supabase.rpc("vault_increment_access_count", { p_entry_id: entryId, p_now: now });
  }
}

// Generate secure random password
function generatePassword(options: {
  length?: number;
  uppercase?: boolean;
  lowercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
}): string {
  const {
    length = 16,
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = true,
  } = options;

  let charset = "";
  if (lowercase) charset += "abcdefghijklmnopqrstuvwxyz";
  if (uppercase) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (numbers) charset += "0123456789";
  if (symbols) charset += "!@#$%^&*()_+-=[]{}|;:,.<>?";

  if (!charset) charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  const array = new Uint32Array(length);
  crypto.getRandomValues(array);

  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }

  return password;
}

// Calculate password strength (0-100)
function calculateStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;

  // Length scoring
  if (password.length >= 8) score += 10;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  if (password.length >= 24) score += 10;
  if (password.length >= 32) score += 5;

  // Character diversity
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^a-zA-Z0-9]/.test(password)) score += 15;

  // Unique characters ratio
  const uniqueChars = new Set(password).size;
  const uniqueRatio = uniqueChars / password.length;
  if (uniqueRatio > 0.8) score += 10;
  else if (uniqueRatio > 0.6) score += 5;

  // Penalty for common patterns
  if (/^[a-z]+$/.test(password)) score -= 10;
  if (/^[0-9]+$/.test(password)) score -= 15;
  if (/(.)\1{2,}/.test(password)) score -= 10;
  if (/^(123|abc|qwerty|password)/i.test(password)) score -= 20;

  score = Math.max(0, Math.min(100, score));

  let label: string;
  let color: string;

  if (score < 20) { label = "Muito Fraca"; color = "#EF4444"; }
  else if (score < 40) { label = "Fraca"; color = "#F97316"; }
  else if (score < 60) { label = "Razoavel"; color = "#EAB308"; }
  else if (score < 80) { label = "Forte"; color = "#22C55E"; }
  else { label = "Excelente"; color = "#10B981"; }

  return { score, label, color };
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();
    const body = await req.json().catch(() => ({}));

    // Auth check
    const authHeader = req.headers.get("Authorization") || "";
    const user = await getUserFromToken(authHeader);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Nao autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Route handling
    switch (path) {
      case "encrypt": {
        const { value, entryId } = body;
        if (!value) {
          return new Response(
            JSON.stringify({ error: "Valor obrigatorio" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const encrypted = await encryptValue(value);
        const preview = value.length > 4
          ? "****" + value.slice(-4)
          : "****";
        const strength = calculateStrength(value);

        if (entryId) {
          await logAccess(user.tenant_id, entryId, user.id, "update", { field: "value" });
        }

        return new Response(
          JSON.stringify({
            success: true,
            encrypted_value: encrypted,
            value_preview: preview,
            strength_score: strength.score,
            strength_label: strength.label,
            strength_color: strength.color,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "decrypt": {
        const { entryId, encrypted_value } = body;
        if (!entryId && !encrypted_value) {
          return new Response(
            JSON.stringify({ error: "entryId ou encrypted_value obrigatorio" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Rate limit check
        if (!checkRateLimit(user.id)) {
          return new Response(
            JSON.stringify({ error: "Limite de requisicoes excedido. Tente novamente em 1 minuto." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        let encValue = encrypted_value;
        let tenantId = user.tenant_id;

        // If entryId provided, fetch the encrypted value from DB
        if (entryId) {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
          const { data: entry, error } = await supabase
            .from("mt_password_vault")
            .select("encrypted_value, tenant_id")
            .eq("id", entryId)
            .single();

          if (error || !entry) {
            return new Response(
              JSON.stringify({ error: "Entrada nao encontrada" }),
              { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          encValue = entry.encrypted_value;
          tenantId = entry.tenant_id;
        }

        const decrypted = await decryptValue(encValue);

        // Log the reveal action
        if (entryId) {
          await logAccess(tenantId, entryId, user.id, "reveal");
        }

        return new Response(
          JSON.stringify({ success: true, value: decrypted }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "generate": {
        const password = generatePassword({
          length: body.length || 16,
          uppercase: body.uppercase !== false,
          lowercase: body.lowercase !== false,
          numbers: body.numbers !== false,
          symbols: body.symbols !== false,
        });

        const strength = calculateStrength(password);

        return new Response(
          JSON.stringify({
            success: true,
            password,
            strength_score: strength.score,
            strength_label: strength.label,
            strength_color: strength.color,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "check-strength": {
        const { value } = body;
        if (!value) {
          return new Response(
            JSON.stringify({ error: "Valor obrigatorio" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const strength = calculateStrength(value);

        return new Response(
          JSON.stringify({ success: true, ...strength }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({
            error: "Endpoint nao encontrado",
            endpoints: ["encrypt", "decrypt", "generate", "check-strength"],
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("[vault-api] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

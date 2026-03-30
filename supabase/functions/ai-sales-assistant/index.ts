// Edge Function: AI Sales Assistant (YESia)
// v3.0 - Mar 2026 — Optimized: fast data context, no timeouts
// Key changes: cap queries at 8 sources, 1 query/source, 4s data timeout, fire-and-forget saves

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface LLMUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
}

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-4o": { input: 0.005, output: 0.015 },
  "gpt-4-turbo": { input: 0.01, output: 0.03 },
  "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
};

const MAX_DATA_SOURCES = 8;
const DATA_TIMEOUT_MS = 4000;
const LLM_TIMEOUT_MS = 25000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: authUser } } = await supabaseAuth.auth.getUser();
    if (!authUser) {
      return json({ error: "Invalid or expired token" }, 401);
    }

    const body = await req.json();
    const { message, conversationId, agentId, userId } = body;

    if (!message || !userId) {
      return json({ error: "message and userId are required" }, 400);
    }

    console.log(`[YESia] msg from ${userId}, agent=${agentId || "auto"}`);

    // ─── Step 1: User context ────────────────────────────────────────
    const userCtx = await getUserContext(supabaseAdmin, userId);
    if (!userCtx) return json({ error: "User not found" }, 404);

    const { tenantId, franchiseId, role, userName } = userCtx;

    // ─── Step 2: AI config ───────────────────────────────────────────
    const aiConfig = await getAIConfig(supabaseAdmin, tenantId);
    if (!aiConfig) return json({ error: "AI not configured" }, 404);

    // ─── Step 3: Route to agent ──────────────────────────────────────
    let selectedAgent: any = null;
    if (agentId) {
      const { data } = await supabaseAdmin
        .from("mt_ai_agents").select("*")
        .eq("id", agentId).eq("tenant_id", tenantId).eq("is_active", true)
        .maybeSingle();
      selectedAgent = data;
    }
    if (!selectedAgent) {
      selectedAgent = await routeToAgent(supabaseAdmin, tenantId, message);
    }
    if (!selectedAgent) return json({ error: "No active AI agent" }, 404);

    console.log(`[YESia] → ${selectedAgent.nome} (${selectedAgent.domain})`);

    // ─── Step 4-6: Build context IN PARALLEL ─────────────────────────
    const [dataContext, knowledgeContext, memoriesContext, history] = await Promise.all([
      buildDataContext(supabaseAdmin, selectedAgent, tenantId, franchiseId),
      aiConfig.enable_knowledge_rag ? searchKnowledge(supabaseAdmin, tenantId, message) : "",
      aiConfig.enable_memory ? searchMemories(supabaseAdmin, userId, tenantId) : "",
      getHistory(supabaseAdmin, conversationId),
    ]);

    // ─── Step 7: Build prompt & call LLM ─────────────────────────────
    const systemPrompt = buildSystemPrompt(selectedAgent, userName, role, dataContext, knowledgeContext, memoriesContext);
    const llmMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
    ];
    for (const msg of history) {
      llmMessages.push({ role: msg.role === "user" ? "user" : "assistant", content: msg.content });
    }
    llmMessages.push({ role: "user", content: message });

    // ─── Step 8: Get API key ─────────────────────────────────────────
    const apiKey =
      selectedAgent.api_key_encrypted ||
      aiConfig.openai_api_key_encrypted ||
      Deno.env.get("OPENAI_API_KEY") ||
      null;

    let finalApiKey = apiKey;
    if (!finalApiKey) {
      const { data: botCfg } = await supabaseAdmin
        .from("mt_whatsapp_bot_config").select("openai_api_key")
        .eq("tenant_id", tenantId).not("openai_api_key", "is", null)
        .limit(1).maybeSingle();
      finalApiKey = botCfg?.openai_api_key;
    }

    if (!finalApiKey) {
      return json({ error: "No API key configured. Configure em IA > Configurações." }, 500);
    }

    // ─── Step 9: Call LLM ────────────────────────────────────────────
    const provider = selectedAgent.provider || aiConfig.default_provider || "openai";
    const modelName = selectedAgent.model || aiConfig.default_model || "gpt-4o-mini";
    const temperature = selectedAgent.temperature ?? aiConfig.default_temperature ?? 0.7;
    const maxTokens = selectedAgent.max_tokens ?? aiConfig.default_max_tokens ?? 800;

    const { reply, usage } = await callLLM(provider, finalApiKey, modelName, temperature, maxTokens, llmMessages);

    console.log(`[YESia] ✓ ${usage.total_tokens} tokens $${usage.cost_usd}: ${reply.substring(0, 80)}...`);

    // ─── Build response FIRST, then save async ──────────────────────
    const responseBody = {
      reply,
      agent_used: {
        id: selectedAgent.id,
        nome: selectedAgent.nome,
        domain: selectedAgent.domain,
        avatar_url: selectedAgent.avatar_url || null,
      },
      actions: [],
      usage,
      conversation_id: conversationId || null,
    };

    // Fire-and-forget: save messages & usage in background
    const activeConvId = conversationId || null;
    if (activeConvId) {
      saveMessagesAsync(supabaseAdmin, activeConvId, tenantId, userId, message, reply, selectedAgent, modelName, usage);
    }
    saveUsageAsync(supabaseAdmin, tenantId, userId, selectedAgent.id, usage, modelName);

    return json(responseBody);

  } catch (error: any) {
    console.error("[YESia] Error:", error);
    return json({ error: error.message }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// LLM Call
// ═══════════════════════════════════════════════════════════════════════════════

async function callLLM(
  provider: string, apiKey: string, model: string,
  temperature: number, maxTokens: number,
  messages: Array<{ role: string; content: string }>
): Promise<{ reply: string; usage: LLMUsage }> {
  const endpoint = provider === "anthropic"
    ? "https://api.anthropic.com/v1/messages"
    : "https://api.openai.com/v1/chat/completions";

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  let requestBody: any;

  if (provider === "anthropic") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
    const systemMsg = messages.find(m => m.role === "system")?.content || "";
    requestBody = { model, system: systemMsg, messages: messages.filter(m => m.role !== "system"), temperature, max_tokens: maxTokens };
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`;
    requestBody = { model, messages, temperature, max_tokens: maxTokens };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const resp = await fetch(endpoint, {
      method: "POST", signal: controller.signal, headers,
      body: JSON.stringify(requestBody),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`LLM ${resp.status}: ${errText.substring(0, 300)}`);
    }

    const data = await resp.json();
    let reply: string, rawUsage: any;

    if (provider === "anthropic") {
      reply = data.content?.[0]?.text || "";
      rawUsage = { prompt_tokens: data.usage?.input_tokens || 0, completion_tokens: data.usage?.output_tokens || 0, total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0) };
    } else {
      reply = data.choices?.[0]?.message?.content || "";
      rawUsage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    }

    const costs = MODEL_COSTS[model] || MODEL_COSTS["gpt-4o-mini"];
    const costUsd = (rawUsage.prompt_tokens / 1000) * costs.input + (rawUsage.completion_tokens / 1000) * costs.output;

    return {
      reply,
      usage: { ...rawUsage, cost_usd: Math.round(costUsd * 1000000) / 1000000 },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Fire-and-forget saves (don't block response)
// ═══════════════════════════════════════════════════════════════════════════════

function saveMessagesAsync(
  sb: any, convId: string, tenantId: string, userId: string,
  userMsg: string, assistantMsg: string, agent: any, model: string, usage: LLMUsage
) {
  (async () => {
    try {
      await sb.from("mt_chatbot_messages").insert([
        { conversation_id: convId, tenant_id: tenantId, role: "user", content: userMsg, metadata: { source: "yesia", user_id: userId } },
        { conversation_id: convId, tenant_id: tenantId, role: "assistant", content: assistantMsg, agent_used: agent.nome, metadata: { source: "yesia", agent_id: agent.id, model, usage } },
      ]);
      await sb.from("mt_chatbot_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
    } catch (e) { console.warn("[YESia] save msgs err:", e); }
  })();
}

function saveUsageAsync(sb: any, tenantId: string, userId: string, agentId: string, usage: LLMUsage, model: string) {
  (async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data: existing } = await sb.from("mt_ai_token_usage")
        .select("id, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, total_requests")
        .eq("tenant_id", tenantId).eq("user_id", userId).eq("agent_id", agentId).eq("data", today)
        .maybeSingle();

      if (existing) {
        await sb.from("mt_ai_token_usage").update({
          prompt_tokens: (existing.prompt_tokens || 0) + usage.prompt_tokens,
          completion_tokens: (existing.completion_tokens || 0) + usage.completion_tokens,
          total_tokens: (existing.total_tokens || 0) + usage.total_tokens,
          estimated_cost_usd: (parseFloat(existing.estimated_cost_usd) || 0) + usage.cost_usd,
          total_requests: (existing.total_requests || 0) + 1,
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await sb.from("mt_ai_token_usage").insert({
          tenant_id: tenantId, user_id: userId, agent_id: agentId, data: today,
          provider: "openai", model,
          prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens, estimated_cost_usd: usage.cost_usd, total_requests: 1,
        });
      }
    } catch (e) { console.warn("[YESia] save usage err:", e); }
  })();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

function json(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getUserContext(sb: any, userId: string) {
  const { data: user } = await sb.from("mt_users").select("id, tenant_id, franchise_id, nome").eq("id", userId).maybeSingle();
  if (!user) return null;

  let roleName = "user";
  try {
    const { data: ur } = await sb.from("mt_user_roles").select("role_id").eq("user_id", userId).limit(1).maybeSingle();
    if (ur?.role_id) {
      const { data: r } = await sb.from("mt_roles").select("nome").eq("id", ur.role_id).maybeSingle();
      roleName = r?.nome || "user";
    }
  } catch (_) {}

  return { tenantId: user.tenant_id, franchiseId: user.franchise_id, role: roleName, userName: user.nome || "Usuario" };
}

async function getAIConfig(sb: any, tenantId: string) {
  const { data } = await sb.from("mt_ai_config").select("*").eq("tenant_id", tenantId).eq("is_active", true).maybeSingle();
  return data;
}

async function routeToAgent(sb: any, tenantId: string, message: string) {
  const { data: agents } = await sb.from("mt_ai_agents").select("*")
    .eq("tenant_id", tenantId).eq("is_active", true).is("deleted_at", null)
    .order("routing_priority", { ascending: false });

  if (!agents?.length) return null;
  if (agents.length === 1) return agents[0];

  const msgLower = message.toLowerCase();
  let best = agents[0], bestScore = 0;

  for (const agent of agents) {
    const kws: string[] = agent.routing_keywords || [];
    let score = 0;
    for (const kw of kws) {
      if (msgLower.includes(kw.toLowerCase())) score++;
    }
    if (score > 0) {
      const weighted = score * (agent.routing_priority || 1);
      if (weighted > bestScore) { bestScore = weighted; best = agent; }
    }
  }
  return best;
}

async function getHistory(sb: any, conversationId: string | null) {
  if (!conversationId) return [];
  const { data } = await sb.from("mt_chatbot_messages").select("role, content")
    .eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(10);
  return (data || []).reverse();
}

async function searchKnowledge(sb: any, tenantId: string, query: string): Promise<string> {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 3);
  if (!words.length) return "";
  const { data } = await sb.from("mt_chatbot_knowledge").select("titulo, conteudo, categoria")
    .eq("tenant_id", tenantId).eq("is_active", true)
    .or(`titulo.ilike.%${words[0]}%,conteudo.ilike.%${words[0]}%`).limit(3);
  if (!data?.length) return "";
  return data.map((e: any) => `[${e.categoria || "geral"}] ${e.titulo}: ${e.conteudo}`).join("\n").substring(0, 1500);
}

async function searchMemories(sb: any, userId: string, tenantId: string): Promise<string> {
  const { data } = await sb.from("mt_ai_memory").select("content, memory_type")
    .eq("user_id", userId).eq("tenant_id", tenantId)
    .order("importance", { ascending: false }).limit(5);
  if (!data?.length) return "";
  return data.map((m: any) => `[${m.memory_type}] ${m.content}`).join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
// Build System Prompt
// ═══════════════════════════════════════════════════════════════════════════════

function buildSystemPrompt(
  agent: any, userName: string, role: string,
  dataContext: string, knowledgeContext: string, memoriesContext: string
): string {
  const p: string[] = [];
  p.push(agent.system_prompt || "Voce e a YESia, assistente IA de gestao comercial.");
  p.push(`\n--- USUARIO ---\nNome: ${userName}\nCargo: ${role}`);

  if (dataContext) {
    p.push(`\n--- DADOS DO SISTEMA (REAIS E ATUALIZADOS) ---`);
    p.push(dataContext);
  }
  if (knowledgeContext) {
    p.push(`\n--- CONHECIMENTO ---`);
    p.push(knowledgeContext);
  }
  if (memoriesContext) {
    p.push(`\n--- MEMORIAS ---`);
    p.push(memoriesContext);
  }

  p.push(`\n--- INSTRUCOES CRITICAS ---`);
  p.push(`1. Os dados acima sao REAIS do sistema. Use SOMENTE esses dados nas respostas.`);
  p.push(`2. NUNCA INVENTE dados, reunioes, tarefas, agendamentos ou informacoes que NAO estao listados acima.`);
  p.push(`3. Se o usuario perguntar algo e NAO houver dados correspondentes acima, diga claramente: "Nao encontrei [X] cadastrado no sistema." e sugira o que ele pode fazer.`);
  p.push(`4. NUNCA crie exemplos genéricos ou informacoes fictícias para preencher lacunas.`);
  p.push(`5. Responda em portugues brasileiro, de forma clara e com numeros reais.`);
  p.push(`6. Use R$ para valores. Formate com listas quando apropriado.`);
  p.push(`7. Quando nao houver dados, seja honesto: "O sistema mostra que voce tem 0 agendamentos hoje" é melhor que inventar.`);

  return p.join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
// Build Data Context — OPTIMIZED v3.0
// Max 8 data sources, 1 fast query per source, 4s total timeout
// ═══════════════════════════════════════════════════════════════════════════════

async function buildDataContext(
  sb: any, agent: any, tenantId: string, franchiseId: string | null
): Promise<string> {
  const allSources: string[] = agent.data_sources || [];
  if (!allSources.length) return "";

  // Cap at MAX_DATA_SOURCES to prevent timeout
  const sources = allSources.slice(0, MAX_DATA_SOURCES);

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;
  const todayStart = `${today}T00:00:00`;

  const parts: string[] = [];
  const addF = (q: any) => franchiseId ? q.eq("franchise_id", franchiseId) : q;

  // Each source = ONE fast query (no sub-queries)
  const queries = sources.map(src => querySource(sb, src, tenantId, franchiseId, addF, today, todayStart, monthStart, monthEnd, parts));

  // Race: wait for all queries OR timeout at 4s (keep whatever finished)
  await Promise.race([
    Promise.allSettled(queries),
    new Promise(r => setTimeout(r, DATA_TIMEOUT_MS)),
  ]);

  if (parts.length === 0) {
    parts.push("[INFO] Nenhum dado encontrado para as fontes configuradas.");
  }

  return parts.join("\n");
}

async function querySource(
  sb: any, src: string, tid: string, fid: string | null,
  addF: (q: any) => any,
  today: string, todayStart: string, monthStart: string, monthEnd: string,
  parts: string[]
): Promise<void> {
  try {
    switch (src) {
      case "mt_leads": {
        // Count + details of hot leads (names, phones, status)
        const { count } = await addF(sb.from("mt_leads").select("id", { count: "exact", head: true }).eq("tenant_id", tid).is("deleted_at", null));
        const { data: hotLeads } = await addF(sb.from("mt_leads").select("nome, telefone, temperatura, status, score, created_at").eq("tenant_id", tid).eq("temperatura", "quente").is("deleted_at", null).order("created_at", { ascending: false }).limit(15));
        const hot = hotLeads?.length || 0;
        let leadDetail = "";
        if (hotLeads?.length) {
          leadDetail = "\nLeads quentes:\n" + hotLeads.map((l: any, i: number) => `${i+1}. ${l.nome} - Tel: ${l.telefone} - Status: ${l.status} - Score: ${l.score || 0}`).join("\n");
        }
        // Count warm leads too
        const { count: warm } = await addF(sb.from("mt_leads").select("id", { count: "exact", head: true }).eq("tenant_id", tid).eq("temperatura", "morna").is("deleted_at", null));
        parts.push(`[LEADS] Total: ${count || 0} | Quentes: ${hot} | Mornos: ${warm || 0}${leadDetail}`);
        break;
      }
      case "mt_lead_activities": {
        // Atividades de hoje
        const { count } = await addF(sb.from("mt_lead_activities").select("id", { count: "exact", head: true }).eq("tenant_id", tid).gte("created_at", todayStart));
        // Atividades/tarefas pendentes (agendadas para hoje ou atrasadas)
        const { data: pending } = await addF(sb.from("mt_lead_activities").select("tipo, descricao, data_agendada, lead_id").eq("tenant_id", tid).eq("status", "pendente").lte("data_agendada", today).order("data_agendada", { ascending: true }).limit(15));
        // Follow-ups pendentes
        const { data: followups } = await addF(sb.from("mt_lead_activities").select("tipo, descricao, data_agendada").eq("tenant_id", tid).in("tipo", ["follow_up", "ligacao", "tarefa", "retorno"]).eq("status", "pendente").order("data_agendada", { ascending: true }).limit(10));
        let actDetail = "";
        if (pending?.length) {
          actDetail = "\nTarefas pendentes (hoje ou atrasadas):\n" + pending.map((a: any) => `- [${a.tipo}] ${a.descricao || "Sem descrição"} (agendada: ${a.data_agendada || "sem data"})`).join("\n");
        }
        if (followups?.length) {
          actDetail += "\nFollow-ups pendentes:\n" + followups.map((f: any) => `- [${f.tipo}] ${f.descricao || "Sem descrição"} (${f.data_agendada || "sem data"})`).join("\n");
        }
        parts.push(`[ATIVIDADES LEADS HOJE] ${count || 0} realizadas | ${pending?.length || 0} tarefas pendentes | ${followups?.length || 0} follow-ups${actDetail}`);
        break;
      }
      case "mt_sales": {
        // Columns: valor_total, valor_desconto, custo_total, status, profissional_id, cliente_nome, created_by
        const { data: sales } = await addF(sb.from("mt_sales").select("valor_total, valor_desconto, custo_total, status, cliente_nome, numero_venda, created_at").eq("tenant_id", tid).gte("created_at", `${monthStart}T00:00:00`).is("deleted_at", null).order("created_at", { ascending: false }));
        const s = sales || [];
        const fat = s.reduce((a: number, x: any) => a + (parseFloat(x.valor_total) || 0), 0);
        const desc = s.reduce((a: number, x: any) => a + (parseFloat(x.valor_desconto) || 0), 0);
        const custo = s.reduce((a: number, x: any) => a + (parseFloat(x.custo_total) || 0), 0);
        const concl = s.filter((x: any) => x.status === "concluido" || x.status === "concluida" || x.status === "finalizado" || x.status === "finalizada").length;
        const orc = s.filter((x: any) => x.status === "orcamento").length;
        let salesDetail = "";
        if (s.length > 0 && s.length <= 10) {
          salesDetail = "\nVendas do mês:\n" + s.map((v: any, i: number) => `${i+1}. ${v.cliente_nome || "Sem nome"} - R$${parseFloat(v.valor_total||0).toFixed(2)} [${v.status}]`).join("\n");
        }
        parts.push(`[VENDAS MÊS] ${s.length} vendas (${concl} concluídas, ${orc} orçamentos) | Faturamento: R$${fat.toFixed(2)} | Descontos: R$${desc.toFixed(2)} | Custo: R$${custo.toFixed(2)} | Margem: R$${(fat - custo).toFixed(2)}${salesDetail}`);
        break;
      }
      case "mt_sale_items": {
        // Columns: sale_id, service_id, product_id, descricao, quantidade, preco_unitario, custo_unitario, valor_total, tipo_item
        const { data } = await sb.from("mt_sale_items").select("descricao, quantidade, valor_total, tipo_item").eq("tenant_id", tid).order("created_at", { ascending: false }).limit(15);
        if (data?.length) {
          parts.push(`[ITENS VENDIDOS] ${data.map((i: any) => `${i.descricao || i.tipo_item || "item"} x${i.quantidade}=R$${parseFloat(i.valor_total || 0).toFixed(2)}`).join("; ")}`);
        }
        break;
      }
      case "mt_sale_payments": {
        // Columns: sale_id, forma, tipo, bandeira, parcelas, valor
        const { data } = await sb.from("mt_sale_payments").select("forma, tipo, valor").eq("tenant_id", tid).order("created_at", { ascending: false }).limit(20);
        if (data?.length) {
          const byForma: Record<string, number> = {};
          for (const p of data) { byForma[p.forma || p.tipo || "outro"] = (byForma[p.forma || p.tipo || "outro"] || 0) + (parseFloat(p.valor) || 0); }
          parts.push(`[PAGAMENTOS] ${Object.entries(byForma).map(([k, v]) => `${k}: R$${v.toFixed(2)}`).join(" | ")}`);
        }
        break;
      }
      case "mt_financial_transactions": {
        // Columns: tipo, descricao, valor, status, data_competencia, data_vencimento, data_pagamento, forma_pagamento
        const { data } = await addF(sb.from("mt_financial_transactions").select("valor, tipo, status, descricao").eq("tenant_id", tid).gte("data_competencia", monthStart).lte("data_competencia", monthEnd).is("deleted_at", null));
        const txs = data || [];
        const rec = txs.filter((t: any) => t.tipo === "receita");
        const desp = txs.filter((t: any) => t.tipo === "despesa");
        const totalRec = rec.reduce((a: number, t: any) => a + (parseFloat(t.valor) || 0), 0);
        const totalDesp = desp.reduce((a: number, t: any) => a + (parseFloat(t.valor) || 0), 0);
        const recPago = rec.filter((t: any) => t.status === "pago" || t.status === "recebido").reduce((a: number, t: any) => a + (parseFloat(t.valor) || 0), 0);
        const despPago = desp.filter((t: any) => t.status === "pago").reduce((a: number, t: any) => a + (parseFloat(t.valor) || 0), 0);
        const despPend = desp.filter((t: any) => t.status === "pendente").reduce((a: number, t: any) => a + (parseFloat(t.valor) || 0), 0);
        let finDetail = "";
        if (desp.length <= 15 && desp.length > 0) {
          finDetail = "\nDespesas:\n" + desp.map((d: any) => `- ${d.descricao || "Sem desc"}: R$${parseFloat(d.valor||0).toFixed(2)} [${d.status}]`).join("\n");
        }
        if (rec.length > 0 && rec.length <= 10) {
          finDetail += "\nReceitas:\n" + rec.map((r: any) => `- ${r.descricao || "Sem desc"}: R$${parseFloat(r.valor||0).toFixed(2)} [${r.status}]`).join("\n");
        }
        parts.push(`[FINANCEIRO MÊS] Receitas: R$${totalRec.toFixed(2)} (recebido: R$${recPago.toFixed(2)}) | Despesas total: R$${totalDesp.toFixed(2)} (pago: R$${despPago.toFixed(2)}, pendente: R$${despPend.toFixed(2)}) | Resultado: R$${(totalRec - totalDesp).toFixed(2)}${finDetail}`);
        break;
      }
      case "mt_financial_categories": {
        const { data } = await sb.from("mt_financial_categories").select("nome, tipo").eq("tenant_id", tid).eq("is_active", true).is("deleted_at", null).limit(20);
        if (data?.length) {
          const rec = data.filter((c: any) => c.tipo === "receita").map((c: any) => c.nome).join(", ");
          const desp = data.filter((c: any) => c.tipo === "despesa").map((c: any) => c.nome).join(", ");
          parts.push(`[CATEGORIAS] Receitas: ${rec || "-"} | Despesas: ${desp || "-"}`);
        }
        break;
      }
      case "mt_financial_recurring": {
        const { data } = await addF(sb.from("mt_financial_recurring").select("tipo, descricao, valor, frequencia").eq("tenant_id", tid).eq("is_active", true).is("deleted_at", null));
        if (data?.length) {
          const recT = data.filter((r: any) => r.tipo === "receita").reduce((s: number, r: any) => s + (parseFloat(r.valor) || 0), 0);
          const desT = data.filter((r: any) => r.tipo === "despesa").reduce((s: number, r: any) => s + (parseFloat(r.valor) || 0), 0);
          parts.push(`[RECORRENTES] ${data.length} itens | Rec: R$${recT.toFixed(2)} | Desp: R$${desT.toFixed(2)}`);
        }
        break;
      }
      case "mt_commissions": {
        // Columns: profissional_id, sale_id, tipo, percentual, valor, status, categoria, referencia_mes
        const { data } = await addF(sb.from("mt_commissions").select("valor, status, categoria").eq("tenant_id", tid).gte("created_at", `${monthStart}T00:00:00`));
        if (data?.length) {
          const total = data.reduce((s: number, c: any) => s + (parseFloat(c.valor) || 0), 0);
          const pagas = data.filter((c: any) => c.status === "paga" || c.status === "pago").reduce((s: number, c: any) => s + (parseFloat(c.valor) || 0), 0);
          parts.push(`[COMISSÕES MÊS] Total: R$${total.toFixed(2)} | Pagas: R$${pagas.toFixed(2)} | Pendentes: R$${(total - pagas).toFixed(2)}`);
        } else {
          parts.push(`[COMISSÕES MÊS] Nenhuma comissão registrada`);
        }
        break;
      }
      case "mt_payroll_runs": {
        const { data } = await addF(sb.from("mt_payroll_runs").select("competencia, status, total_salarios, total_beneficios, total_impostos, total_geral, total_encargos").eq("tenant_id", tid).is("deleted_at", null).order("competencia", { ascending: false }).limit(3));
        if (data?.length) {
          const det = data.map((f: any) => `${f.competencia}: R$${parseFloat(f.total_geral || 0).toFixed(2)} (sal:R$${parseFloat(f.total_salarios || 0).toFixed(2)} enc:R$${parseFloat(f.total_encargos || 0).toFixed(2)}) [${f.status}]`).join("; ");
          parts.push(`[FOLHA] ${det}`);
        }
        break;
      }
      case "mt_payroll_employees": {
        const { data } = await addF(sb.from("mt_payroll_employees").select("nome, cargo, salario_base").eq("tenant_id", tid).eq("is_active", true).is("deleted_at", null));
        if (data?.length) {
          const total = data.reduce((s: number, e: any) => s + (parseFloat(e.salario_base) || 0), 0);
          parts.push(`[COLABORADORES] ${data.length} ativos | Folha base: R$${total.toFixed(2)} | ${data.map((e: any) => `${e.nome}(${e.cargo||"-"})R$${parseFloat(e.salario_base||0).toFixed(2)}`).join(", ")}`);
        }
        break;
      }
      case "mt_bank_statement_entries": {
        const { data } = await sb.from("mt_bank_statement_entries").select("valor, tipo").eq("tenant_id", tid).gte("data_transacao", monthStart).limit(30);
        if (data?.length) {
          const cred = data.filter((e: any) => parseFloat(e.valor) > 0).reduce((s: number, e: any) => s + Math.abs(parseFloat(e.valor) || 0), 0);
          const deb = data.filter((e: any) => parseFloat(e.valor) < 0).reduce((s: number, e: any) => s + Math.abs(parseFloat(e.valor) || 0), 0);
          parts.push(`[EXTRATO MÊS] ${data.length} lançamentos | Créditos: R$${cred.toFixed(2)} | Débitos: R$${deb.toFixed(2)}`);
        }
        break;
      }
      case "mt_appointments": {
        // Columns: data_agendamento (date), hora_inicio (time), status, cliente_nome, servico_nome
        const { data: todayAppts } = await addF(sb.from("mt_appointments").select("cliente_nome, servico_nome, hora_inicio, status").eq("tenant_id", tid).eq("data_agendamento", today).order("hora_inicio", { ascending: true }).limit(20));
        const { count: monthC } = await addF(sb.from("mt_appointments").select("id", { count: "exact", head: true }).eq("tenant_id", tid).gte("data_agendamento", monthStart).lte("data_agendamento", monthEnd));
        let apptDetail = "";
        if (todayAppts?.length) {
          apptDetail = "\nAgendamentos hoje:\n" + todayAppts.map((a: any) => `- ${a.hora_inicio || "?"} ${a.cliente_nome || "Cliente"} - ${a.servico_nome || "Serviço"} [${a.status}]`).join("\n");
        }
        parts.push(`[AGENDAMENTOS] Hoje: ${todayAppts?.length || 0} | Mês: ${monthC || 0}${apptDetail}`);
        break;
      }
      case "mt_services": {
        const { data } = await sb.from("mt_services").select("nome, preco, categoria").eq("tenant_id", tid).eq("is_active", true).limit(20);
        if (data?.length) {
          parts.push(`[SERVIÇOS] ${data.length} ativos: ${data.map((s: any) => `${s.nome} R$${parseFloat(s.preco || 0).toFixed(2)}`).join(", ")}`);
        }
        break;
      }
      case "mt_goals": {
        // Columns: titulo, tipo, periodo, data_inicio, data_fim, meta_valor, meta_unidade, valor_atual, percentual_atingido, status
        const { data } = await addF(sb.from("mt_goals").select("titulo, valor_atual, meta_valor, percentual_atingido, status, meta_unidade").eq("tenant_id", tid).neq("status", "cancelada").is("deleted_at", null).limit(5));
        if (data?.length) {
          parts.push(`[METAS] ${data.map((g: any) => { const p = g.percentual_atingido || (g.meta_valor > 0 ? Math.round(((g.valor_atual||0) / g.meta_valor) * 100) : 0); return `${g.titulo}: ${p}% (R$${parseFloat(g.valor_atual||0).toFixed(2)}/R$${parseFloat(g.meta_valor||0).toFixed(2)}) [${g.status}]`; }).join(" | ")}`);
        }
        break;
      }
      case "mt_productivity_daily": {
        // Columns: user_id, data, presente, diaria_minima, total_comissoes, total_servicos, valor_pago
        const { data } = await addF(sb.from("mt_productivity_daily").select("presente, total_comissoes, total_servicos, valor_pago").eq("tenant_id", tid).eq("data", today));
        if (data?.length) {
          const pres = data.filter((p: any) => p.presente).length;
          const com = data.reduce((s: number, p: any) => s + (parseFloat(p.total_comissoes) || 0), 0);
          const valPago = data.reduce((s: number, p: any) => s + (parseFloat(p.valor_pago) || 0), 0);
          parts.push(`[PRODUTIVIDADE HOJE] ${pres}/${data.length} presentes | Comissões: R$${com.toFixed(2)} | Valor pago: R$${valPago.toFixed(2)}`);
        }
        break;
      }
      case "mt_professional_attendance": {
        // Columns: user_id, data, checkin_em, checkout_em, status
        const { data } = await addF(sb.from("mt_professional_attendance").select("checkin_em, checkout_em, status").eq("tenant_id", tid).eq("data", today));
        if (data?.length) {
          parts.push(`[PONTO HOJE] ${data.filter((a: any) => a.checkin_em).length} check-ins | ${data.filter((a: any) => a.checkout_em).length} check-outs`);
        } else {
          parts.push(`[PONTO HOJE] Nenhum registro`);
        }
        break;
      }
      case "mt_franchises": {
        const { data } = await sb.from("mt_franchises").select("nome, cidade, estado").eq("tenant_id", tid).eq("is_active", true).limit(15);
        if (data?.length) parts.push(`[FRANQUIAS] ${data.length} ativas: ${data.map((f: any) => `${f.nome}(${f.cidade}/${f.estado})`).join(", ")}`);
        break;
      }
      case "mt_users": {
        const { data } = await addF(sb.from("mt_users").select("nome, cargo").eq("tenant_id", tid).eq("is_active", true));
        if (data?.length) parts.push(`[EQUIPE] ${data.length} ativos: ${data.map((u: any) => `${u.nome}(${u.cargo||"-"})`).join(", ")}`);
        break;
      }
      case "mt_whatsapp_conversations": {
        const { count } = await addF(sb.from("mt_whatsapp_conversations").select("id", { count: "exact", head: true }).eq("tenant_id", tid));
        const { count: unread } = await addF(sb.from("mt_whatsapp_conversations").select("id", { count: "exact", head: true }).eq("tenant_id", tid).gt("unread_count", 0));
        parts.push(`[WHATSAPP] ${count || 0} conversas | ${unread || 0} não lidas`);
        break;
      }
      case "mt_campaigns": {
        // Columns: nome, status, budget_planejado, budget_gasto, leads, conversoes, valor_conversoes, cpl, roas
        const { data } = await addF(sb.from("mt_campaigns").select("nome, status, budget_gasto, leads, conversoes, roas").eq("tenant_id", tid).eq("status", "ativa").limit(5));
        if (data?.length) parts.push(`[CAMPANHAS] ${data.map((c: any) => `${c.nome}: R$${parseFloat(c.budget_gasto||0).toFixed(2)} gasto, ${c.leads||0} leads, ${c.conversoes||0} conversões`).join("; ")}`);
        break;
      }
      case "mt_influencers": {
        const { data } = await addF(sb.from("mt_influencers").select("nome_artistico, total_indicacoes, valor_gerado").eq("tenant_id", tid).eq("is_active", true).limit(10));
        if (data?.length) {
          const tv = data.reduce((s: number, i: any) => s + (parseFloat(i.valor_gerado) || 0), 0);
          parts.push(`[INFLUENCIADORAS] ${data.length} ativas | Valor gerado: R$${tv.toFixed(2)}`);
        }
        break;
      }
      case "mt_packages": {
        const { data } = await addF(sb.from("mt_packages").select("nome, preco_pacote, vendas_realizadas").eq("tenant_id", tid).eq("is_active", true).is("deleted_at", null).limit(10));
        if (data?.length) parts.push(`[PACOTES] ${data.map((p: any) => `${p.nome}: R$${parseFloat(p.preco_pacote||0).toFixed(2)} (${p.vendas_realizadas||0}x)`).join(", ")}`);
        break;
      }
      case "mt_assets": {
        const { data } = await addF(sb.from("mt_assets").select("nome, valor_aquisicao").eq("tenant_id", tid).is("deleted_at", null).limit(10));
        if (data?.length) {
          const total = data.reduce((s: number, a: any) => s + (parseFloat(a.valor_aquisicao) || 0), 0);
          parts.push(`[PATRIMÔNIO] ${data.length} itens | Aquisição: R$${total.toFixed(2)}`);
        }
        break;
      }
      case "mt_forms": {
        const { data } = await sb.from("mt_forms").select("nome, total_submissoes, taxa_conversao").eq("tenant_id", tid).eq("publicado", true).is("deleted_at", null).limit(5);
        if (data?.length) parts.push(`[FORMULÁRIOS] ${data.map((f: any) => `${f.nome}: ${f.total_submissoes||0} submissões`).join(", ")}`);
        break;
      }
      case "mt_form_submissions": {
        const { count } = await addF(sb.from("mt_form_submissions").select("id", { count: "exact", head: true }).eq("tenant_id", tid).gte("created_at", `${monthStart}T00:00:00`).is("deleted_at", null));
        parts.push(`[SUBMISSÕES MÊS] ${count || 0}`);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.warn(`[YESia] err ${src}:`, err);
  }
}

// Edge Function: Task AI Assist
// Recebe uma ideia/descrição livre e retorna campos estruturados para criar uma tarefa
// v1.0 - Mar 2026

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://supabase.viniun.com.br';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { idea, tenant_id, categories } = await req.json();

    if (!idea || !tenant_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'idea e tenant_id sao obrigatorios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Buscar API key: mt_ai_agents → mt_whatsapp_bot_config → mt_chatbot_config
    let apiKey: string | null = null;

    // Tentar mt_ai_agents primeiro
    const { data: agent } = await supabase
      .from('mt_ai_agents')
      .select('api_key_encrypted, provider, model')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (agent?.api_key_encrypted) {
      apiKey = agent.api_key_encrypted;
    }

    // Fallback: mt_whatsapp_bot_config
    if (!apiKey) {
      const { data: botConfig } = await supabase
        .from('mt_whatsapp_bot_config')
        .select('openai_api_key')
        .eq('tenant_id', tenant_id)
        .eq('is_active', true)
        .maybeSingle();

      apiKey = botConfig?.openai_api_key || null;
    }

    // Fallback: mt_chatbot_config
    if (!apiKey) {
      const { data: chatbotConfig } = await supabase
        .from('mt_chatbot_config')
        .select('api_key_encrypted')
        .eq('tenant_id', tenant_id)
        .eq('is_active', true)
        .maybeSingle();

      apiKey = chatbotConfig?.api_key_encrypted || null;
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhuma API key de IA configurada para este tenant.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Montar categorias disponíveis para o prompt
    const categoriesText = categories && categories.length > 0
      ? categories.map((c: any) => `- "${c.nome}" (id: ${c.id})`).join('\n')
      : 'Nenhuma categoria disponível';

    const today = new Date().toISOString().slice(0, 10);

    // 3. Chamar OpenAI
    const systemPrompt = `Voce e um assistente de gestao de tarefas para uma empresa. O usuario vai descrever uma ideia ou necessidade de forma livre, e voce deve estruturar isso em campos de uma tarefa.

Hoje e ${today}.

Categorias disponiveis:
${categoriesText}

Retorne APENAS um JSON valido (sem markdown, sem backticks) com estes campos:
{
  "titulo": "string - titulo curto e claro da tarefa (max 100 chars)",
  "descricao": "string - descricao detalhada com contexto, passos e criterios de aceitacao. Use quebras de linha para organizar.",
  "prioridade": "baixa | normal | alta | urgente",
  "category_id": "string | null - ID da categoria mais adequada da lista acima, ou null se nenhuma se encaixar",
  "estimated_minutes": "number | null - estimativa em minutos",
  "due_date": "string | null - data sugerida no formato YYYY-MM-DD baseada na urgencia descrita",
  "due_time": "string | null - horario sugerido no formato HH:MM"
}

Regras:
- O titulo deve ser objetivo e descritivo (como um ticket)
- A descricao deve detalhar o que precisa ser feito, incluindo contexto e criterios de conclusao
- Estime a prioridade baseado em palavras-chave (urgente, importante, pode esperar, etc)
- Estime o tempo baseado na complexidade descrita
- Sugira uma data baseada na urgencia (urgente = hoje, alta = amanha, normal = 3 dias, baixa = 7 dias)
- Se a ideia mencionar horario, use-o. Senao, sugira horario comercial (18:00 para fim do dia)
- Escolha a categoria mais adequada da lista fornecida`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: idea },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      console.error('[task-ai-assist] OpenAI error:', errText);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao chamar IA. Verifique a API key.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await openaiResponse.json();
    const rawContent = openaiData.choices?.[0]?.message?.content?.trim() || '';

    // 4. Parse do JSON retornado
    let parsed: any;
    try {
      // Limpar possíveis backticks/markdown
      const cleaned = rawContent.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('[task-ai-assist] Falha ao parsear JSON da IA:', rawContent);
      return new Response(
        JSON.stringify({ success: false, error: 'IA retornou formato invalido. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Validar e sanitizar campos
    const result = {
      titulo: String(parsed.titulo || '').slice(0, 500),
      descricao: String(parsed.descricao || ''),
      prioridade: ['baixa', 'normal', 'alta', 'urgente'].includes(parsed.prioridade)
        ? parsed.prioridade
        : 'normal',
      category_id: parsed.category_id || null,
      estimated_minutes: typeof parsed.estimated_minutes === 'number' && parsed.estimated_minutes > 0
        ? parsed.estimated_minutes
        : null,
      due_date: parsed.due_date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.due_date)
        ? parsed.due_date
        : null,
      due_time: parsed.due_time && /^\d{2}:\d{2}$/.test(parsed.due_time)
        ? parsed.due_time
        : null,
    };

    console.log(`[task-ai-assist] Sucesso para tenant ${tenant_id}: "${result.titulo}"`);

    return new Response(
      JSON.stringify({ success: true, data: result, usage: openaiData.usage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[task-ai-assist] Erro:', err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

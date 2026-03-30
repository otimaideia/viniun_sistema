// Edge Function: AI Knowledge Extract
// Extrai FAQs, scripts de venda e padrões de conversas WhatsApp reais
// Popula mt_chatbot_knowledge com embeddings para RAG

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const tenantId = body.tenant_id;
    const mode = body.mode || 'all'; // 'converted', 'hot', 'all', 'recent'
    const limit = body.limit || 50; // Max conversas para analisar

    if (!tenantId) {
      return new Response(JSON.stringify({ error: 'tenant_id obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 1. Buscar API key do bot config
    const { data: botConfig } = await supabase
      .from('mt_whatsapp_bot_config')
      .select('openai_api_key')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    const apiKey = botConfig?.openai_api_key;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key OpenAI não configurada' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Buscar conversas relevantes
    let conversationQuery = supabase
      .from('mt_whatsapp_conversations')
      .select('id, contact_name, contact_phone, lead_id')
      .eq('tenant_id', tenantId)
      .eq('is_group', false)
      .is('deleted_at', null)
      .not('lead_id', 'is', null)
      .order('last_message_at', { ascending: false })
      .limit(limit);

    // Filtrar por tipo de lead
    if (mode === 'converted' || mode === 'hot') {
      const { data: leads } = await supabase
        .from('mt_leads')
        .select('id')
        .eq('tenant_id', tenantId)
        .or(mode === 'converted'
          ? 'status.eq.convertido,status.eq.agendado'
          : 'temperatura.eq.quente');

      if (leads && leads.length > 0) {
        const leadIds = leads.map(l => l.id);
        conversationQuery = conversationQuery.in('lead_id', leadIds);
      }
    }

    const { data: conversations } = await conversationQuery;
    if (!conversations || conversations.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhuma conversa encontrada', extracted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[Knowledge] Analisando ${conversations.length} conversas (mode: ${mode})`);

    // 3. Registrar job
    const { data: job } = await supabase
      .from('mt_ai_learning_jobs')
      .insert({
        tenant_id: tenantId,
        job_type: 'knowledge_extraction',
        source: 'whatsapp',
        status: 'running',
        items_total: conversations.length,
      })
      .select('id')
      .single();

    // 4. Para cada conversa, buscar mensagens e extrair padrões
    let totalExtracted = 0;
    const BATCH_SIZE = 5;

    for (let i = 0; i < conversations.length; i += BATCH_SIZE) {
      const batch = conversations.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (conv) => {
        // Buscar mensagens da conversa (max 100)
        const { data: messages } = await supabase
          .from('mt_whatsapp_messages')
          .select('body, from_me, timestamp')
          .eq('conversation_id', conv.id)
          .or('is_revoked.is.null,is_revoked.eq.false')
          .order('timestamp', { ascending: true })
          .limit(100);

        if (!messages || messages.length < 4) return 0; // Conversas muito curtas não servem

        // Formatar como diálogo
        const dialog = messages
          .filter(m => m.body && m.body.trim().length > 2)
          .map(m => `${m.from_me ? 'ATENDENTE' : 'CLIENTE'}: ${m.body}`)
          .join('\n');

        if (dialog.length < 100) return 0; // Diálogo muito curto

        return { conv, dialog };
      });

      const results = await Promise.all(batchPromises);
      const validDialogs = results.filter(r => r && typeof r === 'object') as Array<{ conv: any; dialog: string }>;

      if (validDialogs.length === 0) continue;

      // Enviar batch para GPT para extrair padrões
      const combinedDialogs = validDialogs.map((d, idx) =>
        `--- CONVERSA ${idx + 1} (${d.conv.contact_name || 'Desconhecido'}) ---\n${d.dialog.substring(0, 2000)}`
      ).join('\n\n');

      try {
        const extractResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.3,
            max_tokens: 2000,
            messages: [
              {
                role: 'system',
                content: `Você é um analista de vendas de clínica de estética/depilação a laser.
Analise as conversas de WhatsApp abaixo e extraia conhecimento útil.

Retorne um JSON com a seguinte estrutura:
{
  "faqs": [{"pergunta": "...", "resposta": "..."}],
  "objecoes": [{"objecao": "...", "como_superar": "..."}],
  "scripts_venda": [{"situacao": "...", "script": "..."}],
  "gatilhos_fechamento": [{"gatilho": "...", "exemplo": "..."}]
}

Extraia APENAS padrões REAIS das conversas. Não invente. Foque em:
- Perguntas que clientes fazem frequentemente
- Como atendentes respondem objeções sobre preço
- Scripts que levaram a agendamento/fechamento
- Frases que geram engajamento do cliente`
              },
              {
                role: 'user',
                content: combinedDialogs
              }
            ]
          })
        });

        if (!extractResponse.ok) {
          console.error('[Knowledge] Erro OpenAI:', await extractResponse.text());
          continue;
        }

        const extractData = await extractResponse.json();
        const content = extractData.choices[0]?.message?.content || '';

        // Parsear JSON da resposta
        let extracted;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            extracted = JSON.parse(jsonMatch[0]);
          }
        } catch {
          console.error('[Knowledge] Erro ao parsear JSON extraído');
          continue;
        }

        if (!extracted) continue;

        // 5. Salvar no knowledge base com embeddings
        const knowledgeItems: Array<{ titulo: string; conteudo: string; categoria: string }> = [];

        if (extracted.faqs) {
          for (const faq of extracted.faqs) {
            knowledgeItems.push({
              titulo: faq.pergunta,
              conteudo: `Pergunta: ${faq.pergunta}\nResposta: ${faq.resposta}`,
              categoria: 'faq'
            });
          }
        }
        if (extracted.objecoes) {
          for (const obj of extracted.objecoes) {
            knowledgeItems.push({
              titulo: obj.objecao,
              conteudo: `Objeção: ${obj.objecao}\nComo superar: ${obj.como_superar}`,
              categoria: 'objecao'
            });
          }
        }
        if (extracted.scripts_venda) {
          for (const script of extracted.scripts_venda) {
            knowledgeItems.push({
              titulo: script.situacao,
              conteudo: `Situação: ${script.situacao}\nScript: ${script.script}`,
              categoria: 'script_venda'
            });
          }
        }
        if (extracted.gatilhos_fechamento) {
          for (const gatilho of extracted.gatilhos_fechamento) {
            knowledgeItems.push({
              titulo: gatilho.gatilho,
              conteudo: `Gatilho: ${gatilho.gatilho}\nExemplo: ${gatilho.exemplo}`,
              categoria: 'gatilho_fechamento'
            });
          }
        }

        // Gerar embeddings e salvar
        for (const item of knowledgeItems) {
          try {
            // Gerar embedding
            const embResponse = await fetch('https://api.openai.com/v1/embeddings', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                model: 'text-embedding-3-small',
                input: item.conteudo
              })
            });

            let embedding = null;
            if (embResponse.ok) {
              const embData = await embResponse.json();
              embedding = embData.data[0]?.embedding;
            }

            // Inserir no knowledge base
            const { error: kbError } = await supabase
              .from('mt_chatbot_knowledge')
              .insert({
                tenant_id: tenantId,
                titulo: item.titulo.substring(0, 200),
                conteudo: item.conteudo,
                categoria: item.categoria,
                embedding: embedding,
                fonte: 'whatsapp_extraction',
                is_active: true,
              });

            if (kbError) {
              console.error('[Knowledge] Erro ao inserir:', kbError.message);
            }

            totalExtracted++;
          } catch (err) {
            console.error('[Knowledge] Erro ao salvar item:', err);
          }
        }

        console.log(`[Knowledge] Batch ${Math.floor(i/BATCH_SIZE) + 1}: ${knowledgeItems.length} itens extraídos`);
      } catch (err) {
        console.error('[Knowledge] Erro no batch:', err);
      }

      // Rate limiting
      if (i + BATCH_SIZE < conversations.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // 6. Atualizar job
    if (job?.id) {
      await supabase
        .from('mt_ai_learning_jobs')
        .update({
          status: 'completed',
          items_processed: conversations.length,
          items_created: totalExtracted,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);
    }

    console.log(`[Knowledge] Extração concluída: ${totalExtracted} itens de ${conversations.length} conversas`);

    return new Response(JSON.stringify({
      success: true,
      conversations_analyzed: conversations.length,
      knowledge_items_extracted: totalExtracted,
      job_id: job?.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[Knowledge] Erro:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

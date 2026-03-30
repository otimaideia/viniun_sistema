// Edge Function: AI Follow-up Agent
// Executa cadência de follow-up usando configs de mt_cadencia_config
// Envia mensagens via WAHA usando a sessão configurada na cadência

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Stop words — se lead respondeu com essas, parar cadência
const STOP_WORDS = ['não quero', 'nao quero', 'pare', 'parar', 'cancelar', 'remover', 'sair', 'não tenho interesse', 'nao tenho interesse', 'sem interesse'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const tenantId = body.tenant_id;
    const dryRun = body.dry_run || false; // Se true, não envia msgs (apenas simula)
    const maxLeads = body.max_leads || 20; // Limite de leads por execução

    console.log(`[Followup] Iniciando (tenant: ${tenantId || 'todos'}, dryRun: ${dryRun}, max: ${maxLeads})`);

    // 1. Buscar configs de cadência ativas
    let configQuery = supabase
      .from('mt_cadencia_config')
      .select('*')
      .eq('is_active', true);

    if (tenantId) {
      configQuery = configQuery.eq('tenant_id', tenantId);
    }

    const { data: configs } = await configQuery;

    if (!configs || configs.length === 0) {
      console.log('[Followup] Nenhuma cadência ativa encontrada');
      return new Response(JSON.stringify({ message: 'Nenhuma cadência ativa', processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let totalProcessed = 0;
    let totalSent = 0;
    let totalSkipped = 0;

    for (const config of configs) {
      console.log(`[Followup] Processando cadência: ${config.nome} (intervalo: ${JSON.stringify(config.intervalo_dias)})`);

      // 2. Buscar execuções pendentes (próxima tentativa <= agora)
      const { data: execucoes } = await supabase
        .from('mt_cadencia_execucao')
        .select('*, lead:mt_leads(id, nome, telefone, whatsapp, status, temperatura, servico_interesse)')
        .eq('cadencia_config_id', config.id)
        .eq('status', 'ativa')
        .lte('proxima_tentativa_em', new Date().toISOString())
        .limit(maxLeads);

      if (!execucoes || execucoes.length === 0) {
        console.log(`[Followup] Cadência ${config.nome}: nenhuma execução pendente`);
        continue;
      }

      // 3. Buscar sessão WAHA e config para envio
      const sessionId = config.session_id;
      let wahaUrl = '';
      let wahaApiKey = '';
      let sessionName = '';

      if (sessionId) {
        const { data: session } = await supabase
          .from('mt_whatsapp_sessions')
          .select('session_name, waha_url, waha_api_key')
          .eq('id', sessionId)
          .single();

        if (session?.waha_url && session?.waha_api_key) {
          wahaUrl = session.waha_url;
          wahaApiKey = session.waha_api_key;
          sessionName = session.session_name;
        }
      }

      // Fallback para config global do tenant
      if (!wahaUrl) {
        const { data: wahaConfig } = await supabase
          .from('mt_waha_config')
          .select('api_url, api_key')
          .eq('tenant_id', config.tenant_id)
          .maybeSingle();

        if (wahaConfig?.api_url) {
          wahaUrl = wahaConfig.api_url;
          wahaApiKey = wahaConfig.api_key;
        }

        // Buscar primeira sessão ativa como fallback
        if (!sessionName) {
          const { data: fallbackSession } = await supabase
            .from('mt_whatsapp_sessions')
            .select('session_name')
            .eq('tenant_id', config.tenant_id)
            .eq('is_active', true)
            .eq('is_default', true)
            .maybeSingle();
          sessionName = fallbackSession?.session_name || '';
        }
      }

      if (!wahaUrl || !sessionName) {
        console.error(`[Followup] Cadência ${config.nome}: sem config WAHA ou sessão`);
        continue;
      }

      // Buscar API key OpenAI para gerar msgs personalizadas
      const { data: botConfig } = await supabase
        .from('mt_whatsapp_bot_config')
        .select('openai_api_key')
        .eq('tenant_id', config.tenant_id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      const openaiKey = botConfig?.openai_api_key;

      // 4. Processar cada execução
      for (const exec of execucoes) {
        const lead = exec.lead;
        if (!lead) {
          totalSkipped++;
          continue;
        }

        // Checar stop words na última mensagem do lead
        const phone = lead.whatsapp || lead.telefone;
        if (phone) {
          const chatId = `${phone.replace(/\D/g, '')}@c.us`;
          const { data: lastMsg } = await supabase
            .from('mt_whatsapp_messages')
            .select('body')
            .eq('from_me', false)
            .ilike('body', `%${STOP_WORDS.join('%')}%`)
            .order('timestamp', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (lastMsg?.body) {
            const msgLower = lastMsg.body.toLowerCase();
            if (STOP_WORDS.some(w => msgLower.includes(w))) {
              await supabase
                .from('mt_cadencia_execucao')
                .update({ status: 'respondeu', updated_at: new Date().toISOString() })
                .eq('id', exec.id);
              totalSkipped++;
              console.log(`[Followup] Lead ${lead.nome} pediu para parar: "${lastMsg.body.substring(0, 50)}"`);
              continue;
            }
          }
        }

        // Checar se lead já converteu/agendou — parar cadência
        if (['convertido', 'agendado', 'perdido'].includes(lead.status)) {
          await supabase
            .from('mt_cadencia_execucao')
            .update({ status: lead.status === 'perdido' ? 'esgotada' : 'convertida', updated_at: new Date().toISOString() })
            .eq('id', exec.id);
          totalSkipped++;
          console.log(`[Followup] Lead ${lead.nome} (${lead.status}) — cadência encerrada`);
          continue;
        }

        // Checar se atingiu max tentativas
        const currentAttempt = exec.tentativa_atual || 0;
        const maxAttempts = config.max_tentativas || 3;
        const intervalDays = config.intervalo_dias || [1, 3, 7];

        if (currentAttempt >= maxAttempts) {
          // Executar ação de max tentativas
          const acao = config.acao_max_tentativas || 'stop';
          await supabase
            .from('mt_cadencia_execucao')
            .update({ status: 'esgotada', updated_at: new Date().toISOString() })
            .eq('id', exec.id);

          if (acao === 'move_stage' && config.etapa_destino_sem_resposta) {
            // Mover lead para estágio configurado (ex: Perdido)
            await supabase
              .from('mt_leads')
              .update({ status: config.etapa_destino_sem_resposta, updated_at: new Date().toISOString() })
              .eq('id', lead.id);
          }

          totalSkipped++;
          console.log(`[Followup] Lead ${lead.nome}: max tentativas (${maxAttempts}) — ação: ${acao}`);
          continue;
        }

        // Verificar horário de envio (seg-sex 8h-18h)
        const now = new Date();
        const hour = now.getHours();
        const dayOfWeek = now.getDay();
        if (dayOfWeek === 0 || hour < 8 || hour >= 18) {
          console.log(`[Followup] Fora do horário de envio (${dayOfWeek}/${hour}h) — pulando`);
          continue;
        }

        // Gerar mensagem de follow-up
        let mensagem = '';
        const templateIndex = currentAttempt;
        const templates = config.templates_por_tentativa || [];

        if (templates[templateIndex]) {
          // Usar template configurado (substituir variáveis)
          mensagem = templates[templateIndex]
            .replace('{{nome}}', lead.nome || 'você')
            .replace('{{servico}}', lead.servico_interesse || 'nossos serviços')
            .replace('{{empresa}}', 'YESlaser');
        } else if (openaiKey) {
          // Gerar com IA
          try {
            const tentativaDesc = currentAttempt === 0 ? 'primeira' : currentAttempt === 1 ? 'segunda' : 'última';
            const aiResp = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
              body: JSON.stringify({
                model: 'gpt-4o-mini',
                temperature: 0.8,
                max_tokens: 200,
                messages: [
                  {
                    role: 'system',
                    content: `Você é a Loren, consultora da YESlaser. Gere UMA mensagem curta (2-3 frases) de follow-up para WhatsApp.
Esta é a ${tentativaDesc} tentativa de contato. ${currentAttempt >= 2 ? 'Seja mais direta e ofereça algo especial.' : 'Seja amigável e mostre interesse genuíno.'}
NUNCA diga que é IA. Use emojis moderados (1-2). Seja natural.`
                  },
                  {
                    role: 'user',
                    content: `Lead: ${lead.nome || 'Cliente'}, interesse em: ${lead.servico_interesse || 'depilação a laser'}. Temperatura: ${lead.temperatura || 'morno'}. Tentativa ${currentAttempt + 1} de ${maxAttempts}.`
                  }
                ]
              })
            });

            if (aiResp.ok) {
              const aiData = await aiResp.json();
              mensagem = aiData.choices[0]?.message?.content || '';
            }
          } catch (aiErr) {
            console.error('[Followup] Erro IA:', aiErr);
          }
        }

        if (!mensagem) {
          mensagem = `Oi ${lead.nome || ''}! Tudo bem? Vi que você demonstrou interesse nos nossos serviços. Posso te ajudar com mais informações? 😊`;
        }

        // Formatar chatId
        const phone = lead.whatsapp || lead.telefone;
        if (!phone) {
          totalSkipped++;
          continue;
        }
        const chatId = `${phone.replace(/\D/g, '')}@c.us`;

        console.log(`[Followup] Enviando para ${lead.nome} (${phone}): "${mensagem.substring(0, 50)}..." ${dryRun ? '[DRY RUN]' : ''}`);

        if (!dryRun) {
          // Enviar via WAHA
          try {
            const wahaResp = await fetch(`${wahaUrl}/api/sendText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Api-Key': wahaApiKey },
              body: JSON.stringify({ session: sessionName, chatId, text: mensagem })
            });

            if (!wahaResp.ok) {
              console.error(`[Followup] WAHA erro: ${await wahaResp.text()}`);
              totalSkipped++;
              continue;
            }
          } catch (wahaErr) {
            console.error('[Followup] WAHA erro:', wahaErr);
            totalSkipped++;
            continue;
          }
        }

        // Registrar tentativa
        await supabase
          .from('mt_cadencia_tentativa')
          .insert({
            execucao_id: exec.id,
            tentativa_numero: currentAttempt + 1,
            canal: 'whatsapp',
            mensagem_enviada: mensagem,
            status: dryRun ? 'dry_run' : 'sent',
            enviada_em: new Date().toISOString(),
          });

        // Calcular próxima tentativa
        const nextAttempt = currentAttempt + 1;
        let proximaTentativa: string | null = null;

        if (nextAttempt < maxAttempts && intervalDays[nextAttempt]) {
          const next = new Date();
          next.setDate(next.getDate() + intervalDays[nextAttempt]);
          next.setHours(10, 0, 0, 0); // Agendar para 10h do dia
          proximaTentativa = next.toISOString();
        }

        // Atualizar execução
        await supabase
          .from('mt_cadencia_execucao')
          .update({
            tentativa_atual: nextAttempt,
            ultima_tentativa_em: new Date().toISOString(),
            proxima_tentativa_em: proximaTentativa,
            status: nextAttempt >= maxAttempts ? 'esgotada' : 'ativa',
            updated_at: new Date().toISOString(),
          })
          .eq('id', exec.id);

        // Atualizar lead
        await supabase
          .from('mt_leads')
          .update({
            ultimo_contato: new Date().toISOString(),
            total_contatos: (lead.total_contatos || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', lead.id);

        totalSent++;
        totalProcessed++;
      }
    }

    const result = {
      success: true,
      cadencias_processadas: configs.length,
      total_processed: totalProcessed,
      total_sent: totalSent,
      total_skipped: totalSkipped,
      dry_run: dryRun,
    };

    console.log(`[Followup] Resultado:`, JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[Followup] Erro:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

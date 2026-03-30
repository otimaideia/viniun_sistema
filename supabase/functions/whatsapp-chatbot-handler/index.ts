// Edge Function: WhatsApp Chatbot Handler com OpenAI
// Loren - SDR Humanizada com Function Calling, extração de dados e contexto enriquecido
// v3.0 - Fev 2026

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sanitizeObjectForJSON, createSanitizedFetch } from "../_shared/unicodeSanitizer.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { fetch: createSanitizedFetch() },
    });

    // Aceitar ambos os formatos de parâmetros (camelCase do webhook e snake_case legado)
    const body = await req.json();
    const session_id = body.sessionId || body.session_id;
    const conversation_id = body.conversationId || body.conversation_id;
    const message_text = body.message || body.message_text;
    const from_number = body.fromNumber || body.from_number;
    let tenant_id = body.tenantId || body.tenant_id;

    // Contexto enriquecido do webhook
    const lead = body.leadContext || null;
    const servicos = body.servicos || [];
    const franchise = body.franchiseContext || null;
    const contactName = body.contactName || null;
    const messageType = body.messageType || 'chat';
    const imageUrl = body.imageUrl || null;
    const imageCaption = body.imageCaption || null;
    const audioTranscription = body.audioTranscription || null;
    const wahaApiKey = body.wahaApiKey || null;

    console.log(`[Chatbot] Processando msg de ${from_number || 'unknown'} (tenant: ${tenant_id || 'resolving...'}, tipo: ${messageType})`);

    // Se tenant_id não fornecido, buscar da sessão
    if (!tenant_id && session_id) {
      const { data: session } = await supabase
        .from('mt_whatsapp_sessions')
        .select('tenant_id')
        .eq('id', session_id)
        .single();
      tenant_id = session?.tenant_id;
    }

    if (!tenant_id) {
      console.log('[Chatbot] Tenant não identificado');
      return new Response(JSON.stringify({
        success: false, skipped: true,
        reason: 'no_tenant_id', message: 'Tenant não identificado'
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // 1. Buscar configuração do bot para este tenant
    let botConfig: any = null;

    if (session_id) {
      const { data: sessionConfig } = await supabase
        .from('mt_whatsapp_bot_config')
        .select('*')
        .eq('session_id', session_id)
        .eq('is_active', true)
        .maybeSingle();
      if (sessionConfig) botConfig = sessionConfig;
    }

    if (!botConfig) {
      const { data: tenantConfig } = await supabase
        .from('mt_whatsapp_bot_config')
        .select('*')
        .eq('tenant_id', tenant_id)
        .eq('is_active', true)
        .order('session_id', { ascending: true, nullsFirst: true })
        .limit(1)
        .maybeSingle();
      if (tenantConfig) botConfig = tenantConfig;
    }

    if (!botConfig) {
      console.log('[Chatbot] Bot não configurado ou inativo');
      return new Response(JSON.stringify({
        success: false, skipped: true,
        reason: 'bot_not_configured', message: 'Bot não configurado ou inativo para este tenant'
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // 2. Verificar se deve ativar bot (horário, etc.)
    if (!shouldActivateBot(botConfig)) {
      console.log('[Chatbot] Bot não deve ser ativado neste momento');
      return new Response(JSON.stringify({
        success: false, skipped: true,
        reason: 'bot_not_active_now', message: 'Fora do horário de funcionamento do bot'
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // 3. Montar system prompt DINÂMICO com catálogo e contexto
    let systemPrompt = botConfig.system_prompt || `Você é a Loren, consultora de beleza e estética da unidade. Você é uma pessoa real que trabalha aqui.
NUNCA diga que é IA, bot ou assistente virtual. Seja simpática, direta e confiante. Use linguagem natural de WhatsApp.
Se não souber responder, diga "deixa eu confirmar com a equipe e já te retorno".`;

    // --- DATA E HORA ATUAL (crítico para agendamento) ---
    const now = new Date();
    const diasSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const diaSemana = diasSemana[now.getDay()];
    const dataFormatada = `${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`;
    const horaFormatada = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    systemPrompt += `\n\n--- DATA E HORA ATUAL ---`;
    systemPrompt += `\nHoje é ${diaSemana}, ${dataFormatada}, ${horaFormatada}`;
    systemPrompt += `\nAno atual: ${now.getFullYear()}`;
    systemPrompt += `\nUse SEMPRE esta data como referência. Se o cliente diz "terça", calcule a PRÓXIMA terça-feira a partir de hoje.`;
    systemPrompt += `\nNUNCA sugira datas no passado. NUNCA invente datas sem calcular.`;

    // --- CATÁLOGO DE SERVIÇOS, PACOTES E PRODUTOS ---
    if (servicos.length > 0) {
      const porTipo: Record<string, Record<string, string[]>> = {};
      servicos.forEach((s: any) => {
        const tipo = s.tipo || 'servico';
        if (!porTipo[tipo]) porTipo[tipo] = {};
        const cat = s.categoria || 'geral';
        if (!porTipo[tipo][cat]) porTipo[tipo][cat] = [];
        porTipo[tipo][cat].push(s.nome);
      });

      const catLabels: Record<string, string> = {
        'feminino': 'Depilação a Laser Feminina',
        'masculino': 'Depilação a Laser Masculina',
        'estetica_facial': 'Estética Facial',
        'estetica_corporal': 'Estética Corporal',
        'geral': 'Geral'
      };
      const tipoLabels: Record<string, string> = {
        'servico': 'SERVIÇOS',
        'pacote': 'PACOTES',
        'produto': 'PRODUTOS'
      };

      for (const [tipo, categorias] of Object.entries(porTipo)) {
        systemPrompt += `\n\n--- ${tipoLabels[tipo] || tipo.toUpperCase()} DISPONÍVEIS ---`;
        for (const [cat, nomes] of Object.entries(categorias)) {
          systemPrompt += `\n${catLabels[cat] || cat}: ${nomes.join(', ')}`;
        }
      }
      systemPrompt += '\nNOTA: Os valores variam por unidade. Convide para avaliação gratuita para saber valores.';
    }

    // --- DADOS DA FRANQUIA ---
    if (franchise) {
      systemPrompt += '\n\n--- UNIDADE ---';
      systemPrompt += `\n${franchise.nome}`;
      if (franchise.cidade && franchise.cidade !== 'Não informado') {
        systemPrompt += ` - ${franchise.cidade}/${franchise.estado}`;
      }
      if (franchise.endereco) {
        systemPrompt += `\nEndereço: ${franchise.endereco}${franchise.bairro ? ', ' + franchise.bairro : ''}`;
      }
      if (franchise.whatsapp) {
        systemPrompt += `\nWhatsApp: ${franchise.whatsapp}`;
      }
      if (franchise.horario_funcionamento) {
        const h = franchise.horario_funcionamento;
        const seg = h.segunda;
        const sab = h.sabado;
        if (seg) systemPrompt += `\nHorário: Seg-Sex ${seg.abre}-${seg.fecha}`;
        if (sab) systemPrompt += `, Sáb ${sab.abre}-${sab.fecha}`;
        if (!h.domingo) systemPrompt += '. Domingo: Fechado';
      }
    }

    // --- CONTEXTO DO CLIENTE ---
    const clienteNome = lead?.nome || contactName || null;
    if (lead) {
      systemPrompt += '\n\n--- CLIENTE ---';
      systemPrompt += `\nNome: ${clienteNome || 'Não identificado'}`;
      if (lead.sobrenome) systemPrompt += ` ${lead.sobrenome}`;
      if (lead.temperatura) systemPrompt += ` | Temperatura: ${lead.temperatura}`;
      if (lead.status) systemPrompt += ` | Status: ${lead.status}`;
      if (lead.servico_interesse) systemPrompt += `\nInteresse anterior: ${lead.servico_interesse}`;
      if (lead.score) systemPrompt += ` | Score: ${lead.score}/100`;
      if (lead.email) systemPrompt += `\nEmail: ${lead.email}`;
      if (lead.data_nascimento) systemPrompt += ` | Nascimento: ${lead.data_nascimento}`;
      if (lead.ultimo_contato) {
        const dias = Math.round((Date.now() - new Date(lead.ultimo_contato).getTime()) / 86400000);
        systemPrompt += `\nÚltimo contato: ${dias} dia(s) atrás`;
      }
      if (lead.total_contatos) systemPrompt += ` | Total interações: ${lead.total_contatos}`;
      if (lead.cidade && lead.estado) systemPrompt += `\nLocalização: ${lead.cidade}/${lead.estado}`;

      // REGRA: Se já tem nome, NÃO perguntar novamente
      if (clienteNome && clienteNome !== 'Não identificado') {
        systemPrompt += `\n\nIMPORTANTE: O cliente se chama "${clienteNome}". TRATE PELO NOME em todas as respostas. NÃO pergunte o nome novamente.`;
      } else {
        systemPrompt += '\n\nIMPORTANTE: Você AINDA NÃO sabe o nome do cliente. Pergunte o nome na sua PRIMEIRA resposta de forma natural.';
      }

      systemPrompt += '\nAdapte o tom conforme a temperatura (quente=urgente, frio=nurturing).';
    } else if (contactName) {
      systemPrompt += `\n\n--- CLIENTE ---\nNome: ${contactName} (novo contato)`;
      systemPrompt += `\nIMPORTANTE: O contato informou o nome "${contactName}". Use esse nome. Pergunte o sobrenome.`;
    } else {
      systemPrompt += '\n\n--- CLIENTE ---\nCliente novo, sem dados. Pergunte o nome na primeira mensagem.';
    }

    // --- AGENDAMENTO ---
    const agendHoraInicio = botConfig.agendamento_hora_inicio || '13:00';
    const agendHoraFim = botConfig.agendamento_hora_fim || '19:00';
    const agendDias = botConfig.agendamento_dias || [1,2,3,4,5,6]; // 0=dom, 6=sab
    const diasNomes = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
    const diasDisponiveis = agendDias.map((d: number) => diasNomes[d]).join(', ');
    const agendEnabled = botConfig.agendamento_enabled !== false;

    if (agendEnabled) {
      systemPrompt += `\n\n--- AGENDAMENTO ---`;
      systemPrompt += `\nVocê PODE agendar avaliações/procedimentos para o cliente.`;
      systemPrompt += `\nHorários: ${agendHoraInicio} às ${agendHoraFim}`;
      systemPrompt += `\nDias: ${diasDisponiveis}. Domingo: FECHADO.`;
      systemPrompt += `\nServiço padrão: ${botConfig.agendamento_servico_padrao || 'Avaliação Gratuita'}`;
      systemPrompt += `\n\nREGRAS ABSOLUTAS DE AGENDAMENTO:`;
      systemPrompt += `\n1. Use a DATA ATUAL acima para calcular datas. "terça" = próxima terça-feira A PARTIR DE HOJE.`;
      systemPrompt += `\n2. SEMPRE chame check_availability ANTES de create_appointment.`;
      systemPrompt += `\n3. NUNCA sugira uma data sem verificar disponibilidade primeiro.`;
      systemPrompt += `\n4. NUNCA agende datas no passado.`;
      systemPrompt += `\n5. Se o horário não estiver disponível, mostre os horários livres da função check_availability.`;
      systemPrompt += `\n6. Só chame create_appointment APÓS o cliente confirmar data e horário.`;
    }

    // --- RAG: BUSCAR CONTEXTO DA BASE DE CONHECIMENTO ---
    const ragQuery = message_text || audioTranscription || '';
    if (ragQuery.length > 3) {
      try {
        // Gerar embedding da mensagem do cliente
        const embResp = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${botConfig.openai_api_key}` },
          body: JSON.stringify({ model: 'text-embedding-3-small', input: ragQuery })
        });

        if (embResp.ok) {
          const embData = await embResp.json();
          const queryEmbedding = embData.data[0]?.embedding;

          if (queryEmbedding) {
            // Buscar top 3 matches na knowledge base via similarity
            const { data: kbMatches } = await supabase.rpc('match_knowledge', {
              query_embedding: queryEmbedding,
              match_threshold: 0.7,
              match_count: 3,
              p_tenant_id: tenant_id
            });

            if (kbMatches && kbMatches.length > 0) {
              systemPrompt += '\n\n--- BASE DE CONHECIMENTO (use estas informações para responder melhor) ---';
              kbMatches.forEach((match: any, idx: number) => {
                systemPrompt += `\n${idx + 1}. [${match.categoria}] ${match.conteudo}`;
              });
            }
          }
        }
      } catch (ragErr) {
        console.debug('[Chatbot] RAG search falhou (nao-critico):', ragErr);
      }
    }

    // --- INSTRUÇÕES PARA MÍDIA ---
    systemPrompt += '\n\n--- MÍDIA ---';
    systemPrompt += '\nSe o cliente enviar áudio, a transcrição aparecerá como [ÁUDIO TRANSCRITO]. Responda normalmente ao conteúdo.';
    systemPrompt += '\nSe o cliente enviar imagem, ela será mostrada como [IMAGEM]. Comente a imagem e continue a conversa.';

    console.log(`[Chatbot] System prompt: ${systemPrompt.length} chars, ${servicos.length} serviços, lead=${lead?.nome || 'novo'}`);

    // 4. Buscar histórico de mensagens da conversa (últimas 50)
    const { data: messageHistory } = await supabase
      .from('mt_whatsapp_messages')
      .select('id, body, from_me, created_at, tipo, is_bot_message, media_url')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: false })
      .limit(50);

    // 5. Montar mensagens para OpenAI
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Adicionar histórico (inverter para ordem cronológica, dedup msgs bot)
    if (messageHistory) {
      const seen = new Set<string>();
      const deduped = messageHistory.reverse().filter((msg: any) => {
        // Dedup: remover mensagens bot com mesmo body
        if (msg.is_bot_message && msg.body) {
          if (seen.has(msg.body)) return false;
          seen.add(msg.body);
        }
        return true;
      });

      deduped.forEach((msg: any) => {
        if (msg.body) {
          let content = msg.body;
          // Marcar áudios transcritos no histórico
          if (msg.tipo === 'audio' || msg.tipo === 'ptt') {
            content = `[ÁUDIO TRANSCRITO]: ${msg.body}`;
          }
          messages.push({
            role: msg.from_me ? 'assistant' : 'user',
            content
          });
        }
      });
    }

    // 6. Montar mensagem atual (com suporte a imagem via Vision)
    if (messageType === 'image' && imageUrl) {
      // Tentar baixar imagem e converter para base64
      let imageBase64: string | null = null;
      try {
        const imgHeaders: Record<string, string> = {};
        if (wahaApiKey) imgHeaders['X-Api-Key'] = wahaApiKey;
        const imgResp = await fetch(imageUrl, { headers: imgHeaders });
        if (imgResp.ok) {
          const imgBuffer = await imgResp.arrayBuffer();
          const bytes = new Uint8Array(imgBuffer);
          // Converter para base64
          let binary = '';
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          imageBase64 = btoa(binary);
        }
      } catch (e) {
        console.error('[Chatbot] Erro ao baixar imagem:', e);
      }

      if (imageBase64) {
        const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
        if (imageCaption) {
          contentParts.push({ type: 'text', text: `O cliente enviou esta imagem com a legenda: "${imageCaption}"` });
        } else {
          contentParts.push({ type: 'text', text: 'O cliente enviou esta imagem:' });
        }
        contentParts.push({
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
        });
        messages.push({ role: 'user', content: contentParts });
      } else {
        // Fallback se não conseguir baixar
        messages.push({
          role: 'user',
          content: imageCaption || '[Cliente enviou uma imagem que não pôde ser analisada]'
        });
      }
    } else if (message_text) {
      // Mensagem normal de texto (ou transcrição de áudio)
      let content = message_text;
      if (audioTranscription) {
        content = `[ÁUDIO TRANSCRITO]: ${audioTranscription}`;
      }
      messages.push({ role: 'user', content });
    }

    // 7. Chamar OpenAI API com timeout de 8s
    const apiKey = botConfig.openai_api_key;
    if (!apiKey) {
      console.log('[Chatbot] API key não configurada');
      return new Response(JSON.stringify({
        success: false, skipped: true,
        reason: 'no_api_key', message: 'API key não configurada no bot config'
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    const sanitizedMessages = sanitizeObjectForJSON(messages);

    // Tools para Function Calling — qualificação de lead + agendamento
    const tools = [
      {
        type: 'function' as const,
        function: {
          name: 'update_customer_data',
          description: 'Atualiza dados do cliente quando ele informar dados pessoais durante a conversa. Chame APENAS quando o cliente fornecer explicitamente a informação.',
          parameters: {
            type: 'object',
            properties: {
              nome: { type: 'string', description: 'Nome completo do cliente (ex: "Maria Silva")' },
              sobrenome: { type: 'string', description: 'Sobrenome do cliente, se informado separadamente' },
              email: { type: 'string', description: 'Email do cliente (ex: "maria@email.com")' },
              cep: { type: 'string', description: 'CEP do cliente, apenas números (ex: "11700100")' },
              cidade: { type: 'string', description: 'Cidade onde mora o cliente' },
              estado: { type: 'string', description: 'Estado/UF (ex: "SP", "RJ")' },
              data_nascimento: { type: 'string', description: 'Data de nascimento no formato YYYY-MM-DD (ex: "1990-05-15")' },
              genero: { type: 'string', enum: ['feminino', 'masculino', 'outro'], description: 'Gênero do cliente' },
              servico_interesse: { type: 'string', description: 'Serviço que o cliente demonstrou interesse' },
              como_conheceu: { type: 'string', description: 'Como o cliente conheceu a clínica (indicação, instagram, google, etc)' },
              telefone_secundario: { type: 'string', description: 'Telefone secundário do cliente' }
            },
            required: []
          }
        }
      },
      {
        type: 'function' as const,
        function: {
          name: 'check_availability',
          description: 'Verificar horários disponíveis para agendamento em uma data. SEMPRE chame esta função ANTES de create_appointment para saber quais horários estão livres.',
          parameters: {
            type: 'object',
            properties: {
              data: { type: 'string', description: 'Data para verificar no formato YYYY-MM-DD. Use a data atual do system prompt para calcular.' }
            },
            required: ['data']
          }
        }
      },
      {
        type: 'function' as const,
        function: {
          name: 'create_appointment',
          description: 'Agendar avaliação ou procedimento. APENAS chame APÓS check_availability confirmar que o horário está livre.',
          parameters: {
            type: 'object',
            properties: {
              data: { type: 'string', description: 'Data do agendamento no formato YYYY-MM-DD' },
              hora: { type: 'string', description: 'Horário no formato HH:MM' },
              servico: { type: 'string', description: 'Nome do serviço/procedimento (default: Avaliação Gratuita)' },
              observacoes: { type: 'string', description: 'Observações adicionais sobre o agendamento' }
            },
            required: ['data', 'hora']
          }
        }
      }
    ];

    // Timeout de 10s na chamada OpenAI (aumentado para acomodar function calling)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const modelName = botConfig.openai_model || botConfig.model || 'gpt-4o-mini';

    let openaiData: any;
    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: sanitizedMessages,
          temperature: parseFloat(botConfig.openai_temperature || botConfig.temperature || '0.7'),
          max_tokens: parseInt(botConfig.openai_max_tokens || botConfig.max_tokens || '500'),
          tools: tools,
          tool_choice: 'auto'
        })
      });

      if (!openaiResponse.ok) {
        const errText = await openaiResponse.text();
        console.error('[Chatbot] Erro OpenAI:', errText);
        throw new Error(`Erro ao chamar OpenAI: ${errText}`);
      }

      openaiData = await openaiResponse.json();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error('[Chatbot] OpenAI timeout (10s) - transferindo para humano');
        return new Response(JSON.stringify({
          success: false, skipped: true,
          reason: 'openai_timeout',
          should_transfer_to_human: true,
          message: 'OpenAI timeout após 10s'
        }), { headers: { 'Content-Type': 'application/json' } });
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    // Processar resposta (com suporte a tool_calls / Function Calling)
    const choice = openaiData.choices[0];
    let botReply = choice.message.content || '';
    const usage = openaiData.usage;

    // Processar tool_calls (update_customer_data e/ou create_appointment)
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      let leadUpdated = false;
      const toolResults: Array<{ tool_call_id: string; content: string }> = [];

      for (const toolCall of choice.message.tool_calls) {
        if (toolCall.function.name === 'update_customer_data') {
          try {
            const extractedData = JSON.parse(toolCall.function.arguments);
            console.log('[Chatbot] Dados extraídos via Function Calling:', JSON.stringify(extractedData));
            leadUpdated = await updateLeadData(supabase, tenant_id, from_number, lead, extractedData);
            toolResults.push({ tool_call_id: toolCall.id, content: leadUpdated ? 'Dados do cliente atualizados com sucesso.' : 'Dados registrados.' });
          } catch (parseErr) {
            console.error('[Chatbot] Erro ao parsear tool_call arguments:', parseErr);
            toolResults.push({ tool_call_id: toolCall.id, content: 'Erro ao processar dados.' });
          }
        } else if (toolCall.function.name === 'check_availability') {
          try {
            const availData = JSON.parse(toolCall.function.arguments);
            console.log('[Chatbot] Verificando disponibilidade:', JSON.stringify(availData));
            const availResult = await checkAvailability(supabase, tenant_id, session_id, availData.data, botConfig);
            toolResults.push({ tool_call_id: toolCall.id, content: availResult });
          } catch (parseErr) {
            console.error('[Chatbot] Erro check_availability:', parseErr);
            toolResults.push({ tool_call_id: toolCall.id, content: 'Erro ao verificar disponibilidade.' });
          }
        } else if (toolCall.function.name === 'create_appointment') {
          try {
            const appointmentData = JSON.parse(toolCall.function.arguments);
            console.log('[Chatbot] Agendamento solicitado:', JSON.stringify(appointmentData));
            const appointmentResult = await createAppointment(supabase, tenant_id, session_id, from_number, lead, appointmentData, botConfig);
            toolResults.push({ tool_call_id: toolCall.id, content: appointmentResult.message });
            if (appointmentResult.success) leadUpdated = true;
          } catch (parseErr) {
            console.error('[Chatbot] Erro ao parsear appointment:', parseErr);
            toolResults.push({ tool_call_id: toolCall.id, content: 'Erro ao processar agendamento.' });
          }
        }
      }

      // Se não gerou texto na resposta (só tool_call), fazer segunda chamada para obter resposta textual
      if (!botReply) {
        try {
          const followUpMessages = [
            ...sanitizedMessages,
            choice.message, // Inclui tool_calls
            ...toolResults.map(tr => ({
              role: 'tool' as const,
              tool_call_id: tr.tool_call_id,
              content: tr.content
            }))
          ];

          const followUpResp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: modelName,
              messages: sanitizeObjectForJSON(followUpMessages),
              temperature: parseFloat(botConfig.openai_temperature || botConfig.temperature || '0.7'),
              max_tokens: parseInt(botConfig.openai_max_tokens || botConfig.max_tokens || '500')
            })
          });

          if (followUpResp.ok) {
            const followUpData = await followUpResp.json();
            botReply = followUpData.choices[0].message.content || '';
            // Somar tokens da segunda chamada
            if (followUpData.usage && usage) {
              usage.prompt_tokens += followUpData.usage.prompt_tokens || 0;
              usage.completion_tokens += followUpData.usage.completion_tokens || 0;
              usage.total_tokens += followUpData.usage.total_tokens || 0;
            }
          }
        } catch (followUpErr) {
          console.error('[Chatbot] Erro na segunda chamada (follow-up):', followUpErr);
          botReply = 'Oi! Me conta, no que posso te ajudar? 😊';
        }
      }
    }

    console.log(`[Chatbot] Resposta gerada (${usage?.total_tokens || 0} tokens): ${botReply.substring(0, 80)}...`);

    // 8. Detectar se deve transferir para humano
    const shouldTransfer = detectHandoffTriggers(message_text || '', botReply, botConfig);

    if (shouldTransfer) {
      console.log('[Chatbot] Handoff detectado - transferindo para humano');
      return new Response(JSON.stringify({
        success: true,
        bot_reply: botReply,
        should_transfer_to_human: true,
        usage
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // 9. Atualizar métricas do bot
    await supabase
      .from('mt_whatsapp_bot_config')
      .update({
        total_messages_handled: (botConfig.total_messages_handled || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', botConfig.id);

    // 10. Salvar interação para aprendizado (fire-and-forget)
    if (botReply) {
      const interactionLog = `[WhatsApp Bot] Cliente: ${message_text || audioTranscription || '[mídia]'}\nLoren: ${botReply}`;
      supabase.from('mt_ai_memory').insert({
        tenant_id: tenant_id,
        memory_type: 'learning',
        content: interactionLog,
        source: 'whatsapp_bot',
        importance: 0.5,
        metadata: {
          conversation_id: conversation_id,
          from_number: from_number,
          tokens: usage?.total_tokens || 0,
          lead_nome: lead?.nome || contactName || null,
        },
      }).then(() => console.log('[Chatbot] Interação salva em mt_ai_memory'))
        .catch((err: any) => console.debug('[Chatbot] Erro ao salvar memória:', err?.message));
    }

    // 11. Retornar resposta do bot
    return new Response(JSON.stringify({
      success: true,
      bot_reply: botReply,
      should_transfer_to_human: false,
      usage
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('[Chatbot] Erro:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      should_transfer_to_human: true
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// Helper: Verificar se bot deve ser ativado
function shouldActivateBot(config: any): boolean {
  // Se only_outside_hours está ativo, bot só responde FORA do horário da equipe
  if (config.only_outside_hours) {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay(); // 0=Dom, 1=Seg, ..., 6=Sab

    // Verificar se hoje é dia de trabalho da equipe
    const diasEquipe: number[] = config.dias_semana || [1, 2, 3, 4, 5]; // Seg-Sex default
    const isWorkday = diasEquipe.includes(currentDay);

    if (isWorkday && config.horario_inicio && config.horario_fim) {
      // Converter horario_inicio/fim para minutos do dia
      const [startH, startM] = (config.horario_inicio as string).split(':').map(Number);
      let [endH, endM] = (config.horario_fim as string).split(':').map(Number);

      // Sábado (6) termina mais cedo: 16h
      if (currentDay === 6) {
        endH = 16;
        endM = 0;
      }

      const currentMinutes = currentHour * 60 + currentMinute;
      const startMinutes = (startH || 9) * 60 + (startM || 0);
      const endMinutes = (endH || 18) * 60 + (endM || 0);

      // Equipe está ativa agora → bot NÃO responde
      if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
        return false;
      }
    }

    // Fora do horário ou dia sem equipe → bot responde
    return true;
  }

  // Se not only_outside_hours, bot responde sempre (24h)
  return true;
}

// Helper: Detectar gatilhos de handoff (bot → humano)
function detectHandoffTriggers(userMessage: string, botReply: string, config: any): boolean {
  const userLower = (userMessage || '').toLowerCase();

  // Palavras-chave do usuário pedindo atendente
  const handoffKeywords = [
    'atendente',
    'humano',
    'pessoa',
    'gerente',
    'supervisor',
    'preciso de ajuda',
    'falar com alguém',
    'falar com alguem',
    'quero falar com',
  ];

  if (handoffKeywords.some(kw => userLower.includes(kw))) {
    return true;
  }

  // Limite de interações sem resolução
  if (config.max_bot_interactions && config.total_messages_handled >= config.max_bot_interactions) {
    return true;
  }

  return false;
}

// Helper: Atualizar dados do lead no banco (extraídos via Function Calling)
async function updateLeadData(
  supabase: any,
  tenantId: string,
  phoneNumber: string | null,
  existingLead: any,
  extractedData: Record<string, string>
): Promise<boolean> {
  if (!phoneNumber || Object.keys(extractedData).length === 0) return false;

  try {
    // Montar objeto de update (só campos com valor)
    const updateFields: Record<string, any> = {};

    if (extractedData.nome) {
      const parts = extractedData.nome.trim().split(' ');
      updateFields.nome = parts[0];
      if (parts.length > 1) {
        updateFields.sobrenome = parts.slice(1).join(' ');
      }
    }
    if (extractedData.sobrenome) updateFields.sobrenome = extractedData.sobrenome.trim();
    if (extractedData.email) updateFields.email = extractedData.email.toLowerCase().trim();
    if (extractedData.cep) updateFields.cep = extractedData.cep.replace(/\D/g, '');
    if (extractedData.cidade) updateFields.cidade = extractedData.cidade.trim();
    if (extractedData.estado) updateFields.estado = extractedData.estado.trim().toUpperCase().substring(0, 2);
    if (extractedData.data_nascimento) updateFields.data_nascimento = extractedData.data_nascimento;
    if (extractedData.genero) updateFields.genero = extractedData.genero;
    if (extractedData.servico_interesse) updateFields.servico_interesse = extractedData.servico_interesse;
    if (extractedData.como_conheceu) updateFields.como_conheceu = extractedData.como_conheceu;
    if (extractedData.telefone_secundario) updateFields.telefone_secundario = extractedData.telefone_secundario.replace(/\D/g, '');

    if (Object.keys(updateFields).length === 0) return false;

    updateFields.updated_at = new Date().toISOString();
    updateFields.ultimo_contato = new Date().toISOString();

    if (existingLead?.id) {
      // Atualizar lead existente (não sobrescrever campos já preenchidos com dados vazios)
      const { error } = await supabase
        .from('mt_leads')
        .update(updateFields)
        .eq('id', existingLead.id);

      if (error) {
        console.error('[Chatbot] Erro ao atualizar lead:', error);
        return false;
      }
      console.log(`[Chatbot] Lead ${existingLead.id} atualizado:`, Object.keys(updateFields).join(', '));
    } else {
      // Criar novo lead com os dados extraídos
      const { error } = await supabase
        .from('mt_leads')
        .insert({
          tenant_id: tenantId,
          telefone: phoneNumber,
          whatsapp: phoneNumber,
          origem: 'whatsapp_bot',
          temperatura: 'morno',
          status: 'novo',
          ...updateFields
        });

      if (error) {
        console.error('[Chatbot] Erro ao criar lead:', error);
        return false;
      }
      console.log(`[Chatbot] Novo lead criado para ${phoneNumber}:`, Object.keys(updateFields).join(', '));
    }

    return true;
  } catch (err) {
    console.error('[Chatbot] Erro em updateLeadData:', err);
    return false;
  }
}

// Helper: Criar agendamento via Function Calling
async function createAppointment(
  supabase: any,
  tenantId: string,
  sessionId: string,
  phoneNumber: string | null,
  existingLead: any,
  appointmentData: { data: string; hora: string; servico?: string; observacoes?: string },
  botConfig: any
): Promise<{ success: boolean; message: string }> {
  try {
    const { data: dateStr, hora, servico, observacoes } = appointmentData;

    // Validar data
    const appointmentDate = new Date(dateStr + 'T12:00:00');
    const dayOfWeek = appointmentDate.getDay(); // 0=dom, 6=sab
    const allowedDays = botConfig.agendamento_dias || [1,2,3,4,5,6];

    if (!allowedDays.includes(dayOfWeek)) {
      const diasNomes = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
      return { success: false, message: `Não atendemos ${diasNomes[dayOfWeek]}. Dias disponíveis: ${allowedDays.map((d: number) => diasNomes[d]).join(', ')}.` };
    }

    // Validar data não é passado
    const today = new Date();
    today.setHours(0,0,0,0);
    if (appointmentDate < today) {
      return { success: false, message: 'A data informada já passou. Escolha uma data futura.' };
    }

    // Validar horário
    const horaInicio = botConfig.agendamento_hora_inicio || '13:00';
    const horaFim = botConfig.agendamento_hora_fim || '19:00';
    if (hora < horaInicio || hora >= horaFim) {
      return { success: false, message: `Horário fora do intervalo permitido. Agendamentos disponíveis das ${horaInicio} às ${horaFim}.` };
    }

    // Buscar franchise_id da sessão
    const { data: session } = await supabase
      .from('mt_whatsapp_sessions')
      .select('franchise_id')
      .eq('id', sessionId)
      .single();

    const franchiseId = session?.franchise_id;

    // Verificar disponibilidade (conflito de horário)
    const duracao = botConfig.agendamento_duracao_padrao || 60;
    const [horaH, horaM] = hora.split(':').map(Number);
    const horaFimCalc = `${String(horaH + Math.floor((horaM + duracao) / 60)).padStart(2,'0')}:${String((horaM + duracao) % 60).padStart(2,'0')}`;

    const { data: conflitos } = await supabase
      .from('mt_appointments')
      .select('hora_inicio, hora_fim')
      .eq('data_agendamento', dateStr)
      .eq('franchise_id', franchiseId)
      .not('status', 'eq', 'cancelado')
      .gte('hora_fim', hora)
      .lte('hora_inicio', horaFimCalc);

    if (conflitos && conflitos.length > 0) {
      // Encontrar próximo horário livre
      const horasOcupadas = conflitos.map((c: any) => c.hora_inicio);
      let sugestao = hora;
      for (let h = parseInt(hora); h < parseInt(horaFim); h++) {
        const tentativa = `${String(h).padStart(2,'0')}:00`;
        if (!horasOcupadas.some((o: string) => o <= tentativa && tentativa < (conflitos.find((c: any) => c.hora_inicio <= tentativa)?.hora_fim || '00:00'))) {
          sugestao = tentativa;
          break;
        }
      }
      return { success: false, message: `Horário ${hora} já está ocupado no dia ${dateStr}. Sugestão: ${sugestao}.` };
    }

    // Criar agendamento
    const clienteNome = existingLead?.nome || 'Cliente WhatsApp';
    const servicoNome = servico || botConfig.agendamento_servico_padrao || 'Avaliação Gratuita';

    const { data: newAppointment, error } = await supabase
      .from('mt_appointments')
      .insert({
        tenant_id: tenantId,
        franchise_id: franchiseId,
        lead_id: existingLead?.id || null,
        cliente_nome: clienteNome,
        servico_nome: servicoNome,
        data_agendamento: dateStr,
        hora_inicio: hora,
        hora_fim: horaFimCalc,
        duracao_minutos: duracao,
        status: 'agendado',
        origem: 'chatbot',
        observacoes: observacoes || `Agendado via bot WhatsApp - ${phoneNumber}`,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Chatbot] Erro ao criar agendamento:', error);
      return { success: false, message: 'Erro ao criar agendamento. Tente novamente ou peça para falar com um atendente.' };
    }

    // Atualizar lead com status agendado
    if (existingLead?.id) {
      await supabase
        .from('mt_leads')
        .update({
          status: 'agendado',
          proximo_contato: dateStr,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingLead.id);
    }

    console.log(`[Chatbot] Agendamento criado: ${newAppointment?.id} - ${clienteNome} - ${dateStr} ${hora} - ${servicoNome}`);

    // Salvar memoria de sucesso para aprendizado futuro
    supabase.from('mt_ai_memory').insert({
      tenant_id: tenantId,
      memory_type: 'learning',
      content: `Conversa resultou em agendamento. Cliente: ${clienteNome}. Serviço: ${servicoNome}. Data: ${dateStr} ${hora}.`,
      source: 'whatsapp_conversion',
      importance: 0.9,
      metadata: { lead_id: existingLead?.id, appointment_id: newAppointment?.id },
    }).then(() => {}).catch(() => {});

    return {
      success: true,
      message: `Agendamento confirmado! ${clienteNome} - ${servicoNome} dia ${dateStr} às ${hora}. Duração: ${duracao} minutos. ID: ${newAppointment?.id}`
    };
  } catch (err) {
    console.error('[Chatbot] Erro em createAppointment:', err);
    return { success: false, message: 'Erro interno ao criar agendamento.' };
  }
}

// Helper: Verificar disponibilidade de horários em uma data
async function checkAvailability(
  supabase: any,
  tenantId: string,
  sessionId: string,
  dateStr: string,
  botConfig: any
): Promise<string> {
  try {
    // Validar data
    const appointmentDate = new Date(dateStr + 'T12:00:00');
    const dayOfWeek = appointmentDate.getDay();
    const allowedDays = botConfig.agendamento_dias || [1,2,3,4,5,6];
    const diasNomes = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];

    if (!allowedDays.includes(dayOfWeek)) {
      return `Não atendemos ${diasNomes[dayOfWeek]}. Dias disponíveis: ${allowedDays.map((d: number) => diasNomes[d]).join(', ')}.`;
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    if (appointmentDate < today) {
      return `A data ${dateStr} já passou. Hoje é ${today.toISOString().split('T')[0]}. Escolha uma data futura.`;
    }

    // Buscar franchise_id
    const { data: session } = await supabase
      .from('mt_whatsapp_sessions')
      .select('franchise_id')
      .eq('id', sessionId)
      .single();

    const franchiseId = session?.franchise_id;

    // Buscar agendamentos existentes
    const horaInicio = botConfig.agendamento_hora_inicio || '13:00';
    const horaFim = botConfig.agendamento_hora_fim || '19:00';
    const duracao = botConfig.agendamento_duracao_padrao || 60;

    const { data: appointments } = await supabase
      .from('mt_appointments')
      .select('hora_inicio, hora_fim, servico_nome')
      .eq('data_agendamento', dateStr)
      .eq('franchise_id', franchiseId)
      .not('status', 'eq', 'cancelado');

    // Gerar todos os slots possíveis
    const [startH] = horaInicio.split(':').map(Number);
    const [endH] = horaFim.split(':').map(Number);
    const allSlots: string[] = [];
    for (let h = startH; h < endH; h++) {
      allSlots.push(`${String(h).padStart(2,'0')}:00`);
    }

    // Marcar slots ocupados
    const occupiedSlots: string[] = [];
    if (appointments) {
      for (const apt of appointments) {
        const aptHora = apt.hora_inicio?.substring(0, 5);
        if (aptHora) occupiedSlots.push(aptHora);
      }
    }

    const freeSlots = allSlots.filter(s => !occupiedSlots.includes(s));

    const dateObj = new Date(dateStr + 'T12:00:00');
    const dateLabel = `${dateObj.getDate()}/${dateObj.getMonth()+1} (${diasNomes[dateObj.getDay()]})`;

    if (freeSlots.length === 0) {
      return `Sem horários disponíveis em ${dateLabel}. Todos ocupados. Sugira outra data.`;
    }

    let result = `Horários disponíveis em ${dateLabel}: ${freeSlots.join(', ')}.`;
    if (occupiedSlots.length > 0) {
      result += ` Ocupados: ${occupiedSlots.join(', ')}.`;
    }
    result += ` Duração de cada sessão: ${duracao} minutos.`;

    return result;
  } catch (err) {
    console.error('[Chatbot] Erro em checkAvailability:', err);
    return 'Erro ao verificar disponibilidade. Tente novamente.';
  }
}

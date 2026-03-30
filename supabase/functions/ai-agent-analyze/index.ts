// Edge Function: AI Agent Analyze
// Analisa conversa com agente IA e gera sugestões de resposta

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sanitizeForJSON, sanitizeObjectForJSON } from "../_shared/unicodeSanitizer.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AgentConfig {
  id: string;
  tenant_id: string;
  nome: string;
  tipo: string;
  provider: string;
  model: string;
  api_key_encrypted: string | null;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  context_instructions: string | null;
  output_format: string;
  max_suggestions: number;
  include_reasoning: boolean;
  auto_transcribe_audio: boolean;
  max_history_messages: number;
  whisper_model: string;
  whisper_language: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { analysis_id, agent_id, conversation_id, tenant_id } = await req.json();

    console.log(`[AI-Agent] Iniciando análise ${analysis_id} com agente ${agent_id}`);

    // 1. Buscar configuração do agente
    const { data: agent, error: agentError } = await supabase
      .from('mt_ai_agents')
      .select('*')
      .eq('id', agent_id)
      .single();

    if (agentError || !agent) {
      throw new Error(`Agente não encontrado: ${agentError?.message}`);
    }

    const agentConfig = agent as AgentConfig;

    // 2. Buscar API key: agente → fallback mt_whatsapp_bot_config → mt_chatbot_config
    let apiKey = agentConfig.api_key_encrypted;
    if (!apiKey) {
      // Fallback 1: mt_whatsapp_bot_config (coluna = openai_api_key)
      const { data: botConfig } = await supabase
        .from('mt_whatsapp_bot_config')
        .select('openai_api_key')
        .eq('tenant_id', tenant_id)
        .eq('is_active', true)
        .maybeSingle();

      apiKey = botConfig?.openai_api_key;
    }

    if (!apiKey) {
      // Fallback 2: mt_chatbot_config
      const { data: chatbotConfig } = await supabase
        .from('mt_chatbot_config')
        .select('api_key_encrypted')
        .eq('tenant_id', tenant_id)
        .eq('is_active', true)
        .maybeSingle();

      apiKey = chatbotConfig?.api_key_encrypted;
    }

    if (!apiKey) {
      throw new Error('Nenhuma API key encontrada. Configure no agente ou no bot config.');
    }

    // 3. Buscar últimas N mensagens da conversa
    const { data: rawMessages, error: msgError } = await supabase
      .from('mt_whatsapp_messages')
      .select('id, body, from_me, tipo, media_url, created_at, message_id')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true })
      .limit(agentConfig.max_history_messages);

    if (msgError) {
      throw new Error(`Erro ao buscar mensagens: ${msgError.message}`);
    }

    const messages = rawMessages || [];
    let audioTranscribed = 0;

    // 4. Transcrever áudios se configurado
    if (agentConfig.auto_transcribe_audio) {
      for (const msg of messages) {
        if ((msg.tipo === 'audio' || msg.tipo === 'ptt') && msg.media_url) {
          // Check cache first
          const { data: cached } = await supabase
            .from('mt_ai_audio_transcriptions')
            .select('transcription')
            .eq('message_id', msg.id)
            .maybeSingle();

          if (cached?.transcription) {
            msg.body = `[Áudio transcrito]: ${cached.transcription}`;
            audioTranscribed++;
          } else {
            // Transcribe via Whisper
            try {
              const transcription = await transcribeAudio(
                msg.media_url,
                apiKey,
                agentConfig.whisper_model,
                agentConfig.whisper_language
              );
              if (transcription) {
                // Cache transcription
                await supabase.from('mt_ai_audio_transcriptions').insert({
                  tenant_id,
                  message_id: msg.id,
                  conversation_id,
                  transcription,
                  language: agentConfig.whisper_language,
                  whisper_model: agentConfig.whisper_model,
                });
                msg.body = `[Áudio transcrito]: ${transcription}`;
                audioTranscribed++;
              }
            } catch (err) {
              console.error(`[AI-Agent] Erro ao transcrever áudio ${msg.id}:`, err);
              msg.body = '[Áudio - não foi possível transcrever]';
            }
          }
        }
      }
    }

    // 5. Montar contexto da conversa
    const conversationContext = messages
      .filter(m => m.body)
      .map(m => {
        const time = new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const sender = m.from_me ? 'Atendente' : 'Cliente';
        return `[${time}] ${sender}: ${m.body}`;
      })
      .join('\n');

    // 6. Montar prompt do sistema
    const outputInstructions = getOutputInstructions(agentConfig);
    const systemPrompt = `${agentConfig.system_prompt}\n\n${agentConfig.context_instructions || ''}\n\n${outputInstructions}`;

    // 7. Chamar API de IA (sanitizar Unicode para evitar erro de surrogates)
    const chatMessages: ChatMessage[] = [
      { role: 'system', content: sanitizeForJSON(systemPrompt) },
      { role: 'user', content: sanitizeForJSON(`Analise a seguinte conversa e forneça sua análise:\n\n${conversationContext}`) },
    ];

    const aiResponse = await callAI(
      agentConfig.provider,
      agentConfig.model,
      apiKey,
      chatMessages,
      agentConfig.temperature,
      agentConfig.max_tokens,
    );

    // 8. Parsear resposta
    const parsed = parseAIResponse(aiResponse.content, agentConfig);
    const processingTime = Date.now() - startTime;

    // 9. Atualizar análise no banco
    const { error: updateError } = await supabase
      .from('mt_ai_agent_analyses')
      .update({
        status: 'completed',
        messages_analyzed: messages.length,
        audio_messages_transcribed: audioTranscribed,
        analysis_text: parsed.analysis_text,
        quality_score: parsed.quality_score,
        sentiment: parsed.sentiment,
        lead_temperature: parsed.lead_temperature,
        lead_intent: parsed.lead_intent,
        suggestions: parsed.suggestions,
        prompt_tokens: aiResponse.usage?.prompt_tokens || 0,
        completion_tokens: aiResponse.usage?.completion_tokens || 0,
        total_tokens: aiResponse.usage?.total_tokens || 0,
        processing_time_ms: processingTime,
        updated_at: new Date().toISOString(),
      })
      .eq('id', analysis_id);

    if (updateError) {
      console.error('[AI-Agent] Erro ao atualizar análise:', updateError);
    }

    console.log(`[AI-Agent] Análise ${analysis_id} concluída em ${processingTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      analysis_id,
      processing_time_ms: processingTime,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const error = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[AI-Agent] Erro:', error);

    // Try to update analysis status to failed
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const body = await req.clone().json().catch(() => ({}));
      if (body.analysis_id) {
        await supabase
          .from('mt_ai_agent_analyses')
          .update({
            status: 'failed',
            analysis_text: `Erro: ${error}`,
            processing_time_ms: Date.now() - startTime,
            updated_at: new Date().toISOString(),
          })
          .eq('id', body.analysis_id);
      }
    } catch { /* ignore */ }

    return new Response(JSON.stringify({ success: false, error }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ============================================
// Helper Functions
// ============================================

function getOutputInstructions(agent: AgentConfig): string {
  const suggestionCount = agent.max_suggestions;
  const includeReasoning = agent.include_reasoning;

  return `
FORMATO DE RESPOSTA (JSON obrigatório):
Responda APENAS com um JSON válido no seguinte formato:
{
  "analysis_text": "Sua análise detalhada da conversa aqui",
  "sentiment": "positive" | "neutral" | "negative" | "mixed",
  "lead_temperature": "hot" | "warm" | "cold" | "lost",
  "lead_intent": "Uma frase curta descrevendo a intenção do lead",
  ${agent.tipo === 'quality' ? '"quality_score": 0.0 a 1.0,' : ''}
  "suggestions": [
    {
      "id": "sug_1",
      "text": "Texto da mensagem sugerida para enviar ao cliente",
      "type": "reply" | "question" | "closing",
      "confidence": 0.0 a 1.0${includeReasoning ? ',\n      "reasoning": "Por que esta sugestão é adequada"' : ''}
    }
  ]
}

Gere exatamente ${suggestionCount} sugestões na array "suggestions".
Cada sugestão deve ser uma mensagem pronta para enviar via WhatsApp.
Use linguagem natural, informal mas profissional, adequada para WhatsApp Business.
`;
}

async function callAI(
  provider: string,
  model: string,
  apiKey: string,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number,
): Promise<{ content: string; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }> {

  if (provider === 'anthropic') {
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const userMessages = messages.filter(m => m.role !== 'system');

    const sanitizedBody = sanitizeObjectForJSON({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemMessage,
      messages: userMessages.map(m => ({ role: m.role, content: m.content })),
    });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(sanitizedBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return {
      content: data.content?.[0]?.text || '',
      usage: {
        prompt_tokens: data.usage?.input_tokens || 0,
        completion_tokens: data.usage?.output_tokens || 0,
        total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
    };
  }

  // Default: OpenAI
  const sanitizedOpenAIBody = sanitizeObjectForJSON({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
  });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(sanitizedOpenAIBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    usage: data.usage,
  };
}

async function transcribeAudio(
  mediaUrl: string,
  apiKey: string,
  whisperModel: string,
  language: string,
): Promise<string | null> {
  try {
    // Download audio
    const audioResponse = await fetch(mediaUrl);
    if (!audioResponse.ok) {
      console.error(`[Whisper] Failed to download audio: ${audioResponse.status}`);
      return null;
    }
    const audioBlob = await audioResponse.blob();

    // Send to Whisper API
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.ogg');
    formData.append('model', whisperModel);
    formData.append('language', language);
    formData.append('response_format', 'text');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errText = await whisperResponse.text();
      console.error(`[Whisper] API error: ${errText}`);
      return null;
    }

    return await whisperResponse.text();
  } catch (err) {
    console.error('[Whisper] Error:', err);
    return null;
  }
}

function parseAIResponse(content: string, agent: AgentConfig): {
  analysis_text: string;
  quality_score: number | null;
  sentiment: string | null;
  lead_temperature: string | null;
  lead_intent: string | null;
  suggestions: any[];
} {
  try {
    // Try to extract JSON from response
    let jsonStr = content.trim();

    // Handle markdown code blocks
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    return {
      analysis_text: parsed.analysis_text || content,
      quality_score: agent.tipo === 'quality' ? (parsed.quality_score ?? null) : null,
      sentiment: parsed.sentiment || null,
      lead_temperature: parsed.lead_temperature || null,
      lead_intent: parsed.lead_intent || null,
      suggestions: (parsed.suggestions || []).map((s: any, i: number) => ({
        id: s.id || `sug_${i + 1}`,
        text: s.text || '',
        type: s.type || 'reply',
        confidence: s.confidence ?? 0.8,
        reasoning: s.reasoning || null,
      })),
    };
  } catch {
    // If JSON parsing fails, return raw text
    console.warn('[AI-Agent] Failed to parse JSON response, using raw text');
    return {
      analysis_text: content,
      quality_score: null,
      sentiment: null,
      lead_temperature: null,
      lead_intent: null,
      suggestions: [],
    };
  }
}

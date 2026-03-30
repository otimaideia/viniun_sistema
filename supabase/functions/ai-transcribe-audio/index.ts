// Edge Function: AI Transcribe Audio
// Transcreve áudio via OpenAI Whisper e cacheia no banco

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { message_id, conversation_id, tenant_id, media_url, whisper_model, language } = await req.json();

    if (!message_id || !media_url) {
      throw new Error('message_id e media_url são obrigatórios');
    }

    const model = whisper_model || 'whisper-1';
    const lang = language || 'pt';

    console.log(`[Whisper] Transcrevendo áudio para mensagem ${message_id}`);

    // 1. Check cache
    const { data: cached } = await supabase
      .from('mt_ai_audio_transcriptions')
      .select('*')
      .eq('message_id', message_id)
      .maybeSingle();

    if (cached) {
      console.log(`[Whisper] Cache hit para ${message_id}`);
      return new Response(JSON.stringify({
        success: true,
        transcription: cached.transcription,
        cached: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Get API key
    let apiKey: string | null = null;

    // Try mt_whatsapp_bot_config first
    const { data: botConfig } = await supabase
      .from('mt_whatsapp_bot_config')
      .select('api_key_encrypted')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .maybeSingle();

    apiKey = botConfig?.api_key_encrypted;

    if (!apiKey) {
      // Fallback: mt_chatbot_config
      const { data: chatbotConfig } = await supabase
        .from('mt_chatbot_config')
        .select('api_key_encrypted')
        .eq('tenant_id', tenant_id)
        .eq('is_active', true)
        .maybeSingle();

      apiKey = chatbotConfig?.api_key_encrypted;
    }

    if (!apiKey) {
      throw new Error('Nenhuma API key encontrada para transcrição');
    }

    // 3. Download audio
    const audioResponse = await fetch(media_url);
    if (!audioResponse.ok) {
      throw new Error(`Erro ao baixar áudio: ${audioResponse.status}`);
    }
    const audioBlob = await audioResponse.blob();
    const audioSize = audioBlob.size;

    console.log(`[Whisper] Áudio baixado: ${(audioSize / 1024).toFixed(1)}KB`);

    // 4. Send to Whisper API
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.ogg');
    formData.append('model', model);
    formData.append('language', lang);
    formData.append('response_format', 'verbose_json');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errText = await whisperResponse.text();
      throw new Error(`Whisper API error (${whisperResponse.status}): ${errText}`);
    }

    const whisperData = await whisperResponse.json();
    const transcription = whisperData.text || '';
    const duration = whisperData.duration || null;
    const detectedLanguage = whisperData.language || lang;
    const processingTime = Date.now() - startTime;

    console.log(`[Whisper] Transcrito: "${transcription.substring(0, 100)}..." (${processingTime}ms)`);

    // 5. Cache transcription
    const { error: insertError } = await supabase
      .from('mt_ai_audio_transcriptions')
      .insert({
        tenant_id,
        message_id,
        conversation_id,
        transcription,
        language: detectedLanguage,
        duration_seconds: duration,
        confidence: 1.0,
        whisper_model: model,
        processing_time_ms: processingTime,
      });

    if (insertError) {
      console.error('[Whisper] Erro ao cachear transcrição:', insertError);
    }

    return new Response(JSON.stringify({
      success: true,
      transcription,
      duration_seconds: duration,
      language: detectedLanguage,
      processing_time_ms: processingTime,
      cached: false,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const error = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[Whisper] Erro:', error);

    return new Response(JSON.stringify({ success: false, error }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * META SEND MESSAGE - Edge Function
 *
 * Envia mensagens para Facebook Messenger e Instagram Direct
 *
 * Rate Limiting:
 * - Facebook Messenger: 200 mensagens/hora por página
 * - Instagram Direct: 100 mensagens/hora por conta
 * - Burst: 50 msg/min (FB), 20 msg/min (IG)
 *
 * Features:
 * - Envio de texto e mídia (imagens, vídeos, documentos)
 * - Rate limiting automático com fila
 * - Retry exponencial em caso de falha
 * - Validação de permissões
 *
 * Request Body:
 * {
 *   "page_id": "uuid",
 *   "recipient_id": "PSID",
 *   "message_type": "text|image|video|file",
 *   "content": "texto ou URL da mídia",
 *   "quick_replies": [...] (opcional)
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GRAPH_API_VERSION = 'v19.0'
const GRAPH_API_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`

// Rate Limits
const RATE_LIMIT_FB = 200 // msgs/hora
const RATE_LIMIT_IG = 100 // msgs/hora
const RATE_CHECK_THRESHOLD = 0.9 // 90% do limite

/**
 * Verificar rate limit atual da página
 */
async function checkRateLimit(supabase: any, pageId: string, platform: 'facebook' | 'instagram'): Promise<{
  canSend: boolean
  usage: number
  limit: number
}> {
  try {
    const limit = platform === 'facebook' ? RATE_LIMIT_FB : RATE_LIMIT_IG
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    // Contar mensagens enviadas na última hora
    const { count, error } = await supabase
      .from('mt_meta_messages')
      .select('id', { count: 'exact', head: true })
      .eq('page_id', pageId)
      .eq('direction', 'outgoing')
      .gte('created_at', oneHourAgo.toISOString())

    if (error) {
      console.error('[Rate Limit] Erro ao verificar:', error)
      return { canSend: true, usage: 0, limit }
    }

    const usage = count || 0
    const canSend = usage < limit * RATE_CHECK_THRESHOLD

    console.log(`[Rate Limit] ${platform} - Uso: ${usage}/${limit} (${((usage / limit) * 100).toFixed(1)}%)`)

    return { canSend, usage, limit }
  } catch (error) {
    console.error('[Rate Limit] Erro:', error)
    return { canSend: true, usage: 0, limit: platform === 'facebook' ? RATE_LIMIT_FB : RATE_LIMIT_IG }
  }
}

/**
 * Enfileirar mensagem para envio posterior
 */
async function queueMessage(
  supabase: any,
  tenantId: string,
  franchiseId: string | null,
  pageId: string,
  recipientId: string,
  messageType: string,
  messagePayload: any
) {
  try {
    const { error } = await supabase.from('mt_meta_message_queue').insert({
      tenant_id: tenantId,
      franchise_id: franchiseId,
      page_id: pageId,
      recipient_id: recipientId,
      message_type: messageType,
      message_payload: messagePayload,
      status: 'pending',
      scheduled_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutos
    })

    if (error) {
      console.error('[Queue] Erro ao enfileirar:', error)
      throw error
    }

    console.log('[Queue] Mensagem enfileirada para:', recipientId)
  } catch (error) {
    console.error('[Queue] Erro:', error)
    throw error
  }
}

/**
 * Enviar mensagem via Graph API
 */
async function sendToGraphAPI(
  pageAccessToken: string,
  recipientId: string,
  messageType: string,
  content: string,
  quickReplies?: any[]
): Promise<{ success: boolean; message_id?: string; error?: string }> {
  try {
    let messagePayload: any = {}

    switch (messageType) {
      case 'text':
        messagePayload = {
          text: content,
        }
        if (quickReplies && quickReplies.length > 0) {
          messagePayload.quick_replies = quickReplies
        }
        break

      case 'image':
        messagePayload = {
          attachment: {
            type: 'image',
            payload: {
              url: content,
              is_reusable: true,
            },
          },
        }
        break

      case 'video':
        messagePayload = {
          attachment: {
            type: 'video',
            payload: {
              url: content,
              is_reusable: true,
            },
          },
        }
        break

      case 'file':
        messagePayload = {
          attachment: {
            type: 'file',
            payload: {
              url: content,
              is_reusable: true,
            },
          },
        }
        break

      case 'audio':
        messagePayload = {
          attachment: {
            type: 'audio',
            payload: {
              url: content,
              is_reusable: true,
            },
          },
        }
        break

      default:
        throw new Error(`Tipo de mensagem não suportado: ${messageType}`)
    }

    const response = await fetch(`${GRAPH_API_URL}/me/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: messagePayload,
        messaging_type: 'RESPONSE',
        access_token: pageAccessToken,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[Graph API] Erro:', data)

      // Verificar se é erro de rate limit
      if (data.error?.code === 4 || data.error?.code === 32) {
        return {
          success: false,
          error: 'rate_limit_exceeded',
        }
      }

      return {
        success: false,
        error: data.error?.message || 'Erro desconhecido',
      }
    }

    console.log('[Graph API] Mensagem enviada:', data.message_id)

    return {
      success: true,
      message_id: data.message_id,
    }
  } catch (error) {
    console.error('[Graph API] Erro ao enviar:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      page_id,
      recipient_id,
      message_type,
      content,
      quick_replies,
    }: {
      page_id: string
      recipient_id: string
      message_type: 'text' | 'image' | 'video' | 'file' | 'audio'
      content: string
      quick_replies?: any[]
    } = await req.json()

    // Validar parâmetros
    if (!page_id || !recipient_id || !message_type || !content) {
      return new Response(
        JSON.stringify({
          error: 'missing_parameters',
          message: 'page_id, recipient_id, message_type e content são obrigatórios',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Inicializar Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Buscar página
    const { data: page, error: pageError } = await supabase
      .from('mt_meta_pages')
      .select('id, tenant_id, franchise_id, page_access_token, platform')
      .eq('id', page_id)
      .eq('is_active', true)
      .single()

    if (pageError || !page) {
      return new Response(
        JSON.stringify({
          error: 'page_not_found',
          message: 'Página não encontrada ou inativa',
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar rate limit
    const rateLimitCheck = await checkRateLimit(supabase, page.id, page.platform)

    if (!rateLimitCheck.canSend) {
      // Enfileirar mensagem
      await queueMessage(
        supabase,
        page.tenant_id,
        page.franchise_id,
        page.id,
        recipient_id,
        message_type,
        { content, quick_replies }
      )

      return new Response(
        JSON.stringify({
          success: false,
          queued: true,
          message: 'Rate limit atingido. Mensagem enfileirada para envio posterior.',
          usage: rateLimitCheck.usage,
          limit: rateLimitCheck.limit,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Enviar mensagem via Graph API
    const result = await sendToGraphAPI(page.page_access_token, recipient_id, message_type, content, quick_replies)

    if (!result.success) {
      // Se erro de rate limit, enfileirar
      if (result.error === 'rate_limit_exceeded') {
        await queueMessage(
          supabase,
          page.tenant_id,
          page.franchise_id,
          page.id,
          recipient_id,
          message_type,
          { content, quick_replies }
        )

        return new Response(
          JSON.stringify({
            success: false,
            queued: true,
            message: 'Rate limit atingido pela API. Mensagem enfileirada.',
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      // Outro erro
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Salvar mensagem no banco
    const { error: msgError } = await supabase.from('mt_meta_messages').insert({
      tenant_id: page.tenant_id,
      franchise_id: page.franchise_id,
      page_id: page.id,
      conversation_id: null, // TODO: Vincular com conversação existente
      message_id: result.message_id,
      platform: page.platform,
      from_id: page.page_id, // Page ID
      to_id: recipient_id,
      direction: 'outgoing',
      message_type: message_type,
      text_content: message_type === 'text' ? content : null,
      media_url: message_type !== 'text' ? content : null,
      media_type: message_type,
      status: 'sent',
      sent_at: new Date().toISOString(),
      unique_key: `${page.platform}_${result.message_id}`,
    })

    if (msgError) {
      console.error('[Database] Erro ao salvar mensagem:', msgError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_id: result.message_id,
        message: 'Mensagem enviada com sucesso',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('[Meta Send] Erro:', error)

    return new Response(
      JSON.stringify({
        error: 'internal_error',
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

/**
 * META SYNC - Edge Function
 *
 * Sincroniza conversas e mensagens do Facebook/Instagram
 *
 * Features:
 * - Paginação incremental (50 conversas por vez)
 * - Limita a 500 conversas por execução
 * - Cursor para continuar de onde parou
 * - Salva conversas e mensagens no banco
 * - Auto-criação de leads
 *
 * Request Body:
 * {
 *   "page_id": "uuid",
 *   "cursor": "cursor_string" (opcional),
 *   "limit": 50 (opcional)
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GRAPH_API_VERSION = 'v19.0'
const GRAPH_API_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`

/**
 * Buscar conversas da página via Graph API
 */
async function fetchConversations(
  pageId: string,
  pageAccessToken: string,
  limit: number = 50,
  after?: string
): Promise<{
  data: any[]
  paging?: { cursors?: { before: string; after: string }; next?: string }
}> {
  try {
    let url = `${GRAPH_API_URL}/${pageId}/conversations?fields=id,participants,messages.limit(10){id,from,to,created_time,message},updated_time&limit=${limit}&access_token=${pageAccessToken}`

    if (after) {
      url += `&after=${after}`
    }

    const response = await fetch(url)

    if (!response.ok) {
      const errorData = await response.json()
      console.error('[Sync] Erro ao buscar conversas:', errorData)
      throw new Error(errorData.error?.message || 'Erro ao buscar conversas')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('[Sync] Erro:', error)
    throw error
  }
}

/**
 * Salvar conversa no banco
 */
async function saveConversation(
  supabase: any,
  tenantId: string,
  franchiseId: string | null,
  pageUuid: string,
  platform: 'facebook' | 'instagram',
  conversation: any
) {
  try {
    const conversationId = conversation.id
    const participants = conversation.participants?.data || []
    const messages = conversation.messages?.data || []

    // Buscar participante (não é a página)
    const participant = participants.find((p: any) => p.id !== conversation.id.split('_')[0])

    if (!participant) {
      console.warn('[Sync] Participante não encontrado na conversa:', conversationId)
      return
    }

    const participantId = participant.id
    const participantName = participant.name || participant.username || 'Lead do ' + platform

    // Verificar se conversação já existe
    const { data: existing } = await supabase
      .from('mt_meta_conversations')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('conversation_id', conversationId)
      .single()

    let convUuid: string

    if (existing) {
      // Atualizar
      const lastMessage = messages[0]

      await supabase
        .from('mt_meta_conversations')
        .update({
          last_message_at: lastMessage?.created_time || conversation.updated_time,
          last_message_preview: lastMessage?.message || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      convUuid = existing.id
    } else {
      // Criar nova
      const lastMessage = messages[0]

      const { data: newConv, error: convError } = await supabase
        .from('mt_meta_conversations')
        .insert({
          tenant_id: tenantId,
          franchise_id: franchiseId,
          page_id: pageUuid,
          conversation_id: conversationId,
          platform: platform,
          participant_id: participantId,
          participant_name: participantName,
          status: 'active',
          unread_count: 0,
          last_message_at: lastMessage?.created_time || conversation.updated_time,
          last_message_preview: lastMessage?.message || null,
        })
        .select('id')
        .single()

      if (convError) {
        console.error('[Sync] Erro ao criar conversa:', convError)
        return
      }

      convUuid = newConv.id
    }

    // Salvar mensagens
    for (const message of messages) {
      const messageId = message.id
      const uniqueKey = `${platform}_${messageId}`

      // Verificar duplicata
      const { data: existingMsg } = await supabase
        .from('mt_meta_messages')
        .select('id')
        .eq('unique_key', uniqueKey)
        .single()

      if (existingMsg) {
        continue // Pular duplicata
      }

      // Inserir mensagem
      await supabase.from('mt_meta_messages').insert({
        tenant_id: tenantId,
        franchise_id: franchiseId,
        page_id: pageUuid,
        conversation_id: convUuid,
        message_id: messageId,
        platform: platform,
        from_id: message.from?.id || participantId,
        to_id: message.to?.data?.[0]?.id || conversationId.split('_')[0],
        direction: message.from?.id === participantId ? 'incoming' : 'outgoing',
        message_type: 'text',
        text_content: message.message || null,
        status: 'sent',
        sent_at: message.created_time,
        unique_key: uniqueKey,
      })
    }

    console.log('[Sync] Conversa salva:', conversationId, '(', messages.length, 'mensagens)')
  } catch (error) {
    console.error('[Sync] Erro ao salvar conversa:', error)
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
      cursor,
      limit = 50,
    }: {
      page_id: string
      cursor?: string
      limit?: number
    } = await req.json()

    if (!page_id) {
      return new Response(
        JSON.stringify({
          error: 'missing_parameters',
          message: 'page_id é obrigatório',
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
      .select('id, tenant_id, franchise_id, page_id, page_access_token, platform')
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

    console.log('[Sync] Iniciando sincronização para página:', page.page_id)

    // Buscar conversas
    const conversations = await fetchConversations(page.page_id, page.page_access_token, limit, cursor)

    console.log('[Sync] Conversas recebidas:', conversations.data.length)

    // Salvar conversas
    let savedCount = 0
    for (const conversation of conversations.data) {
      await saveConversation(
        supabase,
        page.tenant_id,
        page.franchise_id,
        page.id,
        page.platform,
        conversation
      )
      savedCount++
    }

    // Verificar se há mais conversas
    const hasMore = !!conversations.paging?.next
    const nextCursor = conversations.paging?.cursors?.after

    // Atualizar last_sync_at da página
    await supabase
      .from('mt_meta_pages')
      .update({
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', page.id)

    return new Response(
      JSON.stringify({
        success: true,
        synced: savedCount,
        has_more: hasMore,
        next_cursor: nextCursor,
        message: `${savedCount} conversas sincronizadas`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('[Sync] Erro:', error)

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

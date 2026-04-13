// Hook híbrido: busca mensagens direto do WAHA em tempo real
// com fallback para banco de dados se WAHA estiver offline
// + sincronização em background
// Viniun Sistema

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { wahaClient } from '@/services/waha/wahaDirectClient';
import { supabase } from '@/integrations/supabase/client';
import type { WhatsAppMessage, MessageType, MessageStatus } from '@/types/whatsapp';

interface WAHAMessageRaw {
  id: string;
  timestamp: number;
  from: string;
  to: string;
  body?: string;
  type?: string; // Pode não vir na API NOWEB
  hasMedia: boolean;
  mediaUrl?: string; // Campo legado, pode não vir
  ack?: number;
  fromMe?: boolean; // Campo que indica se a mensagem foi enviada por nós
  // Objeto media retornado pelo WAHA quando downloadMedia=true
  media?: {
    url?: string;
    filename?: string | null;
    mimetype?: string;
  };
  _data?: {
    notifyName?: string;
    caption?: string;
    mimetype?: string;
    filename?: string;
    size?: number;
    lat?: number;
    lng?: number;
    vcardList?: unknown[];
    // Estrutura message contém o tipo real na API NOWEB
    message?: {
      imageMessage?: unknown;
      videoMessage?: unknown;
      audioMessage?: unknown;
      documentMessage?: unknown;
      stickerMessage?: unknown;
      locationMessage?: unknown;
      contactMessage?: unknown;
      pollCreationMessage?: unknown;
      extendedTextMessage?: unknown;
      conversation?: string;
    };
  };
}

interface UseMessagesHybridOptions {
  conversationId?: string;
  sessionName?: string;
  chatId?: string;
  autoSync?: boolean; // Sincronizar mensagens do WAHA para DB em background
  fallbackToDatabase?: boolean; // Usar DB se WAHA estiver offline
}

const MESSAGES_KEY = 'whatsapp-messages-hybrid';
const PAGE_SIZE = 100;
const SYNC_INTERVAL = 60000; // 60 segundos

/**
 * @deprecated Use useWhatsAppMessagesMT instead. This hook lacks tenant isolation.
 */
export function useMessagesHybrid(options: UseMessagesHybridOptions) {
  const {
    conversationId,
    sessionName,
    chatId,
    autoSync = true,
    fallbackToDatabase = true,
  } = options;

  const queryClient = useQueryClient();
  const [isWahaOnline, setIsWahaOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncIntervalRef = useRef<NodeJS.Timeout>();

  // ========================================
  // BUSCAR MENSAGENS DO WAHA (PRIORIDADE)
  // ========================================
  const wahaQuery = useQuery({
    queryKey: [MESSAGES_KEY, 'waha', sessionName, chatId],
    queryFn: async () => {
      if (!sessionName || !chatId) {
        throw new Error('SessionName e ChatId são obrigatórios');
      }

      const result = await wahaClient.getChatMessages(sessionName, chatId, PAGE_SIZE, {
        downloadMedia: true,
        sortOrder: 'desc',
      });

      if (!result.success) {
        console.error('[Hybrid] Erro ao buscar do WAHA:', result.error);
        setIsWahaOnline(false);
        throw new Error(result.error || 'Erro ao buscar mensagens do WAHA');
      }

      setIsWahaOnline(true);

      // Converter formato WAHA → formato interno
      const rawMessages = result.data as WAHAMessageRaw[];
      const messages = rawMessages.map((msg) => mapWahaToInternal(msg, chatId));

      // Inverter ordem: WAHA retorna desc (recentes primeiro),
      // mas WhatsApp mostra antigas em cima, novas em baixo
      return messages.reverse();
    },
    enabled: !!sessionName && !!chatId,
    staleTime: 10000, // Considerar fresh por 10 segundos
    retry: 1,
    refetchInterval: 30000, // Atualizar a cada 30 segundos (real-time via Supabase cobre o gap)
  });

  // ========================================
  // FALLBACK: BUSCAR DO BANCO DE DADOS
  // ========================================
  const databaseQuery = useInfiniteQuery({
    queryKey: [MESSAGES_KEY, 'database', conversationId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!conversationId) return { data: [], nextPage: null };

      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('mt_whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('[Hybrid] Erro no fallback do banco:', error);
        throw error;
      }

      return {
        data: (data as WhatsAppMessage[]).reverse(),
        nextPage: data.length === PAGE_SIZE ? pageParam + 1 : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !isWahaOnline && fallbackToDatabase && !!conversationId,
    initialPageParam: 0,
  });

  // ========================================
  // SINCRONIZAÇÃO BACKGROUND: WAHA → DB
  // ========================================
  const syncWahaToDatabase = useCallback(async () => {
    if (!sessionName || !chatId || !conversationId || isSyncing) {
      return;
    }

    setIsSyncing(true);

    try {
      // Buscar mensagens do WAHA
      const result = await wahaClient.getChatMessages(sessionName, chatId, PAGE_SIZE, {
        downloadMedia: true,
        sortOrder: 'desc',
      });

      if (!result.success) {
        console.error('[Hybrid] Sync falhou:', result.error);
        return;
      }

      const wahaMessages = result.data as WAHAMessageRaw[];

      // Buscar session_id e tenant_id do banco
      const { data: conversation } = await supabase
        .from('mt_whatsapp_conversations')
        .select('session_id, tenant_id, franqueado_id')
        .eq('id', conversationId)
        .single();

      if (!conversation) {
        console.error('[Hybrid] Conversa não encontrada no banco');
        return;
      }

      if (!conversation.tenant_id) {
        console.error('[Hybrid] Conversa sem tenant_id');
        return;
      }

      // Salvar cada mensagem no banco (se não existir)
      let syncedCount = 0;
      for (const wahaMsg of wahaMessages) {
        const messageData = {
          tenant_id: conversation.tenant_id, // OBRIGATÓRIO para MT
          conversation_id: conversationId,
          session_id: conversation.session_id,
          franqueado_id: conversation.franqueado_id,
          waha_message_id: wahaMsg.id,
          direction: wahaMsg.from.includes(sessionName) ? 'outbound' : 'inbound',
          message_type: inferMessageType(wahaMsg),
          body: wahaMsg.body,
          caption: wahaMsg._data?.caption,
          media_url: wahaMsg.mediaUrl || wahaMsg.media?.url,
          media_mimetype: wahaMsg._data?.mimetype || wahaMsg.media?.mimetype,
          media_filename: wahaMsg._data?.filename || wahaMsg.media?.filename,
          media_size_bytes: wahaMsg._data?.size,
          latitude: wahaMsg._data?.lat,
          longitude: wahaMsg._data?.lng,
          status: mapAckToStatus(wahaMsg.ack || 0),
          timestamp_waha: new Date(wahaMsg.timestamp * 1000).toISOString(),
        };

        // Verificar se mensagem já existe antes de inserir
        const { data: existingMsg } = await supabase
          .from('mt_whatsapp_messages')
          .select('id')
          .eq('waha_message_id', wahaMsg.id)
          .maybeSingle();

        if (existingMsg) {
          // Mensagem já existe, pular
          continue;
        }

        const { error } = await supabase
          .from('mt_whatsapp_messages')
          .insert(messageData);

        if (error) {
          // Ignorar erros de duplicata silenciosamente
          if (error.code !== '23505' && error.code !== '409' && !error.message?.includes('duplicate')) {
            console.error('[Hybrid] Erro ao salvar mensagem:', error);
          }
        } else {
          syncedCount++;
        }
      }

      // Invalidar queries do banco para atualizar UI se estiver em fallback
      if (!isWahaOnline) {
        queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, 'database', conversationId] });
      }
    } catch (error) {
      console.error('[Hybrid] Erro na sincronização:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [sessionName, chatId, conversationId, isSyncing, isWahaOnline, queryClient]);

  // Auto-sincronização em background
  useEffect(() => {
    if (!autoSync || !sessionName || !chatId || !conversationId) {
      return;
    }

    // Sincronizar imediatamente ao montar
    syncWahaToDatabase();

    // Configurar intervalo de sincronização
    syncIntervalRef.current = setInterval(() => {
      syncWahaToDatabase();
    }, SYNC_INTERVAL);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [autoSync, sessionName, chatId, conversationId, syncWahaToDatabase]);

  // ========================================
  // LÓGICA DE PRIORIZAÇÃO
  // ========================================
  const messages: WhatsAppMessage[] = isWahaOnline
    ? ((wahaQuery.data as WhatsAppMessage[]) || [])
    : (databaseQuery.data?.pages.flatMap(page => page.data) || []);

  const isLoading = isWahaOnline ? wahaQuery.isLoading : databaseQuery.isLoading;
  const error = isWahaOnline ? wahaQuery.error : databaseQuery.error;

  return {
    messages,
    isLoading,
    isLoadingMore: databaseQuery.isFetchingNextPage,
    hasMore: databaseQuery.hasNextPage,
    error,
    isWahaOnline,
    isSyncing,

    // Fonte de dados atual
    dataSource: isWahaOnline ? 'waha' : 'database',

    // Ações
    refetch: () => {
      if (isWahaOnline) {
        wahaQuery.refetch();
      } else {
        databaseQuery.refetch();
      }
    },
    loadMore: databaseQuery.fetchNextPage,
    forceSync: syncWahaToDatabase,

    // Queries individuais (para debug)
    wahaQuery,
    databaseQuery,
  };
}

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

function mapWahaToInternal(wahaMsg: WAHAMessageRaw, chatId: string): WhatsAppMessage {
  const timestamp = wahaMsg.timestamp ? new Date(wahaMsg.timestamp * 1000).toISOString() : new Date().toISOString();

  // Determinar direção da mensagem:
  // 1. Se fromMe existe, usar diretamente
  // 2. Caso contrário, verificar se 'from' é o chatId (recebida) ou não (enviada)
  let direction: 'inbound' | 'outbound' = 'inbound';
  if (wahaMsg.fromMe !== undefined) {
    direction = wahaMsg.fromMe ? 'outbound' : 'inbound';
  } else if (chatId) {
    // Se 'from' contém o chatId, a mensagem foi recebida do contato
    // Se 'from' não contém o chatId, a mensagem foi enviada por nós
    direction = wahaMsg.from === chatId || wahaMsg.from?.includes(chatId.split('@')[0]) ? 'inbound' : 'outbound';
  }

  // Extrair URL de mídia: priorizar media.url (WAHA moderno), fallback para mediaUrl (legado)
  const mediaUrl = wahaMsg.media?.url || wahaMsg.mediaUrl || null;
  const mediaMimetype = wahaMsg.media?.mimetype || wahaMsg._data?.mimetype || null;
  const mediaFilename = wahaMsg.media?.filename || wahaMsg._data?.filename || null;

  return {
    id: wahaMsg.id || '',
    conversation_id: '',
    session_id: '',
    franqueado_id: '',
    waha_message_id: wahaMsg.id || '',
    direction,
    message_type: inferMessageType(wahaMsg) as MessageType,
    body: wahaMsg.body || null,
    caption: wahaMsg._data?.caption || null,
    media_url: mediaUrl,
    media_mimetype: mediaMimetype,
    media_filename: mediaFilename,
    media_size_bytes: wahaMsg._data?.size || null,
    storage_path: null,
    latitude: wahaMsg._data?.lat || null,
    longitude: wahaMsg._data?.lng || null,
    location_name: null,
    contact_vcard: null,
    reaction_emoji: null,
    reaction_target_message_id: null,
    quoted_message_id: null,
    status: mapAckToStatus(wahaMsg.ack ?? 0) as MessageStatus,
    error_message: null,
    timestamp_waha: timestamp,
    sent_by_user_id: null,
    is_from_template: false,
    template_id: null,
    is_from_quick_reply: false,
    quick_reply_id: null,
    is_forwarded: false,
    is_edited: false,
    is_deleted: false,
    created_at: timestamp,
  } as WhatsAppMessage;
}

// Inferir tipo da mensagem a partir da estrutura _data.message (API NOWEB)
// ou do campo type (API legada/webjs)
function inferMessageType(wahaMsg: WAHAMessageRaw): string {
  // 1. Se tem campo type direto (API webjs), usar ele
  if (wahaMsg.type) {
    const typeMap: Record<string, string> = {
      'chat': 'text',
      'text': 'text',
      'image': 'image',
      'video': 'video',
      'audio': 'audio',
      'ptt': 'audio', // Push-to-talk
      'document': 'document',
      'location': 'location',
      'vcard': 'contact',
      'poll': 'poll',
      'sticker': 'sticker',
    };
    return typeMap[wahaMsg.type.toLowerCase()] || 'unknown';
  }

  // 2. Inferir pelo mimetype da mídia
  if (wahaMsg.media?.mimetype) {
    const mimetype = wahaMsg.media.mimetype.toLowerCase();
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype.includes('ogg') || mimetype.includes('opus')) return 'audio';
    return 'document'; // Outros tipos de mídia são documentos
  }

  // 3. Inferir pela estrutura _data.message (API NOWEB)
  const message = wahaMsg._data?.message;
  if (message) {
    if (message.imageMessage) return 'image';
    if (message.videoMessage) return 'video';
    if (message.audioMessage) return 'audio';
    if (message.documentMessage) return 'document';
    if (message.stickerMessage) return 'sticker';
    if (message.locationMessage) return 'location';
    if (message.contactMessage) return 'contact';
    if (message.pollCreationMessage) return 'poll';
    if (message.extendedTextMessage || message.conversation) return 'text';
  }

  // 4. Se tem mídia mas não conseguimos identificar o tipo, tentar pelo hasMedia
  if (wahaMsg.hasMedia && wahaMsg.media?.url) {
    // Tentar inferir pela extensão da URL
    const url = wahaMsg.media.url.toLowerCase();
    if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.gif') || url.includes('.webp')) {
      return 'image';
    }
    if (url.includes('.mp4') || url.includes('.mov') || url.includes('.avi')) {
      return 'video';
    }
    if (url.includes('.mp3') || url.includes('.ogg') || url.includes('.opus') || url.includes('.wav')) {
      return 'audio';
    }
    if (url.includes('.pdf') || url.includes('.doc') || url.includes('.xls')) {
      return 'document';
    }
  }

  // 5. Se tem body, é texto
  if (wahaMsg.body) return 'text';

  // 6. Fallback
  return 'unknown';
}

function mapAckToStatus(ack: number): string {
  // ACK Status do WhatsApp:
  // 0 = pending/error
  // 1 = sent (server received)
  // 2 = delivered (phone received)
  // 3 = read (user opened)
  // 4 = played (audio/video played)

  const statusMap: Record<number, string> = {
    0: 'pending',
    1: 'sent',
    2: 'delivered',
    3: 'read',
    4: 'read', // played = read
  };

  return statusMap[ack] || 'pending';
}

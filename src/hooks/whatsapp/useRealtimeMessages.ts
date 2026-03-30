// Hook para receber mensagens em tempo real via Supabase Realtime

import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WhatsAppMessage, WhatsAppConversation } from '@/types/whatsapp';
import { toast } from 'sonner';

const DEBUG = import.meta.env.DEV;

// Buffer para acumular notificações e mostrar apenas as últimas 5
interface PendingNotification {
  contactName: string;
  messagePreview: string;
  timestamp: number;
}

const MAX_NOTIFICATIONS = 5;
let pendingNotifications: PendingNotification[] = [];
let notificationTimeout: ReturnType<typeof setTimeout> | null = null;

// Gerar preview da mensagem com emoji para mídias
function getMessagePreview(message: WhatsAppMessage): string {
  if (message.body) {
    return message.body.substring(0, 50) + (message.body.length > 50 ? '...' : '');
  }
  if (message.caption) {
    return message.caption.substring(0, 50) + (message.caption.length > 50 ? '...' : '');
  }
  // Emojis para tipos de mídia
  switch (message.message_type) {
    case 'image': return '📷 Imagem';
    case 'video': return '🎬 Vídeo';
    case 'audio': return '🎵 Áudio';
    case 'document': return '📄 ' + (message.media_filename || 'Documento');
    case 'sticker': return '🏷️ Sticker';
    case 'location': return '📍 Localização';
    case 'contact': return '👤 Contato';
    case 'poll': return '📊 Enquete';
    default: return '💬 Mensagem';
  }
}

// Processar e exibir notificações pendentes
function flushNotifications() {
  if (pendingNotifications.length === 0) return;

  // Ordenar por timestamp e pegar as últimas 5
  const sorted = [...pendingNotifications]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_NOTIFICATIONS);

  // Limpar buffer
  pendingNotifications = [];

  // Mostrar notificações (da mais antiga para a mais recente)
  sorted.reverse().forEach((notif, index) => {
    setTimeout(() => {
      toast.info(`${notif.contactName}: ${notif.messagePreview}`, {
        description: 'Nova mensagem recebida',
        duration: 5000,
      });
    }, index * 300); // Pequeno delay entre notificações
  });
}

// Adicionar notificação ao buffer
function queueNotification(contactName: string, messagePreview: string) {
  pendingNotifications.push({
    contactName,
    messagePreview,
    timestamp: Date.now(),
  });

  // Limitar tamanho do buffer para evitar acumular muitas
  if (pendingNotifications.length > MAX_NOTIFICATIONS * 2) {
    pendingNotifications = pendingNotifications.slice(-MAX_NOTIFICATIONS);
  }

  // Debounce: esperar 500ms antes de mostrar notificações
  // Isso permite agrupar várias mensagens que chegam em sequência
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
  }
  notificationTimeout = setTimeout(() => {
    flushNotifications();
    notificationTimeout = null;
  }, 500);
}

interface RealtimeMessageEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  message: WhatsAppMessage;
}

interface RealtimeConversationEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  conversation: WhatsAppConversation;
}

interface UseRealtimeMessagesOptions {
  // ID do franqueado para filtrar
  franqueadoId?: string;
  // ID da conversa específica (opcional)
  conversationId?: string;
  // Callback quando nova mensagem chegar
  onNewMessage?: (message: WhatsAppMessage) => void;
  // Callback quando conversa atualizar
  onConversationUpdate?: (conversation: WhatsAppConversation) => void;
  // Mostrar notificação para mensagens novas
  showNotifications?: boolean;
}

/**
 * @deprecated Use useWhatsAppMessagesMT with realtime instead. This hook lacks tenant isolation.
 */
export function useRealtimeMessages(options: UseRealtimeMessagesOptions = {}) {
  const {
    franqueadoId,
    conversationId,
    onNewMessage,
    onConversationUpdate,
    showNotifications = false,
  } = options;

  const queryClient = useQueryClient();
  const onNewMessageRef = useRef(onNewMessage);
  const onConversationUpdateRef = useRef(onConversationUpdate);

  // Atualizar refs quando callbacks mudarem
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
    onConversationUpdateRef.current = onConversationUpdate;
  }, [onNewMessage, onConversationUpdate]);

  // Handler para novas mensagens
  const handleMessageChange = useCallback((payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: Record<string, unknown>;
    old: Record<string, unknown>;
  }) => {
    const message = payload.new as unknown as WhatsAppMessage;

    if (DEBUG) console.log('[Realtime] Mensagem:', payload.eventType, message);

    // Invalidar queries para atualizar UI
    queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });

    // Se for mensagem nova recebida, chamar callback e mostrar notificação
    if (payload.eventType === 'INSERT' && message.direction === 'inbound') {
      onNewMessageRef.current?.(message);

      if (showNotifications) {
        // Buscar nome do contato e enfileirar notificação
        supabase
          .from('mt_whatsapp_conversations')
          .select('contact_name, phone_number')
          .eq('id', message.conversation_id)
          .single()
          .then(({ data }) => {
            if (data) {
              const contactName = data.contact_name || data.phone_number || 'Contato';
              const messagePreview = getMessagePreview(message);
              // Enfileirar para mostrar apenas as últimas 5
              queueNotification(contactName, messagePreview);
            }
          });
      }
    }
  }, [queryClient, showNotifications]);

  // Handler para atualizações de conversa
  const handleConversationChange = useCallback((payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: Record<string, unknown>;
    old: Record<string, unknown>;
  }) => {
    const conversation = payload.new as unknown as WhatsAppConversation;

    if (DEBUG) console.log('[Realtime] Conversa:', payload.eventType, conversation);

    // Invalidar queries
    queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });

    // Chamar callback
    if (payload.eventType !== 'DELETE') {
      onConversationUpdateRef.current?.(conversation);
    }
  }, [queryClient]);

  // Inscrever no canal de mensagens
  useEffect(() => {
    if (!franqueadoId) return;

    // Construir filtro
    let messageFilter = `franqueado_id=eq.${franqueadoId}`;
    if (conversationId) {
      messageFilter = `conversation_id=eq.${conversationId}`;
    }

    if (DEBUG) console.log('[Realtime] Inscrevendo para mensagens:', messageFilter);

    const messagesChannel = supabase
      .channel(`messages:${franqueadoId}:${conversationId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mt_whatsapp_messages',
          filter: messageFilter,
        },
        handleMessageChange
      )
      .subscribe((status) => {
        if (DEBUG) console.log('[Realtime] Status mensagens:', status);
      });

    return () => {
      if (DEBUG) console.log('[Realtime] Removendo canal de mensagens');
      supabase.removeChannel(messagesChannel);
    };
  }, [franqueadoId, conversationId, handleMessageChange]);

  // Inscrever no canal de conversas
  useEffect(() => {
    if (!franqueadoId) return;

    if (DEBUG) console.log('[Realtime] Inscrevendo para conversas:', franqueadoId);

    const conversationsChannel = supabase
      .channel(`conversations:${franqueadoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mt_whatsapp_conversations',
          filter: `franqueado_id=eq.${franqueadoId}`,
        },
        handleConversationChange
      )
      .subscribe((status) => {
        if (DEBUG) console.log('[Realtime] Status conversas:', status);
      });

    return () => {
      if (DEBUG) console.log('[Realtime] Removendo canal de conversas');
      supabase.removeChannel(conversationsChannel);
    };
  }, [franqueadoId, handleConversationChange]);

  return {
    // Não há nada específico para retornar,
    // os eventos são processados via callbacks
  };
}

// Hook específico para uma conversa individual
export function useRealtimeConversation(
  conversationId: string,
  options: {
    onNewMessage?: (message: WhatsAppMessage) => void;
    onMessageUpdate?: (message: WhatsAppMessage) => void;
  } = {}
) {
  const { onNewMessage, onMessageUpdate } = options;
  const queryClient = useQueryClient();

  const onNewMessageRef = useRef(onNewMessage);
  const onMessageUpdateRef = useRef(onMessageUpdate);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
    onMessageUpdateRef.current = onMessageUpdate;
  }, [onNewMessage, onMessageUpdate]);

  useEffect(() => {
    if (!conversationId) return;

    if (DEBUG) console.log('[Realtime] Inscrevendo para conversa:', conversationId);

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mt_whatsapp_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = payload.new as unknown as WhatsAppMessage;
          if (DEBUG) console.log('[Realtime] Nova mensagem na conversa:', message);

          queryClient.invalidateQueries({
            queryKey: ['whatsapp-messages', conversationId],
          });

          onNewMessageRef.current?.(message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mt_whatsapp_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = payload.new as unknown as WhatsAppMessage;
          if (DEBUG) console.log('[Realtime] Mensagem atualizada:', message);

          queryClient.invalidateQueries({
            queryKey: ['whatsapp-messages', conversationId],
          });

          onMessageUpdateRef.current?.(message);
        }
      )
      .subscribe((status) => {
        if (DEBUG) console.log('[Realtime] Status conversa:', status);
      });

    return () => {
      if (DEBUG) console.log('[Realtime] Removendo canal da conversa');
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);
}

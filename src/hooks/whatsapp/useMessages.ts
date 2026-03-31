// Hook para gerenciar mensagens WhatsApp

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { wahaProxy } from '@/services/waha/wahaProxyClient';
import type {
  WhatsAppMessage,
  SendTextMessageInput,
  SendMediaMessageInput,
  SendLocationMessageInput,
  SendPollInput,
  SendContactInput,
  SendReactionInput,
} from '@/types/whatsapp';
import { toast } from 'sonner';

const MESSAGES_KEY = 'whatsapp-messages';
const PAGE_SIZE = 50;

/**
 * @deprecated Use useWhatsAppMessagesMT instead. This hook lacks tenant isolation.
 */
export function useMessages(conversationId?: string) {
  const queryClient = useQueryClient();

  // Listar mensagens com paginação infinita
  const messagesQuery = useInfiniteQuery({
    queryKey: [MESSAGES_KEY, conversationId],
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

      if (error) throw error;

      return {
        data: (data as WhatsAppMessage[]).reverse(), // Ordem cronológica
        nextPage: data.length === PAGE_SIZE ? pageParam + 1 : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!conversationId,
    initialPageParam: 0,
  });

  // Todas as mensagens (flatMap das páginas)
  const allMessages = messagesQuery.data?.pages.flatMap((page) => page.data) || [];

  // Buscar conversa para obter session_id
  const getSessionId = useCallback(async () => {
    if (!conversationId) return null;

    const { data, error } = await supabase
      .from('mt_whatsapp_conversations')
      .select('session_id')
      .eq('id', conversationId)
      .single();

    if (error) return null;
    return data.session_id;
  }, [conversationId]);

  // Enviar mensagem de texto
  const sendText = useMutation({
    mutationFn: async (input: SendTextMessageInput) => {
      const sessionId = await getSessionId();
      if (!sessionId) throw new Error('Sessão não encontrada');

      const result = await wahaProxy.sendText(sessionId, input);
      if (!result.success) {
        throw new Error(result.error || 'Erro ao enviar mensagem');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, conversationId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar mensagem: ${error.message}`);
    },
  });

  // Enviar imagem
  const sendImage = useMutation({
    mutationFn: async (input: SendMediaMessageInput) => {
      const sessionId = await getSessionId();
      if (!sessionId) throw new Error('Sessão não encontrada');

      const result = await wahaProxy.sendImage(sessionId, input);
      if (!result.success) {
        throw new Error(result.error || 'Erro ao enviar imagem');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, conversationId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar imagem: ${error.message}`);
    },
  });

  // Enviar vídeo
  const sendVideo = useMutation({
    mutationFn: async (input: SendMediaMessageInput) => {
      const sessionId = await getSessionId();
      if (!sessionId) throw new Error('Sessão não encontrada');

      const result = await wahaProxy.sendVideo(sessionId, input);
      if (!result.success) {
        throw new Error(result.error || 'Erro ao enviar vídeo');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, conversationId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar vídeo: ${error.message}`);
    },
  });

  // Enviar áudio
  const sendAudio = useMutation({
    mutationFn: async (input: SendMediaMessageInput) => {
      const sessionId = await getSessionId();
      if (!sessionId) throw new Error('Sessão não encontrada');

      const result = await wahaProxy.sendAudio(sessionId, input);
      if (!result.success) {
        throw new Error(result.error || 'Erro ao enviar áudio');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, conversationId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar áudio: ${error.message}`);
    },
  });

  // Enviar mensagem de voz (voice note)
  const sendVoice = useMutation({
    mutationFn: async (input: SendMediaMessageInput) => {
      const sessionId = await getSessionId();
      if (!sessionId) throw new Error('Sessão não encontrada');

      const result = await wahaProxy.sendVoice(sessionId, input);
      if (!result.success) {
        throw new Error(result.error || 'Erro ao enviar áudio');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, conversationId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar áudio: ${error.message}`);
    },
  });

  // Enviar documento
  const sendDocument = useMutation({
    mutationFn: async (input: SendMediaMessageInput) => {
      const sessionId = await getSessionId();
      if (!sessionId) throw new Error('Sessão não encontrada');

      const result = await wahaProxy.sendDocument(sessionId, input);
      if (!result.success) {
        throw new Error(result.error || 'Erro ao enviar documento');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, conversationId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar documento: ${error.message}`);
    },
  });

  // Enviar localização
  const sendLocation = useMutation({
    mutationFn: async (input: SendLocationMessageInput) => {
      const sessionId = await getSessionId();
      if (!sessionId) throw new Error('Sessão não encontrada');

      const result = await wahaProxy.sendLocation(sessionId, input);
      if (!result.success) {
        throw new Error(result.error || 'Erro ao enviar localização');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, conversationId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar localização: ${error.message}`);
    },
  });

  // Enviar enquete (poll)
  const sendPoll = useMutation({
    mutationFn: async (input: SendPollInput) => {
      const sessionId = await getSessionId();
      if (!sessionId) throw new Error('Sessão não encontrada');

      const result = await wahaProxy.sendPoll(sessionId, input.chatId, {
        name: input.name,
        options: input.options,
        multipleAnswers: input.multipleAnswers,
      });
      if (!result.success) {
        throw new Error(result.error || 'Erro ao enviar enquete');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, conversationId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      toast.success('Enquete enviada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar enquete: ${error.message}`);
    },
  });

  // Votar em enquete
  const votePoll = useMutation({
    mutationFn: async (input: { chatId: string; pollMessageId: string; votes: string[] }) => {
      const sessionId = await getSessionId();
      if (!sessionId) throw new Error('Sessão não encontrada');

      const result = await wahaProxy.sendPollVote(
        sessionId,
        input.chatId,
        input.pollMessageId,
        input.votes
      );
      if (!result.success) {
        throw new Error(result.error || 'Erro ao votar na enquete');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, conversationId] });
      toast.success('Voto registrado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao votar: ${error.message}`);
    },
  });

  // Enviar contato (vCard)
  const sendContact = useMutation({
    mutationFn: async (input: SendContactInput) => {
      const sessionId = await getSessionId();
      if (!sessionId) throw new Error('Sessão não encontrada');

      const result = await wahaProxy.sendContact(sessionId, input.chatId, {
        fullName: input.fullName,
        phoneNumber: input.phoneNumber,
        organization: input.organization,
      });
      if (!result.success) {
        throw new Error(result.error || 'Erro ao enviar contato');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, conversationId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      toast.success('Contato enviado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar contato: ${error.message}`);
    },
  });

  // Enviar reação
  const sendReaction = useMutation({
    mutationFn: async (input: SendReactionInput) => {
      const sessionId = await getSessionId();
      if (!sessionId) throw new Error('Sessão não encontrada');

      const result = await wahaProxy.sendReaction(
        sessionId,
        input.chatId,
        input.messageId,
        input.reaction
      );
      if (!result.success) {
        throw new Error(result.error || 'Erro ao enviar reação');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, conversationId] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar reação: ${error.message}`);
    },
  });

  // Remover reação
  const removeReaction = useMutation({
    mutationFn: async (input: Omit<SendReactionInput, 'reaction'>) => {
      const sessionId = await getSessionId();
      if (!sessionId) throw new Error('Sessão não encontrada');

      const result = await wahaProxy.removeReaction(
        sessionId,
        input.chatId,
        input.messageId
      );
      if (!result.success) {
        throw new Error(result.error || 'Erro ao remover reação');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, conversationId] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover reação: ${error.message}`);
    },
  });

  return {
    messages: allMessages,
    isLoading: messagesQuery.isLoading,
    isLoadingMore: messagesQuery.isFetchingNextPage,
    hasMore: messagesQuery.hasNextPage,
    error: messagesQuery.error,
    loadMore: messagesQuery.fetchNextPage,
    refetch: messagesQuery.refetch,

    // Envio de mensagens
    sendText,
    sendImage,
    sendVideo,
    sendAudio,
    sendVoice,
    sendDocument,
    sendLocation,
    sendPoll,
    votePoll,
    sendContact,
    sendReaction,
    removeReaction,
  };
}

// Hook para Realtime Messages
export function useRealtimeMessages(
  conversationId: string,
  onNewMessage?: (message: WhatsAppMessage) => void
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mt_whatsapp_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {

          // Invalidar queries
          queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, conversationId] });
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });

          // Callback
          if (onNewMessage) {
            onNewMessage(payload.new as WhatsAppMessage);
          }
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

          // Atualizar status da mensagem (ACK)
          queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, conversationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient, onNewMessage]);
}

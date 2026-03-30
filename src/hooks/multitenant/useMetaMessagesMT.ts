/**
 * useMetaMessagesMT - Hook Multi-Tenant
 *
 * Gerencia mensagens do Facebook Messenger e Instagram Direct
 *
 * Features:
 * - Listar mensagens com paginação infinita
 * - Enviar mensagens (texto e mídia)
 * - Real-time updates (Supabase Realtime)
 * - Retry de mensagens falhadas
 * - Atualizar status de leitura
 */

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MetaMessage {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  page_id: string;
  conversation_id: string;
  message_id: string;
  platform: 'facebook' | 'instagram';
  from_id: string;
  to_id: string;
  direction: 'incoming' | 'outgoing';
  message_type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'story_mention' | 'story_reply';
  text_content: string | null;
  media_url: string | null;
  media_type: string | null;
  media_size: number | null;
  story_url: string | null;
  story_id: string | null;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  raw_data: any;
  unique_key: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const PAGE_SIZE = 50;

export function useMetaMessagesMT(conversationId: string) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Infinite Query: Mensagens com paginação
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['mt-meta-messages', conversationId, tenant?.id],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let q = supabase
        .from('mt_meta_messages')
        .select('*', { count: 'exact' })
        .eq('conversation_id', conversationId)
        .is('deleted_at', null);

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error, count } = await q
        .order('sent_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        messages: (data || []) as MetaMessage[],
        nextPage: data && data.length === PAGE_SIZE ? pageParam + 1 : undefined,
        totalCount: count || 0,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform') && !!conversationId,
  });

  // Flatten pages para array único
  const messages = data?.pages.flatMap((page) => page.messages).reverse() || [];

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`mt-meta-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mt_meta_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('[Real-time] Mensagem atualizada:', payload);
          queryClient.invalidateQueries({ queryKey: ['mt-meta-messages', conversationId] });
          queryClient.invalidateQueries({ queryKey: ['mt-meta-conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  // Mutation: Enviar mensagem
  const sendMessage = useMutation({
    mutationFn: async ({
      pageId,
      recipientId,
      messageType,
      content,
      quickReplies,
    }: {
      pageId: string;
      recipientId: string;
      messageType: 'text' | 'image' | 'video' | 'file' | 'audio';
      content: string;
      quickReplies?: any[];
    }) => {
      const { data, error } = await supabase.functions.invoke('meta-send-message', {
        body: {
          page_id: pageId,
          recipient_id: recipientId,
          message_type: messageType,
          content,
          quick_replies: quickReplies,
        },
      });

      if (error) throw error;

      // Se mensagem foi enfileirada (rate limit)
      if (data.queued) {
        toast.info('Mensagem enfileirada devido a limite de envios', { duration: 4000 });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-meta-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['mt-meta-conversations'] });
    },
    onError: (error: any) => {
      console.error('Erro ao enviar mensagem:', error);
      toast.error(`Erro ao enviar: ${error.message}`);
    },
  });

  // Mutation: Retry mensagem falhada
  const retryMessage = useMutation({
    mutationFn: async (messageId: string) => {
      // Buscar mensagem
      const { data: message } = await supabase
        .from('mt_meta_messages')
        .select('*')
        .eq('id', messageId)
        .single();

      if (!message) throw new Error('Mensagem não encontrada');

      // Reenviar via Edge Function
      const { data, error } = await supabase.functions.invoke('meta-send-message', {
        body: {
          page_id: message.page_id,
          recipient_id: message.to_id,
          message_type: message.message_type,
          content: message.text_content || message.media_url,
        },
      });

      if (error) throw error;

      // Atualizar status da mensagem original
      await supabase
        .from('mt_meta_messages')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-meta-messages', conversationId] });
      toast.success('Mensagem reenviada!');
    },
    onError: (error: any) => {
      console.error('Erro ao reenviar mensagem:', error);
      toast.error(`Erro ao reenviar: ${error.message}`);
    },
  });

  // Mutation: Marcar mensagens como lidas
  const markAsRead = useMutation({
    mutationFn: async () => {
      // Atualizar todas as mensagens incoming não lidas
      const { error } = await supabase
        .from('mt_meta_messages')
        .update({
          status: 'read',
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('conversation_id', conversationId)
        .eq('direction', 'incoming')
        .neq('status', 'read');

      if (error) throw error;

      // Atualizar unread_count da conversa
      await supabase
        .from('mt_meta_conversations')
        .update({
          unread_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-meta-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['mt-meta-conversations'] });
    },
    onError: (error: any) => {
      console.error('Erro ao marcar como lidas:', error);
    },
  });

  return {
    // Data
    messages,
    isLoading: isLoading || isTenantLoading,
    error,

    // Paginação
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,

    // Mutations
    sendMessage,
    retryMessage,
    markAsRead,

    // Helpers
    refetch,
  };
}

/**
 * Hook para contar mensagens não lidas
 */
export function useMetaUnreadCount(conversationId?: string) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: ['mt-meta-unread-count', conversationId, tenant?.id],
    queryFn: async () => {
      let query = supabase
        .from('mt_meta_messages')
        .select('id', { count: 'exact', head: true })
        .eq('direction', 'incoming')
        .neq('status', 'read')
        .is('deleted_at', null);

      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      }

      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      }

      const { count, error } = await query;

      if (error) throw error;
      return count || 0;
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

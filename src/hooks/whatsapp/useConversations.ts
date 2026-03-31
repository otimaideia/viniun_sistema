// Hook para gerenciar conversas WhatsApp

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  WhatsAppConversation,
  ConversationFilters,
  ConversationStatus,
} from '@/types/whatsapp';
import { toast } from 'sonner';

const CONVERSATIONS_KEY = 'whatsapp-conversations';

/**
 * @deprecated Use useWhatsAppConversationsAdapter instead. This hook lacks tenant isolation.
 */
export function useConversations(
  franqueadoId?: string,
  filters?: ConversationFilters,
  sessionIds?: string[] // IDs das sessões que o usuário tem acesso
) {
  const queryClient = useQueryClient();

  // Listar conversas
  const conversationsQuery = useQuery({
    queryKey: [CONVERSATIONS_KEY, franqueadoId, filters, sessionIds],
    queryFn: async () => {
      // Validar se franqueadoId é UUID válido antes de usar no filtro
      const isValidFranqueadoUUID = franqueadoId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(franqueadoId);

      let query = supabase
        .from('mt_whatsapp_conversations')
        .select(`
          *,
          session:mt_whatsapp_sessions(id, session_name, phone_number, display_name, franqueado_id),
          lead:mt_leads!mt_whatsapp_conversations_lead_id_fkey(id, nome, whatsapp, status)
        `)
        // Ordenar: fixados primeiro, depois por última mensagem (mais recente primeiro)
        .order('is_pinned', { ascending: false })
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(100); // Limitar para performance

      // Se temos IDs de sessões específicas, filtrar por elas (prioridade)
      if (sessionIds && sessionIds.length > 0) {
        query = query.in('session_id', sessionIds);
      }
      // Senão, só aplica filtro por franqueado se for UUID válido
      else if (isValidFranqueadoUUID) {
        query = query.eq('franqueado_id', franqueadoId);
      }

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters?.sessionId) {
        query = query.eq('session_id', filters.sessionId);
      }

      if (filters?.assignedUserId !== undefined) {
        if (filters.assignedUserId === null) {
          query = query.is('assigned_user_id', null);
        } else {
          query = query.eq('assigned_user_id', filters.assignedUserId);
        }
      }

      if (filters?.hasUnread) {
        query = query.gt('unread_count', 0);
      }

      if (filters?.isPinned !== undefined) {
        query = query.eq('is_pinned', filters.isPinned);
      }

      if (filters?.search) {
        query = query.or(
          `contact_name.ilike.%${filters.search}%,phone_number.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as WhatsAppConversation[];
    },
    enabled: true,
  });

  // Buscar conversa por ID
  const getConversation = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('mt_whatsapp_conversations')
      .select(`
        *,
        session:mt_whatsapp_sessions(id, session_name, phone_number, display_name),
        lead:mt_leads!mt_whatsapp_conversations_lead_id_fkey(id, nome, whatsapp, status)
      `)
      .eq('id', conversationId)
      .single();

    if (error) throw error;
    return data as WhatsAppConversation;
  };

  // Atualizar status
  const updateStatus = useMutation({
    mutationFn: async ({
      conversationId,
      status,
    }: {
      conversationId: string;
      status: ConversationStatus;
    }) => {
      const { data, error } = await supabase
        .from('mt_whatsapp_conversations')
        .update({ status })
        .eq('id', conversationId)
        .select()
        .single();

      if (error) throw error;
      return data as WhatsAppConversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });
      toast.success('Status atualizado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  // Atribuir usuário
  const assignUser = useMutation({
    mutationFn: async ({
      conversationId,
      userId,
    }: {
      conversationId: string;
      userId: string | null;
    }) => {
      const { data, error } = await supabase
        .from('mt_whatsapp_conversations')
        .update({ assigned_user_id: userId })
        .eq('id', conversationId)
        .select()
        .single();

      if (error) throw error;
      return data as WhatsAppConversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });
      toast.success('Conversa atribuída!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atribuir conversa: ${error.message}`);
    },
  });

  // Fixar conversa
  const togglePin = useMutation({
    mutationFn: async ({
      conversationId,
      isPinned,
    }: {
      conversationId: string;
      isPinned: boolean;
    }) => {
      const { data, error } = await supabase
        .from('mt_whatsapp_conversations')
        .update({ is_pinned: isPinned })
        .eq('id', conversationId)
        .select()
        .single();

      if (error) throw error;
      return data as WhatsAppConversation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });
      toast.success(data.is_pinned ? 'Conversa fixada!' : 'Conversa desafixada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Marcar como lido (zerar unread_count)
  const markAsRead = useMutation({
    mutationFn: async (conversationId: string) => {
      const { data, error } = await supabase
        .from('mt_whatsapp_conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId)
        .select()
        .single();

      if (error) throw error;
      return data as WhatsAppConversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });
    },
  });

  // Adicionar/remover tag
  const updateTags = useMutation({
    mutationFn: async ({
      conversationId,
      tags,
    }: {
      conversationId: string;
      tags: string[];
    }) => {
      const { data, error } = await supabase
        .from('mt_whatsapp_conversations')
        .update({ tags })
        .eq('id', conversationId)
        .select()
        .single();

      if (error) throw error;
      return data as WhatsAppConversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });
      toast.success('Tags atualizadas!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar tags: ${error.message}`);
    },
  });

  return {
    conversations: conversationsQuery.data || [],
    isLoading: conversationsQuery.isLoading,
    error: conversationsQuery.error,
    refetch: conversationsQuery.refetch,

    getConversation,
    updateStatus,
    assignUser,
    togglePin,
    markAsRead,
    updateTags,
  };
}

// Hook para Realtime
export function useRealtimeConversations(
  franqueadoId: string | null | undefined,
  onConversationUpdate?: (conversation: WhatsAppConversation) => void
) {
  const queryClient = useQueryClient();

  // Validar se franqueadoId é UUID válido
  const isValidUUID = franqueadoId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(franqueadoId);

  useEffect(() => {
    // Só criar canal se franqueadoId for válido
    if (!isValidUUID) {
      return;
    }

    const channel = supabase
      .channel(`conversations:${franqueadoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mt_whatsapp_conversations',
          filter: `franqueado_id=eq.${franqueadoId}`,
        },
        (payload) => {

          // Invalidar queries para atualizar a lista
          queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });

          // Callback opcional
          if (payload.eventType !== 'DELETE' && onConversationUpdate) {
            onConversationUpdate(payload.new as WhatsAppConversation);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [franqueadoId, isValidUUID, queryClient, onConversationUpdate]);
}

/**
 * useMetaConversationsMT - Hook Multi-Tenant
 *
 * Gerencia conversas do Facebook Messenger e Instagram Direct
 *
 * Features:
 * - Listar conversas
 * - Filtrar por status, participante, data
 * - Real-time updates (Supabase Realtime)
 * - Marcar como lida
 * - Arquivar conversa
 * - Buscar por texto
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MetaConversation {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  page_id: string;
  conversation_id: string;
  platform: 'facebook' | 'instagram';
  participant_id: string; // PSID
  participant_name: string;
  participant_username: string | null;
  participant_profile_pic: string | null;
  lead_id: string | null;
  status: 'active' | 'archived' | 'deleted';
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  raw_data: any;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  // Relacionamentos
  page?: {
    page_name: string;
    platform: string;
  };
  lead?: {
    nome: string;
    telefone: string;
  };
}

export function useMetaConversationsMT(
  pageId?: string,
  filters?: {
    status?: 'active' | 'archived' | 'deleted';
    search?: string;
    has_unread?: boolean;
  }
) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Query: Listar conversas
  const {
    data: conversations,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['mt-meta-conversations', tenant?.id, franchise?.id, pageId, filters],
    queryFn: async () => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado');
      }

      let query = supabase
        .from('mt_meta_conversations')
        .select(
          `
          *,
          page:mt_meta_pages(page_name, platform),
          lead:mt_leads(nome, telefone)
        `
        )
        .is('deleted_at', null)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      // Filtros por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        query = query.eq('franchise_id', franchise.id);
      }

      // Filtro por página
      if (pageId) {
        query = query.eq('page_id', pageId);
      }

      // Filtro por status
      if (filters?.status) {
        query = query.eq('status', filters.status);
      } else {
        query = query.eq('status', 'active');
      }

      // Filtro por não lidas
      if (filters?.has_unread) {
        query = query.gt('unread_count', 0);
      }

      // Busca por texto
      if (filters?.search) {
        query = query.or(
          `participant_name.ilike.%${filters.search}%,` +
            `participant_username.ilike.%${filters.search}%,` +
            `last_message_preview.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as MetaConversation[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Real-time subscription
  useEffect(() => {
    if (!tenant && accessLevel !== 'platform') return;

    const channel = supabase
      .channel('mt-meta-conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mt_meta_conversations',
          filter: tenant ? `tenant_id=eq.${tenant.id}` : undefined,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['mt-meta-conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant, accessLevel, queryClient]);

  // Mutation: Marcar como lida
  const markAsRead = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('mt_meta_conversations')
        .update({
          unread_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-meta-conversations'] });
    },
    onError: (error: any) => {
      console.error('Erro ao marcar como lida:', error);
    },
  });

  // Mutation: Arquivar conversa
  const archiveConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('mt_meta_conversations')
        .update({
          status: 'archived',
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-meta-conversations'] });
      toast.success('Conversa arquivada!');
    },
    onError: (error: any) => {
      console.error('Erro ao arquivar conversa:', error);
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Mutation: Restaurar conversa arquivada
  const unarchiveConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('mt_meta_conversations')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-meta-conversations'] });
      toast.success('Conversa restaurada!');
    },
    onError: (error: any) => {
      console.error('Erro ao restaurar conversa:', error);
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Mutation: Vincular lead à conversa
  const linkLead = useMutation({
    mutationFn: async ({ conversationId, leadId }: { conversationId: string; leadId: string }) => {
      const { error } = await supabase
        .from('mt_meta_conversations')
        .update({
          lead_id: leadId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-meta-conversations'] });
      toast.success('Lead vinculado à conversa!');
    },
    onError: (error: any) => {
      console.error('Erro ao vincular lead:', error);
      toast.error(`Erro: ${error.message}`);
    },
  });

  return {
    // Data
    conversations: conversations || [],
    isLoading: isLoading || isTenantLoading,
    error,

    // Mutations
    markAsRead,
    archiveConversation,
    unarchiveConversation,
    linkLead,

    // Helpers
    refetch,
  };
}

/**
 * Hook para buscar uma conversa específica
 */
export function useMetaConversationMT(conversationId: string) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: ['mt-meta-conversation', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt_meta_conversations')
        .select(
          `
          *,
          page:mt_meta_pages(page_name, platform),
          lead:mt_leads(nome, telefone, email)
        `
        )
        .eq('id', conversationId)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return data as MetaConversation;
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform') && !!conversationId,
  });
}

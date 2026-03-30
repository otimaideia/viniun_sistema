import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizePhone } from './useLeadWhatsAppMatch';

const QUERY_KEY = 'lead_conversations';

// Tipo alinhado com colunas reais de mt_whatsapp_conversations
export interface LeadConversationData {
  id: string;
  session_id: string;
  chat_id: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_avatar: string | null;
  unread_count: number | null;
  last_message_text: string | null;
  last_message_at: string | null;
  status: string | null;
  lead_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  sessao?: {
    id: string;
    session_name: string;
    nome: string;
  };
}

// Tipo alinhado com colunas reais de mt_whatsapp_messages
export interface LeadMessageData {
  id: string;
  conversation_id: string;
  session_id: string;
  body: string | null;
  from_me: boolean;
  timestamp: string | null;
  created_at: string;
  tipo: string | null;
  ack: number | null;
}

/**
 * Hook para buscar conversas vinculadas a um lead
 * Primeiro tenta por FK (lead_id), depois fallback por telefone
 */
export function useLeadConversations(leadId: string | undefined, leadPhone?: string) {
  const queryClient = useQueryClient();

  const {
    data: conversations = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, leadId],
    queryFn: async (): Promise<LeadConversationData[]> => {
      if (!leadId) return [];

      // 1. Primeiro: buscar por FK lead_id (mais confiável)
      const { data: linked, error: errorLinked } = await supabase
        .from('mt_whatsapp_conversations')
        .select(`
          *,
          sessao:mt_whatsapp_sessions(id, session_name, nome)
        `)
        .eq('lead_id', leadId)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (errorLinked) throw errorLinked;

      if (linked && linked.length > 0) {
        return linked as LeadConversationData[];
      }

      // 2. Fallback: buscar por telefone normalizado
      if (leadPhone) {
        const normalized = normalizePhone(leadPhone);
        // Buscar pelos últimos 9 dígitos (ignora código do país)
        const searchPattern = normalized.length >= 9 ? normalized.slice(-9) : normalized;

        const { data: byPhone, error: errorPhone } = await supabase
          .from('mt_whatsapp_conversations')
          .select(`
            *,
            sessao:mt_whatsapp_sessions(id, session_name, nome)
          `)
          .or(`contact_phone.ilike.%${searchPattern}%,chat_id.ilike.%${searchPattern}%`)
          .order('last_message_at', { ascending: false, nullsFirst: false })
          .limit(10);

        if (errorPhone) throw errorPhone;
        return (byPhone || []) as LeadConversationData[];
      }

      return [];
    },
    enabled: !!leadId,
    staleTime: 30000, // 30 segundos
  });

  // Buscar mensagens de uma conversa específica
  const fetchMessages = async (conversaId: string, limit = 20): Promise<LeadMessageData[]> => {
    const { data, error } = await supabase
      .from('mt_whatsapp_messages')
      .select('*')
      .eq('conversation_id', conversaId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).reverse() as LeadMessageData[];
  };

  // Contar total de não lidas
  const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);

  return {
    conversations,
    isLoading,
    error,
    refetch,
    fetchMessages,
    totalUnread,
  };
}

/**
 * Hook para vincular uma conversa a um lead
 */
export function useLinkConversationToLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversaId,
      leadId,
    }: {
      conversaId: string;
      leadId: string;
    }) => {
      const { data, error } = await supabase
        .from('mt_whatsapp_conversations')
        .update({ lead_id: leadId })
        .eq('id', conversaId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp_conversas'] });
    },
  });
}

/**
 * Hook para desvincular uma conversa de um lead
 */
export function useUnlinkConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversaId: string) => {
      const { data, error } = await supabase
        .from('mt_whatsapp_conversations')
        .update({ lead_id: null })
        .eq('id', conversaId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp_conversas'] });
    },
  });
}

/**
 * Hook para buscar conversas por telefone (sem lead específico)
 */
export function useConversationsByPhone(phone: string | undefined) {
  return useQuery({
    queryKey: ['conversations_by_phone', phone],
    queryFn: async (): Promise<LeadConversationData[]> => {
      if (!phone) return [];

      const normalized = normalizePhone(phone);
      const searchPattern = normalized.length >= 9 ? normalized.slice(-9) : normalized;

      const { data, error } = await supabase
        .from('mt_whatsapp_conversations')
        .select(`
          *,
          sessao:mt_whatsapp_sessions(id, session_name, nome)
        `)
        .or(`contact_phone.ilike.%${searchPattern}%,chat_id.ilike.%${searchPattern}%`)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as LeadConversationData[];
    },
    enabled: !!phone,
    staleTime: 30000,
  });
}

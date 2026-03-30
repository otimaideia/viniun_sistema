// Hook para vincular contato do WhatsApp com Lead

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Lead {
  id: string;
  nome: string;
  whatsapp: string;
  email?: string;
  status: string;
  created_at?: string;
}

interface UseLinkLeadOptions {
  conversationId: string;
  franqueadoId: string;
  phoneNumber?: string;
  onSuccess?: () => void;
}

/**
 * @deprecated Use useWhatsAppChatAdapter instead. This hook lacks tenant isolation.
 */
export function useLinkLead({ conversationId, franqueadoId, phoneNumber, onSuccess }: UseLinkLeadOptions) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  // Buscar leads disponíveis para vincular (da mesma franquia)
  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['leads-for-link', franqueadoId, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('mt_leads')
        .select('id, nome, whatsapp, email, status, created_at')
        .eq('franqueado_id', franqueadoId)
        .order('created_at', { ascending: false })
        .limit(50);

      // Se tiver termo de busca, filtrar
      if (searchTerm) {
        query = query.or(`nome.ilike.%${searchTerm}%,whatsapp.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!franqueadoId,
  });

  // Buscar lead atualmente vinculado
  const { data: currentLead, isLoading: currentLeadLoading } = useQuery({
    queryKey: ['conversation-lead', conversationId],
    queryFn: async () => {
      const { data: conv, error } = await supabase
        .from('mt_whatsapp_conversations')
        .select('lead_id')
        .eq('id', conversationId)
        .single();

      if (error || !conv?.lead_id) return null;

      const { data: lead, error: leadError } = await supabase
        .from('mt_leads')
        .select('id, nome, whatsapp, email, status')
        .eq('id', conv.lead_id)
        .single();

      if (leadError) return null;
      return lead as Lead;
    },
    enabled: !!conversationId,
  });

  // Vincular lead à conversa
  const linkLead = useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from('mt_whatsapp_conversations')
        .update({ lead_id: leadId, updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Lead vinculado',
        description: 'O lead foi vinculado à conversa com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['conversation-lead', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao vincular lead',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Desvincular lead
  const unlinkLead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('mt_whatsapp_conversations')
        .update({ lead_id: null, updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Lead desvinculado',
        description: 'O lead foi desvinculado da conversa.',
      });
      queryClient.invalidateQueries({ queryKey: ['conversation-lead', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao desvincular lead',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Sugerir lead pelo número de telefone
  const suggestedLead = leads.find(lead => {
    if (!phoneNumber) return false;
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const leadPhone = lead.whatsapp?.replace(/\D/g, '') || '';
    return cleanPhone.includes(leadPhone) || leadPhone.includes(cleanPhone);
  });

  return {
    leads,
    leadsLoading,
    currentLead,
    currentLeadLoading,
    suggestedLead,
    searchTerm,
    setSearchTerm,
    linkLead,
    unlinkLead,
    isLinking: linkLead.isPending,
    isUnlinking: unlinkLead.isPending,
  };
}

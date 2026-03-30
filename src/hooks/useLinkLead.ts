import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

interface Lead {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  status?: string;
}

interface ConversaLead {
  conversa_id: string;
  lead_id: string;
  lead?: Lead;
}

/**
 * Hook para vincular conversas do WhatsApp a leads do CRM
 */
export function useLinkLead(conversaId: string | undefined) {
  const queryClient = useQueryClient();
  const { tenant, franchise } = useTenantContext();

  // Buscar lead vinculado à conversa
  const {
    data: linkedLead,
    isLoading: isLoadingLinkedLead,
    error: linkedLeadError,
  } = useQuery({
    queryKey: ['conversa_lead', conversaId],
    queryFn: async (): Promise<ConversaLead | null> => {
      if (!conversaId) return null;

      const { data: conversa } = await supabase
        .from('mt_whatsapp_conversations')
        .select('lead_id')
        .eq('id', conversaId)
        .single();

      if (!conversa?.lead_id) return null;

      const { data: lead } = await supabase
        .from('mt_leads')
        .select('id, nome, telefone, email, status')
        .eq('id', conversa.lead_id)
        .single();

      return {
        conversa_id: conversaId,
        lead_id: conversa.lead_id,
        lead: lead as Lead,
      };
    },
    enabled: !!conversaId,
  });

  // Buscar leads disponíveis para vincular
  const searchLeads = async (searchTerm: string): Promise<Lead[]> => {
    if (!searchTerm || searchTerm.length < 2) return [];

    const { data, error } = await supabase
      .from('mt_leads')
      .select('id, nome, telefone, email, status')
      .or(`nome.ilike.%${searchTerm}%,telefone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .limit(10);

    if (error) {
      console.error('Erro ao buscar leads:', error);
      return [];
    }

    return (data || []) as Lead[];
  };

  // Buscar lead por telefone (para auto-link)
  const findLeadByPhone = async (phone: string): Promise<Lead | null> => {
    if (!phone) return null;

    // Normalizar telefone (remover caracteres especiais)
    const normalizedPhone = phone.replace(/\D/g, '');

    const { data, error } = await supabase
      .from('mt_leads')
      .select('id, nome, telefone, email, status')
      .or(`telefone.ilike.%${normalizedPhone}%,telefone.ilike.%${phone}%`)
      .limit(1)
      .single();

    if (error || !data) return null;

    return data as Lead;
  };

  // Vincular lead à conversa
  const linkLead = useMutation({
    mutationFn: async ({ leadId }: { leadId: string }) => {
      if (!conversaId) throw new Error('Conversa não informada');

      const { error } = await supabase
        .from('mt_whatsapp_conversations')
        .update({ lead_id: leadId })
        .eq('id', conversaId);

      if (error) throw error;

      return { conversaId, leadId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversa_lead', conversaId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp_chats'] });
      toast.success('Lead vinculado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao vincular lead: ${error.message}`);
    },
  });

  // Desvincular lead da conversa
  const unlinkLead = useMutation({
    mutationFn: async () => {
      if (!conversaId) throw new Error('Conversa não informada');

      const { error } = await supabase
        .from('mt_whatsapp_conversations')
        .update({ lead_id: null })
        .eq('id', conversaId);

      if (error) throw error;

      return { conversaId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversa_lead', conversaId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp_chats'] });
      toast.success('Lead desvinculado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao desvincular lead: ${error.message}`);
    },
  });

  // Auto-vincular lead pelo telefone
  const autoLinkByPhone = async (phone: string) => {
    const lead = await findLeadByPhone(phone);
    if (lead) {
      await linkLead.mutateAsync({ leadId: lead.id });
      return lead;
    }
    return null;
  };

  // Criar novo lead e vincular
  const createAndLink = useMutation({
    mutationFn: async (leadData: Omit<Lead, 'id'>) => {
      if (!conversaId) throw new Error('Conversa não informada');
      if (!tenant?.id) throw new Error('Tenant não identificado');

      // Criar lead
      const { data: newLead, error: createError } = await supabase
        .from('mt_leads')
        .insert({
          tenant_id: tenant.id, // OBRIGATÓRIO para MT
          franchise_id: franchise?.id || null,
          nome: leadData.nome,
          telefone: leadData.telefone,
          email: leadData.email,
          status: 'novo',
          origem: 'whatsapp',
        })
        .select()
        .single();

      if (createError) throw createError;

      // Vincular à conversa
      const { error: linkError } = await supabase
        .from('mt_whatsapp_conversations')
        .update({ lead_id: newLead.id })
        .eq('id', conversaId);

      if (linkError) throw linkError;

      return newLead as Lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversa_lead', conversaId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp_chats'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead criado e vinculado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar lead: ${error.message}`);
    },
  });

  return {
    linkedLead,
    isLoadingLinkedLead,
    linkedLeadError,
    searchLeads,
    findLeadByPhone,
    linkLead: linkLead.mutate,
    linkLeadAsync: linkLead.mutateAsync,
    isLinking: linkLead.isPending,
    unlinkLead: unlinkLead.mutate,
    isUnlinking: unlinkLead.isPending,
    autoLinkByPhone,
    createAndLink: createAndLink.mutate,
    createAndLinkAsync: createAndLink.mutateAsync,
    isCreating: createAndLink.isPending,
  };
}

export default useLinkLead;

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cleanPhone } from '@/utils/phone';
import type { FunilWhatsAppCache } from '@/types/funil';

const QUERY_KEY = 'funil_whatsapp_match';

interface WhatsAppConversa {
  id: string;
  session_id: string;
  chat_id: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_avatar: string | null;
  last_message_text: string | null;
  last_message_at: string | null;
  unread_count: number;
}

interface Lead {
  id: string;
  telefone: string;
  whatsapp?: string;
}

/**
 * Hook para fazer match entre leads e conversas do WhatsApp
 * Normaliza os telefones e busca correspondências nas conversas
 */
export function useLeadWhatsAppMatch(leads: Lead[]) {
  const queryClient = useQueryClient();

  const {
    data: matches = {},
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, leads.map((l) => l.id).join(',')],
    queryFn: async () => {
      if (leads.length === 0) return {};

      // Normalizar telefones dos leads
      const phoneToLeadId: Record<string, string> = {};
      leads.forEach((lead) => {
        if (lead.telefone) {
          const normalizedPhone = normalizePhone(lead.telefone);
          phoneToLeadId[normalizedPhone] = lead.id;
        }
        if (lead.whatsapp) {
          const normalizedWhatsApp = normalizePhone(lead.whatsapp);
          phoneToLeadId[normalizedWhatsApp] = lead.id;
        }
      });

      // Buscar todas as conversas do WhatsApp
      const { data: conversas, error } = await supabase
        .from('mt_whatsapp_conversations')
        .select('id, session_id, chat_id, contact_name, contact_phone, contact_avatar, last_message_text, last_message_at, unread_count')
        .not('contact_phone', 'is', null);

      if (error) throw error;

      // Fazer match
      const result: Record<string, WhatsAppConversa> = {};

      (conversas || []).forEach((conversa) => {
        if (!conversa.contact_phone) return;

        const normalizedPhone = normalizePhone(conversa.contact_phone);
        const leadId = phoneToLeadId[normalizedPhone];

        if (leadId) {
          result[leadId] = conversa as WhatsAppConversa;
        }
      });

      return result;
    },
    enabled: leads.length > 0,
    staleTime: 30000, // 30 segundos
  });

  return { matches, isLoading, error, refetch };
}

/**
 * Hook para sincronizar o cache de WhatsApp dos leads do funil
 */
export function useSyncFunilWhatsAppCache() {
  const queryClient = useQueryClient();

  const syncCache = useMutation({
    mutationFn: async (funilId: string) => {
      // 1. Buscar todos os leads do funil
      const { data: funilLeads, error: errorLeads } = await supabase
        .from('mt_funnel_leads')
        .select(`
          id,
          lead_id,
          lead:mt_leads(id, telefone, whatsapp)
        `)
        .eq('funil_id', funilId);

      if (errorLeads) throw errorLeads;

      // 2. Buscar todas as conversas do WhatsApp
      const { data: conversas, error: errorConversas } = await supabase
        .from('mt_whatsapp_conversations')
        .select('id, contact_phone, contact_avatar, last_message_text, last_message_at, unread_count')
        .not('contact_phone', 'is', null);

      if (errorConversas) throw errorConversas;

      // 3. Criar mapa de telefone -> conversa
      const phoneToConversa: Record<string, typeof conversas[0]> = {};
      (conversas || []).forEach((conversa) => {
        if (conversa.contact_phone) {
          const normalizedPhone = normalizePhone(conversa.contact_phone);
          phoneToConversa[normalizedPhone] = conversa;
        }
      });

      // 4. Preparar upserts para o cache
      const upserts: Partial<FunilWhatsAppCache>[] = [];

      (funilLeads || []).forEach((funilLead) => {
        const lead = Array.isArray(funilLead.lead) ? funilLead.lead[0] : funilLead.lead;
        if (!lead) return;

        // Tentar match com telefone ou whatsapp
        let conversa = null;
        if (lead.telefone) {
          const normalizedPhone = normalizePhone(lead.telefone);
          conversa = phoneToConversa[normalizedPhone];
        }
        if (!conversa && lead.whatsapp) {
          const normalizedWhatsApp = normalizePhone(lead.whatsapp);
          conversa = phoneToConversa[normalizedWhatsApp];
        }

        upserts.push({
          lead_id: lead.id,
          conversa_id: conversa?.id || null,
          telefone_normalizado: normalizePhone(lead.telefone || lead.whatsapp || ''),
          avatar_url: conversa?.contact_avatar || null,
          ultima_mensagem: conversa?.last_message_text || null,
          ultima_mensagem_at: conversa?.last_message_at || null,
          unread_count: conversa?.unread_count || 0,
          updated_at: new Date().toISOString(),
        });
      });

      // 5. Fazer upsert no cache
      if (upserts.length > 0) {
        const { error: errorUpsert } = await supabase
          .from('mt_funnel_whatsapp_cache')
          .upsert(upserts, { onConflict: 'lead_id' });

        if (errorUpsert) throw errorUpsert;
      }

      return { synced: upserts.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funil_leads'] });
    },
  });

  return {
    syncCache: syncCache.mutate,
    syncCacheAsync: syncCache.mutateAsync,
    isSyncing: syncCache.isPending,
    error: syncCache.error,
  };
}

/**
 * Hook para buscar cache de WhatsApp de um lead específico
 */
export function useLeadWhatsAppCache(leadId: string | undefined) {
  const {
    data: cache,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['funil_whatsapp_cache', leadId],
    queryFn: async () => {
      if (!leadId) return null;

      const { data, error } = await supabase
        .from('mt_funnel_whatsapp_cache')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();

      if (error) throw error;
      return data as FunilWhatsAppCache | null;
    },
    enabled: !!leadId,
  });

  return { cache, isLoading, error, refetch };
}

/**
 * Hook para atualizar cache de WhatsApp de um lead
 */
export function useUpdateLeadWhatsAppCache() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      conversaId,
    }: {
      leadId: string;
      conversaId: string;
    }) => {
      // Buscar dados da conversa
      const { data: conversa, error: errorConversa } = await supabase
        .from('mt_whatsapp_conversations')
        .select('id, contact_phone, contact_avatar, last_message_text, last_message_at, unread_count')
        .eq('id', conversaId)
        .single();

      if (errorConversa) throw errorConversa;

      // Atualizar cache
      const { data, error } = await supabase
        .from('mt_funnel_whatsapp_cache')
        .upsert(
          {
            lead_id: leadId,
            conversa_id: conversaId,
            telefone_normalizado: conversa.contact_phone
              ? normalizePhone(conversa.contact_phone)
              : null,
            avatar_url: conversa.contact_avatar,
            ultima_mensagem: conversa.last_message_text,
            ultima_mensagem_at: conversa.last_message_at,
            unread_count: conversa.unread_count,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'lead_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data as FunilWhatsAppCache;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['funil_whatsapp_cache', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['funil_leads'] });
    },
  });
}

/**
 * Normaliza um número de telefone para comparação
 * Remove tudo exceto números e adiciona código do país se necessário
 */
export function normalizePhone(phone: string): string {
  // Remover tudo que não é número
  const digits = phone.replace(/\D/g, '');

  // Se tem 10 ou 11 dígitos (BR sem código país), adicionar 55
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  // Se já tem código do país (13 dígitos com 55)
  if (digits.length === 12 || digits.length === 13) {
    return digits;
  }

  // Retornar como está
  return digits;
}

/**
 * Hook para buscar conversas não vinculadas (para vincular manualmente)
 */
export function useUnlinkedConversas() {
  const {
    data: conversas = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['unlinked_whatsapp_conversas'],
    queryFn: async () => {
      // Buscar conversas que não estão no cache
      const { data: cached, error: errorCached } = await supabase
        .from('mt_funnel_whatsapp_cache')
        .select('conversa_id')
        .not('conversa_id', 'is', null);

      if (errorCached) throw errorCached;

      const cachedIds = (cached || []).map((c) => c.conversa_id).filter(Boolean);

      let query = supabase
        .from('mt_whatsapp_conversations')
        .select('id, session_id, chat_id, contact_name, contact_phone, contact_avatar, last_message_text, last_message_at, unread_count')
        .order('last_message_at', { ascending: false });

      if (cachedIds.length > 0) {
        query = query.not('id', 'in', `(${cachedIds.join(',')})`);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      return data as WhatsAppConversa[];
    },
  });

  return { conversas, isLoading, error, refetch };
}

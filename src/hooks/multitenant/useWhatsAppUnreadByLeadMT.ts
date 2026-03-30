// =============================================================================
// useWhatsAppUnreadByLeadMT - Contagem de mensagens não lidas por lead
// =============================================================================
// Hook leve para exibir badges de mensagens WhatsApp não lidas na tabela de leads
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';

export interface LeadUnreadCount {
  lead_id: string;
  unread_count: number;
  conversation_id: string;
}

export function useWhatsAppUnreadByLeadMT() {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: ['mt-whatsapp-unread-by-lead', tenant?.id],
    queryFn: async (): Promise<Map<string, LeadUnreadCount>> => {
      let q = supabase
        .from('mt_whatsapp_conversations')
        .select('id, lead_id, unread_count')
        .not('lead_id', 'is', null)
        .gt('unread_count', 0);

      if (tenant?.id) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;

      const map = new Map<string, LeadUnreadCount>();
      for (const conv of data || []) {
        if (!conv.lead_id) continue;
        const existing = map.get(conv.lead_id);
        if (existing) {
          existing.unread_count += conv.unread_count || 0;
        } else {
          map.set(conv.lead_id, {
            lead_id: conv.lead_id,
            unread_count: conv.unread_count || 0,
            conversation_id: conv.id,
          });
        }
      }
      return map;
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
  });

  return {
    unreadByLead: query.data || new Map<string, LeadUnreadCount>(),
    isLoading: query.isLoading,
    totalUnread: query.data
      ? Array.from(query.data.values()).reduce((sum, v) => sum + v.unread_count, 0)
      : 0,
  };
}

export default useWhatsAppUnreadByLeadMT;

import { useQuery } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import type { WhatsAppRoutingLog, ProviderType } from '@/types/whatsapp-hybrid';

const TABLE = 'mt_whatsapp_routing_logs';
const QUERY_KEY = 'mt-wa-routing-logs';

export function useWhatsAppRoutingLogsMT(filters?: {
  franchise_id?: string;
  provider_selected?: ProviderType;
  conversation_id?: string;
  success?: boolean;
  date_from?: string;
  date_to?: string;
  limit?: number;
}) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, filters],
    queryFn: async () => {
      let q = (supabase.from(TABLE) as any)
        .select(`
          *,
          rule:mt_whatsapp_routing_rules(nome, condition_type)
        `)
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 100);

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      if (filters?.franchise_id) q = q.eq('franchise_id', filters.franchise_id);
      if (filters?.provider_selected) q = q.eq('provider_selected', filters.provider_selected);
      if (filters?.conversation_id) q = q.eq('conversation_id', filters.conversation_id);
      if (filters?.success !== undefined) q = q.eq('success', filters.success);
      if (filters?.date_from) q = q.gte('created_at', filters.date_from);
      if (filters?.date_to) q = q.lte('created_at', filters.date_to);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as WhatsAppRoutingLog[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform')
      && (accessLevel === 'platform' || accessLevel === 'tenant'),
  });

  // Métricas dos logs
  const stats = {
    total: query.data?.length || 0,
    wahaCount: query.data?.filter(l => l.provider_selected === 'waha').length || 0,
    metaCount: query.data?.filter(l => l.provider_selected === 'meta_cloud_api').length || 0,
    successRate: query.data?.length
      ? (query.data.filter(l => l.success).length / query.data.length) * 100
      : 0,
    fallbackRate: query.data?.length
      ? (query.data.filter(l => l.fallback_used).length / query.data.length) * 100
      : 0,
    totalCost: query.data?.reduce((sum, l) => sum + Number(l.actual_cost || l.estimated_cost || 0), 0) || 0,
    avgResponseTime: query.data?.length
      ? query.data.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / query.data.length
      : 0,
  };

  return {
    logs: query.data || [],
    stats,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

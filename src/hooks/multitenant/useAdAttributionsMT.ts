import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import type { AdAttribution } from '@/types/ad-campaigns';

interface AttributionFilters {
  campaignId?: string;
  method?: string;
  startDate?: string;
  endDate?: string;
  conversionOnly?: boolean;
}

export function useAdAttributionsMT(filters?: AttributionFilters) {
  const { tenant, isLoading: isTenantLoading } = useTenantContext();

  const attributions = useQuery({
    queryKey: ['mt-ad-attributions', tenant?.id, filters],
    queryFn: async () => {
      if (!tenant) throw new Error('Tenant não carregado');

      let query = (supabase as any)
        .from('mt_ad_attributions')
        .select('*, ad_campaign:mt_ad_campaigns(nome, plataforma, status)')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (filters?.campaignId) query = query.eq('ad_campaign_id', filters.campaignId);
      if (filters?.method) query = query.eq('attribution_method', filters.method);
      if (filters?.startDate) query = query.gte('created_at', filters.startDate);
      if (filters?.endDate) query = query.lte('created_at', filters.endDate);
      if (filters?.conversionOnly) query = query.eq('is_conversion', true);

      const { data, error } = await query;
      if (error) throw error;
      return data as (AdAttribution & { ad_campaign?: { nome: string; plataforma: string; status: string } })[];
    },
    enabled: !isTenantLoading && !!tenant,
  });

  // Summary by method
  const summary = useQuery({
    queryKey: ['mt-ad-attributions-summary', tenant?.id],
    queryFn: async () => {
      if (!tenant) throw new Error('Tenant não carregado');
      const { data, error } = await (supabase as any)
        .from('mt_ad_attributions')
        .select('attribution_method, is_conversion, sale_value')
        .eq('tenant_id', tenant.id);
      if (error) throw error;

      const byMethod = (data || []).reduce((acc: Record<string, any>, row: any) => {
        const m = row.attribution_method;
        if (!acc[m]) acc[m] = { method: m, total: 0, conversions: 0, revenue: 0 };
        acc[m].total += 1;
        if (row.is_conversion) acc[m].conversions += 1;
        acc[m].revenue += parseFloat(row.sale_value || 0);
        return acc;
      }, {});

      return Object.values(byMethod);
    },
    enabled: !isTenantLoading && !!tenant,
  });

  return {
    attributions: attributions.data || [],
    summary: summary.data || [],
    isLoading: attributions.isLoading || isTenantLoading,
    refetch: attributions.refetch,
  };
}

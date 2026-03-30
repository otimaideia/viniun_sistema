import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';

const TRAFFIC_ANALYTICS_KEY = 'mt-traffic-analytics';

interface TrafficMetrics {
  total_investido: number;
  total_leads: number;
  total_vendas: number;
  total_receita: number;
  cpl_medio: number;
  roas_medio: number;
  roi_percent: number;
}

interface CampaignPerformance {
  id: string;
  nome: string;
  plataforma: string;
  status: string;
  budget_gasto: number;
  impressions: number;
  cliques: number;
  leads_gerados: number;
  vendas: number;
  receita_gerada: number;
  cpl: number;
  roas: number;
  ctr: number;
}

export function useTrafficAnalyticsMT(filters?: { startDate?: string; endDate?: string; plataforma?: string }) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const metricsQuery = useQuery({
    queryKey: [TRAFFIC_ANALYTICS_KEY, 'metrics', tenant?.id, franchise?.id, filters],
    queryFn: async (): Promise<TrafficMetrics> => {
      if (!tenant && accessLevel !== 'platform') {
        return { total_investido: 0, total_leads: 0, total_vendas: 0, total_receita: 0, cpl_medio: 0, roas_medio: 0, roi_percent: 0 };
      }

      let q = (supabase.from('mt_ad_campaigns') as any)
        .select('budget_gasto, leads_gerados, vendas, receita_gerada')
        .is('deleted_at', null);

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      if (filters?.plataforma) q = q.eq('plataforma', filters.plataforma);

      const { data, error } = await q;
      if (error) {
        if (error.code === '42P01') return { total_investido: 0, total_leads: 0, total_vendas: 0, total_receita: 0, cpl_medio: 0, roas_medio: 0, roi_percent: 0 };
        throw error;
      }

      const campaigns = data || [];
      const total_investido = campaigns.reduce((sum: number, c: any) => sum + (c.budget_gasto || 0), 0);
      const total_leads = campaigns.reduce((sum: number, c: any) => sum + (c.leads_gerados || 0), 0);
      const total_vendas = campaigns.reduce((sum: number, c: any) => sum + (c.vendas || 0), 0);
      const total_receita = campaigns.reduce((sum: number, c: any) => sum + (c.receita_gerada || 0), 0);

      return {
        total_investido,
        total_leads,
        total_vendas,
        total_receita,
        cpl_medio: total_leads > 0 ? total_investido / total_leads : 0,
        roas_medio: total_investido > 0 ? total_receita / total_investido : 0,
        roi_percent: total_investido > 0 ? ((total_receita - total_investido) / total_investido) * 100 : 0,
      };
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  const campaignPerformanceQuery = useQuery({
    queryKey: [TRAFFIC_ANALYTICS_KEY, 'campaigns', tenant?.id, franchise?.id, filters],
    queryFn: async (): Promise<CampaignPerformance[]> => {
      if (!tenant && accessLevel !== 'platform') return [];

      let q = (supabase.from('mt_ad_campaigns') as any)
        .select('id, nome, plataforma, status, budget_gasto, impressions, cliques, leads_gerados, vendas, receita_gerada, cpl, roas, ctr')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      if (filters?.plataforma) q = q.eq('plataforma', filters.plataforma);

      const { data, error } = await q;
      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }
      return (data || []) as CampaignPerformance[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  return {
    metrics: metricsQuery.data ?? { total_investido: 0, total_leads: 0, total_vendas: 0, total_receita: 0, cpl_medio: 0, roas_medio: 0, roi_percent: 0 },
    campaignPerformance: campaignPerformanceQuery.data ?? [],
    isLoading: metricsQuery.isLoading || campaignPerformanceQuery.isLoading || isTenantLoading,
    error: metricsQuery.error || campaignPerformanceQuery.error,
    refetch: () => {
      metricsQuery.refetch();
      campaignPerformanceQuery.refetch();
    },
  };
}

export default useTrafficAnalyticsMT;

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { AdCampaign } from '@/types/ad-campaigns';

interface AdCampaignFilters {
  status?: string;
  plataforma?: string;
  startDate?: string;
  endDate?: string;
}

export function useAdCampaignsMT(filters?: AdCampaignFilters) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const campaigns = useQuery({
    queryKey: ['mt-ad-campaigns', tenant?.id, filters],
    queryFn: async () => {
      if (!tenant) throw new Error('Tenant não carregado');

      let query = (supabase as any)
        .from('mt_ad_campaigns')
        .select('*')
        .eq('tenant_id', tenant.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.plataforma) query = query.eq('plataforma', filters.plataforma);
      if (filters?.startDate) query = query.gte('data_inicio', filters.startDate);
      if (filters?.endDate) query = query.lte('data_fim', filters.endDate);

      const { data, error } = await query;
      if (error) throw error;
      return data as AdCampaign[];
    },
    enabled: !isTenantLoading && !!tenant,
  });

  const create = useMutation({
    mutationFn: async (campaign: Partial<AdCampaign>) => {
      if (!tenant) throw new Error('Tenant não definido');
      const { data, error } = await (supabase as any)
        .from('mt_ad_campaigns')
        .insert({ ...campaign, tenant_id: tenant.id })
        .select()
        .single();
      if (error) throw error;
      return data as AdCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-ad-campaigns'] });
      toast.success('Campanha de ads criada');
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AdCampaign> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('mt_ad_campaigns')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as AdCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-ad-campaigns'] });
      toast.success('Campanha atualizada');
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('mt_ad_campaigns')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-ad-campaigns'] });
      toast.success('Campanha removida');
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });

  // Summary stats
  const stats = useQuery({
    queryKey: ['mt-ad-campaigns-stats', tenant?.id],
    queryFn: async () => {
      if (!tenant) throw new Error('Tenant não carregado');
      const { data, error } = await (supabase as any)
        .from('mt_ad_campaigns')
        .select('status, budget_gasto, leads_gerados, vendas, receita_gerada, roas')
        .eq('tenant_id', tenant.id)
        .is('deleted_at', null);
      if (error) throw error;

      const active = (data || []).filter((c: any) => c.status === 'active');
      return {
        total: (data || []).length,
        active: active.length,
        totalSpent: (data || []).reduce((s: number, c: any) => s + (c.budget_gasto || 0), 0),
        totalLeads: (data || []).reduce((s: number, c: any) => s + (c.leads_gerados || 0), 0),
        totalSales: (data || []).reduce((s: number, c: any) => s + (c.vendas || 0), 0),
        totalRevenue: (data || []).reduce((s: number, c: any) => s + (c.receita_gerada || 0), 0),
        avgRoas: active.length > 0
          ? active.reduce((s: number, c: any) => s + (c.roas || 0), 0) / active.length
          : 0,
      };
    },
    enabled: !isTenantLoading && !!tenant,
  });

  return {
    campaigns: campaigns.data || [],
    stats: stats.data,
    isLoading: campaigns.isLoading || isTenantLoading,
    create,
    update,
    remove,
    refetch: campaigns.refetch,
  };
}

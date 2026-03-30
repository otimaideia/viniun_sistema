import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import type { AITokenUsage } from '@/types/ai-sales-assistant';

interface TokenUsageFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
  agentId?: string;
  provider?: string;
}

export function useAITokenUsageMT(filters?: TokenUsageFilters) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const usage = useQuery({
    queryKey: ['mt-ai-token-usage', tenant?.id, filters],
    queryFn: async () => {
      if (!tenant) throw new Error('Tenant não carregado');

      let query = (supabase as any)
        .from('mt_ai_token_usage')
        .select('*, agent:mt_ai_agents(codigo, nome, icone, cor)')
        .eq('tenant_id', tenant.id)
        .order('data', { ascending: false });

      if (filters?.startDate) query = query.gte('data', filters.startDate);
      if (filters?.endDate) query = query.lte('data', filters.endDate);
      if (filters?.userId) query = query.eq('user_id', filters.userId);
      if (filters?.agentId) query = query.eq('agent_id', filters.agentId);
      if (filters?.provider) query = query.eq('provider', filters.provider);

      const { data, error } = await query;
      if (error) throw error;
      return data as (AITokenUsage & { agent?: { codigo: string; nome: string; icone: string; cor: string } })[];
    },
    enabled: !isTenantLoading && !!tenant,
  });

  const todayUsage = useQuery({
    queryKey: ['mt-ai-token-usage-today', tenant?.id],
    queryFn: async () => {
      if (!tenant) throw new Error('Tenant não carregado');
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await (supabase as any)
        .from('mt_ai_token_usage')
        .select('total_requests, total_tokens, estimated_cost_usd, estimated_cost_brl')
        .eq('tenant_id', tenant.id)
        .eq('data', today);

      if (error) throw error;

      const totals = (data || []).reduce(
        (acc: any, row: any) => ({
          requests: acc.requests + (row.total_requests || 0),
          tokens: acc.tokens + (row.total_tokens || 0),
          cost_usd: acc.cost_usd + parseFloat(row.estimated_cost_usd || 0),
          cost_brl: acc.cost_brl + parseFloat(row.estimated_cost_brl || 0),
        }),
        { requests: 0, tokens: 0, cost_usd: 0, cost_brl: 0 }
      );

      return totals;
    },
    enabled: !isTenantLoading && !!tenant,
    refetchInterval: 60000,
  });

  const monthUsage = useQuery({
    queryKey: ['mt-ai-token-usage-month', tenant?.id],
    queryFn: async () => {
      if (!tenant) throw new Error('Tenant não carregado');
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const { data, error } = await (supabase as any)
        .from('mt_ai_token_usage')
        .select('data, total_requests, total_tokens, estimated_cost_usd, estimated_cost_brl, provider, model')
        .eq('tenant_id', tenant.id)
        .gte('data', firstDay)
        .lte('data', lastDay);

      if (error) throw error;

      const byDay = (data || []).reduce((acc: Record<string, any>, row: any) => {
        const day = row.data;
        if (!acc[day]) acc[day] = { date: day, requests: 0, tokens: 0, cost_usd: 0, cost_brl: 0 };
        acc[day].requests += row.total_requests || 0;
        acc[day].tokens += row.total_tokens || 0;
        acc[day].cost_usd += parseFloat(row.estimated_cost_usd || 0);
        acc[day].cost_brl += parseFloat(row.estimated_cost_brl || 0);
        return acc;
      }, {});

      const byProvider = (data || []).reduce((acc: Record<string, any>, row: any) => {
        const p = row.provider;
        if (!acc[p]) acc[p] = { provider: p, requests: 0, tokens: 0, cost_usd: 0 };
        acc[p].requests += row.total_requests || 0;
        acc[p].tokens += row.total_tokens || 0;
        acc[p].cost_usd += parseFloat(row.estimated_cost_usd || 0);
        return acc;
      }, {});

      const totalCostUsd = (data || []).reduce((sum: number, row: any) => sum + parseFloat(row.estimated_cost_usd || 0), 0);
      const totalCostBrl = (data || []).reduce((sum: number, row: any) => sum + parseFloat(row.estimated_cost_brl || 0), 0);
      const totalRequests = (data || []).reduce((sum: number, row: any) => sum + (row.total_requests || 0), 0);
      const totalTokens = (data || []).reduce((sum: number, row: any) => sum + (row.total_tokens || 0), 0);

      return {
        byDay: Object.values(byDay).sort((a: any, b: any) => a.date.localeCompare(b.date)),
        byProvider: Object.values(byProvider),
        totals: { requests: totalRequests, tokens: totalTokens, cost_usd: totalCostUsd, cost_brl: totalCostBrl },
      };
    },
    enabled: !isTenantLoading && !!tenant,
  });

  return {
    usage: usage.data || [],
    todayUsage: todayUsage.data || { requests: 0, tokens: 0, cost_usd: 0, cost_brl: 0 },
    monthUsage: monthUsage.data || { byDay: [], byProvider: [], totals: { requests: 0, tokens: 0, cost_usd: 0, cost_brl: 0 } },
    isLoading: usage.isLoading || isTenantLoading,
  };
}

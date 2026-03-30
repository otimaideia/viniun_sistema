import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { WhatsAppCost, PeriodType, UpdateBudgetInput } from '@/types/whatsapp-hybrid';
import { formatCostBRL } from '@/types/whatsapp-hybrid';

const TABLE = 'mt_whatsapp_costs';
const QUERY_KEY = 'mt-wa-costs';

export function useWhatsAppCostsMT(filters?: {
  franchise_id?: string;
  period_type?: PeriodType;
  period_start?: string;
  period_end?: string;
}) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, accessLevel, filters],
    queryFn: async () => {
      let q = (supabase.from(TABLE) as any)
        .select('*, franchise:mt_franchises(nome, cidade)')
        .order('period_start', { ascending: false });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      if (filters?.franchise_id) q = q.eq('franchise_id', filters.franchise_id);
      if (filters?.period_type) q = q.eq('period_type', filters.period_type);
      if (filters?.period_start) q = q.gte('period_start', filters.period_start);
      if (filters?.period_end) q = q.lte('period_end', filters.period_end);

      const { data, error } = await q;
      if (error) throw error;

      // Calcular % de uso do orçamento
      return ((data || []) as WhatsAppCost[]).map(cost => ({
        ...cost,
        budget_usage_pct: cost.budget_limit
          ? (cost.cost_total / cost.budget_limit) * 100
          : undefined,
      }));
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Custo do mês atual
  const currentMonth = useQuery({
    queryKey: [QUERY_KEY, 'current', tenant?.id, franchise?.id],
    queryFn: async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString().split('T')[0];

      let q = (supabase.from(TABLE) as any)
        .select('*')
        .eq('period_type', 'monthly')
        .eq('period_start', monthStart);

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as WhatsAppCost[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Configurar orçamento
  const updateBudget = useMutation({
    mutationFn: async (input: UpdateBudgetInput) => {
      if (!tenant) throw new Error('Tenant não definido');

      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString().split('T')[0];
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString().split('T')[0];

      const { data, error } = await (supabase.from(TABLE) as any)
        .upsert({
          tenant_id: tenant.id,
          franchise_id: input.franchise_id || null,
          period_type: input.period_type,
          period_start: periodStart,
          period_end: periodEnd,
          budget_limit: input.budget_limit,
          budget_alert_threshold: input.budget_alert_threshold || 0.80,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'tenant_id,franchise_id,period_type,period_start',
        })
        .select()
        .single();

      if (error) throw error;
      return data as WhatsAppCost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Orçamento atualizado');
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });

  // Métricas consolidadas (memoizadas para evitar recálculos desnecessários)
  const summary = useMemo(() => {
    const data = currentMonth.data;
    const totalMessages = data?.reduce((sum, c) => sum + c.total_messages, 0) || 0;
    const messagesWaha = data?.reduce((sum, c) => sum + c.messages_waha, 0) || 0;
    const messagesMetaFree = data?.reduce((sum, c) => sum + c.messages_meta_free, 0) || 0;
    const messagesMetaPaid = data?.reduce((sum, c) => sum + c.messages_meta_paid, 0) || 0;
    const costTotal = data?.reduce((sum, c) => sum + Number(c.cost_total), 0) || 0;
    const budgetTotal = data?.reduce((sum, c) => sum + Number(c.budget_limit || 0), 0) || 0;

    return {
      totalMessages,
      messagesWaha,
      messagesMetaFree,
      messagesMetaPaid,
      costTotal,
      costTotalFormatted: formatCostBRL(costTotal),
      budgetTotal,
    };
  }, [currentMonth.data]);

  return {
    costs: query.data || [],
    currentMonthCosts: currentMonth.data || [],
    summary,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    updateBudget,
  };
}

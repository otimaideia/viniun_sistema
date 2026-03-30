import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { LeadFunnelHistory, LeadFunnelHistoryWithRelations } from '@/types/lead-crm';

const QUERY_KEY = 'lead_funnel_history';

/**
 * Hook para gerenciar histórico de mudanças de status do lead (funil)
 */
export function useLeadFunnelHistory(leadId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const {
    data: history = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, leadId],
    queryFn: async (): Promise<LeadFunnelHistoryWithRelations[]> => {
      if (!leadId) return [];

      const { data, error } = await supabase
        .from('mt_lead_funnel_history')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as LeadFunnelHistoryWithRelations[];
    },
    enabled: !!leadId,
    staleTime: 30000,
  });

  // Adicionar entrada manual ao histórico (caso precise)
  const addHistoryEntry = useMutation({
    mutationFn: async (input: {
      lead_id: string;
      status_anterior?: string;
      status_novo: string;
      motivo?: string;
      franqueado_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('mt_lead_funnel_history')
        .insert({
          ...input,
          changed_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as LeadFunnelHistory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, leadId] });
    },
  });

  // Calcular estatísticas do histórico
  const stats = {
    totalChanges: history.length,
    // Tempo médio em cada status
    averageTimeByStatus: calculateAverageTimeByStatus(history),
    // Último status
    lastStatus: history[0]?.status_novo || null,
    // Primeiro status
    firstStatus: history[history.length - 1]?.status_novo || null,
    // Data da última mudança
    lastChange: history[0]?.created_at || null,
  };

  return {
    history,
    isLoading,
    error,
    refetch,
    addHistoryEntry: addHistoryEntry.mutate,
    stats,
  };
}

/**
 * Calcular tempo médio em cada status
 */
function calculateAverageTimeByStatus(history: LeadFunnelHistoryWithRelations[]): Record<string, number> {
  if (history.length < 2) return {};

  const statusTimes: Record<string, number[]> = {};

  // Ordenar por data (mais antigo primeiro)
  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  for (let i = 0; i < sortedHistory.length - 1; i++) {
    const current = sortedHistory[i];
    const next = sortedHistory[i + 1];

    const timeInStatus = new Date(next.created_at).getTime() - new Date(current.created_at).getTime();
    const hoursInStatus = timeInStatus / (1000 * 60 * 60); // Em horas

    if (!statusTimes[current.status_novo]) {
      statusTimes[current.status_novo] = [];
    }
    statusTimes[current.status_novo].push(hoursInStatus);
  }

  // Calcular média
  const averages: Record<string, number> = {};
  for (const [status, times] of Object.entries(statusTimes)) {
    averages[status] = times.reduce((a, b) => a + b, 0) / times.length;
  }

  return averages;
}

/**
 * Hook para estatísticas gerais do funil
 */
export function useFunnelStats(franqueadoId?: string, dateRange?: { from: string; to: string }) {
  return useQuery({
    queryKey: ['funnel_stats', franqueadoId, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('mt_lead_funnel_history')
        .select('status_novo, created_at');

      if (franqueadoId) {
        query = query.eq('franqueado_id', franqueadoId);
      }

      if (dateRange?.from) {
        query = query.gte('created_at', dateRange.from);
      }

      if (dateRange?.to) {
        query = query.lte('created_at', dateRange.to);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Contar por status
      const countByStatus: Record<string, number> = {};
      (data || []).forEach(item => {
        countByStatus[item.status_novo] = (countByStatus[item.status_novo] || 0) + 1;
      });

      // Contar por dia
      const countByDay: Record<string, number> = {};
      (data || []).forEach(item => {
        const day = item.created_at.split('T')[0];
        countByDay[day] = (countByDay[day] || 0) + 1;
      });

      return {
        total: data?.length || 0,
        byStatus: countByStatus,
        byDay: countByDay,
      };
    },
    staleTime: 60000,
  });
}

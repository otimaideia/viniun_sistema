// =============================================================================
// USE FUNNEL STAGE HISTORY MT - Histórico de tempo por etapa
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface FunnelStageHistoryEntry {
  id: string;
  tenant_id: string;
  funnel_lead_id: string;
  lead_id: string;
  funnel_id: string;
  stage_id: string;
  entered_at: string;
  exited_at?: string | null;
  duration_seconds?: number | null;
  moved_by?: string | null;
  move_reason?: string | null;
  next_stage_id?: string | null;
  created_at: string;
  // Relacionamentos
  stage?: { id: string; nome: string; cor: string; ordem: number } | null;
  next_stage?: { id: string; nome: string; cor: string } | null;
  mover?: { id: string; nome: string } | null;
}

export interface StageTimeMetric {
  stage_id: string;
  stage_nome: string;
  stage_ordem: number;
  total_leads_passed: number;
  total_leads_exited: number;
  total_leads_current: number;
  avg_duration_seconds: number | null;
  median_duration_seconds: number | null;
  min_duration_seconds: number | null;
  max_duration_seconds: number | null;
}

const QUERY_KEY = 'mt-funnel-stage-history';

// -----------------------------------------------------------------------------
// Hook: Histórico de etapas de um lead específico
// -----------------------------------------------------------------------------

export function useFunnelLeadHistoryMT(funnelLeadId: string | undefined) {
  const { isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'lead', funnelLeadId],
    queryFn: async (): Promise<FunnelStageHistoryEntry[]> => {
      if (!funnelLeadId) return [];

      const { data, error } = await supabase
        .from('mt_funnel_stage_history')
        .select(`
          *,
          stage:mt_funnel_stages!stage_id(id, nome, cor, ordem),
          next_stage:mt_funnel_stages!next_stage_id(id, nome, cor),
          mover:mt_users!moved_by(id, nome)
        `)
        .eq('funnel_lead_id', funnelLeadId)
        .order('entered_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((item) => ({
        ...item,
        stage: Array.isArray(item.stage) ? item.stage[0] : item.stage,
        next_stage: Array.isArray(item.next_stage) ? item.next_stage[0] : item.next_stage,
        mover: Array.isArray(item.mover) ? item.mover[0] : item.mover,
      })) as FunnelStageHistoryEntry[];
    },
    enabled: !!funnelLeadId && !isTenantLoading,
  });
}

// -----------------------------------------------------------------------------
// Hook: Métricas de tempo por etapa de um funil (agregado)
// -----------------------------------------------------------------------------

export function useFunnelStageTimeMetricsMT(funnelId: string | undefined) {
  const { tenant, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'metrics', funnelId],
    queryFn: async (): Promise<StageTimeMetric[]> => {
      if (!funnelId) return [];

      const { data, error } = await supabase
        .from('v_funnel_stage_time_metrics')
        .select('*')
        .eq('funnel_id', funnelId)
        .order('stage_ordem', { ascending: true });

      if (error) {
        // View pode não existir ainda, fallback para query manual
        console.warn('View v_funnel_stage_time_metrics não encontrada, usando fallback');
        return [];
      }

      return (data || []) as StageTimeMetric[];
    },
    enabled: !!funnelId && !isTenantLoading && (!!tenant),
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

// -----------------------------------------------------------------------------
// Hook: Registrar entrada/saída em etapas (usado pelo moveLeadToStage)
// -----------------------------------------------------------------------------

export function useFunnelStageHistoryMutationsMT() {
  const { tenant, user } = useTenantContext();
  const queryClient = useQueryClient();

  // Registrar entrada em uma etapa
  const recordStageEntry = useMutation({
    mutationFn: async ({
      funnelLeadId,
      leadId,
      funnelId,
      stageId,
    }: {
      funnelLeadId: string;
      leadId: string;
      funnelId: string;
      stageId: string;
    }) => {
      if (!tenant) throw new Error('Tenant não definido');

      const { data, error } = await supabase
        .from('mt_funnel_stage_history')
        .insert({
          tenant_id: tenant.id,
          funnel_lead_id: funnelLeadId,
          lead_id: leadId,
          funnel_id: funnelId,
          stage_id: stageId,
          entered_at: new Date().toISOString(),
          moved_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'lead', variables.funnelLeadId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'metrics', variables.funnelId] });
    },
  });

  // Registrar saída de uma etapa (fecha o registro anterior)
  const recordStageExit = useMutation({
    mutationFn: async ({
      funnelLeadId,
      stageId,
      nextStageId,
      moveReason,
    }: {
      funnelLeadId: string;
      stageId: string;
      nextStageId: string;
      moveReason?: string;
    }) => {
      // Buscar o registro de entrada mais recente sem saída
      const { data: currentEntry, error: fetchError } = await supabase
        .from('mt_funnel_stage_history')
        .select('id, entered_at')
        .eq('funnel_lead_id', funnelLeadId)
        .eq('stage_id', stageId)
        .is('exited_at', null)
        .order('entered_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!currentEntry) return null; // Sem registro de entrada

      const exitedAt = new Date();
      const enteredAt = new Date(currentEntry.entered_at);
      const durationSeconds = Math.floor((exitedAt.getTime() - enteredAt.getTime()) / 1000);

      const { data, error } = await supabase
        .from('mt_funnel_stage_history')
        .update({
          exited_at: exitedAt.toISOString(),
          duration_seconds: durationSeconds,
          next_stage_id: nextStageId,
          move_reason: moveReason || 'Movido manualmente',
          moved_by: user?.id || null,
        })
        .eq('id', currentEntry.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Função combinada: sair da etapa atual e entrar na nova
  const recordStageTransition = async ({
    funnelLeadId,
    leadId,
    funnelId,
    fromStageId,
    toStageId,
    moveReason,
  }: {
    funnelLeadId: string;
    leadId: string;
    funnelId: string;
    fromStageId: string;
    toStageId: string;
    moveReason?: string;
  }) => {
    try {
      // 1. Fechar a etapa anterior
      await recordStageExit.mutateAsync({
        funnelLeadId,
        stageId: fromStageId,
        nextStageId: toStageId,
        moveReason,
      });

      // 2. Abrir entrada na nova etapa
      await recordStageEntry.mutateAsync({
        funnelLeadId,
        leadId,
        funnelId,
        stageId: toStageId,
      });
    } catch (error) {
      console.error('[StageHistory] Erro ao registrar transição:', error);
    }
  };

  return {
    recordStageEntry,
    recordStageExit,
    recordStageTransition,
  };
}

// -----------------------------------------------------------------------------
// Utilitário: Formatar duração em segundos para texto legível
// -----------------------------------------------------------------------------

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '-';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function formatDurationShort(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '-';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return '< 1m';
}

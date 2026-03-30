// =============================================================================
// USE LEAD ACTIVITIES ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para atividades de leads usando tabelas MT
// SISTEMA 100% MT - Usa useLeadActivitiesMT diretamente
//
// =============================================================================

import { useLeadActivitiesMT, usePendingTasksMT } from './useLeadActivitiesMT';
import type {
  LeadActivityInsert,
  ActivityFilters,
} from '@/types/lead-crm';
import type {
  MTLeadActivity,
  MTLeadActivityCreate,
} from '@/types/lead-mt';

// -----------------------------------------------------------------------------
// Tipos do Adapter (compatibilidade com código existente)
// -----------------------------------------------------------------------------

export interface LeadActivityAdapted {
  id: string;
  lead_id: string;
  tipo: string;
  titulo?: string | null;
  descricao: string;
  is_pinned: boolean;
  is_completed: boolean;
  data_prazo?: string | null;
  data_agendada?: string | null;
  resultado_ligacao?: string | null;
  status_agendamento?: string | null;
  duracao_minutos?: number | null;
  responsavel_id?: string | null;
  created_at: string;
  updated_at?: string | null;
  user?: {
    id: string;
    nome: string;
    email?: string;
  } | null;
}

export interface LeadActivityStats {
  total: number;
  pending: number;
  completed: number;
  pinned?: number;
  byType?: Record<string, number>;
}

// -----------------------------------------------------------------------------
// Funções de Mapeamento
// -----------------------------------------------------------------------------

/**
 * Converte atividade MT para formato do adapter
 */
function mapMTToAdapter(activity: MTLeadActivity): LeadActivityAdapted {
  return {
    id: activity.id,
    lead_id: activity.lead_id,
    tipo: activity.tipo,
    titulo: activity.titulo,
    descricao: activity.descricao,
    is_pinned: activity.is_pinned || false,
    is_completed: activity.concluida || false,
    data_prazo: activity.data_agendada,
    data_agendada: activity.data_agendada,
    resultado_ligacao: (activity.metadata as any)?.resultado || null,
    status_agendamento: (activity.metadata as any)?.status || null,
    duracao_minutos: (activity.metadata as any)?.duracao ? Math.floor((activity.metadata as any).duracao / 60) : null,
    responsavel_id: null, // MT não tem responsavel_id separado
    created_at: activity.created_at,
    updated_at: activity.updated_at,
    user: activity.criador ? {
      id: activity.criador.id,
      nome: activity.criador.nome,
      email: activity.criador.email || undefined,
    } : null,
  };
}

/**
 * Converte dados de criação do adapter para formato MT
 */
function mapAdapterToMTCreate(input: Partial<LeadActivityInsert> & { lead_id: string; descricao: string }): MTLeadActivityCreate {
  return {
    lead_id: input.lead_id,
    tipo: (input.tipo || 'nota') as any,
    titulo: input.titulo,
    descricao: input.descricao,
    data_agendada: input.data_agendada || input.data_prazo,
    metadata: {
      resultado: input.resultado_ligacao,
      duracao: input.duracao_minutos ? input.duracao_minutos * 60 : undefined,
    },
  };
}

// -----------------------------------------------------------------------------
// Hook Principal do Adapter - 100% MT
// -----------------------------------------------------------------------------

export function useLeadActivitiesAdapter(leadId: string | undefined, filters?: ActivityFilters) {
  const mtHook = useLeadActivitiesMT(leadId);

  return {
    activities: (mtHook.activities || []).map(mapMTToAdapter),
    stats: {
      total: mtHook.stats.total,
      pending: mtHook.stats.pending,
      completed: mtHook.stats.completed,
      byType: mtHook.stats.byType,
    } as LeadActivityStats,
    isLoading: mtHook.isLoading,
    error: mtHook.error,
    refetch: mtHook.refetch,

    // Mutations adaptadas
    createActivity: (input: LeadActivityInsert) => {
      if (!leadId) return;
      mtHook.createActivity.mutate(mapAdapterToMTCreate({
        ...input,
        lead_id: leadId,
        descricao: input.descricao || '',
      }));
    },
    createActivityAsync: async (input: LeadActivityInsert) => {
      if (!leadId) throw new Error('leadId é obrigatório');
      const result = await mtHook.createActivity.mutateAsync(mapAdapterToMTCreate({
        ...input,
        lead_id: leadId,
        descricao: input.descricao || '',
      }));
      return mapMTToAdapter(result);
    },
    isCreating: mtHook.isCreating,

    toggleComplete: mtHook.toggleComplete,
    togglePin: mtHook.togglePin,
    deleteActivity: mtHook.deleteActivity,
    isDeleting: false,

    updateCallResult: (params: { id: string; resultado_ligacao: string; duracao_minutos?: number }) => {
      mtHook.updateCallResult({
        activityId: params.id,
        resultado: params.resultado_ligacao,
      });
    },
    updateAppointmentStatus: (params: { id: string; status_agendamento: string }) => {
      mtHook.updateAppointmentStatus({
        activityId: params.id,
        status: params.status_agendamento,
      });
    },

    // updateActivity não existe no MT de forma direta
    updateActivity: undefined,
    updateActivityAsync: undefined,
    isUpdating: false,

    // Marcador MT
    _mode: 'mt' as const,
  };
}

// -----------------------------------------------------------------------------
// Hook para Follow-Ups/Tarefas Pendentes - 100% MT
// -----------------------------------------------------------------------------

export function usePendingFollowUpsAdapter(franqueadoId?: string) {
  const mtHook = usePendingTasksMT();

  return {
    data: (mtHook.data || []).map(task => ({
      ...mapMTToAdapter(task),
      lead: task.lead,
      is_atrasado: task.data_agendada ? new Date(task.data_agendada) < new Date() : false,
      dias_ate_prazo: task.data_agendada
        ? Math.ceil((new Date(task.data_agendada).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null,
    })),
    isLoading: mtHook.isLoading,
    error: mtHook.error,
    _mode: 'mt' as const,
  };
}

export default useLeadActivitiesAdapter;

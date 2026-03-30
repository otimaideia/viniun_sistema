// =============================================================================
// USE LEADS ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// SISTEMA 100% MULTI-TENANT
// Este adapter usa APENAS os hooks MT (useLeadsMT, etc.)
// As tabelas mt_* são a ÚNICA fonte de dados do sistema.
//
// =============================================================================

// Hooks Multi-Tenant
import { useLeadsMT, useLeadMT, useLeadMetricsMT } from './useLeadsMT';
import { useLeadActivitiesMT } from './useLeadActivitiesMT';
import {
  useFunilLeadsMT,
  useFunilLeadsByEtapaMT,
  useFunilLeadMutationsMT,
  useFunilMetricsMT
} from './useFunilLeadsMT';
import {
  useLeadHistoryMT,
  useLeadTimelineMT,
  useLeadStatusHistoryMT,
  useLeadActivityCountsMT
} from './useLeadHistoryMT';
import {
  useLeadMetricsMT as useLeadMetricsCalculator,
  useLeadMetricsByOrigemMT as calcMetricsByOrigem,
  useLeadMetricsByResponsavelMT as calcMetricsByResponsavel,
  useLeadMetricsComparisonMT as calcMetricsComparison
} from './useLeadMetricsMT';
import { useIndicacoesMT } from './useIndicacoesMT';
import { useLeadCRMMT } from './useLeadCRMMT';

// Types
import type { MTLeadFilters, MTLead, LeadWithExtras } from '@/types/lead-mt';
import type { MTFunnelFilters } from './useFunilLeadsMT';
import type { MTIndicacaoFiltros } from './useIndicacoesMT';
export { spreadDadosExtras } from '@/types/lead-mt';

// Re-export ExtendedLead como alias para LeadWithExtras (MTLead + dados_extras)
export type ExtendedLead = LeadWithExtras;

// -----------------------------------------------------------------------------
// Adapter: useLeads - 100% MT
// -----------------------------------------------------------------------------

/**
 * Adapter para listagem de leads
 *
 * @param filters - Filtros opcionais para a query
 * @returns Hook de leads MT
 *
 * @example
 * const { leads, createLead, updateLead } = useLeadsAdapter();
 * const { leads } = useLeadsAdapter({ status: 'novo', search: 'João' });
 */
export function useLeadsAdapter(filters?: MTLeadFilters) {
  const mtHook = useLeadsMT(filters);

  return {
    ...mtHook,
    _mode: 'mt' as const,
  };
}

// -----------------------------------------------------------------------------
// Adapter: useLead (single) - 100% MT
// -----------------------------------------------------------------------------

/**
 * Adapter para buscar um lead por ID
 */
export function useLeadAdapter(id: string | undefined) {
  const mtHook = useLeadMT(id);

  return {
    ...mtHook,
    _mode: 'mt' as const,
  };
}

// -----------------------------------------------------------------------------
// Adapter: useLeadActivities - 100% MT
// -----------------------------------------------------------------------------

/**
 * Adapter para atividades de lead
 */
export function useLeadActivitiesAdapter(leadId?: string) {
  const mtHook = useLeadActivitiesMT(leadId);

  return {
    activities: mtHook.activities,
    stats: mtHook.stats,
    isLoading: mtHook.isLoading,
    error: mtHook.error,
    refetch: mtHook.refetch,
    createActivity: mtHook.createActivity,
    createActivityAsync: mtHook.createActivity.mutateAsync,
    isCreating: mtHook.isCreating,
    toggleComplete: mtHook.toggleComplete,
    togglePin: mtHook.togglePin,
    deleteActivity: mtHook.deleteActivity,
    updateCallResult: mtHook.updateCallResult,
    updateAppointmentStatus: mtHook.updateAppointmentStatus,
    _mode: 'mt' as const,
  };
}

// -----------------------------------------------------------------------------
// Adapter: useLeadMetrics - 100% MT
// -----------------------------------------------------------------------------

/**
 * Adapter para métricas de leads
 */
export function useLeadMetricsAdapter() {
  const mtHook = useLeadMetricsMT();

  return {
    ...mtHook,
    _mode: 'mt' as const,
  };
}

// -----------------------------------------------------------------------------
// Adapter: useFunilLeads (Kanban) - 100% MT
// -----------------------------------------------------------------------------

/**
 * Adapter para funil de leads (Kanban)
 */
export function useFunilLeadsAdapter(funilId: string | undefined, filters?: MTFunnelFilters) {
  const mtHook = useFunilLeadsMT(funilId, filters);

  return {
    ...mtHook,
    _mode: 'mt' as const,
  };
}

/**
 * Adapter para leads por etapa (Kanban columns)
 */
export function useFunilLeadsByEtapaAdapter(funilId: string | undefined, filters?: MTFunnelFilters) {
  const mtHook = useFunilLeadsByEtapaMT(funilId, filters);

  return {
    ...mtHook,
    _mode: 'mt' as const,
  };
}

/**
 * Adapter para mutations do funil
 */
export function useFunilLeadMutationsAdapter() {
  const mtHook = useFunilLeadMutationsMT();

  return {
    ...mtHook,
    _mode: 'mt' as const,
  };
}

/**
 * Adapter para métricas do funil
 */
export function useFunilMetricsAdapter(funilId: string | undefined) {
  const mtHook = useFunilMetricsMT(funilId);

  return {
    ...mtHook,
    _mode: 'mt' as const,
  };
}

// -----------------------------------------------------------------------------
// Adapter: useLeadHistory (Timeline) - 100% MT
// -----------------------------------------------------------------------------

/**
 * Adapter para histórico de lead
 */
export function useLeadHistoryAdapter(leadId?: string) {
  const mtHook = useLeadHistoryMT(leadId);

  return {
    ...mtHook,
    _mode: 'mt' as const,
  };
}

/**
 * Adapter para timeline completa
 */
export function useLeadTimelineAdapter(leadId?: string) {
  const mtHook = useLeadTimelineMT(leadId);

  return {
    ...mtHook,
    _mode: 'mt' as const,
  };
}

/**
 * Adapter para histórico de status
 */
export function useLeadStatusHistoryAdapter(leadId?: string) {
  const mtHook = useLeadStatusHistoryMT(leadId);

  return {
    ...mtHook,
    _mode: 'mt' as const,
  };
}

/**
 * Adapter para contagem de atividades
 */
export function useLeadActivityCountsAdapter(leadId: string | undefined) {
  const mtHook = useLeadActivityCountsMT(leadId);

  return {
    ...mtHook,
    _mode: 'mt' as const,
  };
}

// -----------------------------------------------------------------------------
// Adapter: useLeadMetrics (Dashboard/KPIs) - 100% MT
// -----------------------------------------------------------------------------

// Exportar calculadores de métricas para uso direto
export {
  useLeadMetricsCalculator,
  calcMetricsByOrigem,
  calcMetricsByResponsavel,
  calcMetricsComparison
};

// -----------------------------------------------------------------------------
// Adapter: useIndicacoes (Referrals) - 100% MT
// -----------------------------------------------------------------------------

/**
 * Adapter para indicações
 */
export function useIndicacoesAdapter(filtros?: MTIndicacaoFiltros) {
  const mtHook = useIndicacoesMT(filtros);

  return {
    indicacoes: mtHook.indicacoes,
    kpis: mtHook.kpis,
    leaderboard: mtHook.leaderboard,
    isLoading: mtHook.isLoading,
    error: mtHook.error,
    refetch: mtHook.refetch,
    isFetching: mtHook.isLoading,
    getIndicacoesByLead: mtHook.getIndicacoesByLead,
    getIndicadorByLead: mtHook.getIndicadorByLead,
    getLeadByCodigo: mtHook.getLeadByCodigo,
    updateStatus: mtHook.updateStatus,
    isUpdating: mtHook.isUpdating,
    _mode: 'mt' as const,
  };
}

// -----------------------------------------------------------------------------
// Adapter: useLeadCRM (Mini CRM) - 100% MT
// -----------------------------------------------------------------------------

/**
 * Adapter para CRM de leads
 */
export function useLeadCRMAdapter(leadId?: string) {
  const mtHook = useLeadCRMMT(leadId);

  return {
    ...mtHook,
    _mode: 'mt' as const,
  };
}

// -----------------------------------------------------------------------------
// Export Padrão
// -----------------------------------------------------------------------------

export default useLeadsAdapter;

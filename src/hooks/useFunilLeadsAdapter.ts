// =============================================================================
// USE FUNIL LEADS ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para gestão de leads no funil usando tabelas MT
// SISTEMA 100% MT - Usa hooks useFunilLeadsMT diretamente
//
// =============================================================================

import {
  useFunilLeadsMT,
  useFunilLeadsByEtapaMT,
  useFunilLeadMutationsMT,
  useFunilMetricsMT,
  useFunnelsMT,
  useFunnelStagesMT,
  type MTFunnelLead,
  type MTFunnel,
  type MTFunnelStage,
  type MTFunnelFilters,
} from './useFunilLeadsMT';
import type { FunilFilters } from '@/types/funil';

// -----------------------------------------------------------------------------
// Tipos do Adapter (compatibilidade com código existente)
// -----------------------------------------------------------------------------

export interface FunilLeadAdapted {
  id: string;
  funil_id: string;
  etapa_id: string;
  lead_id: string;
  prioridade: number;
  valor_estimado?: number | null;
  responsavel_id?: string | null;
  tags?: string[] | null;
  data_entrada: string;
  data_etapa: string;
  created_at: string;
  updated_at?: string;
  lead?: {
    id: string;
    nome: string;
    telefone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    unidade?: string | null;
    cidade?: string | null;
    estado?: string | null;
    status?: string | null;
    created_at: string;
  };
  etapa?: {
    id: string;
    nome: string;
    cor: string;
    icone?: string | null;
    ordem: number;
    tipo: string;
    meta_dias?: number | null;
  };
  responsavel?: {
    id: string;
    full_name?: string;
    nome?: string;
    email: string;
  };
}

export interface FunilAdapted {
  id: string;
  nome: string;
  descricao?: string | null;
  is_default: boolean;
  is_active: boolean;
  stages?: EtapaAdapted[];
}

export interface EtapaAdapted {
  id: string;
  nome: string;
  cor: string;
  icone?: string | null;
  ordem: number;
  tipo: string;
  meta_dias?: number | null;
  is_active: boolean;
}

// -----------------------------------------------------------------------------
// Funções de Mapeamento
// -----------------------------------------------------------------------------

function mapMTFunnelLeadToAdapter(funnelLead: MTFunnelLead): FunilLeadAdapted {
  return {
    id: funnelLead.id,
    funil_id: funnelLead.funnel_id,
    etapa_id: funnelLead.stage_id,
    lead_id: funnelLead.lead_id,
    prioridade: funnelLead.prioridade,
    valor_estimado: funnelLead.valor_estimado,
    responsavel_id: funnelLead.responsavel_id,
    tags: funnelLead.tags,
    data_entrada: funnelLead.data_entrada,
    data_etapa: funnelLead.data_etapa,
    created_at: funnelLead.created_at,
    updated_at: funnelLead.updated_at,
    lead: funnelLead.lead ? {
      id: funnelLead.lead.id,
      nome: funnelLead.lead.nome,
      telefone: funnelLead.lead.telefone,
      whatsapp: funnelLead.lead.whatsapp,
      email: funnelLead.lead.email,
      unidade: (funnelLead.lead as any).franchise?.nome || null,
      cidade: funnelLead.lead.cidade,
      estado: funnelLead.lead.estado,
      status: funnelLead.lead.status,
      created_at: funnelLead.lead.created_at,
    } : undefined,
    etapa: funnelLead.stage ? {
      id: funnelLead.stage.id,
      nome: funnelLead.stage.nome,
      cor: funnelLead.stage.cor,
      icone: funnelLead.stage.icone,
      ordem: funnelLead.stage.ordem,
      tipo: funnelLead.stage.tipo,
      meta_dias: funnelLead.stage.meta_dias,
    } : undefined,
    responsavel: funnelLead.responsavel ? {
      id: funnelLead.responsavel.id,
      nome: funnelLead.responsavel.nome,
      full_name: funnelLead.responsavel.nome,
      email: funnelLead.responsavel.email,
    } : undefined,
  };
}

function mapFiltersToMT(filters?: FunilFilters): MTFunnelFilters | undefined {
  if (!filters) return undefined;

  return {
    stageIds: filters.etapaIds,
    responsavelId: filters.responsavelId,
    valorMin: filters.valorMin,
    valorMax: filters.valorMax,
    dataEntradaInicio: filters.dataEntradaInicio,
    dataEntradaFim: filters.dataEntradaFim,
    tags: filters.tags,
    search: filters.busca,
    apenasEsfriando: filters.apenasEsfriando,
  };
}

// -----------------------------------------------------------------------------
// Hook Principal: Leads no Funil - 100% MT
// -----------------------------------------------------------------------------

export function useFunilLeadsAdapter(funilId: string | undefined, filters?: FunilFilters) {
  const mtHook = useFunilLeadsMT(funilId, mapFiltersToMT(filters));

  return {
    leads: (mtHook.leads || []).map(mapMTFunnelLeadToAdapter),
    isLoading: mtHook.isLoading,
    error: mtHook.error,
    refetch: mtHook.refetch,
    _mode: 'mt' as const,
  };
}

// -----------------------------------------------------------------------------
// Hook: Leads Agrupados por Etapa (Kanban) - 100% MT
// -----------------------------------------------------------------------------

export function useFunilLeadsByEtapaAdapter(funilId: string | undefined, filters?: FunilFilters) {
  const mtHook = useFunilLeadsByEtapaMT(funilId, mapFiltersToMT(filters));

  const leadsByEtapa: Record<string, FunilLeadAdapted[]> = {};
  for (const [etapaId, leads] of Object.entries(mtHook.leadsByEtapa || {})) {
    leadsByEtapa[etapaId] = leads.map(mapMTFunnelLeadToAdapter);
  }

  return {
    leadsByEtapa,
    leads: (mtHook.leads || []).map(mapMTFunnelLeadToAdapter),
    isLoading: mtHook.isLoading,
    error: mtHook.error,
    refetch: mtHook.refetch,
    _mode: 'mt' as const,
  };
}

// -----------------------------------------------------------------------------
// Hook: Mutations do Funil - 100% MT
// -----------------------------------------------------------------------------

export function useFunilLeadMutationsAdapter() {
  const mtMutations = useFunilLeadMutationsMT();

  return {
    addLeadToFunil: mtMutations.addLeadToFunnel,
    removeLeadFromFunil: mtMutations.removeLeadFromFunnel,
    moveLeadToEtapa: {
      mutate: (params: { funilLeadId: string; sourceEtapaId: string; destinationEtapaId: string; newPrioridade?: number; motivo?: string }) => {
        mtMutations.moveLeadToStage.mutate({
          funnelLeadId: params.funilLeadId,
          sourceStageId: params.sourceEtapaId,
          destinationStageId: params.destinationEtapaId,
          newPrioridade: params.newPrioridade,
          motivo: params.motivo,
        });
      },
      mutateAsync: async (params: { funilLeadId: string; sourceEtapaId: string; destinationEtapaId: string; newPrioridade?: number; motivo?: string }) => {
        return mtMutations.moveLeadToStage.mutateAsync({
          funnelLeadId: params.funilLeadId,
          sourceStageId: params.sourceEtapaId,
          destinationStageId: params.destinationEtapaId,
          newPrioridade: params.newPrioridade,
          motivo: params.motivo,
        });
      },
      isPending: mtMutations.isMoving,
    },
    updateValorEstimado: {
      mutate: (params: { funilLeadId: string; valor: number | null }) => {
        mtMutations.updateValorEstimado.mutate({
          funnelLeadId: params.funilLeadId,
          valor: params.valor,
        });
      },
      isPending: false,
    },
    assignResponsavel: {
      mutate: (params: { funilLeadId: string; responsavelId: string | null }) => {
        mtMutations.assignResponsavel.mutate({
          funnelLeadId: params.funilLeadId,
          responsavelId: params.responsavelId,
        });
      },
      isPending: false,
    },
    updateTags: {
      mutate: (params: { funilLeadId: string; tags: string[] }) => {
        mtMutations.updateTags.mutate({
          funnelLeadId: params.funilLeadId,
          tags: params.tags,
        });
      },
      isPending: false,
    },
    addLeadsInBatch: {
      mutate: (params: { funilId: string; etapaId: string; leadIds: string[]; responsavelId?: string }) => {
        mtMutations.addLeadsInBatch.mutate({
          funnelId: params.funilId,
          stageId: params.etapaId,
          leadIds: params.leadIds,
          responsavelId: params.responsavelId,
        });
      },
      isPending: false,
    },
    isAdding: mtMutations.isAdding,
    isRemoving: mtMutations.isRemoving,
    isMoving: mtMutations.isMoving,
    _mode: 'mt' as const,
  };
}

// -----------------------------------------------------------------------------
// Hook: Métricas do Funil - 100% MT
// -----------------------------------------------------------------------------

export function useFunilMetricsAdapter(funilId: string | undefined) {
  const mtMetrics = useFunilMetricsMT(funilId);

  return {
    metrics: mtMetrics.metrics,
    isLoading: mtMetrics.isLoading,
    error: mtMetrics.error,
    _mode: 'mt' as const,
  };
}

// -----------------------------------------------------------------------------
// Hook: Listar Funis - 100% MT
// -----------------------------------------------------------------------------

export function useFunnelsAdapter() {
  const mtHook = useFunnelsMT();

  return {
    funnels: (mtHook.data || []).map((funnel: MTFunnel): FunilAdapted => ({
      id: funnel.id,
      nome: funnel.nome,
      descricao: funnel.descricao,
      is_default: funnel.is_default,
      is_active: funnel.is_active,
      stages: funnel.stages?.map((stage: MTFunnelStage): EtapaAdapted => ({
        id: stage.id,
        nome: stage.nome,
        cor: stage.cor,
        icone: stage.icone,
        ordem: stage.ordem,
        tipo: stage.tipo,
        meta_dias: stage.meta_dias,
        is_active: stage.is_active,
      })),
    })),
    isLoading: mtHook.isLoading,
    error: mtHook.error,
    _mode: 'mt' as const,
  };
}

// -----------------------------------------------------------------------------
// Hook: Etapas de um Funil - 100% MT
// -----------------------------------------------------------------------------

export function useFunnelStagesAdapter(funnelId: string | undefined) {
  const mtHook = useFunnelStagesMT(funnelId);

  return {
    stages: (mtHook.data || []).map((stage: MTFunnelStage): EtapaAdapted => ({
      id: stage.id,
      nome: stage.nome,
      cor: stage.cor,
      icone: stage.icone,
      ordem: stage.ordem,
      tipo: stage.tipo,
      meta_dias: stage.meta_dias,
      is_active: stage.is_active,
    })),
    isLoading: mtHook.isLoading,
    error: mtHook.error,
    _mode: 'mt' as const,
  };
}

export default useFunilLeadsAdapter;

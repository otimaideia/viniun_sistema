// =============================================================================
// USE CAMPANHAS ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para campanhas
// SISTEMA 100% MT - Usa mt_campaigns diretamente via useCampanhasMT
//
// =============================================================================

import { useTenantContext } from '@/contexts/TenantContext';
import { useCampanhasMT, useCampanhaMT } from './multitenant/useCampanhasMT';
import type { MTCampaign, MTCampaignCreate, MTCampaignFilters, MTCampaignStatus, MTCampaignStats } from './multitenant/useCampanhasMT';
import type { CampanhaFormData, CampanhaTipo, CampanhaStatus } from '@/types/campanha';

// =============================================================================
// Types
// =============================================================================

export interface CampanhaAdaptada {
  id: string;
  tenant_id?: string;
  franchise_id?: string | null;

  // Dados da campanha
  nome: string;
  descricao: string | null;
  tipo: CampanhaTipo;

  // Período
  data_inicio: string | null;
  data_fim: string | null;

  // Orçamento (legacy: orcamento_mensal, MT: budget_planejado)
  orcamento_mensal: number | null;
  budget_gasto?: number;

  // Métricas
  impressoes?: number;
  cliques?: number;
  leads_count?: number;
  conversoes?: number;
  valor_conversoes?: number;

  // Métricas calculadas
  ctr?: number;
  cpl?: number;
  cpa?: number;
  roas?: number;

  // Canais (MT only)
  canais?: string[] | null;

  // Status
  status: CampanhaStatus;

  // Relacionamentos
  franqueado_id: string | null;
  franqueado_nome?: string;

  // Timestamps
  created_at: string;
  updated_at?: string;
}

export interface CampanhaStatsAdaptada {
  total: number;
  ativas: number;
  pausadas?: number;
  leads_total: number;
  conversoes_total?: number;
  orcamento_total: number;
  gasto_total?: number;
  roi_medio?: number;
}

// =============================================================================
// Mapeamento de Tipos
// =============================================================================

// Mapeamento de canais para tipo legacy
const CHANNEL_TO_TIPO: Record<string, CampanhaTipo> = {
  'google_ads': 'google_ads',
  'meta_ads': 'meta_ads',
  'facebook_ads': 'meta_ads',
  'instagram_ads': 'meta_ads',
  'tiktok_ads': 'tiktok_ads',
  'linkedin_ads': 'linkedin_ads',
  'organico': 'organico',
  'indicacao': 'indicacao',
};

// Mapeamento de tipo legacy para canal MT
const TIPO_TO_CHANNEL: Record<CampanhaTipo, string> = {
  'google_ads': 'google_ads',
  'meta_ads': 'meta_ads',
  'tiktok_ads': 'tiktok_ads',
  'linkedin_ads': 'linkedin_ads',
  'organico': 'organico',
  'indicacao': 'indicacao',
};

// Mapeamento de status
const STATUS_MT_TO_LEGACY: Record<MTCampaignStatus, CampanhaStatus> = {
  'rascunho': 'pausada',
  'ativa': 'ativa',
  'pausada': 'pausada',
  'encerrada': 'finalizada',
  'arquivada': 'finalizada',
};

const STATUS_LEGACY_TO_MT: Record<CampanhaStatus, MTCampaignStatus> = {
  'ativa': 'ativa',
  'pausada': 'pausada',
  'finalizada': 'encerrada',
};

// =============================================================================
// Mapper Functions
// =============================================================================

function mapMTToAdaptado(campaign: MTCampaign): CampanhaAdaptada {
  // Determinar tipo baseado nos canais
  let tipo: CampanhaTipo = 'organico';
  if (campaign.canais && campaign.canais.length > 0) {
    const firstChannel = campaign.canais[0].toLowerCase();
    tipo = CHANNEL_TO_TIPO[firstChannel] || 'organico';
  }

  return {
    id: campaign.id,
    tenant_id: campaign.tenant_id,
    franchise_id: campaign.franchise_id,

    // Dados da campanha
    nome: campaign.nome,
    descricao: campaign.descricao,
    tipo,

    // Período
    data_inicio: campaign.data_inicio,
    data_fim: campaign.data_fim,

    // Orçamento
    orcamento_mensal: campaign.budget_planejado,
    budget_gasto: campaign.budget_gasto,

    // Métricas
    impressoes: campaign.impressoes,
    cliques: campaign.cliques,
    leads_count: campaign.leads,
    conversoes: campaign.conversoes,
    valor_conversoes: campaign.valor_conversoes,

    // Métricas calculadas
    ctr: campaign.ctr,
    cpl: campaign.cpl,
    cpa: campaign.cpa,
    roas: campaign.roas,

    // Canais
    canais: campaign.canais,

    // Status
    status: STATUS_MT_TO_LEGACY[campaign.status],

    // Relacionamentos
    franqueado_id: campaign.franchise_id,
    franqueado_nome: campaign.franchise?.nome_fantasia,

    // Timestamps
    created_at: campaign.created_at,
    updated_at: campaign.updated_at,
  };
}

function mapStatsToAdaptado(stats: MTCampaignStats | undefined): CampanhaStatsAdaptada {
  if (!stats) {
    return {
      total: 0,
      ativas: 0,
      pausadas: 0,
      leads_total: 0,
      conversoes_total: 0,
      orcamento_total: 0,
      gasto_total: 0,
      roi_medio: 0,
    };
  }

  return {
    total: stats.total,
    ativas: stats.ativas,
    pausadas: stats.pausadas,
    leads_total: stats.leads_total,
    conversoes_total: stats.conversoes_total,
    orcamento_total: stats.orcamento_total,
    gasto_total: stats.gasto_total,
    roi_medio: stats.roi_medio,
  };
}

function mapFiltersToMT(franqueadoId?: string): MTCampaignFilters | undefined {
  if (!franqueadoId) return undefined;

  return {
    franchise_id: franqueadoId,
  };
}

// =============================================================================
// Hook Principal
// =============================================================================

interface UseCampanhasAdapterOptions {
  franqueadoId?: string;
}

export function useCampanhasAdapter(options: UseCampanhasAdapterOptions = {}) {
  const { franqueadoId } = options;
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  // Hook MT - sempre usa tabelas mt_*
  const mtFilters = mapFiltersToMT(franqueadoId);
  const mt = useCampanhasMT(mtFilters);

  return {
    campanhas: mt.campanhas.map(mapMTToAdaptado),
    stats: mapStatsToAdaptado(mt.stats),
    isLoading: mt.isLoading || isTenantLoading,
    error: mt.error,
    refetch: mt.refetch,

    // Mutations (adaptadas para interface legacy)
    createCampanha: async (data: CampanhaFormData) => {
      const mtData: MTCampaignCreate = {
        nome: data.nome,
        descricao: data.descricao || undefined,
        tipo: 'lead_gen', // Default para lead generation
        data_inicio: data.data_inicio || undefined,
        data_fim: data.data_fim || undefined,
        budget_planejado: data.orcamento_mensal || undefined,
        canais: data.tipo ? [TIPO_TO_CHANNEL[data.tipo]] : undefined,
        franchise_id: data.franqueado_id || undefined,
        status: data.status ? STATUS_LEGACY_TO_MT[data.status] : 'rascunho',
      };
      const result = await mt.createCampanha.mutateAsync(mtData);
      return mapMTToAdaptado(result);
    },

    updateCampanha: async ({ id, ...data }: Partial<CampanhaFormData> & { id: string }) => {
      const result = await mt.updateCampanha.mutateAsync({
        id,
        nome: data.nome,
        descricao: data.descricao || undefined,
        data_inicio: data.data_inicio || undefined,
        data_fim: data.data_fim || undefined,
        budget_planejado: data.orcamento_mensal || undefined,
        canais: data.tipo ? [TIPO_TO_CHANNEL[data.tipo]] : undefined,
        franchise_id: data.franqueado_id || undefined,
        status: data.status ? STATUS_LEGACY_TO_MT[data.status] : undefined,
      });
      return mapMTToAdaptado(result);
    },

    deleteCampanha: async (id: string) => {
      await mt.deleteCampanha.mutateAsync(id);
    },

    updateStatus: async ({ id, status }: { id: string; status: CampanhaStatus }) => {
      await mt.updateStatus.mutateAsync({
        id,
        status: STATUS_LEGACY_TO_MT[status],
      });
    },

    // Helpers
    getCampanha: async (id: string) => {
      const result = await mt.getCampanha(id);
      return result ? mapMTToAdaptado(result) : null;
    },

    // Métricas (MT only)
    updateMetrics: mt.updateMetrics,

    isCreating: mt.isCreating,
    isUpdating: mt.isUpdating,
    isDeleting: mt.isDeleting,
    isUpdatingStatus: mt.isUpdatingStatus,
    isUpdatingMetrics: mt.isUpdatingMetrics,

    // Context info
    tenant,
    franchise,
    accessLevel,

    _mode: 'mt' as const,
  };
}

// =============================================================================
// Hook para Campanha Individual
// =============================================================================

export function useCampanhaAdapter(id: string | undefined) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  // Hook MT
  const mt = useCampanhaMT(id);

  return {
    campanha: mt.data ? mapMTToAdaptado(mt.data) : null,
    isLoading: mt.isLoading || isTenantLoading,
    error: mt.error,
    refetch: mt.refetch,

    // Context info
    tenant,
    franchise,
    accessLevel,

    _mode: 'mt' as const,
  };
}

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getCampanhaMode(): 'mt' {
  return 'mt';
}

// =============================================================================
// Re-export constantes úteis
// =============================================================================

export { CAMPANHA_TIPOS, CAMPANHA_STATUS } from '@/types/campanha';

export default useCampanhasAdapter;

// =============================================================================
// USE CAMPANHAS MT - Hook Multi-Tenant para Gerenciamento de Campanhas
// =============================================================================
//
// Este hook fornece CRUD completo para mt_campaigns
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type MTCampaignStatus = 'rascunho' | 'ativa' | 'pausada' | 'encerrada' | 'arquivada';
export type MTCampaignType = 'awareness' | 'lead_gen' | 'conversao' | 'retencao';

export interface MTCampaign {
  id: string;
  tenant_id: string;
  franchise_id: string | null;

  // Identificação
  nome: string;
  descricao: string | null;
  tipo: MTCampaignType | null;

  // Período
  data_inicio: string | null;
  data_fim: string | null;

  // Orçamento
  budget_planejado: number | null;
  budget_gasto: number;
  moeda: string;

  // Canais
  canais: string[] | null;

  // Métricas
  impressoes: number;
  cliques: number;
  leads: number;
  conversoes: number;
  valor_conversoes: number;

  // Calculados
  ctr: number;
  cpl: number;
  cpa: number;
  roas: number;

  // Status
  status: MTCampaignStatus;

  // Timestamps
  created_at: string;
  updated_at: string;
  created_by: string | null;

  // Relations
  tenant?: {
    id: string;
    slug: string;
    nome_fantasia: string;
  };
  franchise?: {
    id: string;
    nome_fantasia: string;
  };
}

export interface MTCampaignCreate {
  nome: string;
  tenant_id?: string;
  franchise_id?: string | null;
  descricao?: string;
  tipo?: MTCampaignType;
  data_inicio?: string;
  data_fim?: string;
  budget_planejado?: number;
  moeda?: string;
  canais?: string[];
  status?: MTCampaignStatus;
}

export interface MTCampaignUpdate extends Partial<MTCampaignCreate> {
  id: string;
  budget_gasto?: number;
  impressoes?: number;
  cliques?: number;
  leads?: number;
  conversoes?: number;
  valor_conversoes?: number;
}

export interface MTCampaignFilters {
  search?: string;
  status?: MTCampaignStatus;
  tipo?: MTCampaignType;
  franchise_id?: string;
  data_inicio?: string;
  data_fim?: string;
}

export interface MTCampaignStats {
  total: number;
  ativas: number;
  pausadas: number;
  leads_total: number;
  conversoes_total: number;
  orcamento_total: number;
  gasto_total: number;
  roi_medio: number;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-campaigns';
const STATS_QUERY_KEY = 'mt-campaigns-stats';

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function getErrorMessage(error: any): string {
  if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }

  const pgCode = error?.code;
  if (pgCode) {
    switch (pgCode) {
      case '23505':
        return 'Esta campanha já existe.';
      case '23503':
        return 'Esta campanha está vinculada a outros dados.';
      case '23502':
        return 'Preencha todos os campos obrigatórios.';
      case '42501':
        return 'Você não tem permissão para realizar esta ação.';
      default:
        break;
    }
  }

  return error?.message || 'Erro desconhecido. Tente novamente.';
}

function calculateMetrics(campaign: MTCampaign): MTCampaign {
  const ctr = campaign.impressoes > 0
    ? (campaign.cliques / campaign.impressoes) * 100
    : 0;

  const cpl = campaign.leads > 0 && campaign.budget_gasto > 0
    ? campaign.budget_gasto / campaign.leads
    : 0;

  const cpa = campaign.conversoes > 0 && campaign.budget_gasto > 0
    ? campaign.budget_gasto / campaign.conversoes
    : 0;

  const roas = campaign.budget_gasto > 0
    ? campaign.valor_conversoes / campaign.budget_gasto
    : 0;

  return {
    ...campaign,
    ctr: Math.round(ctr * 100) / 100,
    cpl: Math.round(cpl * 100) / 100,
    cpa: Math.round(cpa * 100) / 100,
    roas: Math.round(roas * 100) / 100,
  };
}

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useCampanhasMT(filters?: MTCampaignFilters) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query Principal - Listar Campanhas
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, filters?.status, filters?.tipo, filters?.search, filters?.franchise_id],
    queryFn: async (): Promise<MTCampaign[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_campaigns')
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia),
          franchise:mt_franchises (id, nome_fantasia)
        `)
        .order('created_at', { ascending: false });

      // Filtro por tenant
      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      // Filtros opcionais
      if (filters?.status) {
        q = q.eq('status', filters.status);
      }

      if (filters?.tipo) {
        q = q.eq('tipo', filters.tipo);
      }

      if (filters?.franchise_id) {
        q = q.eq('franchise_id', filters.franchise_id);
      }

      if (filters?.data_inicio) {
        q = q.gte('data_inicio', filters.data_inicio);
      }

      if (filters?.data_fim) {
        q = q.lte('data_fim', filters.data_fim);
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        q = q.or(`nome.ilike.${searchTerm},descricao.ilike.${searchTerm}`);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar campanhas MT:', error);
        throw error;
      }

      // Calcular métricas para cada campanha
      return (data || []).map(calculateMetrics) as MTCampaign[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Query: Estatísticas de Campanhas
  // ---------------------------------------------------------------------------

  const statsQuery = useQuery({
    queryKey: [STATS_QUERY_KEY, tenant?.id],
    queryFn: async (): Promise<MTCampaignStats> => {
      if (!tenant && accessLevel !== 'platform') {
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

      let q = supabase
        .from('mt_campaigns')
        .select('id, status, leads, conversoes, budget_planejado, budget_gasto, valor_conversoes');

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar stats:', error);
        throw error;
      }

      const campaigns = data || [];
      const total = campaigns.length;
      const ativas = campaigns.filter((c) => c.status === 'ativa').length;
      const pausadas = campaigns.filter((c) => c.status === 'pausada').length;
      const leads_total = campaigns.reduce((sum, c) => sum + (c.leads || 0), 0);
      const conversoes_total = campaigns.reduce((sum, c) => sum + (c.conversoes || 0), 0);
      const orcamento_total = campaigns.reduce((sum, c) => sum + (c.budget_planejado || 0), 0);
      const gasto_total = campaigns.reduce((sum, c) => sum + (c.budget_gasto || 0), 0);
      const valor_conversoes_total = campaigns.reduce((sum, c) => sum + (c.valor_conversoes || 0), 0);

      const roi_medio = gasto_total > 0
        ? ((valor_conversoes_total - gasto_total) / gasto_total) * 100
        : 0;

      return {
        total,
        ativas,
        pausadas,
        leads_total,
        conversoes_total,
        orcamento_total,
        gasto_total,
        roi_medio: Math.round(roi_medio * 100) / 100,
      };
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar Campanha
  // ---------------------------------------------------------------------------

  const createCampaign = useMutation({
    mutationFn: async (newCampaign: MTCampaignCreate): Promise<MTCampaign> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const campaignData = {
        ...newCampaign,
        tenant_id: newCampaign.tenant_id || tenant!.id,
        status: newCampaign.status ?? 'rascunho',
        moeda: newCampaign.moeda ?? 'BRL',
        budget_gasto: 0,
        impressoes: 0,
        cliques: 0,
        leads: 0,
        conversoes: 0,
        valor_conversoes: 0,
        ctr: 0,
        cpl: 0,
        cpa: 0,
        roas: 0,
      };

      const { data, error } = await supabase
        .from('mt_campaigns')
        .insert(campaignData)
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia),
          franchise:mt_franchises (id, nome_fantasia)
        `)
        .single();

      if (error) {
        console.error('Erro ao criar campanha MT:', error);
        throw error;
      }

      return data as MTCampaign;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [STATS_QUERY_KEY] });
      toast.success(`Campanha "${data.nome}" criada com sucesso!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Campanha
  // ---------------------------------------------------------------------------

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: MTCampaignUpdate): Promise<MTCampaign> => {
      if (!id) {
        throw new Error('ID da campanha é obrigatório.');
      }

      const { data, error } = await supabase
        .from('mt_campaigns')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia),
          franchise:mt_franchises (id, nome_fantasia)
        `)
        .single();

      if (error) {
        console.error('Erro ao atualizar campanha MT:', error);
        throw error;
      }

      return calculateMetrics(data as MTCampaign);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [STATS_QUERY_KEY] });
      toast.success(`Campanha "${data.nome}" atualizada!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Status
  // ---------------------------------------------------------------------------

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MTCampaignStatus }): Promise<void> => {
      const { error } = await supabase
        .from('mt_campaigns')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Erro ao atualizar status:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [STATS_QUERY_KEY] });
      toast.success('Status atualizado!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Deletar Campanha
  // ---------------------------------------------------------------------------

  const deleteCampaign = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!id) {
        throw new Error('ID da campanha é obrigatório.');
      }

      const { error } = await supabase
        .from('mt_campaigns')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar campanha MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [STATS_QUERY_KEY] });
      toast.success('Campanha removida com sucesso!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Métricas
  // ---------------------------------------------------------------------------

  const updateMetrics = useMutation({
    mutationFn: async ({
      id,
      impressoes,
      cliques,
      leads,
      conversoes,
      valor_conversoes,
      budget_gasto,
    }: {
      id: string;
      impressoes?: number;
      cliques?: number;
      leads?: number;
      conversoes?: number;
      valor_conversoes?: number;
      budget_gasto?: number;
    }): Promise<MTCampaign> => {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (impressoes !== undefined) updateData.impressoes = impressoes;
      if (cliques !== undefined) updateData.cliques = cliques;
      if (leads !== undefined) updateData.leads = leads;
      if (conversoes !== undefined) updateData.conversoes = conversoes;
      if (valor_conversoes !== undefined) updateData.valor_conversoes = valor_conversoes;
      if (budget_gasto !== undefined) updateData.budget_gasto = budget_gasto;

      const { data, error } = await supabase
        .from('mt_campaigns')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia),
          franchise:mt_franchises (id, nome_fantasia)
        `)
        .single();

      if (error) {
        console.error('Erro ao atualizar métricas:', error);
        throw error;
      }

      return calculateMetrics(data as MTCampaign);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [STATS_QUERY_KEY] });
      toast.success('Métricas atualizadas!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const getCampanha = async (id: string): Promise<MTCampaign | null> => {
    const { data, error } = await supabase
      .from('mt_campaigns')
      .select(`
        *,
        tenant:mt_tenants (id, slug, nome_fantasia),
        franchise:mt_franchises (id, nome_fantasia)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar campanha:', error);
      return null;
    }

    return data ? calculateMetrics(data as MTCampaign) : null;
  };

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    campanhas: query.data ?? [],
    stats: statsQuery.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    isFetching: query.isFetching,
    refetch: () => {
      query.refetch();
      statsQuery.refetch();
    },

    // Mutations
    createCampanha: {
      mutate: createCampaign.mutate,
      mutateAsync: createCampaign.mutateAsync,
      isPending: createCampaign.isPending,
    },
    updateCampanha: {
      mutate: updateCampaign.mutate,
      mutateAsync: updateCampaign.mutateAsync,
      isPending: updateCampaign.isPending,
    },
    updateStatus: {
      mutate: updateStatus.mutate,
      mutateAsync: updateStatus.mutateAsync,
      isPending: updateStatus.isPending,
    },
    deleteCampanha: {
      mutate: deleteCampaign.mutate,
      mutateAsync: deleteCampaign.mutateAsync,
      isPending: deleteCampaign.isPending,
    },
    updateMetrics: {
      mutate: updateMetrics.mutate,
      mutateAsync: updateMetrics.mutateAsync,
      isPending: updateMetrics.isPending,
    },

    // Helpers
    getCampanha,

    isCreating: createCampaign.isPending,
    isUpdating: updateCampaign.isPending,
    isUpdatingStatus: updateStatus.isPending,
    isDeleting: deleteCampaign.isPending,
    isUpdatingMetrics: updateMetrics.isPending,
  };
}

// -----------------------------------------------------------------------------
// Hook: Buscar Campanha por ID
// -----------------------------------------------------------------------------

export function useCampanhaMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async (): Promise<MTCampaign | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('mt_campaigns')
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia),
          franchise:mt_franchises (id, nome_fantasia)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return calculateMetrics(data as MTCampaign);
    },
    enabled: !!id && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

export default useCampanhasMT;

// =============================================================================
// USE MARKETING CAMPANHAS ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para campanhas de marketing usando tabela MT
// SISTEMA 100% MT - Usa mt_campaigns com isolamento por tenant
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';
import type { MarketingCampanha, MarketingCampanhaFormData, CampanhaStatus } from '@/types/marketing';

// =============================================================================
// Types
// =============================================================================

interface MTCampanha {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  nome: string;
  descricao: string | null;
  tipo: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  budget_planejado: number | null;
  budget_gasto: number | null;
  moeda: string;
  canais: string[] | null;
  impressoes: number;
  cliques: number;
  leads: number;
  conversoes: number;
  valor_conversoes: number | null;
  ctr: number;
  cpl: number;
  cpa: number;
  roas: number;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Relacionamentos
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

export interface MarketingCampanhaAdaptada extends MarketingCampanha {
  tenant_id?: string;
  franchise_id?: string | null;
}

// =============================================================================
// Helper: Mapear MT para Legacy
// =============================================================================

function mapMTToLegacy(mtCampanha: MTCampanha): MarketingCampanhaAdaptada {
  // Mapear status MT para legacy
  const statusMap: Record<string, CampanhaStatus> = {
    rascunho: 'pausada',
    ativa: 'ativa',
    pausada: 'pausada',
    encerrada: 'finalizada',
    arquivada: 'finalizada',
  };

  return {
    id: mtCampanha.id,
    nome: mtCampanha.nome,
    descricao: mtCampanha.descricao || undefined,
    tipo: mtCampanha.franchise_id ? 'unidade_especifica' : 'geral',
    status: statusMap[mtCampanha.status] || 'ativa',
    unidade_id: mtCampanha.franchise_id,
    data_inicio: mtCampanha.data_inicio || undefined,
    data_fim: mtCampanha.data_fim || undefined,
    budget_estimado: mtCampanha.budget_planejado || undefined,
    budget_real: mtCampanha.budget_gasto || undefined,
    leads_gerados: mtCampanha.leads || 0,
    conversoes: mtCampanha.conversoes || 0,
    receita_gerada: mtCampanha.valor_conversoes || undefined,
    canais: mtCampanha.canais || [],
    metricas: {
      impressoes: mtCampanha.impressoes,
      cliques: mtCampanha.cliques,
      ctr: mtCampanha.ctr,
      cpl: mtCampanha.cpl,
      cpa: mtCampanha.cpa,
      roas: mtCampanha.roas,
    },
    ativa: mtCampanha.status === 'ativa',
    created_at: mtCampanha.created_at,
    updated_at: mtCampanha.updated_at,
    tenant_id: mtCampanha.tenant_id,
    franchise_id: mtCampanha.franchise_id,
    // Relacionamento MT
    franquia: mtCampanha.franchise
      ? {
          id: mtCampanha.franchise.id,
          nome_fantasia: mtCampanha.franchise.nome_fantasia,
        }
      : undefined,
  };
}

// =============================================================================
// Query Keys
// =============================================================================

const QUERY_KEY = 'mt-marketing-campanhas';

// =============================================================================
// Hook Principal
// =============================================================================

export function useMarketingCampanhasAdapter() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();
  const autoUpdateRef = useRef<Set<string>>(new Set());

  // ==========================================================================
  // Query: Listar Campanhas
  // ==========================================================================
  const {
    data: campanhasRaw = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, accessLevel],
    queryFn: async () => {
      let query = supabase
        .from('mt_campaigns')
        .select(`
          *,
          tenant:mt_tenants(id, slug, nome_fantasia),
          franchise:mt_franchises(id, nome_fantasia)
        `)
        .order('created_at', { ascending: false });

      // Filtrar por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        query = query.eq('franchise_id', franchise.id);
      } else if (accessLevel !== 'platform') {
        // Usuário comum - filtrar por tenant
        if (tenant) {
          query = query.eq('tenant_id', tenant.id);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('[MT] Erro ao buscar campanhas:', error);
        throw error;
      }

      return (data || []) as MTCampanha[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Mapear para formato legacy
  const campanhas: MarketingCampanhaAdaptada[] = campanhasRaw.map(mapMTToLegacy);

  // ==========================================================================
  // Auto-Update: Finalizar campanhas expiradas
  // ==========================================================================
  useEffect(() => {
    if (campanhas.length === 0) return;

    const hoje = new Date().toISOString().split('T')[0];

    campanhas.forEach((campanha) => {
      if (
        campanha.status === 'ativa' &&
        campanha.data_fim &&
        campanha.data_fim < hoje &&
        !autoUpdateRef.current.has(campanha.id)
      ) {
        autoUpdateRef.current.add(campanha.id);

        supabase
          .from('mt_campaigns')
          .update({ status: 'encerrada', updated_at: new Date().toISOString() })
          .eq('id', campanha.id)
          .then(({ error }) => {
            if (error) {
              console.error(`[MT] Erro ao finalizar campanha ${campanha.nome}:`, error);
              autoUpdateRef.current.delete(campanha.id);
            } else {
              queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            }
          });
      }
    });
  }, [campanhas, queryClient]);

  // ==========================================================================
  // Mutation: Criar Campanha
  // ==========================================================================
  const createMutation = useMutation({
    mutationFn: async (data: MarketingCampanhaFormData) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      // Mapear status legacy para MT
      const statusMap: Record<string, string> = {
        ativa: 'ativa',
        pausada: 'pausada',
        finalizada: 'encerrada',
      };

      const mtData = {
        tenant_id: tenant?.id,
        franchise_id: data.unidade_id || franchise?.id || null,
        nome: data.nome,
        descricao: data.descricao || null,
        tipo: 'lead_gen',
        data_inicio: data.data_inicio || null,
        data_fim: data.data_fim || null,
        budget_planejado: data.budget_estimado || null,
        budget_gasto: data.budget_real || null,
        canais: data.canais || [],
        status: statusMap[data.status || 'ativa'] || 'ativa',
      };

      const { data: created, error } = await supabase
        .from('mt_campaigns')
        .insert(mtData)
        .select(`
          *,
          tenant:mt_tenants(id, slug, nome_fantasia),
          franchise:mt_franchises(id, nome_fantasia)
        `)
        .single();

      if (error) {
        console.error('[MT] Erro ao criar campanha:', error);
        throw error;
      }

      return mapMTToLegacy(created as MTCampanha);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Campanha criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar campanha: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Atualizar Campanha
  // ==========================================================================
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MarketingCampanhaFormData> }) => {
      const mtData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      // Mapear campos
      if (data.nome !== undefined) mtData.nome = data.nome;
      if (data.descricao !== undefined) mtData.descricao = data.descricao;
      if (data.data_inicio !== undefined) mtData.data_inicio = data.data_inicio;
      if (data.data_fim !== undefined) mtData.data_fim = data.data_fim;
      if (data.budget_estimado !== undefined) mtData.budget_planejado = data.budget_estimado;
      if (data.budget_real !== undefined) mtData.budget_gasto = data.budget_real;
      if (data.canais !== undefined) mtData.canais = data.canais;
      if (data.unidade_id !== undefined) mtData.franchise_id = data.unidade_id;

      // Mapear status
      if (data.status !== undefined) {
        const statusMap: Record<string, string> = {
          ativa: 'ativa',
          pausada: 'pausada',
          finalizada: 'encerrada',
        };
        mtData.status = statusMap[data.status] || data.status;
      }

      const { data: updated, error } = await supabase
        .from('mt_campaigns')
        .update(mtData)
        .eq('id', id)
        .select(`
          *,
          tenant:mt_tenants(id, slug, nome_fantasia),
          franchise:mt_franchises(id, nome_fantasia)
        `)
        .single();

      if (error) {
        console.error('[MT] Erro ao atualizar campanha:', error);
        throw error;
      }

      return mapMTToLegacy(updated as MTCampanha);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Campanha atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar campanha: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Deletar Campanha (soft delete via status)
  // ==========================================================================
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Em MT usamos soft delete via status
      const { error } = await supabase
        .from('mt_campaigns')
        .update({
          status: 'arquivada',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('[MT] Erro ao arquivar campanha:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Campanha arquivada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao arquivar campanha: ${error.message}`);
    },
  });

  // ==========================================================================
  // Stats Computados
  // ==========================================================================
  const stats = {
    total: campanhas.length,
    ativas: campanhas.filter((c) => c.status === 'ativa').length,
    pausadas: campanhas.filter((c) => c.status === 'pausada').length,
    finalizadas: campanhas.filter((c) => c.status === 'finalizada').length,
    totalBudget: campanhas.reduce((sum, c) => sum + (c.budget_estimado || 0), 0),
    totalLeads: campanhas.reduce((sum, c) => sum + (c.leads_gerados || 0), 0),
    totalConversoes: campanhas.reduce((sum, c) => sum + (c.conversoes || 0), 0),
    taxaConversao:
      campanhas.reduce((sum, c) => sum + (c.leads_gerados || 0), 0) > 0
        ? (campanhas.reduce((sum, c) => sum + (c.conversoes || 0), 0) /
            campanhas.reduce((sum, c) => sum + (c.leads_gerados || 0), 0)) *
          100
        : 0,
  };

  return {
    campanhas,
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,
    stats,
    createCampanha: createMutation.mutateAsync,
    updateCampanha: (id: string, data: Partial<MarketingCampanhaFormData>) =>
      updateMutation.mutateAsync({ id, data }),
    deleteCampanha: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    _mode: 'mt' as const,
  };
}

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getMarketingCampanhasMode(): 'mt' {
  return 'mt';
}

export default useMarketingCampanhasAdapter;

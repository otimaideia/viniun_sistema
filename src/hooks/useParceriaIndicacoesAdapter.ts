// =============================================================================
// USE PARCERIA INDICACOES ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter 100% MT para indicações de parcerias
// SISTEMA 100% MT - Usa mt_partnership_referrals diretamente
//
// =============================================================================

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  ParceriaIndicacao,
  ParceriaIndicacaoInsert,
  ParceriaIndicacaoUpdate,
  ParceriaIndicacaoFilters,
  ParceriaIndicacaoMetrics,
  IndicacaoStatus,
} from '@/types/parceria';

// =============================================================================
// Query Keys
// =============================================================================

export const parceriaIndicacoesKeys = {
  all: ['mt-parceria-indicacoes'] as const,
  lists: () => [...parceriaIndicacoesKeys.all, 'list'] as const,
  list: (filters: ParceriaIndicacaoFilters) => [...parceriaIndicacoesKeys.lists(), filters] as const,
  byParceria: (parceriaId: string) => [...parceriaIndicacoesKeys.all, 'parceria', parceriaId] as const,
  metrics: (parceriaId: string) => [...parceriaIndicacoesKeys.all, 'metrics', parceriaId] as const,
};

// =============================================================================
// Types
// =============================================================================

interface UseParceriaIndicacoesOptions {
  filters?: ParceriaIndicacaoFilters;
}

// =============================================================================
// Hook Principal
// =============================================================================

export function useParceriaIndicacoesAdapter(options: UseParceriaIndicacoesOptions = {}) {
  const { filters = {} } = options;
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ==========================================================================
  // Query: Listar Indicações
  // ==========================================================================
  const {
    data: indicacoes = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: parceriaIndicacoesKeys.list(filters),
    queryFn: async (): Promise<ParceriaIndicacao[]> => {
      let query = supabase
        .from('mt_partnership_referrals')
        .select(`
          *,
          lead:mt_leads!lead_id(
            id, nome, email, whatsapp, status, created_at
          ),
          parceria:mt_partnerships!partnership_id(
            id, nome_fantasia, codigo_indicacao, logo_url
          )
        `)
        .is('deleted_at', null)
        .order('data_indicacao', { ascending: false });

      // Filtrar por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        query = query.eq('franchise_id', franchise.id);
      }

      // Aplicar filtros
      if (filters.parceria_id) {
        query = query.eq('partnership_id', filters.parceria_id);
      }

      if (filters.lead_id) {
        query = query.eq('lead_id', filters.lead_id);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.periodo_inicio) {
        query = query.gte('data_indicacao', filters.periodo_inicio);
      }

      if (filters.periodo_fim) {
        query = query.lte('data_indicacao', filters.periodo_fim);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[MT] Erro ao buscar indicações:', error);
        throw error;
      }

      // Mapear campos MT para campos legados
      let result = (data || []).map((i) => ({
        id: i.id,
        parceria_id: i.partnership_id,
        lead_id: i.lead_id,
        codigo_usado: i.codigo_usado || i.code_used,
        data_indicacao: i.data_indicacao || i.referral_date,
        data_conversao: i.data_conversao || i.conversion_date,
        status: i.status as IndicacaoStatus,
        valor_venda: i.valor_venda || i.sale_value,
        comissao: i.comissao || i.commission,
        observacoes: i.observacoes || i.notes,
        created_at: i.created_at,
        updated_at: i.updated_at,
        lead: i.lead,
        parceria: i.parceria,
      })) as ParceriaIndicacao[];

      // Filtro de busca textual (client-side)
      if (filters.search) {
        const search = filters.search.toLowerCase();
        result = result.filter(
          (i) =>
            i.lead?.nome?.toLowerCase().includes(search) ||
            i.lead?.email?.toLowerCase().includes(search) ||
            i.parceria?.nome_fantasia?.toLowerCase().includes(search) ||
            i.codigo_usado?.toLowerCase().includes(search)
        );
      }

      return result;
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ==========================================================================
  // Query: Métricas por Parceria
  // ==========================================================================
  const getMetrics = useCallback(
    async (parceriaId: string): Promise<ParceriaIndicacaoMetrics> => {
      let query = supabase
        .from('mt_partnership_referrals')
        .select('status')
        .eq('partnership_id', parceriaId)
        .is('deleted_at', null);

      // Aplicar filtro de tenant
      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        query = query.eq('franchise_id', franchise.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[MT] Erro ao buscar métricas:', error);
        throw error;
      }

      const total = data?.length || 0;
      const convertidas = data?.filter((i) => i.status === 'convertido').length || 0;
      const pendentes = data?.filter((i) => i.status === 'pendente').length || 0;
      const perdidas = data?.filter((i) => i.status === 'perdido').length || 0;
      const canceladas = data?.filter((i) => i.status === 'cancelado').length || 0;

      return {
        total,
        convertidas,
        pendentes,
        perdidas,
        canceladas,
        taxa_conversao: total > 0 ? Math.round((convertidas / total) * 100 * 10) / 10 : 0,
      };
    },
    [tenant, franchise, accessLevel]
  );

  // ==========================================================================
  // Mutation: Criar Indicação
  // ==========================================================================
  const createMutation = useMutation({
    mutationFn: async (data: ParceriaIndicacaoInsert) => {
      const { data: indicacao, error } = await supabase
        .from('mt_partnership_referrals')
        .insert({
          tenant_id: tenant?.id,
          franchise_id: franchise?.id,
          partnership_id: data.parceria_id,
          lead_id: data.lead_id,
          codigo_usado: data.codigo_usado,
          code_used: data.codigo_usado,
          data_indicacao: data.data_indicacao || new Date().toISOString(),
          referral_date: data.data_indicacao || new Date().toISOString(),
          status: data.status || 'pendente',
          valor_venda: data.valor_venda,
          sale_value: data.valor_venda,
          comissao: data.comissao,
          commission: data.comissao,
          observacoes: data.observacoes,
          notes: data.observacoes,
        })
        .select()
        .single();

      if (error) {
        console.error('[MT] Erro ao criar indicação:', error);
        throw error;
      }

      return indicacao as ParceriaIndicacao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parceriaIndicacoesKeys.all });
      toast.success('Indicação registrada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao registrar indicação: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Atualizar Status
  // ==========================================================================
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: IndicacaoStatus }) => {
      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };

      // Se convertido, registrar data de conversão
      if (status === 'convertido') {
        updateData.data_conversao = new Date().toISOString();
        updateData.conversion_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('mt_partnership_referrals')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('[MT] Erro ao atualizar status:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parceriaIndicacoesKeys.all });
      toast.success('Status atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Atualizar Indicação
  // ==========================================================================
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ParceriaIndicacaoUpdate }) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (data.status !== undefined) updateData.status = data.status;
      if (data.valor_venda !== undefined) {
        updateData.valor_venda = data.valor_venda;
        updateData.sale_value = data.valor_venda;
      }
      if (data.comissao !== undefined) {
        updateData.comissao = data.comissao;
        updateData.commission = data.comissao;
      }
      if (data.observacoes !== undefined) {
        updateData.observacoes = data.observacoes;
        updateData.notes = data.observacoes;
      }

      const { error } = await supabase
        .from('mt_partnership_referrals')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('[MT] Erro ao atualizar indicação:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parceriaIndicacoesKeys.all });
      toast.success('Indicação atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar indicação: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Deletar Indicação (soft delete)
  // ==========================================================================
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_partnership_referrals')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('[MT] Erro ao deletar indicação:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parceriaIndicacoesKeys.all });
      toast.success('Indicação removida com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover indicação: ${error.message}`);
    },
  });

  // ==========================================================================
  // Atalhos para Mudança de Status
  // ==========================================================================
  const marcarComoConvertido = useCallback(
    (id: string) => updateStatusMutation.mutateAsync({ id, status: 'convertido' }),
    [updateStatusMutation]
  );

  const marcarComoPerdido = useCallback(
    (id: string) => updateStatusMutation.mutateAsync({ id, status: 'perdido' }),
    [updateStatusMutation]
  );

  const marcarComoCancelado = useCallback(
    (id: string) => updateStatusMutation.mutateAsync({ id, status: 'cancelado' }),
    [updateStatusMutation]
  );

  return {
    // Dados
    indicacoes,

    // Estados
    isLoading: isLoading || isTenantLoading,
    error,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending || updateStatusMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Ações
    refetch,
    createIndicacao: createMutation.mutateAsync,
    updateIndicacao: updateMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,
    deleteIndicacao: deleteMutation.mutateAsync,

    // Atalhos
    marcarComoConvertido,
    marcarComoPerdido,
    marcarComoCancelado,

    // Métricas
    getMetrics,

    // Context info
    tenant,
    franchise,
    accessLevel,

    _mode: 'mt' as const,
  };
}

// =============================================================================
// Hook: Indicações de uma Parceria Específica
// =============================================================================

export function useIndicacoesByParceriaAdapter(parceriaId: string | undefined) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const {
    data: indicacoes = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: parceriaIndicacoesKeys.byParceria(parceriaId || ''),
    queryFn: async (): Promise<ParceriaIndicacao[]> => {
      if (!parceriaId) return [];

      let query = supabase
        .from('mt_partnership_referrals')
        .select(`
          *,
          lead:mt_leads!lead_id(
            id, nome, email, whatsapp, status, created_at
          )
        `)
        .eq('partnership_id', parceriaId)
        .is('deleted_at', null)
        .order('data_indicacao', { ascending: false });

      // Aplicar filtro de tenant
      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        query = query.eq('franchise_id', franchise.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[MT] Erro ao buscar indicações por parceria:', error);
        throw error;
      }

      return (data || []).map((i) => ({
        id: i.id,
        parceria_id: i.partnership_id,
        lead_id: i.lead_id,
        codigo_usado: i.codigo_usado || i.code_used,
        data_indicacao: i.data_indicacao || i.referral_date,
        data_conversao: i.data_conversao || i.conversion_date,
        status: i.status as IndicacaoStatus,
        valor_venda: i.valor_venda || i.sale_value,
        comissao: i.comissao || i.commission,
        observacoes: i.observacoes || i.notes,
        created_at: i.created_at,
        updated_at: i.updated_at,
        lead: i.lead,
      })) as ParceriaIndicacao[];
    },
    enabled: !!parceriaId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Calcular métricas
  const metrics: ParceriaIndicacaoMetrics = {
    total: indicacoes.length,
    convertidas: indicacoes.filter((i) => i.status === 'convertido').length,
    pendentes: indicacoes.filter((i) => i.status === 'pendente').length,
    perdidas: indicacoes.filter((i) => i.status === 'perdido').length,
    canceladas: indicacoes.filter((i) => i.status === 'cancelado').length,
    taxa_conversao:
      indicacoes.length > 0
        ? Math.round(
            (indicacoes.filter((i) => i.status === 'convertido').length / indicacoes.length) * 100 * 10
          ) / 10
        : 0,
  };

  return {
    indicacoes,
    metrics,
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,

    // Context info
    tenant,
    franchise,
    accessLevel,

    _mode: 'mt' as const,
  };
}

// =============================================================================
// Re-export Types
// =============================================================================

export type {
  ParceriaIndicacao,
  ParceriaIndicacaoInsert,
  ParceriaIndicacaoUpdate,
  ParceriaIndicacaoFilters,
  ParceriaIndicacaoMetrics,
  IndicacaoStatus,
} from '@/types/parceria';

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getParceriaIndicacoesMode(): 'mt' {
  return 'mt';
}

export default useParceriaIndicacoesAdapter;

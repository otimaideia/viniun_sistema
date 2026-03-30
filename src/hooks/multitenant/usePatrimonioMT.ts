// =============================================================================
// USE PATRIMONIO MT - Hook Multi-Tenant para Gestão de Ativos/Patrimônio
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import {
  MTAsset,
  MTAssetCreate,
  MTAssetUpdate,
  MTAssetFilters,
  MTAssetStatusHistory,
  AssetStatus,
  AssetMetrics,
} from '@/types/patrimonio';
import { calculateCurrentBookValue } from '@/lib/depreciation';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-assets';

// -----------------------------------------------------------------------------
// Helper
// -----------------------------------------------------------------------------

function getErrorMessage(error: any): string {
  if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }
  const pgCode = error?.code;
  if (pgCode) {
    switch (pgCode) {
      case '23505': return 'Este ativo já existe (código duplicado).';
      case '23503': return 'Este ativo está vinculado a outros dados.';
      case '23502': return 'Preencha todos os campos obrigatórios.';
      case '42501': return 'Você não tem permissão para realizar esta ação.';
    }
  }
  return error?.message || 'Erro desconhecido. Tente novamente.';
}

const SELECT_QUERY = `
  *,
  category:mt_asset_categories (id, codigo, nome, cor, icone, depreciation_method, default_useful_life_years, default_salvage_rate),
  franchise:mt_franchises!mt_assets_franchise_id_fkey (id, nome_fantasia),
  tenant:mt_tenants (id, slug, nome_fantasia),
  responsavel_user:mt_users!mt_assets_responsavel_id_fkey (id, nome, email, cargo, departamento, avatar_url)
`;

// -----------------------------------------------------------------------------
// Hook Principal: usePatrimonioMT
// -----------------------------------------------------------------------------

export function usePatrimonioMT(filters?: MTAssetFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Query: Listar ativos
  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, accessLevel, filters?.status, filters?.category_id, filters?.search],
    queryFn: async (): Promise<MTAsset[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_assets')
        .select(SELECT_QUERY)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Filtro por nível de acesso
      if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      } else if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      // Filtros opcionais
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.category_id) q = q.eq('category_id', filters.category_id);
      if (filters?.franchise_id) q = q.eq('franchise_id', filters.franchise_id);
      if (filters?.search) {
        const term = `%${filters.search}%`;
        q = q.or(`nome.ilike.${term},codigo.ilike.${term},marca.ilike.${term},numero_serie.ilike.${term}`);
      }

      const { data, error } = await q;
      if (error) { console.error('Erro ao buscar ativos MT:', error); throw error; }
      return (data || []) as MTAsset[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // Mutation: Criar ativo
  const createAsset = useMutation({
    mutationFn: async (newAsset: MTAssetCreate): Promise<MTAsset> => {
      if (!tenant && accessLevel !== 'platform') throw new Error('Tenant não definido.');

      const bookValue = (newAsset.valor_aquisicao || 0) - (newAsset.valor_residual || 0);
      const assetData = {
        ...newAsset,
        tenant_id: newAsset.tenant_id || tenant!.id,
        franchise_id: newAsset.franchise_id || franchise?.id || null,
        valor_residual: newAsset.valor_residual ?? 0,
        metodo_depreciacao: newAsset.metodo_depreciacao || 'straight_line',
        vida_util_anos: newAsset.vida_util_anos || 5,
        status: newAsset.status || 'acquired',
        moeda: newAsset.moeda || 'BRL',
        depreciacao_acumulada: 0,
        valor_contabil: newAsset.valor_aquisicao || 0,
      };

      const { data, error } = await supabase
        .from('mt_assets')
        .insert(assetData)
        .select(SELECT_QUERY)
        .single();

      if (error) { console.error('Erro ao criar ativo:', error); throw error; }

      // Register initial status in history
      await supabase.from('mt_asset_status_history').insert({
        tenant_id: assetData.tenant_id,
        asset_id: data.id,
        status_anterior: null,
        status_novo: assetData.status,
        motivo: 'Cadastro inicial',
      });

      return data as MTAsset;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Ativo "${data.nome}" cadastrado!`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  // Mutation: Atualizar ativo
  const updateAsset = useMutation({
    mutationFn: async ({ id, ...updates }: MTAssetUpdate): Promise<MTAsset> => {
      if (!id) throw new Error('ID do ativo é obrigatório.');

      const { data, error } = await supabase
        .from('mt_assets')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(SELECT_QUERY)
        .single();

      if (error) { console.error('Erro ao atualizar ativo:', error); throw error; }
      return data as MTAsset;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Ativo "${data.nome}" atualizado!`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  // Mutation: Soft delete
  const deleteAsset = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('mt_assets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Ativo removido!');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  // Mutation: Alterar status
  const updateStatus = useMutation({
    mutationFn: async ({ id, novoStatus, motivo }: { id: string; novoStatus: AssetStatus; motivo?: string }): Promise<void> => {
      // Get current status
      const { data: current } = await supabase
        .from('mt_assets')
        .select('status, tenant_id')
        .eq('id', id)
        .single();

      if (!current) throw new Error('Ativo não encontrado.');

      // Update status
      const updateData: any = { status: novoStatus, updated_at: new Date().toISOString() };
      if (novoStatus === 'disposed') {
        updateData.data_baixa = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase.from('mt_assets').update(updateData).eq('id', id);
      if (error) throw error;

      // Record history
      await supabase.from('mt_asset_status_history').insert({
        tenant_id: current.tenant_id,
        asset_id: id,
        status_anterior: current.status,
        status_novo: novoStatus,
        motivo: motivo || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Status atualizado!');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  // Mutation: Transferir entre franquias
  const transferAsset = useMutation({
    mutationFn: async ({ id, novaFranchiseId, motivo }: { id: string; novaFranchiseId: string; motivo?: string }): Promise<void> => {
      const { data: current } = await supabase
        .from('mt_assets')
        .select('franchise_id, tenant_id, status')
        .eq('id', id)
        .single();

      if (!current) throw new Error('Ativo não encontrado.');

      const { error } = await supabase.from('mt_assets').update({
        franchise_id: novaFranchiseId,
        franchise_origem_id: current.franchise_id,
        data_transferencia: new Date().toISOString().split('T')[0],
        status: 'transferred',
        updated_at: new Date().toISOString(),
      }).eq('id', id);

      if (error) throw error;

      await supabase.from('mt_asset_status_history').insert({
        tenant_id: current.tenant_id,
        asset_id: id,
        status_anterior: current.status,
        status_novo: 'transferred',
        motivo: motivo || 'Transferência entre franquias',
        franchise_anterior_id: current.franchise_id,
        franchise_nova_id: novaFranchiseId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Ativo transferido!');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return {
    ativos: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: () => query.refetch(),

    createAsset: { mutate: createAsset.mutate, mutateAsync: createAsset.mutateAsync, isPending: createAsset.isPending },
    updateAsset: { mutate: updateAsset.mutate, mutateAsync: updateAsset.mutateAsync, isPending: updateAsset.isPending },
    deleteAsset: { mutate: deleteAsset.mutate, mutateAsync: deleteAsset.mutateAsync, isPending: deleteAsset.isPending },
    updateStatus: { mutate: updateStatus.mutate, mutateAsync: updateStatus.mutateAsync, isPending: updateStatus.isPending },
    transferAsset: { mutate: transferAsset.mutate, mutateAsync: transferAsset.mutateAsync, isPending: transferAsset.isPending },

    isCreating: createAsset.isPending,
    isUpdating: updateAsset.isPending,
    isDeleting: deleteAsset.isPending,
  };
}

// -----------------------------------------------------------------------------
// Hook: Buscar Ativo por ID
// -----------------------------------------------------------------------------

export function useAssetMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async (): Promise<MTAsset | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('mt_assets')
        .select(SELECT_QUERY)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data as MTAsset;
    },
    enabled: !!id && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

// -----------------------------------------------------------------------------
// Hook: Status History
// -----------------------------------------------------------------------------

export function useAssetStatusHistory(assetId: string | undefined) {
  const { isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'history', assetId],
    queryFn: async (): Promise<MTAssetStatusHistory[]> => {
      if (!assetId) return [];

      const { data, error } = await supabase
        .from('mt_asset_status_history')
        .select('*')
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as MTAssetStatusHistory[];
    },
    enabled: !!assetId && !isTenantLoading,
  });
}

// -----------------------------------------------------------------------------
// Hook: Métricas
// -----------------------------------------------------------------------------

export function useAssetMetricsMT() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'metrics', tenant?.id, franchise?.id],
    queryFn: async (): Promise<AssetMetrics> => {
      let q = supabase
        .from('mt_assets')
        .select('*, category:mt_asset_categories(nome, cor)')
        .is('deleted_at', null);

      if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      } else if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data: assets, error } = await q;
      if (error) throw error;

      const items = (assets || []) as any[];

      // Count by status
      const por_status: Record<string, number> = {};
      items.forEach(a => {
        por_status[a.status] = (por_status[a.status] || 0) + 1;
      });

      // Count by category
      const catMap: Record<string, { quantidade: number; valor: number; cor: string }> = {};
      items.forEach(a => {
        const catName = a.category?.nome || 'Sem Categoria';
        const catCor = a.category?.cor || '#999';
        if (!catMap[catName]) catMap[catName] = { quantidade: 0, valor: 0, cor: catCor };
        catMap[catName].quantidade += 1;
        catMap[catName].valor += Number(a.valor_aquisicao) || 0;
      });

      const por_categoria = Object.entries(catMap).map(([categoria, v]) => ({
        categoria,
        cor: v.cor,
        quantidade: v.quantidade,
        valor: v.valor,
      }));

      // Maintenance count
      let mq = supabase
        .from('mt_asset_maintenance')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'scheduled')
        .is('deleted_at', null);

      if (accessLevel !== 'platform' && tenant) {
        mq = mq.eq('tenant_id', tenant.id);
      }

      const { count: maintenanceCount } = await mq;

      const totalAquisicao = items.reduce((s, a) => s + (Number(a.valor_aquisicao) || 0), 0);
      const totalDepreciacao = items.reduce((s, a) => s + (Number(a.depreciacao_acumulada) || 0), 0);
      const totalContabil = totalAquisicao - totalDepreciacao;
      const fullyDep = items.filter(a =>
        Number(a.depreciacao_acumulada) >= (Number(a.valor_aquisicao) - Number(a.valor_residual)) &&
        a.status === 'in_operation'
      ).length;

      return {
        total_ativos: items.length,
        valor_total_aquisicao: totalAquisicao,
        valor_total_contabil: totalContabil,
        depreciacao_total: totalDepreciacao,
        por_status,
        por_categoria,
        proximas_manutencoes: maintenanceCount || 0,
        ativos_totalmente_depreciados: fullyDep,
      };
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });
}

export default usePatrimonioMT;

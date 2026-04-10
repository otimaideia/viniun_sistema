// =============================================================================
// USE REDE TABELAS MT - Hook Multi-Tenant para Tabelas Colaborativas da Rede
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  MTNetworkTable,
  MTNetworkTableCreate,
  MTNetworkTableItem,
  NetworkTableFilters,
} from '@/types/rede-imoveis-mt';

const TABLES_KEY = 'mt-network-tables';
const TABLE_KEY = 'mt-network-table';
const ITEMS_KEY = 'mt-network-table-items';

// -----------------------------------------------------------------------------
// Hook: Listar Tabelas da Rede
// -----------------------------------------------------------------------------

export function useRedeTabelasMT(filters?: NetworkTableFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Listar tabelas (próprias + públicas/parceiros da rede)
  const query = useQuery({
    queryKey: [TABLES_KEY, tenant?.id, franchise?.id, filters],
    queryFn: async (): Promise<MTNetworkTable[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = (supabase
        .from('mt_network_tables' as any)
        .select('*, tenant:mt_tenants!mt_network_tables_tenant_id_fkey(slug, nome_fantasia)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })) as any;

      // Filtros
      if (filters?.tipo) q = q.eq('tipo', filters.tipo);
      if (filters?.visibilidade) q = q.eq('visibilidade', filters.visibilidade);
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.search) q = q.ilike('nome', `%${filters.search}%`);
      if (filters?.tenantId) q = q.eq('tenant_id', filters.tenantId);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as MTNetworkTable[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 2,
  });

  // Apenas minhas tabelas
  const minhasTabelas = useQuery({
    queryKey: [TABLES_KEY, 'minhas', tenant?.id],
    queryFn: async (): Promise<MTNetworkTable[]> => {
      if (!tenant) throw new Error('Tenant não carregado.');

      const { data, error } = await (supabase
        .from('mt_network_tables' as any)
        .select('*')
        .eq('tenant_id', tenant.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })) as any;

      if (error) throw error;
      return (data || []) as MTNetworkTable[];
    },
    enabled: !isTenantLoading && !!tenant,
  });

  // Criar tabela
  const create = useMutation({
    mutationFn: async (newItem: MTNetworkTableCreate): Promise<MTNetworkTable> => {
      if (!tenant && accessLevel !== 'platform') throw new Error('Tenant não definido.');

      const { data, error } = await (supabase
        .from('mt_network_tables' as any)
        .insert({
          ...newItem,
          tenant_id: tenant!.id,
          franchise_id: franchise?.id,
        })
        .select()
        .single()) as any;

      if (error) throw error;
      return data as MTNetworkTable;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [TABLES_KEY] });
      toast.success(`Tabela "${data.nome}" criada com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao criar tabela.');
    },
  });

  // Atualizar tabela
  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<MTNetworkTable>): Promise<MTNetworkTable> => {
      const { data, error } = await (supabase
        .from('mt_network_tables' as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()) as any;

      if (error) throw error;
      return data as MTNetworkTable;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [TABLES_KEY] });
      queryClient.invalidateQueries({ queryKey: [TABLE_KEY, data.id] });
      toast.success(`Tabela "${data.nome}" atualizada!`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar tabela.');
    },
  });

  // Soft delete
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('mt_network_tables' as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)) as any;

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TABLES_KEY] });
      toast.success('Tabela removida.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao remover tabela.');
    },
  });

  return {
    data: query.data,
    minhasTabelas: minhasTabelas.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    create,
    update,
    remove,
  };
}

// -----------------------------------------------------------------------------
// Hook: Tabela Individual + Itens
// -----------------------------------------------------------------------------

export function useRedeTabelaMT(tableId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: [TABLE_KEY, tableId],
    queryFn: async (): Promise<MTNetworkTable | null> => {
      if (!tableId) return null;

      const { data, error } = await (supabase
        .from('mt_network_tables' as any)
        .select('*, tenant:mt_tenants!mt_network_tables_tenant_id_fkey(slug, nome_fantasia)')
        .eq('id', tableId)
        .single()) as any;

      if (error) throw error;
      return data as MTNetworkTable;
    },
    enabled: !!tableId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  return {
    data: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// -----------------------------------------------------------------------------
// Hook: Itens de uma Tabela da Rede
// -----------------------------------------------------------------------------

export function useRedeTabelaItensMT(tableId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [ITEMS_KEY, tableId],
    queryFn: async (): Promise<MTNetworkTableItem[]> => {
      if (!tableId) return [];

      const { data, error } = await (supabase
        .from('mt_network_table_items' as any)
        .select(`
          *,
          property:mt_properties!mt_network_table_items_property_id_fkey(
            id, titulo, ref_code, foto_destaque_url, valor_venda, valor_locacao,
            dormitorios, area_construida, situacao,
            tenant:mt_tenants!mt_properties_tenant_id_fkey(slug, nome_fantasia)
          )
        `)
        .eq('table_id', tableId)
        .eq('is_active', true)
        .order('ordem', { ascending: true })) as any;

      if (error) throw error;
      return (data || []) as MTNetworkTableItem[];
    },
    enabled: !!tableId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Adicionar imóvel à tabela
  const addItem = useMutation({
    mutationFn: async (params: {
      property_id: string;
      valor_rede?: number;
      valor_comissao?: number;
      comissao_percentual?: number;
      observacoes?: string;
      destaque?: boolean;
    }) => {
      if (!tenant || !tableId) throw new Error('Dados incompletos.');

      const { data, error } = await (supabase
        .from('mt_network_table_items' as any)
        .insert({
          tenant_id: tenant.id,
          table_id: tableId,
          ...params,
        })
        .select()
        .single()) as any;

      if (error) throw error;
      return data as MTNetworkTableItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ITEMS_KEY, tableId] });
      toast.success('Imóvel adicionado à tabela.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao adicionar imóvel.');
    },
  });

  // Remover imóvel da tabela
  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await (supabase
        .from('mt_network_table_items' as any)
        .delete()
        .eq('id', itemId)) as any;

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ITEMS_KEY, tableId] });
      toast.success('Imóvel removido da tabela.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao remover imóvel.');
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    addItem,
    removeItem,
  };
}

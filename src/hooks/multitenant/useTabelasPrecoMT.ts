// =============================================================================
// USE TABELAS PRECO MT - Hook Multi-Tenant para Tabelas de Preço de Imóveis
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  MTPropertyPriceTable,
  MTPriceItem,
} from '@/types/tabela-preco-mt';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-price-tables';
const ITEMS_QUERY_KEY = 'mt-price-table-items';

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useTabelasPrecoMT() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query: Listar Tabelas de Preço
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id],
    queryFn: async (): Promise<MTPropertyPriceTable[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_property_price_tables')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      } else if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar tabelas de preço MT:', error);
        throw error;
      }

      return (data || []) as MTPropertyPriceTable[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar Tabela
  // ---------------------------------------------------------------------------

  const create = useMutation({
    mutationFn: async (newItem: Partial<MTPropertyPriceTable>): Promise<MTPropertyPriceTable> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const { data, error } = await supabase
        .from('mt_property_price_tables')
        .insert({
          ...newItem,
          tenant_id: tenant!.id,
          franchise_id: franchise?.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar tabela de preço MT:', error);
        throw error;
      }

      return data as MTPropertyPriceTable;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Tabela "${data.nome}" criada com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao criar tabela de preço.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Tabela
  // ---------------------------------------------------------------------------

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<MTPropertyPriceTable>): Promise<MTPropertyPriceTable> => {
      if (!id) throw new Error('ID da tabela é obrigatório.');

      const { data, error } = await supabase
        .from('mt_property_price_tables')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar tabela de preço MT:', error);
        throw error;
      }

      return data as MTPropertyPriceTable;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Tabela "${data.nome}" atualizada com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar tabela de preço.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Soft Delete Tabela
  // ---------------------------------------------------------------------------

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_property_price_tables')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Erro ao remover tabela de preço MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Tabela de preço removida com sucesso.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao remover tabela de preço.');
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    create,
    update,
    remove,
  };
}

// -----------------------------------------------------------------------------
// Hook: Itens de uma Tabela de Preço
// -----------------------------------------------------------------------------

export function useTabelaPrecoItemsMT(tableId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [ITEMS_QUERY_KEY, tableId, tenant?.id],
    queryFn: async (): Promise<MTPriceItem[]> => {
      if (!tableId) return [];

      let q = supabase
        .from('mt_property_price_items')
        .select('*')
        .eq('table_id', tableId)
        .order('created_at', { ascending: false });

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar itens da tabela de preço MT:', error);
        throw error;
      }

      return (data || []) as MTPriceItem[];
    },
    enabled: !!tableId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Adicionar imóvel à tabela
  const addItem = useMutation({
    mutationFn: async (params: { table_id: string; property_id: string; valor_tabela?: number; valor_desconto?: number; condicoes?: Record<string, unknown> }) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const { data, error } = await supabase
        .from('mt_property_price_items')
        .insert({
          tenant_id: tenant!.id,
          table_id: params.table_id,
          property_id: params.property_id,
          valor_tabela: params.valor_tabela || null,
          valor_desconto: params.valor_desconto || null,
          condicoes: params.condicoes || {},
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao adicionar imóvel à tabela MT:', error);
        throw error;
      }

      return data as MTPriceItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ITEMS_QUERY_KEY] });
      toast.success('Imóvel adicionado à tabela de preço.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao adicionar imóvel à tabela.');
    },
  });

  // Remover imóvel da tabela
  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_property_price_items')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao remover item da tabela MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ITEMS_QUERY_KEY] });
      toast.success('Imóvel removido da tabela de preço.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao remover imóvel da tabela.');
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

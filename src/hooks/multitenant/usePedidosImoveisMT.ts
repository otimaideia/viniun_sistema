// =============================================================================
// USE PEDIDOS IMOVEIS MT - Hook Multi-Tenant para Pedidos/Orders
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { MTPropertyOrder } from '@/types/consulta-imovel-mt';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-property-orders';

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function usePedidosImoveisMT(statusFilter?: string) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query: Listar Pedidos
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, statusFilter],
    queryFn: async (): Promise<MTPropertyOrder[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_property_orders')
        .select('*, mt_property_clients(nome, email)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      } else if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      if (statusFilter) {
        q = q.eq('status', statusFilter);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar pedidos MT:', error);
        throw error;
      }

      return (data || []) as MTPropertyOrder[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar Pedido
  // ---------------------------------------------------------------------------

  const create = useMutation({
    mutationFn: async (newItem: Partial<MTPropertyOrder>): Promise<MTPropertyOrder> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const { data, error } = await supabase
        .from('mt_property_orders')
        .insert({
          ...newItem,
          tenant_id: tenant!.id,
          franchise_id: franchise?.id,
          status: newItem.status || 'pendente',
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar pedido MT:', error);
        throw error;
      }

      return data as MTPropertyOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Pedido criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao criar pedido.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Status
  // ---------------------------------------------------------------------------

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from('mt_property_orders')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar status do pedido MT:', error);
        throw error;
      }

      return data as MTPropertyOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Status do pedido atualizado.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar status.');
    },
  });

  return {
    data: query.data,
    pedidos: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    create,
    updateStatus,
  };
}

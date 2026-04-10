// =============================================================================
// USE CLIENTE TICKETS MT - Hook Multi-Tenant para Tickets de Clientes
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { MTClientTicket } from '@/types/cliente-imovel-mt';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-client-tickets';

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useClienteTicketsMT(clientId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query - Listar tickets do cliente
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, clientId, tenant?.id],
    queryFn: async (): Promise<MTClientTicket[]> => {
      if (!clientId) return [];

      let q = supabase
        .from('mt_property_client_tickets')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar tickets MT:', error);
        throw error;
      }

      return (data || []) as MTClientTicket[];
    },
    enabled: !!clientId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar Ticket
  // ---------------------------------------------------------------------------

  const create = useMutation({
    mutationFn: async (newTicket: Partial<MTClientTicket>): Promise<MTClientTicket> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const { data, error } = await supabase
        .from('mt_property_client_tickets')
        .insert({
          ...newTicket,
          tenant_id: tenant!.id,
          client_id: clientId || newTicket.client_id,
          status: newTicket.status || 'aberto',
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar ticket MT:', error);
        throw error;
      }

      return data as MTClientTicket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Ticket criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao criar ticket.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Status
  // ---------------------------------------------------------------------------

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MTClientTicket['status'] }) => {
      const { data, error } = await supabase
        .from('mt_property_client_tickets')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar status do ticket MT:', error);
        throw error;
      }

      return data as MTClientTicket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Status do ticket atualizado.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar status.');
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    create,
    updateStatus,
  };
}

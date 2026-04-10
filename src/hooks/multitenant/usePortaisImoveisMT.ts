// =============================================================================
// USE PORTAIS IMOVEIS MT - Hook Multi-Tenant para Portais e Fila de Exportação
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  MTPropertyPortal,
  MTPortalQueue,
} from '@/types/portal-imovel-mt';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const PORTALS_KEY = 'mt-property-portals';
const QUEUE_KEY = 'mt-property-portal-queue';

// -----------------------------------------------------------------------------
// Hook: Portais
// -----------------------------------------------------------------------------

export function usePortaisImoveisMT() {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query: Listar Portais
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [PORTALS_KEY, tenant?.id],
    queryFn: async (): Promise<MTPropertyPortal[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_property_portals')
        .select('*')
        .order('nome', { ascending: true });

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar portais MT:', error);
        throw error;
      }

      return (data || []) as MTPropertyPortal[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 10,
  });

  return {
    data: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// -----------------------------------------------------------------------------
// Hook: Fila de Portal
// -----------------------------------------------------------------------------

export function usePortalQueueMT(portalId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query: Fila do Portal
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUEUE_KEY, portalId, tenant?.id],
    queryFn: async (): Promise<MTPortalQueue[]> => {
      if (!portalId) return [];

      let q = supabase
        .from('mt_property_portal_queue')
        .select(`
          *,
          property:mt_properties(id, titulo, ref_code),
          portal:mt_property_portals(*)
        `)
        .eq('portal_id', portalId)
        .order('created_at', { ascending: false });

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar fila do portal MT:', error);
        throw error;
      }

      return (data || []) as MTPortalQueue[];
    },
    enabled: !!portalId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Adicionar imóvel à fila
  // ---------------------------------------------------------------------------

  const addToQueue = useMutation({
    mutationFn: async (params: { property_id: string; destaque?: boolean }) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const { data, error } = await supabase
        .from('mt_property_portal_queue')
        .insert({
          tenant_id: tenant!.id,
          portal_id: portalId,
          property_id: params.property_id,
          destaque: params.destaque ?? false,
          status: 'pendente',
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao adicionar à fila MT:', error);
        throw error;
      }

      return data as MTPortalQueue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUEUE_KEY] });
      toast.success('Imóvel adicionado à fila do portal.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao adicionar à fila.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Remover imóvel da fila
  // ---------------------------------------------------------------------------

  const removeFromQueue = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_property_portal_queue')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao remover da fila MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUEUE_KEY] });
      toast.success('Imóvel removido da fila do portal.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao remover da fila.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar destaque
  // ---------------------------------------------------------------------------

  const updateDestaque = useMutation({
    mutationFn: async ({ id, destaque }: { id: string; destaque: boolean }) => {
      const { data, error } = await supabase
        .from('mt_property_portal_queue')
        .update({ destaque })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar destaque MT:', error);
        throw error;
      }

      return data as MTPortalQueue;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUEUE_KEY] });
      toast.success(data.destaque ? 'Imóvel destacado.' : 'Destaque removido.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar destaque.');
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    addToQueue,
    removeFromQueue,
    updateDestaque,
  };
}

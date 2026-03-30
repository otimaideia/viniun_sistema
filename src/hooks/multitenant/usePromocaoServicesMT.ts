// =============================================================================
// USE PROMOCAO SERVICES MT - Hook Multi-Tenant para Serviços da Promoção
// =============================================================================
//
// Gerencia a junction table mt_promotion_services
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { MTPromotionService, MTPromotionDescontoTipo } from '@/types/promocao-mt';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-promocao-services';
const PARENT_QUERY_KEY = 'mt-promocoes';

const SELECT_WITH_SERVICE = `
  *,
  service:mt_services (id, nome, preco, categoria)
`;

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function usePromocaoServicesMT(promotionId: string | undefined) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query: Listar Serviços da Promoção
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, promotionId],
    queryFn: async (): Promise<MTPromotionService[]> => {
      if (!promotionId) return [];

      const { data, error } = await supabase
        .from('mt_promotion_services')
        .select(SELECT_WITH_SERVICE)
        .eq('promotion_id', promotionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao buscar serviços da promoção:', error);
        throw error;
      }

      return (data || []) as MTPromotionService[];
    },
    enabled: !!promotionId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Adicionar Serviços (bulk)
  // ---------------------------------------------------------------------------

  const addServices = useMutation({
    mutationFn: async ({
      promotionId: promoId,
      serviceIds,
    }: {
      promotionId: string;
      serviceIds: string[];
    }): Promise<MTPromotionService[]> => {
      if (!promoId || serviceIds.length === 0) {
        throw new Error('Promoção e serviços são obrigatórios.');
      }

      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const rows = serviceIds.map((serviceId) => ({
        promotion_id: promoId,
        service_id: serviceId,
        tenant_id: tenant!.id,
      }));

      const { data, error } = await supabase
        .from('mt_promotion_services')
        .insert(rows)
        .select(SELECT_WITH_SERVICE);

      if (error) {
        console.error('Erro ao adicionar serviços:', error);
        throw error;
      }

      return (data || []) as MTPromotionService[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, promotionId] });
      queryClient.invalidateQueries({ queryKey: [PARENT_QUERY_KEY] });
      toast.success('Serviços vinculados à promoção!');
    },
    onError: (error: any) => {
      const msg = error?.code === '23505'
        ? 'Um ou mais serviços já estão vinculados a esta promoção.'
        : error?.message || 'Erro ao vincular serviços.';
      toast.error(msg);
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Remover Serviço
  // ---------------------------------------------------------------------------

  const removeService = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('mt_promotion_services')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao remover serviço da promoção:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, promotionId] });
      queryClient.invalidateQueries({ queryKey: [PARENT_QUERY_KEY] });
      toast.success('Serviço removido da promoção.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao remover serviço.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Override de Serviço
  // ---------------------------------------------------------------------------

  const updateServiceOverride = useMutation({
    mutationFn: async ({
      id,
      desconto_tipo,
      desconto_valor,
      preco_promocional,
    }: {
      id: string;
      desconto_tipo?: MTPromotionDescontoTipo | null;
      desconto_valor?: number | null;
      preco_promocional?: number | null;
    }): Promise<MTPromotionService> => {
      const updateData: Record<string, any> = {};
      if (desconto_tipo !== undefined) updateData.desconto_tipo = desconto_tipo;
      if (desconto_valor !== undefined) updateData.desconto_valor = desconto_valor;
      if (preco_promocional !== undefined) updateData.preco_promocional = preco_promocional;

      const { data, error } = await supabase
        .from('mt_promotion_services')
        .update(updateData)
        .eq('id', id)
        .select(SELECT_WITH_SERVICE)
        .single();

      if (error) {
        console.error('Erro ao atualizar override de serviço:', error);
        throw error;
      }

      return data as MTPromotionService;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, promotionId] });
      queryClient.invalidateQueries({ queryKey: [PARENT_QUERY_KEY] });
      toast.success('Desconto do serviço atualizado!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar desconto.');
    },
  });

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    services: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    addServices: {
      mutate: addServices.mutate,
      mutateAsync: addServices.mutateAsync,
      isPending: addServices.isPending,
    },
    removeService: {
      mutate: removeService.mutate,
      mutateAsync: removeService.mutateAsync,
      isPending: removeService.isPending,
    },
    updateServiceOverride: {
      mutate: updateServiceOverride.mutate,
      mutateAsync: updateServiceOverride.mutateAsync,
      isPending: updateServiceOverride.isPending,
    },

    isAdding: addServices.isPending,
    isRemoving: removeService.isPending,
    isUpdatingOverride: updateServiceOverride.isPending,
  };
}

export default usePromocaoServicesMT;

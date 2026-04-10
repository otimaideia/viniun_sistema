// =============================================================================
// USE IMOVEL FINALIDADES MT - Hook Multi-Tenant para Finalidades de Imóvel
// =============================================================================
//
// Este hook fornece CRUD para mt_property_purposes
// (Venda, Locação, Temporada, etc.)
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { MTPropertyPurpose } from '@/types/imovel-mt';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-property-purposes';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface MTPropertyPurposeCreate {
  tenant_id?: string;
  codigo: string;
  nome: string;
  ordem?: number;
}

export interface MTPropertyPurposeUpdate extends Partial<MTPropertyPurposeCreate> {
  id: string;
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function getErrorMessage(error: any): string {
  if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }
  const pgCode = error?.code;
  if (pgCode === '23505') return 'Esta finalidade já existe.';
  if (pgCode === '42501') return 'Você não tem permissão para realizar esta ação.';
  return error?.message || 'Erro desconhecido. Tente novamente.';
}

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useImovelFinalidadesMT() {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query: Listar Finalidades
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, accessLevel],
    queryFn: async (): Promise<MTPropertyPurpose[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_property_purposes')
        .select('*')
        .eq('is_active', true)
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true });

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) {
        console.error('Erro ao buscar finalidades MT:', error);
        throw error;
      }
      return (data || []) as MTPropertyPurpose[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 30,
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar Finalidade
  // ---------------------------------------------------------------------------

  const createFinalidade = useMutation({
    mutationFn: async (newFinalidade: MTPropertyPurposeCreate): Promise<MTPropertyPurpose> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const finalidadeData = {
        ...newFinalidade,
        tenant_id: newFinalidade.tenant_id || tenant!.id,
        is_active: true,
        ordem: newFinalidade.ordem ?? 0,
      };

      const { data, error } = await supabase
        .from('mt_property_purposes')
        .insert(finalidadeData)
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao criar finalidade MT:', error);
        throw error;
      }
      return data as MTPropertyPurpose;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Finalidade "${data.nome}" criada com sucesso!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Finalidade
  // ---------------------------------------------------------------------------

  const updateFinalidade = useMutation({
    mutationFn: async ({ id, ...updates }: MTPropertyPurposeUpdate): Promise<MTPropertyPurpose> => {
      if (!id) throw new Error('ID da finalidade é obrigatório.');

      const { data, error } = await supabase
        .from('mt_property_purposes')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao atualizar finalidade MT:', error);
        throw error;
      }
      return data as MTPropertyPurpose;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Finalidade "${data.nome}" atualizada!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Delete Finalidade (desativar)
  // ---------------------------------------------------------------------------

  const deleteFinalidade = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!id) throw new Error('ID da finalidade é obrigatório.');

      const { error } = await supabase
        .from('mt_property_purposes')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        console.error('Erro ao desativar finalidade MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Finalidade removida com sucesso!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    finalidades: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    createFinalidade: {
      mutate: createFinalidade.mutate,
      mutateAsync: createFinalidade.mutateAsync,
      isPending: createFinalidade.isPending,
    },
    updateFinalidade: {
      mutate: updateFinalidade.mutate,
      mutateAsync: updateFinalidade.mutateAsync,
      isPending: updateFinalidade.isPending,
    },
    deleteFinalidade: {
      mutate: deleteFinalidade.mutate,
      mutateAsync: deleteFinalidade.mutateAsync,
      isPending: deleteFinalidade.isPending,
    },

    isCreating: createFinalidade.isPending,
    isUpdating: updateFinalidade.isPending,
    isDeleting: deleteFinalidade.isPending,
  };
}

export default useImovelFinalidadesMT;

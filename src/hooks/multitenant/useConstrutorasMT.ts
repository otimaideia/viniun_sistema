// =============================================================================
// USE CONSTRUTORAS MT - Hook Multi-Tenant para Gerenciamento de Construtoras
// =============================================================================
//
// Este hook fornece CRUD completo para mt_construtoras
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { MTConstrutora, MTConstrutoraCreate, MTConstrutoraUpdate } from '@/types/construtora-mt';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-construtoras';

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function getErrorMessage(error: any): string {
  if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }
  const pgCode = error?.code;
  if (pgCode) {
    switch (pgCode) {
      case '23505': return 'Esta construtora já existe.';
      case '23503': return 'Esta construtora está vinculada a outros dados.';
      case '23502': return 'Preencha todos os campos obrigatórios.';
      case '42501': return 'Você não tem permissão para realizar esta ação.';
      default: break;
    }
  }
  return error?.message || 'Erro desconhecido. Tente novamente.';
}

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useConstrutorasMT(filters?: { search?: string }) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query Principal - Listar Construtoras
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, accessLevel, filters?.search],
    queryFn: async (): Promise<MTConstrutora[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_construtoras')
        .select('*')
        .is('deleted_at', null)
        .order('nome', { ascending: true });

      // Filtro por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      // Filtro de busca
      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        q = q.or(`nome.ilike.${searchTerm},responsavel.ilike.${searchTerm},email.ilike.${searchTerm}`);
      }

      const { data, error } = await q;
      if (error) {
        console.error('Erro ao buscar construtoras MT:', error);
        throw error;
      }
      return (data || []) as MTConstrutora[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar Construtora
  // ---------------------------------------------------------------------------

  const createConstrutora = useMutation({
    mutationFn: async (newConstrutora: MTConstrutoraCreate): Promise<MTConstrutora> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const construtoraData = {
        ...newConstrutora,
        tenant_id: newConstrutora.tenant_id || tenant!.id,
        franchise_id: newConstrutora.franchise_id || franchise?.id || null,
        status: 'ativo',
        mostrar_endereco: newConstrutora.mostrar_endereco ?? true,
        metadata: {},
      };

      const { data, error } = await supabase
        .from('mt_construtoras')
        .insert(construtoraData)
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao criar construtora MT:', error);
        throw error;
      }
      return data as MTConstrutora;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Construtora "${data.nome}" criada com sucesso!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Construtora
  // ---------------------------------------------------------------------------

  const updateConstrutora = useMutation({
    mutationFn: async ({ id, ...updates }: MTConstrutoraUpdate): Promise<MTConstrutora> => {
      if (!id) throw new Error('ID da construtora é obrigatório.');

      const { data, error } = await supabase
        .from('mt_construtoras')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao atualizar construtora MT:', error);
        throw error;
      }
      return data as MTConstrutora;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Construtora "${data.nome}" atualizada!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Soft Delete Construtora
  // ---------------------------------------------------------------------------

  const deleteConstrutora = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!id) throw new Error('ID da construtora é obrigatório.');

      const { error } = await supabase
        .from('mt_construtoras')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar construtora MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Construtora removida com sucesso!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    construtoras: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    createConstrutora: {
      mutate: createConstrutora.mutate,
      mutateAsync: createConstrutora.mutateAsync,
      isPending: createConstrutora.isPending,
    },
    updateConstrutora: {
      mutate: updateConstrutora.mutate,
      mutateAsync: updateConstrutora.mutateAsync,
      isPending: updateConstrutora.isPending,
    },
    deleteConstrutora: {
      mutate: deleteConstrutora.mutate,
      mutateAsync: deleteConstrutora.mutateAsync,
      isPending: deleteConstrutora.isPending,
    },

    isCreating: createConstrutora.isPending,
    isUpdating: updateConstrutora.isPending,
    isDeleting: deleteConstrutora.isPending,
  };
}

// -----------------------------------------------------------------------------
// Hook: Buscar Construtora por ID
// -----------------------------------------------------------------------------

export function useConstrutoraMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async (): Promise<MTConstrutora | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('mt_construtoras')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as MTConstrutora;
    },
    enabled: !!id && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

export default useConstrutorasMT;

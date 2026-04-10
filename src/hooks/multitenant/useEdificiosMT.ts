// =============================================================================
// USE EDIFICIOS MT - Hook Multi-Tenant para Gerenciamento de Edifícios
// =============================================================================
//
// Este hook fornece CRUD completo para mt_buildings
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { MTBuilding, MTBuildingCreate, MTBuildingUpdate } from '@/types/building-mt';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-buildings';

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
      case '23505': return 'Este edifício já existe.';
      case '23503': return 'Este edifício está vinculado a outros dados.';
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

export function useEdificiosMT(filters?: { search?: string }) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query Principal - Listar Edifícios
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, accessLevel, filters?.search],
    queryFn: async (): Promise<MTBuilding[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_buildings')
        .select(`
          *,
          construtora:mt_construtoras (id, nome)
        `)
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
        q = q.or(`nome.ilike.${searchTerm},endereco.ilike.${searchTerm}`);
      }

      const { data, error } = await q;
      if (error) {
        console.error('Erro ao buscar edifícios MT:', error);
        throw error;
      }
      return (data || []) as MTBuilding[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar Edifício
  // ---------------------------------------------------------------------------

  const createEdificio = useMutation({
    mutationFn: async (newEdificio: MTBuildingCreate): Promise<MTBuilding> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const edificioData = {
        ...newEdificio,
        tenant_id: newEdificio.tenant_id || tenant!.id,
        franchise_id: newEdificio.franchise_id || franchise?.id || null,
        is_active: true,
      };

      const { data, error } = await supabase
        .from('mt_buildings')
        .insert(edificioData)
        .select(`
          *,
          construtora:mt_construtoras (id, nome)
        `)
        .single();

      if (error) {
        console.error('Erro ao criar edifício MT:', error);
        throw error;
      }
      return data as MTBuilding;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Edifício "${data.nome}" criado com sucesso!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Edifício
  // ---------------------------------------------------------------------------

  const updateEdificio = useMutation({
    mutationFn: async ({ id, ...updates }: MTBuildingUpdate): Promise<MTBuilding> => {
      if (!id) throw new Error('ID do edifício é obrigatório.');

      const { data, error } = await supabase
        .from('mt_buildings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          construtora:mt_construtoras (id, nome)
        `)
        .single();

      if (error) {
        console.error('Erro ao atualizar edifício MT:', error);
        throw error;
      }
      return data as MTBuilding;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Edifício "${data.nome}" atualizado!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Soft Delete Edifício
  // ---------------------------------------------------------------------------

  const deleteEdificio = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!id) throw new Error('ID do edifício é obrigatório.');

      const { error } = await supabase
        .from('mt_buildings')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar edifício MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Edifício removido com sucesso!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    edificios: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    createEdificio: {
      mutate: createEdificio.mutate,
      mutateAsync: createEdificio.mutateAsync,
      isPending: createEdificio.isPending,
    },
    updateEdificio: {
      mutate: updateEdificio.mutate,
      mutateAsync: updateEdificio.mutateAsync,
      isPending: updateEdificio.isPending,
    },
    deleteEdificio: {
      mutate: deleteEdificio.mutate,
      mutateAsync: deleteEdificio.mutateAsync,
      isPending: deleteEdificio.isPending,
    },

    isCreating: createEdificio.isPending,
    isUpdating: updateEdificio.isPending,
    isDeleting: deleteEdificio.isPending,
  };
}

// -----------------------------------------------------------------------------
// Hook: Buscar Edifício por ID
// -----------------------------------------------------------------------------

export function useEdificioMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async (): Promise<MTBuilding | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('mt_buildings')
        .select(`
          *,
          construtora:mt_construtoras (id, nome)
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as MTBuilding;
    },
    enabled: !!id && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

export default useEdificiosMT;

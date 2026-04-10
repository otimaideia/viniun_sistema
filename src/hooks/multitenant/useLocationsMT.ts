// =============================================================================
// USE LOCATIONS MT - Hook Multi-Tenant para Gerenciamento de Localidades
// =============================================================================
//
// Este hook fornece CRUD completo para mt_locations
// Hierarquia: País → Estado → Cidade → Bairro
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { MTLocation, MTLocationCreate, LocationTipo } from '@/types/location-mt';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-locations';

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
      case '23505': return 'Esta localidade já existe.';
      case '23503': return 'Esta localidade está vinculada a outros dados.';
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

export function useLocationsMT(filters?: { tipo?: LocationTipo; parent_id?: string; search?: string }) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query Principal - Listar Locations
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, accessLevel, filters?.tipo, filters?.parent_id, filters?.search],
    queryFn: async (): Promise<MTLocation[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_locations')
        .select('*')
        .is('deleted_at', null)
        .order('nome', { ascending: true });

      // Filtro por tenant
      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      // Filtros opcionais
      if (filters?.tipo) q = q.eq('tipo', filters.tipo);
      if (filters?.parent_id) q = q.eq('parent_id', filters.parent_id);
      if (filters?.search) {
        q = q.ilike('nome', `%${filters.search}%`);
      }

      const { data, error } = await q;
      if (error) {
        console.error('Erro ao buscar locations MT:', error);
        throw error;
      }
      return (data || []) as MTLocation[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 10, // Locations mudam raramente
  });

  // ---------------------------------------------------------------------------
  // Helpers: Buscar por tipo hierárquico
  // ---------------------------------------------------------------------------

  const getEstados = (): MTLocation[] => {
    return (query.data || []).filter(l => l.tipo === 'estado');
  };

  const getCidadesByEstado = (estadoId: string): MTLocation[] => {
    return (query.data || []).filter(l => l.tipo === 'cidade' && l.parent_id === estadoId);
  };

  const getBairrosByCidade = (cidadeId: string): MTLocation[] => {
    return (query.data || []).filter(l => l.tipo === 'bairro' && l.parent_id === cidadeId);
  };

  // ---------------------------------------------------------------------------
  // Mutation: Criar Location
  // ---------------------------------------------------------------------------

  const createLocation = useMutation({
    mutationFn: async (newLocation: MTLocationCreate): Promise<MTLocation> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const locationData = {
        ...newLocation,
        tenant_id: newLocation.tenant_id || tenant!.id,
        is_active: true,
      };

      const { data, error } = await supabase
        .from('mt_locations')
        .insert(locationData)
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao criar location MT:', error);
        throw error;
      }
      return data as MTLocation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Localidade "${data.nome}" criada com sucesso!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Location
  // ---------------------------------------------------------------------------

  const updateLocation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<MTLocationCreate>): Promise<MTLocation> => {
      if (!id) throw new Error('ID da localidade é obrigatório.');

      const { data, error } = await supabase
        .from('mt_locations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao atualizar location MT:', error);
        throw error;
      }
      return data as MTLocation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Localidade "${data.nome}" atualizada!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Soft Delete Location
  // ---------------------------------------------------------------------------

  const deleteLocation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!id) throw new Error('ID da localidade é obrigatório.');

      const { error } = await supabase
        .from('mt_locations')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar location MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Localidade removida com sucesso!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    locations: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    getEstados,
    getCidadesByEstado,
    getBairrosByCidade,

    createLocation: {
      mutate: createLocation.mutate,
      mutateAsync: createLocation.mutateAsync,
      isPending: createLocation.isPending,
    },
    updateLocation: {
      mutate: updateLocation.mutate,
      mutateAsync: updateLocation.mutateAsync,
      isPending: updateLocation.isPending,
    },
    deleteLocation: {
      mutate: deleteLocation.mutate,
      mutateAsync: deleteLocation.mutateAsync,
      isPending: deleteLocation.isPending,
    },

    isCreating: createLocation.isPending,
    isUpdating: updateLocation.isPending,
    isDeleting: deleteLocation.isPending,
  };
}

// -----------------------------------------------------------------------------
// Hook: Buscar Estados (atalho)
// -----------------------------------------------------------------------------

export function useEstadosMT() {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'estados', tenant?.id],
    queryFn: async (): Promise<MTLocation[]> => {
      let q = supabase
        .from('mt_locations')
        .select('*')
        .eq('tipo', 'estado')
        .is('deleted_at', null)
        .order('nome', { ascending: true });

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as MTLocation[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 30,
  });
}

// -----------------------------------------------------------------------------
// Hook: Buscar Cidades por Estado
// -----------------------------------------------------------------------------

export function useCidadesByEstadoMT(estadoId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'cidades', tenant?.id, estadoId],
    queryFn: async (): Promise<MTLocation[]> => {
      if (!estadoId) return [];

      let q = supabase
        .from('mt_locations')
        .select('*')
        .eq('tipo', 'cidade')
        .eq('parent_id', estadoId)
        .is('deleted_at', null)
        .order('nome', { ascending: true });

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as MTLocation[];
    },
    enabled: !!estadoId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 30,
  });
}

// -----------------------------------------------------------------------------
// Hook: Buscar Bairros por Cidade
// -----------------------------------------------------------------------------

export function useBairrosByCidadeMT(cidadeId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'bairros', tenant?.id, cidadeId],
    queryFn: async (): Promise<MTLocation[]> => {
      if (!cidadeId) return [];

      let q = supabase
        .from('mt_locations')
        .select('*')
        .eq('tipo', 'bairro')
        .eq('parent_id', cidadeId)
        .is('deleted_at', null)
        .order('nome', { ascending: true });

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as MTLocation[];
    },
    enabled: !!cidadeId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 30,
  });
}

export default useLocationsMT;

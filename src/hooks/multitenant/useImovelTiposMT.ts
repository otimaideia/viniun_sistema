// =============================================================================
// USE IMOVEL TIPOS MT - Hook Multi-Tenant para Tipos de Imóvel
// =============================================================================
//
// Este hook fornece CRUD para mt_property_types
// Suporta hierarquia parent → children (tipo → subtipo)
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { MTPropertyType } from '@/types/imovel-mt';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-property-types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface MTPropertyTypeCreate {
  tenant_id?: string;
  parent_id?: string | null;
  codigo: string;
  nome: string;
  descricao?: string;
  icone?: string;
  ordem?: number;
}

export interface MTPropertyTypeUpdate extends Partial<MTPropertyTypeCreate> {
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
  if (pgCode === '23505') return 'Este tipo de imóvel já existe.';
  if (pgCode === '42501') return 'Você não tem permissão para realizar esta ação.';
  return error?.message || 'Erro desconhecido. Tente novamente.';
}

function buildTree(items: MTPropertyType[]): MTPropertyType[] {
  const map = new Map<string, MTPropertyType>();
  const roots: MTPropertyType[] = [];

  items.forEach(item => {
    map.set(item.id, { ...item, children: [] });
  });

  items.forEach(item => {
    const node = map.get(item.id)!;
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useImovelTiposMT() {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query: Listar todos os tipos (flat)
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, accessLevel],
    queryFn: async (): Promise<MTPropertyType[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_property_types')
        .select('*')
        .eq('is_active', true)
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true });

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) {
        console.error('Erro ao buscar tipos de imóvel MT:', error);
        throw error;
      }
      return (data || []) as MTPropertyType[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 30,
  });

  // Tipos raiz (sem parent)
  const tipos = (query.data || []).filter(t => !t.parent_id);

  // Árvore hierárquica
  const tiposTree = buildTree(query.data || []);

  // Subtipos por tipo pai
  const getSubtipos = (parentId: string): MTPropertyType[] => {
    return (query.data || []).filter(t => t.parent_id === parentId);
  };

  // ---------------------------------------------------------------------------
  // Mutation: Criar Tipo
  // ---------------------------------------------------------------------------

  const createTipo = useMutation({
    mutationFn: async (newTipo: MTPropertyTypeCreate): Promise<MTPropertyType> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const tipoData = {
        ...newTipo,
        tenant_id: newTipo.tenant_id || tenant!.id,
        is_active: true,
        ordem: newTipo.ordem ?? 0,
      };

      const { data, error } = await supabase
        .from('mt_property_types')
        .insert(tipoData)
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao criar tipo de imóvel MT:', error);
        throw error;
      }
      return data as MTPropertyType;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Tipo "${data.nome}" criado com sucesso!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Tipo
  // ---------------------------------------------------------------------------

  const updateTipo = useMutation({
    mutationFn: async ({ id, ...updates }: MTPropertyTypeUpdate): Promise<MTPropertyType> => {
      if (!id) throw new Error('ID do tipo é obrigatório.');

      const { data, error } = await supabase
        .from('mt_property_types')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao atualizar tipo de imóvel MT:', error);
        throw error;
      }
      return data as MTPropertyType;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Tipo "${data.nome}" atualizado!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Soft Delete Tipo (desativar)
  // ---------------------------------------------------------------------------

  const deleteTipo = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!id) throw new Error('ID do tipo é obrigatório.');

      const { error } = await supabase
        .from('mt_property_types')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        console.error('Erro ao desativar tipo de imóvel MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Tipo de imóvel removido com sucesso!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    allTipos: query.data ?? [],
    tipos,
    tiposTree,
    getSubtipos,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    createTipo: {
      mutate: createTipo.mutate,
      mutateAsync: createTipo.mutateAsync,
      isPending: createTipo.isPending,
    },
    updateTipo: {
      mutate: updateTipo.mutate,
      mutateAsync: updateTipo.mutateAsync,
      isPending: updateTipo.isPending,
    },
    deleteTipo: {
      mutate: deleteTipo.mutate,
      mutateAsync: deleteTipo.mutateAsync,
      isPending: deleteTipo.isPending,
    },

    isCreating: createTipo.isPending,
    isUpdating: updateTipo.isPending,
    isDeleting: deleteTipo.isPending,
  };
}

export default useImovelTiposMT;

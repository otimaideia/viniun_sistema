// =============================================================================
// USE SERVICE CATEGORIES MT - Hook Multi-Tenant para Categorias de Serviços
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import { CATEGORIA_LABELS } from '@/types/servico';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type CategoryTipo = 'servico' | 'produto' | 'ambos';

export interface MTServiceCategory {
  id: string;
  tenant_id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  tipo: CategoryTipo;
  icone: string | null;
  cor: string | null;
  ordem: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MTServiceCategoryCreate {
  codigo: string;
  nome: string;
  descricao?: string | null;
  tipo?: CategoryTipo;
  icone?: string | null;
  cor?: string | null;
  ordem?: number;
  is_active?: boolean;
}

export interface MTServiceCategoryUpdate extends Partial<MTServiceCategoryCreate> {
  id: string;
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

export function useServiceCategoriesMT() {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Query principal
  const query = useQuery({
    queryKey: ['mt-service-categories', tenant?.id],
    queryFn: async () => {
      let q = (supabase as any)
        .from('mt_service_categories')
        .select('*')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as MTServiceCategory[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 5 * 60 * 1000, // 5 min - categorias mudam raramente
  });

  // Todas as categorias (incluindo inativas, para admin)
  const allQuery = useQuery({
    queryKey: ['mt-service-categories-all', tenant?.id],
    queryFn: async () => {
      let q = (supabase as any)
        .from('mt_service_categories')
        .select('*')
        .is('deleted_at', null)
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as MTServiceCategory[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 5 * 60 * 1000,
  });

  // Helper: buscar label por codigo (com fallback para hardcoded)
  const getCategoryLabel = useCallback((codigo: string | null | undefined): string => {
    if (!codigo) return 'Sem categoria';
    const cat = query.data?.find(c => c.codigo === codigo);
    if (cat) return cat.nome;
    // Fallback para hardcoded (retrocompatibilidade)
    return CATEGORIA_LABELS[codigo] || codigo;
  }, [query.data]);

  // Helper: buscar categoria completa por codigo
  const getCategoryByCode = useCallback((codigo: string | null | undefined): MTServiceCategory | undefined => {
    if (!codigo) return undefined;
    return query.data?.find(c => c.codigo === codigo);
  }, [query.data]);

  // Helper: filtrar categorias por tipo
  const getCategoriesByTipo = useCallback((tipo: 'servico' | 'produto'): MTServiceCategory[] => {
    if (!query.data) return [];
    return query.data.filter(c => c.tipo === tipo || c.tipo === 'ambos');
  }, [query.data]);

  // Helper: mapa codigo -> label (retrocompatibilidade com CATEGORIA_LABELS)
  const categoryLabels = useCallback((): Record<string, string> => {
    const map: Record<string, string> = {};
    if (query.data) {
      query.data.forEach(c => { map[c.codigo] = c.nome; });
    }
    // Merge com fallback hardcoded
    return { ...CATEGORIA_LABELS, ...map };
  }, [query.data]);

  // Mutation: Criar
  const create = useMutation({
    mutationFn: async (newCat: MTServiceCategoryCreate) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      const { data, error } = await (supabase as any)
        .from('mt_service_categories')
        .insert({
          ...newCat,
          tenant_id: tenant?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MTServiceCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-service-categories'] });
      toast.success('Categoria criada com sucesso');
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate') || error.code === '23505') {
        toast.error('Já existe uma categoria com esse código');
      } else {
        toast.error(`Erro ao criar categoria: ${error.message}`);
      }
    },
  });

  // Mutation: Atualizar
  const update = useMutation({
    mutationFn: async ({ id, ...updates }: MTServiceCategoryUpdate) => {
      const { data, error } = await (supabase as any)
        .from('mt_service_categories')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MTServiceCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-service-categories'] });
      toast.success('Categoria atualizada com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar categoria: ${error.message}`);
    },
  });

  // Mutation: Deletar (soft delete)
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('mt_service_categories')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-service-categories'] });
      toast.success('Categoria removida com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover categoria: ${error.message}`);
    },
  });

  return {
    categories: query.data || [],
    allCategories: allQuery.data || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    getCategoryLabel,
    getCategoryByCode,
    getCategoriesByTipo,
    categoryLabels,
    create,
    update,
    remove,
  };
}

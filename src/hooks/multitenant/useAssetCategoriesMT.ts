// =============================================================================
// USE ASSET CATEGORIES MT - Hook Multi-Tenant para Categorias de Ativos
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import { MTAssetCategory } from '@/types/patrimonio';

const QUERY_KEY = 'mt-asset-categories';

export function useAssetCategoriesMT() {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id],
    queryFn: async (): Promise<MTAssetCategory[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_asset_categories')
        .select('*')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('ordem', { ascending: true });

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as MTAssetCategory[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 10,
  });

  const createCategory = useMutation({
    mutationFn: async (cat: Partial<MTAssetCategory> & { nome: string; codigo: string }) => {
      if (!tenant && accessLevel !== 'platform') throw new Error('Tenant não definido.');

      const { data, error } = await supabase
        .from('mt_asset_categories')
        .insert({
          ...cat,
          tenant_id: tenant!.id,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Categoria criada!');
    },
    onError: (error: any) => toast.error(error?.message || 'Erro ao criar categoria.'),
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<MTAssetCategory>) => {
      const { data, error } = await supabase
        .from('mt_asset_categories')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Categoria atualizada!');
    },
    onError: (error: any) => toast.error(error?.message || 'Erro ao atualizar categoria.'),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_asset_categories')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Categoria removida!');
    },
    onError: (error: any) => toast.error(error?.message || 'Erro ao remover categoria.'),
  });

  return {
    categories: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: () => query.refetch(),

    createCategory: { mutate: createCategory.mutate, mutateAsync: createCategory.mutateAsync, isPending: createCategory.isPending },
    updateCategory: { mutate: updateCategory.mutate, mutateAsync: updateCategory.mutateAsync, isPending: updateCategory.isPending },
    deleteCategory: { mutate: deleteCategory.mutate, mutateAsync: deleteCategory.mutateAsync, isPending: deleteCategory.isPending },
  };
}

export default useAssetCategoriesMT;

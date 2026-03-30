import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MTSOPCategory } from '@/types/sop';

export function useSOPCategoriesMT() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mt-sop-categories', tenant?.id],
    queryFn: async () => {
      let q = (supabase
        .from('mt_sop_categories') as any)
        .select('*')
        .is('deleted_at', null)
        .order('ordem', { ascending: true });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('tenant_id', tenant?.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as MTSOPCategory[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Build tree structure from flat list
  const categoryTree = query.data
    ? buildCategoryTree(query.data)
    : [];

  const create = useMutation({
    mutationFn: async (newCategory: Partial<MTSOPCategory>) => {
      const { data, error } = await (supabase
        .from('mt_sop_categories') as any)
        .insert({
          ...newCategory,
          tenant_id: tenant?.id,
          franchise_id: franchise?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-sop-categories'] });
      toast.success('Categoria criada');
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MTSOPCategory> & { id: string }) => {
      const { data, error } = await (supabase
        .from('mt_sop_categories') as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-sop-categories'] });
      toast.success('Categoria atualizada');
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('mt_sop_categories') as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-sop-categories'] });
      toast.success('Categoria removida');
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });

  return {
    categories: query.data || [],
    categoryTree,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    create,
    update,
    remove,
  };
}

function buildCategoryTree(categories: MTSOPCategory[]): MTSOPCategory[] {
  const map = new Map<string, MTSOPCategory>();
  const roots: MTSOPCategory[] = [];

  categories.forEach((cat) => {
    map.set(cat.id, { ...cat, children: [] });
  });

  categories.forEach((cat) => {
    const item = map.get(cat.id)!;
    if (cat.parent_id && map.has(cat.parent_id)) {
      map.get(cat.parent_id)!.children!.push(item);
    } else {
      roots.push(item);
    }
  });

  return roots;
}

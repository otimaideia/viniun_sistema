import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MTTaskCategory } from '@/types/tarefa';

export function useTarefaCategoriesMT() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mt-task-categories', tenant?.id],
    queryFn: async () => {
      let q = (supabase.from('mt_task_categories') as any)
        .select('*')
        .is('deleted_at', null)
        .order('ordem', { ascending: true });

      // Categories are tenant-wide resources, filter by tenant_id for both tenant and franchise users
      if ((accessLevel === 'tenant' || accessLevel === 'franchise') && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as MTTaskCategory[];
    },
    enabled: !isTenantLoading && (!!tenant?.id || accessLevel === 'platform'),
  });

  const create = useMutation({
    mutationFn: async (newCategory: Omit<MTTaskCategory, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'deleted_at'>) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      const { data, error } = await (supabase.from('mt_task_categories') as any)
        .insert({
          ...newCategory,
          tenant_id: tenant?.id,
          franchise_id: franchise?.id || newCategory.franchise_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MTTaskCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-task-categories'] });
      toast.success('Categoria criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar categoria: ${error.message}`);
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MTTaskCategory> & { id: string }) => {
      const { data, error } = await (supabase.from('mt_task_categories') as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MTTaskCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-task-categories'] });
      toast.success('Categoria atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar categoria: ${error.message}`);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('mt_task_categories') as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-task-categories'] });
      toast.success('Categoria removida com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover categoria: ${error.message}`);
    },
  });

  return {
    categories: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    create,
    update,
    remove,
  };
}

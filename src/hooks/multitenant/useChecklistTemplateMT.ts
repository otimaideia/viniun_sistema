import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MTChecklistTemplate, MTChecklistItem, CreateChecklistItem } from '@/types/checklist';

export function useChecklistTemplateMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mt-checklist-template', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await (supabase
        .from('mt_checklist_templates') as any)
        .select(`
          *,
          role:mt_roles(id, nome),
          assigned_user:mt_users!mt_checklist_templates_user_id_fkey(id, nome),
          department:mt_departments(id, nome),
          team:mt_teams(id, nome),
          creator:mt_users!mt_checklist_templates_created_by_fkey(id, nome),
          items:mt_checklist_items(*)
        `)
        .eq('id', id)
        .is('items.deleted_at', null)
        .order('ordem', { referencedTable: 'mt_checklist_items', ascending: true })
        .single();

      if (error) throw error;
      return data as MTChecklistTemplate;
    },
    enabled: !isTenantLoading && !!id && (!!tenant || accessLevel === 'platform'),
  });

  // CRUD de items do template
  const createItem = useMutation({
    mutationFn: async (newItem: CreateChecklistItem) => {
      const { data, error } = await (supabase
        .from('mt_checklist_items') as any)
        .insert({
          ...newItem,
          tenant_id: tenant?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-checklist-template', id] });
      toast.success('Item adicionado');
    },
    onError: (error: any) => toast.error(`Erro ao adicionar item: ${error.message}`),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id: itemId, ...updates }: Partial<MTChecklistItem> & { id: string }) => {
      const { data, error } = await (supabase
        .from('mt_checklist_items') as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', itemId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-checklist-template', id] });
    },
    onError: (error: any) => toast.error(`Erro ao atualizar item: ${error.message}`),
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await (supabase
        .from('mt_checklist_items') as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-checklist-template', id] });
      toast.success('Item removido');
    },
    onError: (error: any) => toast.error(`Erro ao remover item: ${error.message}`),
  });

  const reorderItems = useMutation({
    mutationFn: async (items: { id: string; ordem: number }[]) => {
      const promises = items.map(item =>
        (supabase.from('mt_checklist_items') as any)
          .update({ ordem: item.ordem })
          .eq('id', item.id)
      );
      const results = await Promise.all(promises);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-checklist-template', id] });
    },
  });

  return {
    data: query.data,
    items: (query.data?.items || []) as MTChecklistItem[],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    createItem,
    updateItem,
    removeItem,
    reorderItems,
  };
}

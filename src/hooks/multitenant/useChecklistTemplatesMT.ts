import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MTChecklistTemplate, ChecklistTemplateFilters, CreateChecklistTemplate } from '@/types/checklist';

export function useChecklistTemplatesMT(filters?: ChecklistTemplateFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mt-checklist-templates', tenant?.id, franchise?.id, filters],
    queryFn: async () => {
      let q = (supabase
        .from('mt_checklist_templates') as any)
        .select(`
          *,
          role:mt_roles(id, nome),
          assigned_user:mt_users!mt_checklist_templates_user_id_fkey(id, nome),
          department:mt_departments(id, nome),
          team:mt_teams(id, nome),
          creator:mt_users!mt_checklist_templates_created_by_fkey(id, nome),
          items:mt_checklist_items(count)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.or(`franchise_id.eq.${franchise.id},franchise_id.is.null`);
        q = q.eq('tenant_id', tenant?.id);
      }

      if (filters?.search) {
        q = q.or(`nome.ilike.%${filters.search}%,descricao.ilike.%${filters.search}%`);
      }
      if (filters?.assignment_type) q = q.eq('assignment_type', filters.assignment_type);
      if (filters?.recurrence) q = q.eq('recurrence', filters.recurrence);
      if (filters?.is_active !== undefined) q = q.eq('is_active', filters.is_active);
      if (filters?.franchise_id) q = q.eq('franchise_id', filters.franchise_id);

      const { data, error } = await q;
      if (error) throw error;

      return (data || []).map((t: any) => ({
        ...t,
        _items_count: t.items?.[0]?.count || 0,
      })) as MTChecklistTemplate[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  const create = useMutation({
    mutationFn: async (newTemplate: CreateChecklistTemplate) => {
      const { data, error } = await (supabase
        .from('mt_checklist_templates') as any)
        .insert({
          ...newTemplate,
          tenant_id: tenant?.id,
          franchise_id: newTemplate.franchise_id || franchise?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-checklist-templates'] });
      toast.success('Template de checklist criado com sucesso');
    },
    onError: (error: any) => toast.error(`Erro ao criar template: ${error.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MTChecklistTemplate> & { id: string }) => {
      const { data, error } = await (supabase
        .from('mt_checklist_templates') as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-checklist-templates'] });
      toast.success('Template atualizado com sucesso');
    },
    onError: (error: any) => toast.error(`Erro ao atualizar template: ${error.message}`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('mt_checklist_templates') as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-checklist-templates'] });
      toast.success('Template removido com sucesso');
    },
    onError: (error: any) => toast.error(`Erro ao remover template: ${error.message}`),
  });

  return {
    data: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    create,
    update,
    remove,
  };
}

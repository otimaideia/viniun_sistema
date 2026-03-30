import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MTSOP, SOPFilters } from '@/types/sop';

export function useSOPsMT(filters?: SOPFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mt-sops', tenant?.id, franchise?.id, filters],
    queryFn: async () => {
      let q = (supabase
        .from('mt_sops') as any)
        .select(`
          *,
          category:mt_sop_categories(id, nome, icone, cor),
          department:mt_departments(id, nome),
          responsavel:mt_users!mt_sops_responsavel_id_fkey(id, nome),
          steps:mt_sop_steps(count)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        // POPs globais (franchise_id NULL) + POPs da franquia
        q = q.eq('tenant_id', tenant!.id)
          .or(`franchise_id.eq.${franchise.id},franchise_id.is.null`);
      }

      if (filters?.search) {
        q = q.or(`titulo.ilike.%${filters.search}%,codigo.ilike.%${filters.search}%,descricao.ilike.%${filters.search}%`);
      }
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.category_id) q = q.eq('category_id', filters.category_id);
      if (filters?.department_id) q = q.eq('department_id', filters.department_id);
      if (filters?.prioridade) q = q.eq('prioridade', filters.prioridade);
      if (filters?.responsavel_id) q = q.eq('responsavel_id', filters.responsavel_id);
      if (filters?.is_template !== undefined) q = q.eq('is_template', filters.is_template);

      const { data, error } = await q;
      if (error) throw error;
      return data as MTSOP[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  const create = useMutation({
    mutationFn: async (newSOP: Partial<MTSOP>) => {
      const { data, error } = await (supabase
        .from('mt_sops') as any)
        .insert({
          ...newSOP,
          tenant_id: tenant?.id,
          franchise_id: franchise?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-sops'] });
      toast.success('POP criado com sucesso');
    },
    onError: (error: any) => toast.error(`Erro ao criar POP: ${error.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MTSOP> & { id: string }) => {
      const { data, error } = await (supabase
        .from('mt_sops') as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-sops'] });
      toast.success('POP atualizado com sucesso');
    },
    onError: (error: any) => toast.error(`Erro ao atualizar POP: ${error.message}`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('mt_sops') as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-sops'] });
      toast.success('POP removido com sucesso');
    },
    onError: (error: any) => toast.error(`Erro ao remover POP: ${error.message}`),
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

export function useSOPMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: ['mt-sop', id],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('mt_sops') as any)
        .select(`
          *,
          category:mt_sop_categories(id, nome, icone, cor),
          department:mt_departments(id, nome),
          responsavel:mt_users!mt_sops_responsavel_id_fkey(id, nome),
          aprovador:mt_users!mt_sops_aprovador_id_fkey(id, nome),
          steps:mt_sop_steps(
            *,
            checklist_items:mt_sop_step_checklist(*)
          )
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();
      if (error) throw error;

      // Sort steps by ordem
      if (data?.steps) {
        data.steps.sort((a: any, b: any) => a.ordem - b.ordem);
        data.steps.forEach((step: any) => {
          if (step.checklist_items) {
            step.checklist_items.sort((a: any, b: any) => a.ordem - b.ordem);
          }
        });
      }

      return data as MTSOP;
    },
    enabled: !!id && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

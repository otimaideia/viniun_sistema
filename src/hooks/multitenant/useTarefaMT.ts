import { useQuery } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import type { MTTask } from '@/types/tarefa';

export function useTarefaMT(taskId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const taskQuery = useQuery({
    queryKey: ['mt-task', taskId, tenant?.id],
    queryFn: async () => {
      let q = (supabase.from('mt_tasks') as any)
        .select(`
          *,
          delegator:mt_users!delegated_by(id, nome),
          category:mt_task_categories(id, nome, cor, icone),
          assignees:mt_task_assignees(
            id, user_id, status, accepted_at, completed_at,
            user:mt_users(id, nome, email, telefone)
          )
        `)
        .eq('id', taskId)
        .is('deleted_at', null);

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q.single();

      if (error) throw error;
      return data as MTTask;
    },
    enabled: !!taskId && !isTenantLoading,
  });

  const subTasksQuery = useQuery({
    queryKey: ['mt-task-subtasks', taskId, tenant?.id],
    queryFn: async () => {
      let q = (supabase.from('mt_tasks') as any)
        .select(`
          *,
          delegator:mt_users!delegated_by(id, nome),
          assignees:mt_task_assignees(
            id, user_id, status, accepted_at, completed_at,
            user:mt_users(id, nome)
          )
        `)
        .eq('parent_task_id', taskId)
        .is('deleted_at', null);

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q
        .order('ordem', { ascending: true });

      if (error) throw error;
      return (data || []) as MTTask[];
    },
    enabled: !!taskId && !isTenantLoading,
  });

  return {
    task: taskQuery.data ?? null,
    subTasks: subTasksQuery.data ?? [],
    isLoading: taskQuery.isLoading || subTasksQuery.isLoading || isTenantLoading,
    error: taskQuery.error || subTasksQuery.error,
    refetch: () => {
      taskQuery.refetch();
      subTasksQuery.refetch();
    },
  };
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import type { MTTaskActivity } from '@/types/tarefa';

export function useTarefaActivitiesMT(taskId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: ['mt-task-activities', taskId, tenant?.id],
    queryFn: async () => {
      let q = (supabase.from('mt_task_activities') as any)
        .select('*, user:mt_users(id, nome)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;

      if (error) throw error;
      return (data || []) as MTTaskActivity[];
    },
    enabled: !!taskId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  return {
    activities: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

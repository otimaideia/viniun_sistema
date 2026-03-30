import { useQuery } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import type { MTTask } from '@/types/tarefa';

interface MinhasTarefasStats {
  assigned_count: number;
  delegated_count: number;
  overdue_count: number;
  aguardando_conferencia_count: number;
  completed_today: number;
}

export function useMinhasTarefasMT() {
  const { tenant, user } = useTenantContext();

  // Tarefas atribuídas a mim
  const assignedQuery = useQuery({
    queryKey: ['mt-minhas-tarefas-assigned', tenant?.id, user?.id],
    queryFn: async () => {
      // Buscar IDs de tarefas onde sou assignee
      const { data: assigneeData } = await (supabase
        .from('mt_task_assignees') as any)
        .select('task_id')
        .eq('user_id', user!.id);

      if (!assigneeData?.length) return [] as MTTask[];

      const taskIds = assigneeData.map((a: any) => a.task_id);

      let q = (supabase
        .from('mt_tasks') as any)
        .select('*, delegator:mt_users!delegated_by(id, nome), category:mt_task_categories(id, nome, cor, icone), assignees:mt_task_assignees(id, user_id, status, user:mt_users(id, nome))')
        .in('id', taskIds)
        .is('deleted_at', null)
        .not('status', 'in', '("finalizada","cancelada")');

      if (tenant?.id) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q.order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as MTTask[];
    },
    enabled: !!tenant?.id && !!user?.id,
  });

  // Tarefas que eu deleguei
  const delegatedQuery = useQuery({
    queryKey: ['mt-minhas-tarefas-delegated', tenant?.id, user?.id],
    queryFn: async () => {
      let q = (supabase
        .from('mt_tasks') as any)
        .select('*, delegator:mt_users!delegated_by(id, nome), category:mt_task_categories(id, nome, cor, icone), assignees:mt_task_assignees(id, user_id, status, user:mt_users(id, nome))')
        .eq('delegated_by', user!.id)
        .is('deleted_at', null)
        .not('status', 'in', '("finalizada","cancelada")');

      if (tenant?.id) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q.order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as MTTask[];
    },
    enabled: !!tenant?.id && !!user?.id,
  });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const assigned = assignedQuery.data || [];
  const delegated = delegatedQuery.data || [];

  // Calcular overdue
  const allTasks = [...assigned, ...delegated];
  const uniqueTasks = allTasks.filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i);

  const overdue = uniqueTasks.filter(t =>
    t.due_date &&
    new Date(t.due_date) < now &&
    !['finalizada', 'cancelada', 'concluida'].includes(t.status)
  );

  const aguardandoConferencia = delegated.filter(t => t.status === 'concluida');

  const completedToday = uniqueTasks.filter(t =>
    t.completed_at && t.completed_at >= todayStart
  ).length;

  const stats: MinhasTarefasStats = {
    assigned_count: assigned.length,
    delegated_count: delegated.length,
    overdue_count: overdue.length,
    aguardando_conferencia_count: aguardandoConferencia.length,
    completed_today: completedToday,
  };

  return {
    assigned,
    delegated,
    overdue,
    aguardandoConferencia,
    isLoading: assignedQuery.isLoading || delegatedQuery.isLoading,
    stats,
  };
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MTTask, TaskFilters, CreateTask, UpdateTask, TaskStatus, TaskStats } from '@/types/tarefa';
import { useTarefaNotificationsMT } from './useTarefaNotificationsMT';

const QUERY_KEY = 'mt-tasks';

const FINALIZED_STATUSES: TaskStatus[] = ['finalizada', 'cancelada'];

function computeStats(tasks: MTTask[]): TaskStats {
  const now = new Date();
  return {
    total: tasks.length,
    pendentes: tasks.filter(t => t.status === 'pendente').length,
    em_andamento: tasks.filter(t => t.status === 'em_andamento').length,
    aguardando: tasks.filter(t => t.status === 'aguardando').length,
    concluidas: tasks.filter(t => t.status === 'concluida').length,
    finalizadas: tasks.filter(t => t.status === 'finalizada').length,
    recusadas: tasks.filter(t => t.status === 'recusada').length,
    canceladas: tasks.filter(t => t.status === 'cancelada').length,
    atrasadas: tasks.filter(t =>
      t.due_date &&
      new Date(t.due_date) < now &&
      !FINALIZED_STATUSES.includes(t.status)
    ).length,
    aguardando_conferencia: tasks.filter(t => t.status === 'concluida').length,
  };
}

export function useTarefasMT(filters?: TaskFilters) {
  const { tenant, franchise, accessLevel, user, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();
  const { notifyTaskCreated, notifyStatusChange } = useTarefaNotificationsMT();

  // --- QUERY ---
  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, filters],
    queryFn: async () => {
      let q = (supabase
        .from('mt_tasks') as any)
        .select(`
          *,
          delegator:mt_users!delegated_by(id, nome),
          category:mt_task_categories(id, nome, cor, icone),
          assignees:mt_task_assignees(id, user_id, status, completed_at, user:mt_users(id, nome))
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Tenant/franchise isolation
      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      // Default: only top-level tasks
      if (filters?.has_parent === false || filters?.has_parent === undefined) {
        q = q.is('parent_task_id', null);
      }

      // Filters
      if (filters?.search) {
        q = q.ilike('titulo', `%${filters.search}%`);
      }
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          q = q.in('status', filters.status);
        } else {
          q = q.eq('status', filters.status);
        }
      }
      if (filters?.prioridade) {
        q = q.eq('prioridade', filters.prioridade);
      }
      if (filters?.delegated_by) {
        q = q.eq('delegated_by', filters.delegated_by);
      }
      if (filters?.category_id) {
        q = q.eq('category_id', filters.category_id);
      }
      if (filters?.due_date_from) {
        q = q.gte('due_date', filters.due_date_from);
      }
      if (filters?.due_date_to) {
        q = q.lte('due_date', filters.due_date_to);
      }
      if (filters?.franchise_id) {
        q = q.eq('franchise_id', filters.franchise_id);
      }

      const { data, error } = await q;
      if (error) throw error;

      let tasks = (data || []) as MTTask[];

      // Client-side filters that require JOIN data
      if (filters?.assigned_to) {
        tasks = tasks.filter(t =>
          t.assignees?.some(a => a.user_id === filters.assigned_to)
        );
      }
      if (filters?.is_overdue) {
        const now = new Date();
        tasks = tasks.filter(t =>
          t.due_date &&
          new Date(t.due_date) < now &&
          !FINALIZED_STATUSES.includes(t.status)
        );
      }
      if (filters?.tags && filters.tags.length > 0) {
        tasks = tasks.filter(t =>
          filters.tags!.some(tag => t.tags?.includes(tag))
        );
      }

      return tasks;
    },
    enabled: !isTenantLoading && (!!tenant?.id || accessLevel === 'platform'),
  });

  const stats: TaskStats = computeStats(query.data || []);

  // Helper: log activity
  async function logActivity(taskId: string, acao: string, descricao?: string, dados?: Record<string, any>) {
    if (!user?.id || !tenant?.id) return;
    await (supabase.from('mt_task_activities') as any).insert({
      tenant_id: tenant.id,
      task_id: taskId,
      user_id: user.id,
      acao,
      descricao: descricao || null,
      dados_json: dados || null,
    });
  }

  // --- CREATE ---
  const create = useMutation({
    mutationFn: async (input: CreateTask) => {
      if (!user?.id || !tenant?.id) throw new Error('Contexto de tenant/usuário não disponível');

      const { assignee_ids, ...taskData } = input;

      const { data: task, error } = await (supabase
        .from('mt_tasks') as any)
        .insert({
          ...taskData,
          tenant_id: tenant.id,
          franchise_id: input.franchise_id || franchise?.id || null,
          delegated_by: user.id,
          status: 'pendente' as TaskStatus,
          prioridade: input.prioridade || 'normal',
          tags: input.tags || [],
        })
        .select()
        .single();

      if (error) throw error;

      // Create assignees
      if (assignee_ids.length > 0) {
        const assigneeRows = assignee_ids.map(uid => ({
          tenant_id: tenant.id,
          task_id: task.id,
          user_id: uid,
          status: 'pendente',
        }));
        const { error: assignErr } = await (supabase
          .from('mt_task_assignees') as any)
          .insert(assigneeRows);
        if (assignErr) console.error('Erro ao criar assignees:', assignErr);
      }

      await logActivity(task.id, 'criou', `Tarefa "${task.titulo}" criada`);

      // Fire-and-forget WhatsApp notification
      notifyTaskCreated(
        task as MTTask,
        assignee_ids,
        user.nome || 'Admin'
      );

      return task as MTTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Tarefa criada com sucesso');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao criar tarefa: ${err.message}`);
    },
  });

  // --- UPDATE ---
  const update = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTask) => {
      const { data, error } = await (supabase
        .from('mt_tasks') as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logActivity(id, 'editou');
      return data as MTTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Tarefa atualizada');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao atualizar: ${err.message}`);
    },
  });

  // --- CHANGE STATUS ---
  const changeStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: TaskStatus; notes?: string }) => {
      // Fetch current task to get old status and assignees for notification
      const { data: currentTask } = await (supabase
        .from('mt_tasks') as any)
        .select('status, started_at, delegated_by, assignees:mt_task_assignees(user_id)')
        .eq('id', id)
        .single();

      const oldStatus = currentTask?.status as TaskStatus;

      const updatePayload: Record<string, any> = {
        status,
        updated_at: new Date().toISOString(),
      };

      let acao = 'status_alterado';

      switch (status) {
        case 'em_andamento':
          // Set started_at only if not already set
          if (!currentTask?.started_at) {
            updatePayload.started_at = new Date().toISOString();
          }
          break;
        case 'concluida':
          updatePayload.completed_at = new Date().toISOString();
          acao = 'concluiu';
          break;
        case 'finalizada':
          updatePayload.finalized_at = new Date().toISOString();
          updatePayload.finalized_by = user?.id;
          updatePayload.finalization_status = 'aprovada';
          updatePayload.finalization_notes = notes || null;
          acao = 'finalizou';
          break;
        case 'cancelada':
          acao = 'cancelou';
          break;
      }

      const { data, error } = await (supabase
        .from('mt_tasks') as any)
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logActivity(id, acao, notes || null);

      // Fire-and-forget WhatsApp notification for status change
      const assigneeIds = (currentTask?.assignees || []).map((a: { user_id: string }) => a.user_id);
      notifyStatusChange(
        data as MTTask,
        assigneeIds,
        oldStatus,
        status,
        notes
      );

      return data as MTTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Status atualizado');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao alterar status: ${err.message}`);
    },
  });

  // --- FINALIZE (delegator approve/reject) ---
  const finalize = useMutation({
    mutationFn: async ({ id, approved, notes }: { id: string; approved: boolean; notes?: string }) => {
      if (!user?.id) throw new Error('Usuário não identificado');

      // Fetch assignees for notification
      const { data: taskWithAssignees } = await (supabase
        .from('mt_tasks') as any)
        .select('status, assignees:mt_task_assignees(user_id)')
        .eq('id', id)
        .single();

      const oldStatus = taskWithAssignees?.status as TaskStatus;

      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
        finalization_notes: notes || null,
      };

      if (approved) {
        updatePayload.status = 'finalizada';
        updatePayload.finalized_at = new Date().toISOString();
        updatePayload.finalized_by = user.id;
        updatePayload.finalization_status = 'aprovada';
      } else {
        updatePayload.status = 'em_andamento';
        updatePayload.finalization_status = 'recusada';
        updatePayload.completed_at = null;
      }

      const { data, error } = await (supabase
        .from('mt_tasks') as any)
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logActivity(
        id,
        approved ? 'finalizou' : 'recusou',
        notes || (approved ? 'Tarefa aprovada' : 'Tarefa devolvida para refazer'),
      );

      // Fire-and-forget WhatsApp notification
      const assigneeIds = (taskWithAssignees?.assignees || []).map((a: { user_id: string }) => a.user_id);
      const newStatus = approved ? 'finalizada' : 'em_andamento';
      notifyStatusChange(
        data as MTTask,
        assigneeIds,
        oldStatus,
        newStatus as TaskStatus,
        notes || (approved ? 'Tarefa aprovada pelo delegador' : 'Tarefa devolvida para refazer'),
      );

      return data as MTTask;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(vars.approved ? 'Tarefa finalizada com sucesso' : 'Tarefa devolvida para refazer');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao finalizar: ${err.message}`);
    },
  });

  // --- REMOVE (soft delete) ---
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('mt_tasks') as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      await logActivity(id, 'cancelou', 'Tarefa removida');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Tarefa removida');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao remover: ${err.message}`);
    },
  });

  const syncAssignees = async (taskId: string, assigneeIds: string[]) => {
    await (supabase.from('mt_task_assignees') as any).delete().eq('task_id', taskId);
    if (assigneeIds.length > 0) {
      await (supabase.from('mt_task_assignees') as any).insert(
        assigneeIds.map((uid) => ({ tenant_id: tenant?.id, task_id: taskId, user_id: uid, status: 'pendente' })),
      );
    }
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
  };

  const fetchTask = async (taskId: string): Promise<MTTask | null> => {
    const { data } = await (supabase.from('mt_tasks') as any).select('*').eq('id', taskId).single();
    return data as MTTask | null;
  };

  return {
    tasks: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    stats,
    create,
    update,
    changeStatus,
    finalize,
    remove,
    syncAssignees,
    fetchTask,
    refetch: query.refetch,
  };
}

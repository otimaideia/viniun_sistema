import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MTTaskComment, MTTask } from '@/types/tarefa';
import { useTarefaNotificationsMT } from './useTarefaNotificationsMT';

export function useTarefaCommentsMT(taskId: string | undefined) {
  const { tenant, franchise, accessLevel, user, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();
  const { notifyComment } = useTarefaNotificationsMT();

  const query = useQuery({
    queryKey: ['mt-task-comments', taskId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('mt_task_comments') as any)
        .select('*, user:mt_users(id, nome)')
        .eq('task_id', taskId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as MTTaskComment[];
    },
    enabled: !!taskId && !isTenantLoading,
  });

  const addComment = useMutation({
    mutationFn: async ({ conteudo, mentioned_user_ids }: { conteudo: string; mentioned_user_ids?: string[] }) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      const { data, error } = await (supabase.from('mt_task_comments') as any)
        .insert({
          task_id: taskId,
          user_id: user?.id,
          tenant_id: tenant?.id,
          conteudo,
          mentioned_user_ids: mentioned_user_ids || [],
        })
        .select('*, user:mt_users(id, nome)')
        .single();

      if (error) throw error;

      // Log activity
      await (supabase.from('mt_task_activities') as any).insert({
        task_id: taskId,
        user_id: user?.id,
        tenant_id: tenant?.id,
        acao: 'comentou',
        descricao: conteudo.length > 100 ? conteudo.substring(0, 100) + '...' : conteudo,
      });

      // Fire-and-forget WhatsApp notification for comment
      if (taskId) {
        const { data: taskData } = await (supabase.from('mt_tasks') as any)
          .select('*, assignees:mt_task_assignees(user_id)')
          .eq('id', taskId)
          .single();

        if (taskData) {
          const assigneeIds = (taskData.assignees || []).map((a: { user_id: string }) => a.user_id);
          notifyComment(taskData as MTTask, assigneeIds, conteudo);
        }
      }

      return data as MTTaskComment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-task-comments', taskId] });
      queryClient.invalidateQueries({ queryKey: ['mt-task-activities', taskId] });
      toast.success('Comentário adicionado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao comentar: ${error.message}`);
    },
  });

  const updateComment = useMutation({
    mutationFn: async ({ id, conteudo }: { id: string; conteudo: string }) => {
      const { data, error } = await (supabase.from('mt_task_comments') as any)
        .update({ conteudo, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, user:mt_users(id, nome)')
        .single();

      if (error) throw error;
      return data as MTTaskComment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-task-comments', taskId] });
      toast.success('Comentário atualizado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar comentário: ${error.message}`);
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('mt_task_comments') as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-task-comments', taskId] });
      toast.success('Comentário removido');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover comentário: ${error.message}`);
    },
  });

  return {
    comments: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    addComment,
    updateComment,
    deleteComment,
  };
}

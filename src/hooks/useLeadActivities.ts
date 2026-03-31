import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type {
  LeadActivity,
  LeadActivityInsert,
  LeadActivityUpdate,
  LeadActivityType,
  LeadActivityWithRelations,
  ActivityFilters
} from '@/types/lead-crm';

const QUERY_KEY = 'lead_activities';

// Tratamento de erros
function getActivityErrorMessage(error: any): string {
  if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
    return 'Erro de conexão. Verifique sua internet.';
  }
  if (error?.code === '23503') {
    return 'Este registro está vinculado a outros dados.';
  }
  if (error?.code === '42501') {
    return 'Você não tem permissão para esta ação.';
  }
  return error?.message || 'Erro desconhecido';
}

/**
 * Hook para gerenciar atividades de um lead (notas, ligacoes, tarefas, agendamentos, etc)
 * Expandido para 8 tipos de atividade Viniun Sistema
 * Inclui informações do usuário que criou cada atividade
 * @deprecated Use useLeadActivitiesAdapter instead for proper multi-tenant isolation.
 */
export function useLeadActivities(leadId: string | undefined, filters?: ActivityFilters) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const {
    data: activities = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, leadId, filters],
    queryFn: async (): Promise<LeadActivityWithRelations[]> => {
      if (!leadId) return [];

      // JOIN com mt_users para obter nome do usuário que criou a atividade
      let query = supabase
        .from('mt_lead_activities')
        .select(`
          *,
          user:mt_users!created_by(id, nome, full_name, email)
        `)
        .eq('lead_id', leadId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filters?.tipo) {
        if (Array.isArray(filters.tipo)) {
          query = query.in('tipo', filters.tipo);
        } else {
          query = query.eq('tipo', filters.tipo);
        }
      }

      if (filters?.isPinned !== undefined) {
        query = query.eq('is_pinned', filters.isPinned);
      }

      if (filters?.isCompleted !== undefined) {
        query = query.eq('is_completed', filters.isCompleted);
      }

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      if (filters?.responsavelId) {
        query = query.eq('responsavel_id', filters.responsavelId);
      }

      if (filters?.prazoFrom) {
        query = query.gte('data_prazo', filters.prazoFrom);
      }

      if (filters?.prazoTo) {
        query = query.lte('data_prazo', filters.prazoTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Mapear para garantir estrutura correta do user
      return (data || []).map((item: any) => ({
        ...item,
        user: item.user ? {
          id: item.user.id,
          nome: item.user.nome || item.user.full_name || 'Usuário',
          email: item.user.email || '',
        } : null,
      })) as LeadActivityWithRelations[];
    },
    enabled: !!leadId,
    staleTime: 30000,
  });

  // Criar nova atividade
  const createActivity = useMutation({
    mutationFn: async (input: LeadActivityInsert) => {
      const { data, error } = await supabase
        .from('mt_lead_activities')
        .insert({
          ...input,
          created_by: user?.id || null,
          usuario_id: user?.id || null,
          data_atividade: input.data_atividade || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as LeadActivityWithRelations;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, leadId] });
      toast.success('Atividade adicionada');
    },
    onError: (error: any) => {
      console.error('Erro ao criar atividade:', error);
      toast.error(`Erro ao criar atividade: ${getActivityErrorMessage(error)}`);
    },
  });

  // Atualizar atividade
  const updateActivity = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: LeadActivityUpdate;
    }) => {
      const { data, error } = await supabase
        .from('mt_lead_activities')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as LeadActivityWithRelations;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, leadId] });
      toast.success('Atividade atualizada');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar atividade:', error);
      toast.error(`Erro ao atualizar: ${getActivityErrorMessage(error)}`);
    },
  });

  // Marcar como concluída/não concluída
  const toggleComplete = useMutation({
    mutationFn: async (id: string) => {
      const activity = activities.find((a) => a.id === id);
      if (!activity) throw new Error('Atividade não encontrada');

      const { data, error } = await supabase
        .from('mt_lead_activities')
        .update({
          is_completed: !activity.is_completed,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as LeadActivityWithRelations;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, leadId] });
      toast.success(data.is_completed ? 'Marcado como concluído' : 'Marcado como pendente');
    },
    onError: (error: any) => {
      console.error('Erro ao alterar status:', error);
      toast.error(`Erro: ${getActivityErrorMessage(error)}`);
    },
  });

  // Fixar/desfixar atividade
  const togglePin = useMutation({
    mutationFn: async (id: string) => {
      const activity = activities.find((a) => a.id === id);
      if (!activity) throw new Error('Atividade não encontrada');

      const { data, error } = await supabase
        .from('mt_lead_activities')
        .update({
          is_pinned: !activity.is_pinned,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as LeadActivityWithRelations;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, leadId] });
      toast.success(data.is_pinned ? 'Atividade fixada' : 'Atividade desfixada');
    },
    onError: (error: any) => {
      console.error('Erro ao fixar/desfixar:', error);
      toast.error(`Erro: ${getActivityErrorMessage(error)}`);
    },
  });

  // Deletar atividade
  const deleteActivity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_lead_activities')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, leadId] });
      toast.success('Atividade removida');
    },
    onError: (error: any) => {
      console.error('Erro ao remover atividade:', error);
      toast.error(`Erro ao remover: ${getActivityErrorMessage(error)}`);
    },
  });

  // Atualizar resultado de ligação
  const updateCallResult = useMutation({
    mutationFn: async ({
      id,
      resultado_ligacao,
      duracao_minutos,
    }: {
      id: string;
      resultado_ligacao: string;
      duracao_minutos?: number;
    }) => {
      const { data, error } = await supabase
        .from('mt_lead_activities')
        .update({
          resultado_ligacao,
          duracao_minutos,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as LeadActivityWithRelations;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, leadId] });
      toast.success('Resultado da ligação atualizado');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar ligação:', error);
      toast.error(`Erro: ${getActivityErrorMessage(error)}`);
    },
  });

  // Atualizar status de agendamento
  const updateAppointmentStatus = useMutation({
    mutationFn: async ({
      id,
      status_agendamento,
    }: {
      id: string;
      status_agendamento: string;
    }) => {
      const { data, error } = await supabase
        .from('mt_lead_activities')
        .update({
          status_agendamento,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as LeadActivityWithRelations;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, leadId] });
      toast.success('Status do agendamento atualizado');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar agendamento:', error);
      toast.error(`Erro: ${getActivityErrorMessage(error)}`);
    },
  });

  // Estatísticas expandidas
  const stats = {
    total: activities.length,
    completed: activities.filter((a) => a.is_completed).length,
    pending: activities.filter((a) => !a.is_completed).length,
    pinned: activities.filter((a) => a.is_pinned).length,
    byType: {
      nota: activities.filter((a) => a.tipo === 'nota').length,
      ligacao: activities.filter((a) => a.tipo === 'ligacao').length,
      email: activities.filter((a) => a.tipo === 'email').length,
      whatsapp: activities.filter((a) => a.tipo === 'whatsapp').length,
      reuniao: activities.filter((a) => a.tipo === 'reuniao').length,
      agendamento: activities.filter((a) => a.tipo === 'agendamento').length,
      status_change: activities.filter((a) => a.tipo === 'status_change').length,
      tarefa: activities.filter((a) => a.tipo === 'tarefa').length,
    },
    // Tarefas atrasadas
    overdueTasks: activities.filter((a) => {
      if (a.tipo !== 'tarefa' || a.is_completed) return false;
      if (!a.data_prazo) return false;
      return new Date(a.data_prazo) < new Date();
    }).length,
    // Ligações sem resultado
    pendingCalls: activities.filter((a) =>
      a.tipo === 'ligacao' && !a.resultado_ligacao
    ).length,
  };

  return {
    activities,
    isLoading,
    error,
    refetch,
    createActivity: createActivity.mutate,
    createActivityAsync: createActivity.mutateAsync,
    isCreating: createActivity.isPending,
    updateActivity: updateActivity.mutate,
    updateActivityAsync: updateActivity.mutateAsync,
    isUpdating: updateActivity.isPending,
    toggleComplete: toggleComplete.mutate,
    togglePin: togglePin.mutate,
    deleteActivity: deleteActivity.mutate,
    isDeleting: deleteActivity.isPending,
    updateCallResult: updateCallResult.mutate,
    updateAppointmentStatus: updateAppointmentStatus.mutate,
    stats,
  };
}

/**
 * Hook para buscar tarefas pendentes (follow-ups) de todos os leads
 */
export function usePendingFollowUps(franqueadoId?: string) {
  return useQuery({
    queryKey: ['pending_followups', franqueadoId],
    queryFn: async () => {
      let query = supabase
        .from('mt_lead_activities')
        .select(`
          *,
          lead:mt_leads(id, nome, whatsapp)
        `)
        .eq('tipo', 'tarefa')
        .eq('is_completed', false)
        .order('data_prazo', { ascending: true });

      if (franqueadoId) {
        query = query.eq('franqueado_id', franqueadoId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(item => ({
        ...item,
        is_atrasado: item.data_prazo ? new Date(item.data_prazo) < new Date() : false,
        dias_ate_prazo: item.data_prazo
          ? Math.ceil((new Date(item.data_prazo).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : null,
      }));
    },
    enabled: true,
    staleTime: 60000,
  });
}

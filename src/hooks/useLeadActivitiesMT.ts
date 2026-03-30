// =============================================================================
// USE LEAD ACTIVITIES MT - Hook Multi-Tenant para Atividades de Leads
// =============================================================================
//
// Este hook gerencia as atividades/histórico dos leads no sistema multi-tenant.
// Utiliza a tabela mt_lead_activities com isolamento por tenant.
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { sanitizeObjectForJSON } from '@/utils/unicodeSanitizer';
import type {
  MTLeadActivity,
  MTLeadActivityCreate,
  LeadActivityType,
  UseLeadActivitiesMTReturn,
} from '@/types/lead-mt';

// -----------------------------------------------------------------------------
// Constantes
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-lead-activities';

// -----------------------------------------------------------------------------
// Hook Principal: Atividades de um Lead
// -----------------------------------------------------------------------------

export function useLeadActivitiesMT(leadId: string | undefined): UseLeadActivitiesMTReturn {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query: Listar Atividades do Lead
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, leadId, tenant?.id],
    queryFn: async (): Promise<MTLeadActivity[]> => {
      if (!leadId) return [];

      // Nota: tabela usa user_id/user_nome (denormalizado), não precisa join
      const { data, error } = await supabase
        .from('mt_lead_activities')
        .select('*')
        .eq('lead_id', leadId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar atividades MT:', error);
        throw error;
      }

      // Sanitizar Unicode (previne surrogates inválidos)
      return (data || []).map(item => sanitizeObjectForJSON(item)) as MTLeadActivity[];
    },
    enabled: !!leadId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 30, // 30 segundos
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar Atividade
  // ---------------------------------------------------------------------------

  const createActivity = useMutation({
    mutationFn: async (newActivity: MTLeadActivityCreate): Promise<MTLeadActivity> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      if (!newActivity.lead_id) {
        throw new Error('ID do lead é obrigatório.');
      }

      if (!newActivity.descricao?.trim()) {
        throw new Error('Descrição é obrigatória.');
      }

      const activityData: Record<string, unknown> = {
        tenant_id: newActivity.tenant_id || tenant!.id,
        lead_id: newActivity.lead_id,
        tipo: newActivity.tipo || 'nota',
        titulo: newActivity.titulo,
        descricao: newActivity.descricao,
        dados: newActivity.metadata || {},
        user_id: user?.id,
        user_nome: user?.email || 'Sistema',
      };

      // Campos opcionais que podem não existir na tabela
      if (newActivity.data_agendada) {
        activityData.data_agendada = newActivity.data_agendada;
      }

      const { data, error } = await supabase
        .from('mt_lead_activities')
        .insert(activityData)
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao criar atividade MT:', error);
        throw error;
      }

      // Atualizar contador de contatos no lead
      await updateLeadContactCount(newActivity.lead_id, newActivity.tipo);

      return data as MTLeadActivity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, leadId] });
      queryClient.invalidateQueries({ queryKey: ['mt-leads'] });
      toast.success('Atividade registrada!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao registrar atividade');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Toggle Complete (Concluir/Desmarcar Tarefa)
  // ---------------------------------------------------------------------------

  const toggleCompleteMutation = useMutation({
    mutationFn: async (activityId: string): Promise<MTLeadActivity> => {
      // Buscar estado atual (concluida armazenado em dados jsonb)
      const { data: current, error: fetchError } = await supabase
        .from('mt_lead_activities')
        .select('dados')
        .eq('id', activityId)
        .single();

      if (fetchError) throw fetchError;

      const currentDados = (current?.dados as Record<string, unknown>) || {};
      const newConcluida = !currentDados.concluida;

      const { data, error } = await supabase
        .from('mt_lead_activities')
        .update({
          dados: {
            ...currentDados,
            concluida: newConcluida,
            concluida_em: newConcluida ? new Date().toISOString() : null,
          },
        })
        .eq('id', activityId)
        .select()
        .single();

      if (error) throw error;
      return data as MTLeadActivity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, leadId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar tarefa');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Toggle Pin (Fixar/Desfixar)
  // ---------------------------------------------------------------------------

  const togglePinMutation = useMutation({
    mutationFn: async (activityId: string): Promise<MTLeadActivity> => {
      // Buscar estado atual (is_pinned armazenado em dados jsonb)
      const { data: current, error: fetchError } = await supabase
        .from('mt_lead_activities')
        .select('dados')
        .eq('id', activityId)
        .single();

      if (fetchError) throw fetchError;

      const currentDados = (current?.dados as Record<string, unknown>) || {};

      const { data, error } = await supabase
        .from('mt_lead_activities')
        .update({
          dados: {
            ...currentDados,
            is_pinned: !currentDados.is_pinned,
          },
        })
        .eq('id', activityId)
        .select()
        .single();

      if (error) throw error;
      return data as MTLeadActivity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, leadId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar fixação');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Delete Activity
  // ---------------------------------------------------------------------------

  const deleteActivityMutation = useMutation({
    mutationFn: async (activityId: string): Promise<void> => {
      // Soft delete
      const { error } = await supabase
        .from('mt_lead_activities')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', activityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, leadId] });
      toast.success('Atividade removida!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover atividade');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Update Activity (generico)
  // ---------------------------------------------------------------------------

  const updateActivityMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MTLeadActivity> }): Promise<MTLeadActivity> => {
      const { data, error } = await supabase
        .from('mt_lead_activities')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MTLeadActivity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, leadId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar atividade');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Update Call Result
  // ---------------------------------------------------------------------------

  const updateCallResultMutation = useMutation({
    mutationFn: async ({
      activityId,
      resultado,
    }: {
      activityId: string;
      resultado: string;
    }): Promise<MTLeadActivity> => {
      const { data: current, error: fetchError } = await supabase
        .from('mt_lead_activities')
        .select('dados')
        .eq('id', activityId)
        .single();

      if (fetchError) throw fetchError;

      const dados = { ...((current?.dados as Record<string, unknown>) || {}), resultado };

      const { data, error } = await supabase
        .from('mt_lead_activities')
        .update({ dados, resultado })
        .eq('id', activityId)
        .select()
        .single();

      if (error) throw error;
      return data as MTLeadActivity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, leadId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar resultado');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Update Appointment Status
  // ---------------------------------------------------------------------------

  const updateAppointmentStatusMutation = useMutation({
    mutationFn: async ({
      activityId,
      status,
    }: {
      activityId: string;
      status: string;
    }): Promise<MTLeadActivity> => {
      const { data: current, error: fetchError } = await supabase
        .from('mt_lead_activities')
        .select('dados')
        .eq('id', activityId)
        .single();

      if (fetchError) throw fetchError;

      const dados = { ...((current?.dados as Record<string, unknown>) || {}), status };

      const { data, error } = await supabase
        .from('mt_lead_activities')
        .update({ dados })
        .eq('id', activityId)
        .select()
        .single();

      if (error) throw error;
      return data as MTLeadActivity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, leadId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar agendamento');
    },
  });

  // ---------------------------------------------------------------------------
  // Calcular Estatísticas
  // ---------------------------------------------------------------------------

  const stats = {
    total: query.data?.length || 0,
    pending: query.data?.filter((a) => a.tipo === 'tarefa' && !(a as any).dados?.concluida).length || 0,
    completed: query.data?.filter((a) => (a as any).dados?.concluida).length || 0,
    byType: (query.data || []).reduce(
      (acc, a) => {
        acc[a.tipo] = (acc[a.tipo] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
  };

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    activities: query.data || [],
    stats,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: async () => {
      await query.refetch();
    },
    createActivity: {
      mutate: createActivity.mutate,
      mutateAsync: createActivity.mutateAsync,
      isPending: createActivity.isPending,
    },
    // Alias para compatibilidade com LeadMiniCRM
    createActivityAsync: createActivity.mutateAsync,
    isCreating: createActivity.isPending,
    // Métodos avançados
    toggleComplete: toggleCompleteMutation.mutate,
    togglePin: togglePinMutation.mutate,
    deleteActivity: deleteActivityMutation.mutate,
    updateActivity: updateActivityMutation.mutate,
    updateActivityAsync: updateActivityMutation.mutateAsync,
    updateCallResult: updateCallResultMutation.mutate,
    updateAppointmentStatus: updateAppointmentStatusMutation.mutate,
  };
}

// -----------------------------------------------------------------------------
// Helper: Atualizar Contadores no Lead
// -----------------------------------------------------------------------------

async function updateLeadContactCount(leadId: string, tipo: LeadActivityType) {
  const incrementField: Record<string, string> = {
    ligacao: 'total_ligacoes',
    email: 'total_emails',
    whatsapp: 'total_mensagens',
  };

  const field = incrementField[tipo];

  if (field) {
    // Buscar valor atual
    const { data: lead } = await supabase
      .from('mt_leads')
      .select(field)
      .eq('id', leadId)
      .single();

    if (lead) {
      const currentValue = (lead as any)[field] || 0;

      await supabase
        .from('mt_leads')
        .update({
          [field]: currentValue + 1,
          total_contatos: (lead as any).total_contatos + 1 || 1,
          ultimo_contato: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);
    }
  } else {
    // Apenas atualizar ultimo_contato e total_contatos
    const { data: lead } = await supabase
      .from('mt_leads')
      .select('total_contatos')
      .eq('id', leadId)
      .single();

    if (lead) {
      await supabase
        .from('mt_leads')
        .update({
          total_contatos: (lead.total_contatos || 0) + 1,
          ultimo_contato: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);
    }
  }
}

// -----------------------------------------------------------------------------
// Hook: Registrar Mudança de Status
// -----------------------------------------------------------------------------

export function useLogStatusChangeMT() {
  const { tenant } = useTenantContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      statusAnterior,
      statusNovo,
    }: {
      leadId: string;
      statusAnterior: string;
      statusNovo: string;
    }): Promise<MTLeadActivity> => {
      if (!tenant) {
        throw new Error('Tenant não definido.');
      }

      const { data, error } = await supabase
        .from('mt_lead_activities')
        .insert({
          tenant_id: tenant.id,
          lead_id: leadId,
          tipo: 'status_change',
          titulo: 'Mudança de Status',
          descricao: `Status alterado de "${statusAnterior}" para "${statusNovo}"`,
          status_anterior: statusAnterior,
          status_novo: statusNovo,
          user_id: user?.id,
          user_nome: user?.email || 'Sistema',
        })
        .select()
        .single();

      if (error) throw error;
      return data as MTLeadActivity;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.leadId] });
    },
  });
}

// -----------------------------------------------------------------------------
// Hook: Adicionar Nota
// -----------------------------------------------------------------------------

export function useAddNoteMT() {
  const { tenant } = useTenantContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      nota,
      titulo,
    }: {
      leadId: string;
      nota: string;
      titulo?: string;
    }): Promise<MTLeadActivity> => {
      if (!tenant) {
        throw new Error('Tenant não definido.');
      }

      if (!nota?.trim()) {
        throw new Error('Nota é obrigatória.');
      }

      const { data, error } = await supabase
        .from('mt_lead_activities')
        .insert({
          tenant_id: tenant.id,
          lead_id: leadId,
          tipo: 'nota',
          titulo: titulo || 'Nota',
          descricao: nota,
          user_id: user?.id,
          user_nome: user?.email || 'Sistema',
        })
        .select('*')
        .single();

      if (error) throw error;
      return data as MTLeadActivity;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.leadId] });
      toast.success('Nota adicionada!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao adicionar nota');
    },
  });
}

// -----------------------------------------------------------------------------
// Hook: Registrar Ligação
// -----------------------------------------------------------------------------

export function useLogCallMT() {
  const { tenant } = useTenantContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      descricao,
      duracao,
      resultado,
    }: {
      leadId: string;
      descricao: string;
      duracao?: number; // em segundos
      resultado?: 'atendeu' | 'nao_atendeu' | 'ocupado' | 'caixa_postal';
    }): Promise<MTLeadActivity> => {
      if (!tenant) {
        throw new Error('Tenant não definido.');
      }

      const { data, error } = await supabase
        .from('mt_lead_activities')
        .insert({
          tenant_id: tenant.id,
          lead_id: leadId,
          tipo: 'ligacao',
          titulo: 'Ligação',
          descricao,
          dados: {
            duracao,
            resultado,
          },
          duracao_segundos: duracao,
          resultado,
          user_id: user?.id,
          user_nome: user?.email || 'Sistema',
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar contadores
      await updateLeadContactCount(leadId, 'ligacao');

      return data as MTLeadActivity;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['mt-leads'] });
      toast.success('Ligação registrada!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao registrar ligação');
    },
  });
}

// -----------------------------------------------------------------------------
// Hook: Criar Tarefa
// -----------------------------------------------------------------------------

export function useCreateTaskMT() {
  const { tenant } = useTenantContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      titulo,
      descricao,
      dataAgendada,
    }: {
      leadId: string;
      titulo: string;
      descricao: string;
      dataAgendada: string;
    }): Promise<MTLeadActivity> => {
      if (!tenant) {
        throw new Error('Tenant não definido.');
      }

      const { data, error } = await supabase
        .from('mt_lead_activities')
        .insert({
          tenant_id: tenant.id,
          lead_id: leadId,
          tipo: 'tarefa',
          titulo,
          descricao,
          dados: { data_agendada: dataAgendada, concluida: false },
          user_id: user?.id,
          user_nome: user?.email || 'Sistema',
        })
        .select()
        .single();

      if (error) throw error;
      return data as MTLeadActivity;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.leadId] });
      toast.success('Tarefa criada!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar tarefa');
    },
  });
}

// -----------------------------------------------------------------------------
// Hook: Concluir Tarefa
// -----------------------------------------------------------------------------

export function useCompleteTaskMT() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      activityId,
      leadId,
    }: {
      activityId: string;
      leadId: string;
    }): Promise<MTLeadActivity> => {
      // Buscar dados atuais para merge no jsonb
      const { data: current, error: fetchError } = await supabase
        .from('mt_lead_activities')
        .select('dados')
        .eq('id', activityId)
        .single();

      if (fetchError) throw fetchError;

      const currentDados = (current?.dados as Record<string, unknown>) || {};

      const { data, error } = await supabase
        .from('mt_lead_activities')
        .update({
          dados: {
            ...currentDados,
            concluida: true,
            concluida_em: new Date().toISOString(),
          },
        })
        .eq('id', activityId)
        .select()
        .single();

      if (error) throw error;
      return data as MTLeadActivity;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.leadId] });
      toast.success('Tarefa concluída!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao concluir tarefa');
    },
  });
}

// -----------------------------------------------------------------------------
// Hook: Tarefas Pendentes
// -----------------------------------------------------------------------------

export function usePendingTasksMT() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const { user } = useAuth();

  return useQuery({
    queryKey: [QUERY_KEY, 'pending', tenant?.id, franchise?.id, user?.id],
    queryFn: async (): Promise<MTLeadActivity[]> => {
      let q = supabase
        .from('mt_lead_activities')
        .select(`
          *,
          lead:mt_leads!mt_lead_activities_lead_id_fkey (
            id,
            nome,
            telefone,
            status
          )
        `)
        .eq('tipo', 'tarefa')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Filtros por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      // Filtrar por usuário atual
      if (user?.id) {
        q = q.eq('user_id', user.id);
      }

      const { data, error } = await q;

      if (error) throw error;
      // Filtrar tarefas não concluídas via dados jsonb
      return ((data || []) as MTLeadActivity[]).filter(
        (a) => !(a as any).dados?.concluida
      );
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60, // 1 minuto
  });
}

export default useLeadActivitiesMT;

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantContext } from '@/contexts/TenantContext';
import type {
  Appointment,
  AppointmentWithRelations,
  AppointmentInsert,
  AppointmentUpdate,
  AppointmentFilters,
  AppointmentStatus,
} from '@/types/appointment';

const QUERY_KEY = 'mt-appointments';

/**
 * Mapeia colunas reais do mt_appointments para o formato esperado pelo tipo Appointment.
 * DB usa: data_agendamento, hora_inicio, hora_fim, servico_nome, observacoes
 * Frontend espera: data_inicio, data_fim, titulo, descricao, tipo, cor
 */
function mapAppointmentFromDB(row: any): any {
  return {
    ...row,
    // Combinar data + hora para criar data_inicio/data_fim ISO
    data_inicio: row.data_agendamento && row.hora_inicio
      ? `${row.data_agendamento}T${row.hora_inicio}`
      : row.data_agendamento || row.created_at,
    data_fim: row.data_agendamento && row.hora_fim
      ? `${row.data_agendamento}T${row.hora_fim}`
      : null,
    // Campos mapeados
    titulo: row.servico_nome || 'Agendamento',
    descricao: row.observacoes || null,
    tipo: row.servico_nome ? 'procedimento' : 'consulta',
    cor: undefined,
  };
}

/**
 * Aplica filtros de tenant/franchise baseado no nível de acesso
 */
function applyTenantFilters(
  query: any,
  accessLevel: string,
  tenant: any,
  franchise: any,
) {
  if (accessLevel === 'tenant' && tenant) {
    return query.eq('tenant_id', tenant.id);
  } else if (accessLevel === 'franchise' && franchise) {
    return query.eq('franchise_id', franchise.id);
  } else if (accessLevel !== 'platform' && tenant) {
    return query.eq('tenant_id', tenant.id);
  }
  return query;
}

/**
 * Hook para gerenciar agendamentos (MT)
 */
export function useAppointments(filters?: AppointmentFilters) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const {
    data: appointments = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, filters],
    queryFn: async (): Promise<AppointmentWithRelations[]> => {
      let query = supabase
        .from('mt_appointments')
        .select(`
          *,
          lead:mt_leads(id, nome, whatsapp, email)
        `)
        .order('data_agendamento', { ascending: true });

      // Isolamento multi-tenant
      query = applyTenantFilters(query, accessLevel, tenant, franchise);

      // Aplicar filtros
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters?.tipo) {
        if (Array.isArray(filters.tipo)) {
          query = query.in('servico_nome', filters.tipo);
        } else {
          query = query.eq('servico_nome', filters.tipo);
        }
      }

      if (filters?.dateFrom) {
        query = query.gte('data_agendamento', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('data_agendamento', filters.dateTo);
      }

      if (filters?.leadId) {
        query = query.eq('lead_id', filters.leadId);
      }

      if (filters?.assignedTo) {
        query = query.eq('profissional_id', filters.assignedTo);
      }

      if (filters?.search) {
        query = query.or(`servico_nome.ilike.%${filters.search}%,observacoes.ilike.%${filters.search}%,cliente_nome.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(mapAppointmentFromDB) as AppointmentWithRelations[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 30000,
  });

  // Buscar por lead específico
  const fetchByLead = async (leadId: string): Promise<AppointmentWithRelations[]> => {
    let query = supabase
      .from('mt_appointments')
      .select(`
        *,
        lead:mt_leads(id, nome, whatsapp, email)
      `)
      .eq('lead_id', leadId)
      .order('data_agendamento', { ascending: false });

    query = applyTenantFilters(query, accessLevel, tenant, franchise);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapAppointmentFromDB) as AppointmentWithRelations[];
  };

  // Buscar por período
  const fetchByDateRange = async (startDate: string, endDate: string, franqueadoId?: string): Promise<AppointmentWithRelations[]> => {
    let query = supabase
      .from('mt_appointments')
      .select(`
        *,
        lead:mt_leads(id, nome, whatsapp)
      `)
      .gte('data_agendamento', startDate)
      .lte('data_agendamento', endDate)
      .order('data_agendamento', { ascending: true });

    // Filtro explícito de franquia tem prioridade
    if (franqueadoId) {
      query = query.eq('franchise_id', franqueadoId);
    } else {
      query = applyTenantFilters(query, accessLevel, tenant, franchise);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(mapAppointmentFromDB) as AppointmentWithRelations[];
  };

  // Criar agendamento
  const createAppointment = useMutation({
    mutationFn: async (input: AppointmentInsert) => {
      const { data, error } = await supabase
        .from('mt_appointments')
        .insert({
          ...input,
          tenant_id: tenant?.id,
          franchise_id: franchise?.id || input.franchise_id,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  // Atualizar agendamento
  const updateAppointment = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: AppointmentUpdate;
    }) => {
      const { data, error } = await supabase
        .from('mt_appointments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  // Atualizar status
  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: AppointmentStatus;
    }) => {
      const { data, error } = await supabase
        .from('mt_appointments')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  // Deletar agendamento
  const deleteAppointment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  // Estatísticas
  const stats = {
    total: appointments.length,
    agendado: appointments.filter(a => a.status === 'agendado').length,
    confirmado: appointments.filter(a => a.status === 'confirmado').length,
    concluido: appointments.filter(a => a.status === 'concluido').length,
    cancelado: appointments.filter(a => a.status === 'cancelado').length,
    nao_compareceu: appointments.filter(a => a.status === 'nao_compareceu').length,
  };

  return {
    appointments,
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,
    fetchByLead,
    fetchByDateRange,
    createAppointment: createAppointment.mutate,
    createAppointmentAsync: createAppointment.mutateAsync,
    isCreating: createAppointment.isPending,
    updateAppointment: updateAppointment.mutate,
    updateAppointmentAsync: updateAppointment.mutateAsync,
    isUpdating: updateAppointment.isPending,
    updateStatus: updateStatus.mutate,
    deleteAppointment: deleteAppointment.mutate,
    isDeleting: deleteAppointment.isPending,
    stats,
  };
}

/**
 * Hook para agendamentos de um lead específico (MT)
 */
export function useLeadAppointments(leadId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const {
    data: appointments = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, 'lead', leadId, tenant?.id],
    queryFn: async (): Promise<AppointmentWithRelations[]> => {
      if (!leadId) return [];

      let query = supabase
        .from('mt_appointments')
        .select('*')
        .eq('lead_id', leadId)
        .order('data_agendamento', { ascending: false });

      // Isolamento multi-tenant
      query = applyTenantFilters(query, accessLevel, tenant, franchise);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapAppointmentFromDB) as AppointmentWithRelations[];
    },
    enabled: !!leadId && !isTenantLoading,
    staleTime: 30000,
  });

  // Criar agendamento para o lead
  const createAppointment = useMutation({
    mutationFn: async (input: Omit<AppointmentInsert, 'lead_id'>) => {
      const { data, error } = await supabase
        .from('mt_appointments')
        .insert({
          ...input,
          lead_id: leadId,
          tenant_id: tenant?.id,
          franchise_id: franchise?.id,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'lead', leadId] });
    },
  });

  // Atualizar status
  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: AppointmentStatus;
    }) => {
      const { data, error } = await supabase
        .from('mt_appointments')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'lead', leadId] });
    },
  });

  // Deletar agendamento
  const deleteAppointment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'lead', leadId] });
    },
  });

  // Separar futuros e passados
  const now = new Date();
  const futureAppointments = appointments.filter(
    a => new Date(a.data_inicio) >= now && !['concluido', 'cancelado', 'nao_compareceu'].includes(a.status)
  );
  const pastAppointments = appointments.filter(
    a => new Date(a.data_inicio) < now || ['concluido', 'cancelado', 'nao_compareceu'].includes(a.status)
  );

  return {
    appointments,
    futureAppointments,
    pastAppointments,
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,
    createAppointment: createAppointment.mutate,
    createAppointmentAsync: createAppointment.mutateAsync,
    isCreating: createAppointment.isPending,
    updateStatus: updateStatus.mutate,
    deleteAppointment: deleteAppointment.mutate,
    isDeleting: deleteAppointment.isPending,
  };
}

/**
 * Hook para agendamentos do dia (MT)
 */
export function useTodayAppointments(franqueadoId?: string) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  return useQuery({
    queryKey: [QUERY_KEY, 'today', tenant?.id, franqueadoId],
    queryFn: async (): Promise<AppointmentWithRelations[]> => {
      let query = supabase
        .from('mt_appointments')
        .select(`
          *,
          lead:mt_leads(id, nome, whatsapp)
        `)
        .gte('data_agendamento', startOfDay)
        .lte('data_agendamento', endOfDay)
        .order('data_agendamento', { ascending: true });

      // Filtro explícito de franquia tem prioridade
      if (franqueadoId) {
        query = query.eq('franchise_id', franqueadoId);
      } else {
        query = applyTenantFilters(query, accessLevel, tenant, franchise);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(mapAppointmentFromDB) as AppointmentWithRelations[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 60000,
  });
}

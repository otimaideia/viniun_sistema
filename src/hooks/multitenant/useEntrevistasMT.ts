import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { Entrevista, EntrevistaWithDetails, EntrevistaStatus, EntrevistaTipo, Recomendacao } from '@/types/recrutamento';

// =============================================================================
// TIPOS DE INPUT
// =============================================================================

export interface EntrevistaFilters {
  status?: EntrevistaStatus;
  tipo?: EntrevistaTipo;
  candidateId?: string;
  positionId?: string;
  entrevistadorId?: string;
  periodo?: 'hoje' | 'semana' | 'passadas' | 'todas';
}

export interface EntrevistaCreateInput {
  candidate_id: string;
  position_id: string;
  data_entrevista: string;
  duracao_minutos?: number;
  local_ou_link?: string;
  tipo?: EntrevistaTipo;
  entrevistador_id?: string;
  entrevistador_nome?: string;
  etapa?: number;
  etapa_nome?: string;
}

export interface EntrevistaUpdateInput extends Partial<EntrevistaCreateInput> {
  id: string;
  status?: EntrevistaStatus;
  nota?: number;
  feedback?: string;
  recomendacao?: Recomendacao;
}

const QUERY_KEY = 'mt-entrevistas';

// =============================================================================
// HELPERS
// =============================================================================

function getDateRange(periodo?: string): { start?: string; end?: string } {
  if (!periodo || periodo === 'todas') return {};

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (periodo === 'hoje') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { start: today.toISOString(), end: tomorrow.toISOString() };
  }

  if (periodo === 'semana') {
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 7);
    return { start: monday.toISOString(), end: sunday.toISOString() };
  }

  if (periodo === 'passadas') {
    return { end: today.toISOString() };
  }

  return {};
}

// =============================================================================
// HOOK: useEntrevistasMT
// =============================================================================

export function useEntrevistasMT(filters?: EntrevistaFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---- Query: listar entrevistas ----
  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, accessLevel, filters],
    queryFn: async () => {
      let q = supabase
        .from('mt_interviews')
        .select(`
          *,
          candidate:mt_candidates!mt_interviews_candidate_id_fkey(
            id, nome, email, telefone, whatsapp, status
          ),
          position:mt_job_positions!mt_interviews_position_id_fkey(
            id, titulo
          ),
          entrevistador:mt_users!mt_interviews_entrevistador_id_fkey(
            id, nome, email
          )
        `)
        .order('data_entrevista', { ascending: true });

      // Filtro por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('tenant_id', tenant!.id);
      }

      // Filtros opcionais
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.tipo) q = q.eq('tipo', filters.tipo);
      if (filters?.candidateId) q = q.eq('candidate_id', filters.candidateId);
      if (filters?.positionId) q = q.eq('position_id', filters.positionId);
      if (filters?.entrevistadorId) q = q.eq('entrevistador_id', filters.entrevistadorId);

      // Filtro por período
      const { start, end } = getDateRange(filters?.periodo);
      if (start) q = q.gte('data_entrevista', start);
      if (end) q = q.lt('data_entrevista', end);

      const { data, error } = await q;
      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }
      return (data || []) as EntrevistaWithDetails[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ---- Mutation: criar entrevista ----
  const createEntrevista = useMutation({
    mutationFn: async (input: EntrevistaCreateInput) => {
      if (!tenant && accessLevel !== 'platform') throw new Error('Tenant não definido');

      const { data, error } = await supabase
        .from('mt_interviews')
        .insert({
          ...input,
          tenant_id: tenant!.id,
          status: 'agendada',
          duracao_minutos: input.duracao_minutos || 60,
          etapa: input.etapa || 1,
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-atualizar status do candidato para 'entrevista'
      await supabase
        .from('mt_candidates')
        .update({ status: 'entrevista', updated_at: new Date().toISOString() })
        .eq('id', input.candidate_id);

      return data as Entrevista;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['mt-candidatos'] });
      toast.success('Entrevista agendada com sucesso');
    },
    onError: (error: Error) => toast.error(`Erro ao agendar entrevista: ${error.message}`),
  });

  // ---- Mutation: atualizar entrevista ----
  const updateEntrevista = useMutation({
    mutationFn: async ({ id, ...updates }: EntrevistaUpdateInput) => {
      const { data, error } = await supabase
        .from('mt_interviews')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Entrevista;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Entrevista atualizada');
    },
    onError: (error: Error) => toast.error(`Erro ao atualizar entrevista: ${error.message}`),
  });

  // ---- Mutation: atualizar status ----
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EntrevistaStatus }) => {
      const { data, error } = await supabase
        .from('mt_interviews')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Entrevista;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['mt-candidatos'] });
      const labels: Record<string, string> = {
        agendada: 'reagendada', confirmada: 'confirmada',
        realizada: 'marcada como realizada', cancelada: 'cancelada',
        no_show: 'marcada como não compareceu',
      };
      toast.success(`Entrevista ${labels[status] || status}`);
    },
    onError: (error: Error) => toast.error(`Erro ao atualizar status: ${error.message}`),
  });

  // ---- Mutation: deletar entrevista ----
  const deleteEntrevista = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_interviews')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['mt-candidatos'] });
      toast.success('Entrevista excluída');
    },
    onError: (error: Error) => toast.error(`Erro ao excluir entrevista: ${error.message}`),
  });

  return {
    entrevistas: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    createEntrevista,
    updateEntrevista,
    updateStatus,
    deleteEntrevista,
    isCreating: createEntrevista.isPending,
    isUpdating: updateEntrevista.isPending,
    isDeleting: deleteEntrevista.isPending,
  };
}

// Hook individual
export function useEntrevistaMT(id: string | undefined) {
  return useQuery({
    queryKey: ['mt-entrevistas', 'detail', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('mt_interviews')
        .select(`
          *,
          candidate:mt_candidates!mt_interviews_candidate_id_fkey(
            id, nome, email, telefone, whatsapp, status
          ),
          position:mt_job_positions!mt_interviews_position_id_fkey(
            id, titulo
          ),
          entrevistador:mt_users!mt_interviews_entrevistador_id_fkey(
            id, nome, email
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as EntrevistaWithDetails;
    },
    enabled: !!id,
  });
}

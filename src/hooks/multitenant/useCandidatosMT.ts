import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { Candidato, CandidatoWithDetails, CandidatoStatus } from '@/types/recrutamento';

// =============================================================================
// TIPOS DE INPUT
// =============================================================================

export interface CandidatoFilters {
  status?: CandidatoStatus;
  positionId?: string;
  cidade?: string;
  disponibilidade?: string;
  search?: string;
}

export interface CandidatoCreateInput {
  nome: string;
  email: string;
  telefone?: string;
  whatsapp?: string;
  cpf?: string;
  data_nascimento?: string;
  cidade?: string;
  estado?: string;
  formacao?: string;
  experiencia?: string;
  curriculo_url?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  pretensao_salarial?: number;
  disponibilidade?: string;
  position_id?: string;
  notas?: string;
  status?: CandidatoStatus;
}

export interface CandidatoUpdateInput extends Partial<CandidatoCreateInput> {
  id: string;
  rating?: number;
  avaliado_por?: string;
}

const QUERY_KEY = 'mt-candidatos';

// =============================================================================
// HOOK: useCandidatosMT
// =============================================================================

export function useCandidatosMT(filters?: CandidatoFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---- Query: listar candidatos ----
  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, accessLevel, filters],
    queryFn: async () => {
      let q = supabase
        .from('mt_candidates')
        .select(`
          *,
          position:mt_job_positions!mt_candidates_position_id_fkey(
            id, titulo, departamento, status
          ),
          tenant:mt_tenants!mt_candidates_tenant_id_fkey(
            id, slug, nome_fantasia
          )
        `)
        .order('created_at', { ascending: false });

      // Filtro por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        // Candidatos não têm franchise_id direto, filtrar via position
        q = q.eq('tenant_id', tenant!.id);
      }

      // Filtros opcionais
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.positionId) q = q.eq('position_id', filters.positionId);
      if (filters?.cidade) q = q.ilike('cidade', `%${filters.cidade}%`);
      if (filters?.disponibilidade) q = q.eq('disponibilidade', filters.disponibilidade);
      if (filters?.search) {
        q = q.or(`nome.ilike.%${filters.search}%,email.ilike.%${filters.search}%,telefone.ilike.%${filters.search}%,whatsapp.ilike.%${filters.search}%`);
      }

      const { data, error } = await q;
      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }
      return (data || []) as CandidatoWithDetails[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ---- Mutation: criar candidato ----
  const createCandidato = useMutation({
    mutationFn: async (input: CandidatoCreateInput) => {
      if (!tenant && accessLevel !== 'platform') throw new Error('Tenant não definido');

      const { data, error } = await supabase
        .from('mt_candidates')
        .insert({
          ...input,
          tenant_id: tenant!.id,
          status: input.status || 'novo',
        })
        .select()
        .single();

      if (error) throw error;
      return data as Candidato;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['mt-vagas'] });
      toast.success('Candidato cadastrado com sucesso');
    },
    onError: (error: Error) => toast.error(`Erro ao cadastrar candidato: ${error.message}`),
  });

  // ---- Mutation: atualizar candidato ----
  const updateCandidato = useMutation({
    mutationFn: async ({ id, ...updates }: CandidatoUpdateInput) => {
      const { data, error } = await supabase
        .from('mt_candidates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Candidato;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Candidato atualizado com sucesso');
    },
    onError: (error: Error) => toast.error(`Erro ao atualizar candidato: ${error.message}`),
  });

  // ---- Mutation: atualizar status ----
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CandidatoStatus }) => {
      const { data, error } = await supabase
        .from('mt_candidates')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Candidato;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['mt-vagas'] });
      const labels: Record<string, string> = {
        novo: 'marcado como Novo',
        em_analise: 'movido para Análise',
        entrevista: 'agendado para Entrevista',
        aprovado: 'aprovado',
        reprovado: 'reprovado',
        desistiu: 'marcado como Desistiu',
        contratado: 'contratado',
      };
      toast.success(`Candidato ${labels[status] || status}`);
    },
    onError: (error: Error) => toast.error(`Erro ao atualizar status: ${error.message}`),
  });

  // ---- Mutation: atualizar rating ----
  const updateRating = useMutation({
    mutationFn: async ({ id, rating, avaliado_por }: { id: string; rating: number; avaliado_por?: string }) => {
      const { data, error } = await supabase
        .from('mt_candidates')
        .update({ rating, avaliado_por, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Candidato;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Avaliação salva');
    },
    onError: (error: Error) => toast.error(`Erro ao avaliar: ${error.message}`),
  });

  // ---- Mutation: deletar candidato ----
  const deleteCandidato = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_candidates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['mt-vagas'] });
      queryClient.invalidateQueries({ queryKey: ['mt-entrevistas'] });
      toast.success('Candidato excluído');
    },
    onError: (error: Error) => toast.error(`Erro ao excluir candidato: ${error.message}`),
  });

  return {
    candidatos: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    createCandidato,
    updateCandidato,
    updateStatus,
    updateRating,
    deleteCandidato,
    isCreating: createCandidato.isPending,
    isUpdating: updateCandidato.isPending,
    isDeleting: deleteCandidato.isPending,
  };
}

// Hook individual
export function useCandidatoMT(id: string | undefined) {
  return useQuery({
    queryKey: ['mt-candidatos', 'detail', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('mt_candidates')
        .select(`
          *,
          position:mt_job_positions!mt_candidates_position_id_fkey(
            id, titulo, departamento, status
          ),
          tenant:mt_tenants!mt_candidates_tenant_id_fkey(
            id, slug, nome_fantasia
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as CandidatoWithDetails;
    },
    enabled: !!id,
  });
}

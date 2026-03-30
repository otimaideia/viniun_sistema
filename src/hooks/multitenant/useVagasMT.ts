import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { Vaga, VagaWithDetails, VagaStatus } from '@/types/recrutamento';

// =============================================================================
// TIPOS DE INPUT
// =============================================================================

export interface VagaFilters {
  status?: VagaStatus;
  franchiseId?: string;
  departamento?: string;
  modalidade?: string;
  search?: string;
}

export interface VagaCreateInput {
  titulo: string;
  descricao?: string;
  requisitos?: string;
  beneficios?: string;
  departamento?: string;
  nivel?: string;
  tipo_contrato?: string;
  modalidade?: string;
  faixa_salarial_min?: number;
  faixa_salarial_max?: number;
  exibir_salario?: boolean;
  quantidade_vagas?: number;
  franchise_id?: string;
  status?: VagaStatus;
  expira_em?: string;
}

export interface VagaUpdateInput extends Partial<VagaCreateInput> {
  id: string;
}

const QUERY_KEY = 'mt-vagas';

// =============================================================================
// HOOK: useVagasMT
// =============================================================================

export function useVagasMT(filters?: VagaFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---- Query: listar vagas ----
  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, accessLevel, filters],
    queryFn: async () => {
      let q = supabase
        .from('mt_job_positions')
        .select(`
          *,
          franchise:mt_franchises!mt_job_positions_franchise_id_fkey(
            id, nome_fantasia, cidade, estado
          ),
          candidatos_count:mt_candidates(count)
        `)
        .order('created_at', { ascending: false });

      // Filtro por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('tenant_id', tenant!.id).eq('franchise_id', franchise.id);
      }

      // Filtros opcionais
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.franchiseId) q = q.eq('franchise_id', filters.franchiseId);
      if (filters?.departamento) q = q.eq('departamento', filters.departamento);
      if (filters?.modalidade) q = q.eq('modalidade', filters.modalidade);
      if (filters?.search) q = q.ilike('titulo', `%${filters.search}%`);

      const { data, error } = await q;
      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }
      // Mapear contagem real de candidatos para total_candidatos
      return (data || []).map((v: any) => ({
        ...v,
        total_candidatos: v.candidatos_count?.[0]?.count || 0,
      })) as VagaWithDetails[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ---- Query: buscar vaga individual ----
  const useVaga = (id: string | undefined) =>
    useQuery({
      queryKey: [QUERY_KEY, 'detail', id],
      queryFn: async () => {
        if (!id) return null;
        const { data, error } = await supabase
          .from('mt_job_positions')
          .select(`
            *,
            franchise:mt_franchises!mt_job_positions_franchise_id_fkey(
              id, nome_fantasia, cidade, estado
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        return data as VagaWithDetails;
      },
      enabled: !!id,
    });

  // ---- Mutation: criar vaga ----
  const createVaga = useMutation({
    mutationFn: async (input: VagaCreateInput) => {
      if (!tenant && accessLevel !== 'platform') throw new Error('Tenant não definido');

      const insertData = {
        ...input,
        tenant_id: tenant!.id,
        franchise_id: input.franchise_id || franchise?.id || null,
        status: input.status || 'rascunho',
        quantidade_vagas: input.quantidade_vagas || 1,
        exibir_salario: input.exibir_salario ?? false,
      };

      const { data, error } = await supabase
        .from('mt_job_positions')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data as Vaga;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Vaga criada com sucesso');
    },
    onError: (error: Error) => toast.error(`Erro ao criar vaga: ${error.message}`),
  });

  // ---- Mutation: atualizar vaga ----
  const updateVaga = useMutation({
    mutationFn: async ({ id, ...updates }: VagaUpdateInput) => {
      const { data, error } = await supabase
        .from('mt_job_positions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Vaga;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Vaga atualizada com sucesso');
    },
    onError: (error: Error) => toast.error(`Erro ao atualizar vaga: ${error.message}`),
  });

  // ---- Mutation: atualizar status ----
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: VagaStatus }) => {
      const updates: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'aberta') {
        updates.publicada = true;
        updates.publicada_em = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('mt_job_positions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Vaga;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      const labels: Record<string, string> = {
        aberta: 'publicada', pausada: 'pausada', encerrada: 'encerrada', rascunho: 'salva como rascunho',
      };
      toast.success(`Vaga ${labels[status] || status}`);
    },
    onError: (error: Error) => toast.error(`Erro ao atualizar status: ${error.message}`),
  });

  // ---- Mutation: deletar vaga ----
  const deleteVaga = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_job_positions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Vaga excluída com sucesso');
    },
    onError: (error: Error) => toast.error(`Erro ao excluir vaga: ${error.message}`),
  });

  return {
    vagas: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    useVaga,
    createVaga,
    updateVaga,
    updateStatus,
    deleteVaga,
    isCreating: createVaga.isPending,
    isUpdating: updateVaga.isPending,
    isDeleting: deleteVaga.isPending,
  };
}

// Hook independente para buscar vaga individual (NÃO instancia useVagasMT)
export function useVagaMT(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('mt_job_positions')
        .select(`
          *,
          franchise:mt_franchises!mt_job_positions_franchise_id_fkey(
            id, nome_fantasia, cidade, estado
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as VagaWithDetails;
    },
    enabled: !!id,
  });
}

// =============================================================================
// USE PROMOCAO CADASTROS ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter 100% MT para cadastros de promoções
// SISTEMA 100% MT - Usa mt_form_submissions para cadastros de promoções
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { PromocaoCadastro } from '@/types/promocao';
import type { LeadStatus } from '@/types/lead-mt';

// =============================================================================
// Query Key
// =============================================================================

const QUERY_KEY = 'mt-promocao-cadastros';

// =============================================================================
// Hook Principal
// =============================================================================

export function usePromocaoCadastrosAdapter() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ==========================================================================
  // Query: Buscar Cadastros
  // ==========================================================================
  const {
    data: cadastros = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, accessLevel],
    queryFn: async (): Promise<PromocaoCadastro[]> => {
      // Busca cadastros da tabela mt_form_submissions
      // Filtra por formulários de promoção através do join com mt_forms
      let query = supabase
        .from('mt_form_submissions')
        .select(`
          id,
          form_id,
          tenant_id,
          franchise_id,
          lead_id,
          dados,
          status,
          created_at,
          form:mt_forms!form_id(id, nome, slug),
          franchise:mt_franchises!franchise_id(id, codigo, nome_fantasia)
        `)
        .eq('form_type', 'promocao')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Filtrar por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        query = query.eq('franchise_id', franchise.id);
      }

      const { data, error } = await query;

      if (error) {
        // Se erro de coluna não existe ou tabela não existe, retornar vazio
        if (error.code === '42703' || error.code === '42P01') {
          console.warn('[MT] Tabela/coluna não encontrada, retornando vazio:', error.message);
          return [];
        }
        console.error('[MT] Erro ao buscar cadastros:', error);
        throw error;
      }

      // Mapear para formato PromocaoCadastro
      return (data || []).map((row: any) => {
        const submissionData = row.dados || {};
        return {
          id: row.id,
          nome: submissionData.nome || '',
          email: submissionData.email || '',
          telefone: submissionData.telefone || '',
          whatsapp: submissionData.whatsapp || submissionData.telefone || '',
          unidade: row.franchise?.nome_fantasia || submissionData.unidade || '',
          status: (row.status || submissionData.status || 'novo') as LeadStatus,
          aceita_contato: submissionData.aceita_contato ?? true,
          quantidade_indicacoes: submissionData.quantidade_indicacoes || 0,
          created_at: row.created_at,
          updated_at: row.updated_at || row.created_at,
          tenant_id: row.tenant_id,
          franchise_id: row.franchise_id,
        };
      }) as PromocaoCadastro[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ==========================================================================
  // Mutation: Atualizar Status
  // ==========================================================================
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      // mt_form_submissions não tem updated_at, apenas status
      const { data, error } = await supabase
        .from('mt_form_submissions')
        .update({ status })
        .eq('id', id)
        .select();

      if (error) {
        console.error('[MT] Erro ao atualizar status:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Status atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Atualizar Cadastro
  // ==========================================================================
  const updateCadastroMutation = useMutation({
    mutationFn: async ({ id, data: updateData }: { id: string; data: Partial<PromocaoCadastro> }) => {
      // Buscar dados atuais (coluna é 'dados', não 'data')
      const { data: current, error: fetchError } = await supabase
        .from('mt_form_submissions')
        .select('dados')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('[MT] Erro ao buscar cadastro:', fetchError);
        throw fetchError;
      }

      // Mesclar dados
      const updatedDados = {
        ...(current?.dados || {}),
        ...updateData,
      };

      // mt_form_submissions não tem updated_at
      const { data: updated, error } = await supabase
        .from('mt_form_submissions')
        .update({
          dados: updatedDados,
          status: updateData.status,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[MT] Erro ao atualizar cadastro:', error);
        throw error;
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Cadastro atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar cadastro: ${error.message}`);
    },
  });

  return {
    cadastros,
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,
    isFetching,
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
    updateCadastro: updateCadastroMutation.mutateAsync,
    isUpdatingCadastro: updateCadastroMutation.isPending,

    // Context info
    tenant,
    franchise,
    accessLevel,

    _mode: 'mt' as const,
  };
}

// =============================================================================
// Re-export Types
// =============================================================================

export type { PromocaoCadastro } from '@/types/promocao';

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getPromocaoCadastrosMode(): 'mt' {
  return 'mt';
}

export default usePromocaoCadastrosAdapter;

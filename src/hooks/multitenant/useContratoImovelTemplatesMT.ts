// =============================================================================
// USE CONTRATO IMOVEL TEMPLATES MT - Hook Multi-Tenant para Templates de Contratos
// =============================================================================
//
// CRUD completo para mt_property_contract_templates
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  MTPropertyContractTemplate,
  MTPropertyContractTemplateCreate,
  MTPropertyContractTemplateUpdate,
  ContractTipo,
} from '@/types/contrato-imovel-mt';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-property-contract-templates';

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function getErrorMessage(error: any): string {
  if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
    return 'Erro de conexao. Verifique sua internet e tente novamente.';
  }
  const pgCode = error?.code;
  if (pgCode) {
    switch (pgCode) {
      case '23505': return 'Este template ja existe.';
      case '23503': return 'Registro vinculado nao encontrado.';
      case '23502': return 'Preencha todos os campos obrigatorios.';
      case '42501': return 'Voce nao tem permissao para realizar esta acao.';
      default: break;
    }
  }
  return error?.message || 'Erro desconhecido. Tente novamente.';
}

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useContratoImovelTemplatesMT(tipoFilter?: ContractTipo) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query Principal - Listar Templates
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, accessLevel, tipoFilter],
    queryFn: async (): Promise<MTPropertyContractTemplate[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant nao carregado.');
      }

      let q = supabase
        .from('mt_property_contract_templates')
        .select('*')
        .is('deleted_at', null)
        .order('is_default', { ascending: false })
        .order('nome', { ascending: true });

      if (accessLevel === 'franchise' && franchise) {
        q = q.or(`franchise_id.eq.${franchise.id},franchise_id.is.null`);
      } else if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      if (tipoFilter) {
        q = q.eq('tipo_contrato', tipoFilter);
      }

      const { data, error } = await q;
      if (error) { console.error('Erro ao buscar templates de contrato MT:', error); throw error; }
      return (data || []) as MTPropertyContractTemplate[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 10,
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar Template
  // ---------------------------------------------------------------------------

  const create = useMutation({
    mutationFn: async (input: MTPropertyContractTemplateCreate): Promise<MTPropertyContractTemplate> => {
      if (!tenant && accessLevel !== 'platform') throw new Error('Tenant nao definido.');

      const { data, error } = await supabase
        .from('mt_property_contract_templates')
        .insert({
          ...input,
          tenant_id: tenant!.id,
          franchise_id: input.franchise_id || franchise?.id || null,
          tipo_contrato: input.tipo_contrato ?? 'venda',
          html_template: input.html_template || '',
          clausulas_padrao: input.clausulas_padrao || [],
          variaveis: input.variaveis || [],
          is_default: input.is_default ?? false,
          is_active: input.is_active ?? true,
        })
        .select()
        .single();

      if (error) { console.error('Erro ao criar template de contrato MT:', error); throw error; }
      return data as MTPropertyContractTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Template "${data.nome}" criado!`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Template
  // ---------------------------------------------------------------------------

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: MTPropertyContractTemplateUpdate): Promise<MTPropertyContractTemplate> => {
      if (!id) throw new Error('ID do template e obrigatorio.');

      const { data, error } = await supabase
        .from('mt_property_contract_templates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) { console.error('Erro ao atualizar template de contrato MT:', error); throw error; }
      return data as MTPropertyContractTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Template "${data.nome}" atualizado!`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Soft Delete
  // ---------------------------------------------------------------------------

  const remove = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('mt_property_contract_templates')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) { console.error('Erro ao remover template de contrato MT:', error); throw error; }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Template removido!');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    templates: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    create: { mutate: create.mutate, mutateAsync: create.mutateAsync, isPending: create.isPending },
    update: { mutate: update.mutate, mutateAsync: update.mutateAsync, isPending: update.isPending },
    remove: { mutate: remove.mutate, mutateAsync: remove.mutateAsync, isPending: remove.isPending },

    isCreating: create.isPending,
    isUpdating: update.isPending,
    isDeleting: remove.isPending,
  };
}

// -----------------------------------------------------------------------------
// Hook: Template por ID
// -----------------------------------------------------------------------------

export function useContratoImovelTemplateMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async (): Promise<MTPropertyContractTemplate | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('mt_property_contract_templates')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as MTPropertyContractTemplate;
    },
    enabled: !!id && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

export default useContratoImovelTemplatesMT;

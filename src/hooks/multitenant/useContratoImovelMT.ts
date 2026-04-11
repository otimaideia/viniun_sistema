// =============================================================================
// USE CONTRATO IMOVEL MT - Hook Multi-Tenant para Contratos de Imoveis
// =============================================================================
//
// CRUD completo para mt_property_contracts com workflow de status,
// signatarios e historico.
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  MTPropertyContract,
  MTPropertyContractCreate,
  MTPropertyContractUpdate,
  MTPropertyContractFilters,
  MTPropertyContractSignatory,
  MTPropertyContractSignatoryCreate,
  MTPropertyContractSignatoryUpdate,
  MTPropertyContractHistory,
  ContractHistoryTipo,
} from '@/types/contrato-imovel-mt';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-property-contracts';
const SIGNATORIES_KEY = 'mt-property-contract-signatories';
const HISTORY_KEY = 'mt-property-contract-history';

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
      case '23505': return 'Este contrato ja existe.';
      case '23503': return 'Registro vinculado nao encontrado.';
      case '23502': return 'Preencha todos os campos obrigatorios.';
      case '42501': return 'Voce nao tem permissao para realizar esta acao.';
      default: break;
    }
  }
  return error?.message || 'Erro desconhecido. Tente novamente.';
}

// -----------------------------------------------------------------------------
// SELECT for contracts with JOINs
// -----------------------------------------------------------------------------

const CONTRACT_SELECT = `
  *,
  tenant:mt_tenants (slug, nome_fantasia),
  property:mt_properties (id, titulo, ref_code, valor_venda),
  lead:mt_leads (id, nome, email, telefone),
  client:mt_property_clients (id, nome),
  corretor:mt_corretores (id, nome),
  owner:mt_property_owners (id, nome),
  proposal:mt_property_proposals (id, numero_proposta, valor_proposta)
`;

// -----------------------------------------------------------------------------
// Hook: useContratosMT - List contracts with filters
// -----------------------------------------------------------------------------

export function useContratosMT(filters?: MTPropertyContractFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query Principal - Listar Contratos
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, accessLevel, filters],
    queryFn: async (): Promise<MTPropertyContract[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant nao carregado.');
      }

      let q = supabase
        .from('mt_property_contracts')
        .select(CONTRACT_SELECT)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Filtro por nivel de acesso
      if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      } else if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      // Filtros opcionais
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          q = q.in('status', filters.status);
        } else {
          q = q.eq('status', filters.status);
        }
      }
      if (filters?.tipo) {
        if (Array.isArray(filters.tipo)) {
          q = q.in('tipo', filters.tipo);
        } else {
          q = q.eq('tipo', filters.tipo);
        }
      }
      if (filters?.property_id) q = q.eq('property_id', filters.property_id);
      if (filters?.lead_id) q = q.eq('lead_id', filters.lead_id);
      if (filters?.client_id) q = q.eq('client_id', filters.client_id);
      if (filters?.corretor_id) q = q.eq('corretor_id', filters.corretor_id);
      if (filters?.owner_id) q = q.eq('owner_id', filters.owner_id);
      if (filters?.proposal_id) q = q.eq('proposal_id', filters.proposal_id);
      if (filters?.data_inicio) q = q.gte('created_at', filters.data_inicio);
      if (filters?.data_fim) q = q.lte('created_at', filters.data_fim);
      if (filters?.search) {
        const s = `%${filters.search}%`;
        q = q.or(`numero_contrato.ilike.${s}`);
      }

      const { data, error } = await q;
      if (error) { console.error('Erro ao buscar contratos MT:', error); throw error; }
      return (data || []) as MTPropertyContract[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Helper: Insert history entry
  // ---------------------------------------------------------------------------

  async function insertHistory(
    contractId: string,
    tenantId: string,
    tipo: ContractHistoryTipo,
    dados?: Record<string, unknown>,
  ) {
    const { error } = await supabase
      .from('mt_property_contract_history')
      .insert({
        contract_id: contractId,
        tenant_id: tenantId,
        tipo_alteracao: tipo,
        dados: dados || {},
      });
    if (error) console.warn('Erro ao registrar historico de contrato:', error);
  }

  // ---------------------------------------------------------------------------
  // Mutation: Criar Contrato
  // ---------------------------------------------------------------------------

  const create = useMutation({
    mutationFn: async (input: MTPropertyContractCreate): Promise<MTPropertyContract> => {
      if (!tenant && accessLevel !== 'platform') throw new Error('Tenant nao definido.');
      const tenantId = tenant!.id;

      // If created from proposal, fetch proposal values
      let proposalData: Record<string, unknown> | null = null;
      if (input.proposal_id) {
        const { data: proposal } = await supabase
          .from('mt_property_proposals')
          .select('valor_proposta, valor_entrada, valor_financiamento, lead_id, client_id, corretor_id, property_id, forma_pagamento, condicoes_pagamento')
          .eq('id', input.proposal_id)
          .single();

        if (proposal) {
          proposalData = proposal;
        }
      }

      const contractData = {
        tenant_id: tenantId,
        franchise_id: input.franchise_id || franchise?.id || null,
        property_id: input.property_id || (proposalData?.property_id as string) || null,
        proposal_id: input.proposal_id || null,
        lead_id: input.lead_id || (proposalData?.lead_id as string) || null,
        client_id: input.client_id || (proposalData?.client_id as string) || null,
        corretor_id: input.corretor_id || (proposalData?.corretor_id as string) || null,
        owner_id: input.owner_id || null,
        template_id: input.template_id || null,
        numero_contrato: input.numero_contrato || null,
        tipo: input.tipo ?? 'venda',
        status: 'rascunho' as const,
        valor_contrato: input.valor_contrato ?? (proposalData?.valor_proposta as number) ?? 0,
        valor_mensal: input.valor_mensal || null,
        taxa_administracao: input.taxa_administracao || null,
        comissao_corretor: input.comissao_corretor || null,
        valor_comissao: input.valor_comissao || null,
        data_inicio: input.data_inicio || null,
        data_vencimento: input.data_vencimento || null,
        html_content: input.html_content || null,
        clausulas: input.clausulas || [],
        multa_rescisoria: input.multa_rescisoria || null,
        indice_reajuste: input.indice_reajuste || null,
        percentual_reajuste: input.percentual_reajuste || null,
      };

      const { data, error } = await supabase
        .from('mt_property_contracts')
        .insert(contractData)
        .select(CONTRACT_SELECT)
        .single();

      if (error) { console.error('Erro ao criar contrato MT:', error); throw error; }

      await insertHistory(data.id, tenantId, 'criacao', {
        acao: 'Contrato criado',
        origem_proposta: input.proposal_id || null,
      });

      return data as MTPropertyContract;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Contrato "${data.numero_contrato || data.id.slice(0, 8)}" criado!`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Contrato
  // ---------------------------------------------------------------------------

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: MTPropertyContractUpdate): Promise<MTPropertyContract> => {
      if (!id) throw new Error('ID do contrato e obrigatorio.');

      const { data: prev } = await supabase
        .from('mt_property_contracts')
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('mt_property_contracts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(CONTRACT_SELECT)
        .single();

      if (error) { console.error('Erro ao atualizar contrato MT:', error); throw error; }

      await insertHistory(id, data.tenant_id, 'edicao', {
        acao: 'Contrato editado',
        campos_alterados: Object.keys(updates),
        valores_anteriores: prev || {},
      });

      return data as MTPropertyContract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Contrato atualizado!');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Soft Delete
  // ---------------------------------------------------------------------------

  const remove = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('mt_property_contracts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) { console.error('Erro ao remover contrato MT:', error); throw error; }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Contrato removido!');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Enviar para Assinatura
  // ---------------------------------------------------------------------------

  const sendForSignature = useMutation({
    mutationFn: async (id: string): Promise<MTPropertyContract> => {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('mt_property_contracts')
        .update({ status: 'pendente_assinatura', updated_at: now })
        .eq('id', id)
        .select(CONTRACT_SELECT)
        .single();

      if (error) { console.error('Erro ao enviar contrato para assinatura:', error); throw error; }

      await insertHistory(id, data.tenant_id, 'envio', { acao: 'Contrato enviado para assinatura' });

      return data as MTPropertyContract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Contrato enviado para assinatura!');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Registrar Assinatura (de um signatario)
  // ---------------------------------------------------------------------------

  const recordSignature = useMutation({
    mutationFn: async ({
      contractId,
      signatoryId,
      assinatura_hash,
      assinatura_canvas_data,
      ip_address,
      user_agent,
    }: {
      contractId: string;
      signatoryId: string;
      assinatura_hash?: string;
      assinatura_canvas_data?: string;
      ip_address?: string;
      user_agent?: string;
    }): Promise<MTPropertyContract> => {
      const now = new Date().toISOString();

      // Update signatory
      const { error: sigError } = await supabase
        .from('mt_property_contract_signatories')
        .update({
          assinado: true,
          assinado_em: now,
          assinatura_hash: assinatura_hash || null,
          assinatura_canvas_data: assinatura_canvas_data || null,
          ip_address: ip_address || null,
          user_agent: user_agent || null,
        })
        .eq('id', signatoryId);

      if (sigError) { console.error('Erro ao registrar assinatura:', sigError); throw sigError; }

      // Check if all signatories have signed
      const { data: allSignatories } = await supabase
        .from('mt_property_contract_signatories')
        .select('id, assinado')
        .eq('contract_id', contractId);

      const allSigned = allSignatories?.length
        ? allSignatories.every(s => s.assinado)
        : false;

      // Update contract status
      const newStatus = allSigned ? 'assinado' : 'assinado_parcialmente';
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: now,
      };
      if (allSigned) {
        updateData.data_assinatura = now;
      }

      const { data, error } = await supabase
        .from('mt_property_contracts')
        .update(updateData)
        .eq('id', contractId)
        .select(CONTRACT_SELECT)
        .single();

      if (error) { console.error('Erro ao atualizar status do contrato:', error); throw error; }

      const historyTipo: ContractHistoryTipo = allSigned ? 'assinatura' : 'assinatura_parcial';
      await insertHistory(contractId, data.tenant_id, historyTipo, {
        acao: allSigned ? 'Todas as assinaturas coletadas' : 'Assinatura parcial registrada',
        signatory_id: signatoryId,
        total_signatarios: allSignatories?.length || 0,
        assinados: allSignatories?.filter(s => s.assinado).length || 0,
      });

      return data as MTPropertyContract;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [SIGNATORIES_KEY] });
      const msg = data.status === 'assinado'
        ? 'Contrato totalmente assinado!'
        : 'Assinatura registrada!';
      toast.success(msg);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Iniciar Execucao
  // ---------------------------------------------------------------------------

  const startExecution = useMutation({
    mutationFn: async (id: string): Promise<MTPropertyContract> => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('mt_property_contracts')
        .update({ status: 'em_execucao', updated_at: now })
        .eq('id', id)
        .select(CONTRACT_SELECT)
        .single();

      if (error) { console.error('Erro ao iniciar execucao do contrato:', error); throw error; }

      await insertHistory(id, data.tenant_id, 'finalizacao', { acao: 'Contrato em execucao' });

      return data as MTPropertyContract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Contrato em execucao!');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Finalizar Contrato
  // ---------------------------------------------------------------------------

  const finalize = useMutation({
    mutationFn: async (id: string): Promise<MTPropertyContract> => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('mt_property_contracts')
        .update({ status: 'finalizado', updated_at: now })
        .eq('id', id)
        .select(CONTRACT_SELECT)
        .single();

      if (error) { console.error('Erro ao finalizar contrato:', error); throw error; }

      await insertHistory(id, data.tenant_id, 'finalizacao', { acao: 'Contrato finalizado' });

      return data as MTPropertyContract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Contrato finalizado!');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Cancelar Contrato
  // ---------------------------------------------------------------------------

  const cancel = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo?: string }): Promise<MTPropertyContract> => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('mt_property_contracts')
        .update({
          status: 'cancelado',
          data_cancelamento: now,
          updated_at: now,
        })
        .eq('id', id)
        .select(CONTRACT_SELECT)
        .single();

      if (error) { console.error('Erro ao cancelar contrato:', error); throw error; }

      await insertHistory(id, data.tenant_id, 'cancelamento', {
        acao: 'Contrato cancelado',
        motivo: motivo || null,
      });

      return data as MTPropertyContract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Contrato cancelado.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    contratos: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    create: { mutate: create.mutate, mutateAsync: create.mutateAsync, isPending: create.isPending },
    update: { mutate: update.mutate, mutateAsync: update.mutateAsync, isPending: update.isPending },
    remove: { mutate: remove.mutate, mutateAsync: remove.mutateAsync, isPending: remove.isPending },
    sendForSignature: { mutate: sendForSignature.mutate, mutateAsync: sendForSignature.mutateAsync, isPending: sendForSignature.isPending },
    recordSignature: { mutate: recordSignature.mutate, mutateAsync: recordSignature.mutateAsync, isPending: recordSignature.isPending },
    startExecution: { mutate: startExecution.mutate, mutateAsync: startExecution.mutateAsync, isPending: startExecution.isPending },
    finalize: { mutate: finalize.mutate, mutateAsync: finalize.mutateAsync, isPending: finalize.isPending },
    cancel: { mutate: cancel.mutate, mutateAsync: cancel.mutateAsync, isPending: cancel.isPending },

    isCreating: create.isPending,
    isUpdating: update.isPending,
    isDeleting: remove.isPending,
  };
}

// -----------------------------------------------------------------------------
// Hook: useContratoMT - Single contract by ID
// -----------------------------------------------------------------------------

export function useContratoMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async (): Promise<MTPropertyContract | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('mt_property_contracts')
        .select(CONTRACT_SELECT)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as MTPropertyContract;
    },
    enabled: !!id && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

// -----------------------------------------------------------------------------
// Hook: useContratoSignatoriesMT - CRUD signatories + record signature
// -----------------------------------------------------------------------------

export function useContratoSignatoriesMT(contractId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [SIGNATORIES_KEY, contractId],
    queryFn: async (): Promise<MTPropertyContractSignatory[]> => {
      if (!contractId) return [];

      const { data, error } = await supabase
        .from('mt_property_contract_signatories')
        .select('*')
        .eq('contract_id', contractId)
        .order('ordem_assinatura', { ascending: true });

      if (error) { console.error('Erro ao buscar signatarios:', error); throw error; }
      return (data || []) as MTPropertyContractSignatory[];
    },
    enabled: !!contractId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  const createSignatory = useMutation({
    mutationFn: async (input: MTPropertyContractSignatoryCreate): Promise<MTPropertyContractSignatory> => {
      if (!tenant && accessLevel !== 'platform') throw new Error('Tenant nao definido.');

      const { data, error } = await supabase
        .from('mt_property_contract_signatories')
        .insert({
          ...input,
          tenant_id: tenant!.id,
          assinado: false,
          ordem_assinatura: input.ordem_assinatura ?? 0,
        })
        .select()
        .single();

      if (error) { console.error('Erro ao criar signatario:', error); throw error; }
      return data as MTPropertyContractSignatory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SIGNATORIES_KEY, contractId] });
      toast.success('Signatario adicionado!');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const updateSignatory = useMutation({
    mutationFn: async ({ id, ...updates }: MTPropertyContractSignatoryUpdate): Promise<MTPropertyContractSignatory> => {
      const { data, error } = await supabase
        .from('mt_property_contract_signatories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) { console.error('Erro ao atualizar signatario:', error); throw error; }
      return data as MTPropertyContractSignatory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SIGNATORIES_KEY, contractId] });
      toast.success('Signatario atualizado!');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteSignatory = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('mt_property_contract_signatories')
        .delete()
        .eq('id', id);
      if (error) { console.error('Erro ao remover signatario:', error); throw error; }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SIGNATORIES_KEY, contractId] });
      toast.success('Signatario removido!');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return {
    signatories: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    createSignatory: { mutate: createSignatory.mutate, mutateAsync: createSignatory.mutateAsync, isPending: createSignatory.isPending },
    updateSignatory: { mutate: updateSignatory.mutate, mutateAsync: updateSignatory.mutateAsync, isPending: updateSignatory.isPending },
    deleteSignatory: { mutate: deleteSignatory.mutate, mutateAsync: deleteSignatory.mutateAsync, isPending: deleteSignatory.isPending },
  };
}

// -----------------------------------------------------------------------------
// Hook: useContratoHistoryMT - Read contract history
// -----------------------------------------------------------------------------

export function useContratoHistoryMT(contractId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [HISTORY_KEY, contractId],
    queryFn: async (): Promise<MTPropertyContractHistory[]> => {
      if (!contractId) return [];

      const { data, error } = await supabase
        .from('mt_property_contract_history')
        .select(`
          *,
          usuario:mt_users (id, nome)
        `)
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });

      if (error) { console.error('Erro ao buscar historico do contrato:', error); throw error; }
      return (data || []) as MTPropertyContractHistory[];
    },
    enabled: !!contractId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

export default useContratosMT;

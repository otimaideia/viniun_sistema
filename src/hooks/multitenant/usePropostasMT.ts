// =============================================================================
// USE PROPOSTAS MT - Hook Multi-Tenant para Propostas de Imoveis
// =============================================================================
//
// CRUD completo para mt_property_proposals com workflow de status,
// itens de proposta e historico.
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  MTPropertyProposal,
  MTPropertyProposalCreate,
  MTPropertyProposalUpdate,
  MTPropertyProposalFilters,
  MTPropertyProposalItem,
  MTPropertyProposalItemCreate,
  MTPropertyProposalItemUpdate,
  MTPropertyProposalHistory,
  ProposalHistoryTipo,
} from '@/types/proposta-imovel-mt';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-property-proposals';
const ITEMS_KEY = 'mt-property-proposal-items';
const HISTORY_KEY = 'mt-property-proposal-history';

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
      case '23505': return 'Esta proposta ja existe.';
      case '23503': return 'Registro vinculado nao encontrado.';
      case '23502': return 'Preencha todos os campos obrigatorios.';
      case '42501': return 'Voce nao tem permissao para realizar esta acao.';
      default: break;
    }
  }
  return error?.message || 'Erro desconhecido. Tente novamente.';
}

// -----------------------------------------------------------------------------
// SELECT for proposals with JOINs
// -----------------------------------------------------------------------------

const PROPOSAL_SELECT = `
  *,
  tenant:mt_tenants (slug, nome_fantasia),
  property:mt_properties (id, titulo, ref_code, valor_venda),
  lead:mt_leads (id, nome, email, telefone),
  client:mt_property_clients (id, nome),
  corretor:mt_corretores (id, nome)
`;

// -----------------------------------------------------------------------------
// Hook: usePropostasMT - List proposals with filters
// -----------------------------------------------------------------------------

export function usePropostasMT(filters?: MTPropertyProposalFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query Principal - Listar Propostas
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, accessLevel, filters],
    queryFn: async (): Promise<MTPropertyProposal[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant nao carregado.');
      }

      let q = supabase
        .from('mt_property_proposals')
        .select(PROPOSAL_SELECT)
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
      if (filters?.property_id) q = q.eq('property_id', filters.property_id);
      if (filters?.lead_id) q = q.eq('lead_id', filters.lead_id);
      if (filters?.client_id) q = q.eq('client_id', filters.client_id);
      if (filters?.corretor_id) q = q.eq('corretor_id', filters.corretor_id);
      if (filters?.data_inicio) q = q.gte('created_at', filters.data_inicio);
      if (filters?.data_fim) q = q.lte('created_at', filters.data_fim);
      if (filters?.search) {
        const s = `%${filters.search}%`;
        q = q.or(`numero_proposta.ilike.${s},observacoes.ilike.${s}`);
      }

      const { data, error } = await q;
      if (error) { console.error('Erro ao buscar propostas MT:', error); throw error; }
      return (data || []) as MTPropertyProposal[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Helper: Insert history entry
  // ---------------------------------------------------------------------------

  async function insertHistory(
    proposalId: string,
    tenantId: string,
    tipo: ProposalHistoryTipo,
    dados?: Record<string, unknown>,
  ) {
    const { error } = await supabase
      .from('mt_property_proposal_history')
      .insert({
        proposal_id: proposalId,
        tenant_id: tenantId,
        tipo_alteracao: tipo,
        dados: dados || {},
      });
    if (error) console.warn('Erro ao registrar historico de proposta:', error);
  }

  // ---------------------------------------------------------------------------
  // Mutation: Criar Proposta
  // ---------------------------------------------------------------------------

  const create = useMutation({
    mutationFn: async (input: MTPropertyProposalCreate): Promise<MTPropertyProposal> => {
      if (!tenant && accessLevel !== 'platform') throw new Error('Tenant nao definido.');
      const tenantId = tenant!.id;

      const { data, error } = await supabase
        .from('mt_property_proposals')
        .insert({
          ...input,
          tenant_id: tenantId,
          franchise_id: input.franchise_id || franchise?.id || null,
          status: 'rascunho',
          prazo_validade_dias: input.prazo_validade_dias ?? 7,
          valor_entrada: input.valor_entrada ?? 0,
          valor_financiamento: input.valor_financiamento ?? 0,
          parcelas: input.parcelas ?? 1,
          desconto_percentual: input.desconto_percentual ?? 0,
          condicoes_pagamento: input.condicoes_pagamento ?? {},
        })
        .select(PROPOSAL_SELECT)
        .single();

      if (error) { console.error('Erro ao criar proposta MT:', error); throw error; }

      await insertHistory(data.id, tenantId, 'criacao', { acao: 'Proposta criada' });

      return data as MTPropertyProposal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Proposta "${data.numero_proposta || data.id.slice(0, 8)}" criada!`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Proposta
  // ---------------------------------------------------------------------------

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: MTPropertyProposalUpdate): Promise<MTPropertyProposal> => {
      if (!id) throw new Error('ID da proposta e obrigatorio.');

      const { data: prev } = await supabase
        .from('mt_property_proposals')
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('mt_property_proposals')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(PROPOSAL_SELECT)
        .single();

      if (error) { console.error('Erro ao atualizar proposta MT:', error); throw error; }

      await insertHistory(id, data.tenant_id, 'edicao', {
        acao: 'Proposta editada',
        campos_alterados: Object.keys(updates),
        valores_anteriores: prev || {},
      });

      return data as MTPropertyProposal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Proposta atualizada!');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Soft Delete
  // ---------------------------------------------------------------------------

  const remove = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('mt_property_proposals')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) { console.error('Erro ao remover proposta MT:', error); throw error; }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Proposta removida!');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Enviar Proposta
  // ---------------------------------------------------------------------------

  const send = useMutation({
    mutationFn: async (id: string): Promise<MTPropertyProposal> => {
      const now = new Date();

      const { data: current } = await supabase
        .from('mt_property_proposals')
        .select('prazo_validade_dias, tenant_id')
        .eq('id', id)
        .single();

      const prazoDias = current?.prazo_validade_dias ?? 7;
      const validadeAte = new Date(now.getTime() + prazoDias * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('mt_property_proposals')
        .update({
          status: 'enviada',
          enviada_em: now.toISOString(),
          validade_ate: validadeAte.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', id)
        .select(PROPOSAL_SELECT)
        .single();

      if (error) { console.error('Erro ao enviar proposta MT:', error); throw error; }

      await insertHistory(id, data.tenant_id, 'envio', {
        acao: 'Proposta enviada',
        prazo_validade_dias: prazoDias,
        validade_ate: validadeAte.toISOString(),
      });

      return data as MTPropertyProposal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Proposta enviada!');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Marcar como Visualizada
  // ---------------------------------------------------------------------------

  const markViewed = useMutation({
    mutationFn: async (id: string): Promise<MTPropertyProposal> => {
      const { data: current } = await supabase
        .from('mt_property_proposals')
        .select('status, tenant_id')
        .eq('id', id)
        .single();

      if (current?.status !== 'enviada') {
        throw new Error('Proposta nao esta com status "enviada" para marcar como visualizada.');
      }

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('mt_property_proposals')
        .update({ status: 'visualizada', visualizada_em: now, updated_at: now })
        .eq('id', id)
        .select(PROPOSAL_SELECT)
        .single();

      if (error) { console.error('Erro ao marcar proposta como visualizada:', error); throw error; }

      await insertHistory(id, data.tenant_id, 'visualizacao', { acao: 'Proposta visualizada pelo destinatario' });

      return data as MTPropertyProposal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Proposta marcada como visualizada!');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Aceitar Proposta
  // ---------------------------------------------------------------------------

  const accept = useMutation({
    mutationFn: async (id: string): Promise<MTPropertyProposal> => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('mt_property_proposals')
        .update({ status: 'aceita', respondida_em: now, updated_at: now })
        .eq('id', id)
        .select(PROPOSAL_SELECT)
        .single();

      if (error) { console.error('Erro ao aceitar proposta MT:', error); throw error; }

      await insertHistory(id, data.tenant_id, 'aceite', { acao: 'Proposta aceita' });

      return data as MTPropertyProposal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Proposta aceita!');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Rejeitar Proposta
  // ---------------------------------------------------------------------------

  const reject = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo?: string }): Promise<MTPropertyProposal> => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('mt_property_proposals')
        .update({
          status: 'rejeitada',
          respondida_em: now,
          motivo_rejeicao: motivo || null,
          updated_at: now,
        })
        .eq('id', id)
        .select(PROPOSAL_SELECT)
        .single();

      if (error) { console.error('Erro ao rejeitar proposta MT:', error); throw error; }

      await insertHistory(id, data.tenant_id, 'rejeicao', {
        acao: 'Proposta rejeitada',
        motivo_rejeicao: motivo || null,
      });

      return data as MTPropertyProposal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Proposta rejeitada.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Contraproposta
  // ---------------------------------------------------------------------------

  const counterProposal = useMutation({
    mutationFn: async ({
      id,
      contraproposta_valor,
      contraproposta_condicoes,
    }: {
      id: string;
      contraproposta_valor?: number;
      contraproposta_condicoes?: string;
    }): Promise<MTPropertyProposal> => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('mt_property_proposals')
        .update({
          status: 'contrapropostada',
          contraproposta_valor: contraproposta_valor || null,
          contraproposta_condicoes: contraproposta_condicoes || null,
          respondida_em: now,
          updated_at: now,
        })
        .eq('id', id)
        .select(PROPOSAL_SELECT)
        .single();

      if (error) { console.error('Erro ao registrar contraproposta MT:', error); throw error; }

      await insertHistory(id, data.tenant_id, 'contraproposta', {
        acao: 'Contraproposta registrada',
        contraproposta_valor,
        contraproposta_condicoes,
      });

      return data as MTPropertyProposal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Contraproposta registrada!');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    propostas: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    create: { mutate: create.mutate, mutateAsync: create.mutateAsync, isPending: create.isPending },
    update: { mutate: update.mutate, mutateAsync: update.mutateAsync, isPending: update.isPending },
    remove: { mutate: remove.mutate, mutateAsync: remove.mutateAsync, isPending: remove.isPending },
    send: { mutate: send.mutate, mutateAsync: send.mutateAsync, isPending: send.isPending },
    markViewed: { mutate: markViewed.mutate, mutateAsync: markViewed.mutateAsync, isPending: markViewed.isPending },
    accept: { mutate: accept.mutate, mutateAsync: accept.mutateAsync, isPending: accept.isPending },
    reject: { mutate: reject.mutate, mutateAsync: reject.mutateAsync, isPending: reject.isPending },
    counterProposal: { mutate: counterProposal.mutate, mutateAsync: counterProposal.mutateAsync, isPending: counterProposal.isPending },

    isCreating: create.isPending,
    isUpdating: update.isPending,
    isDeleting: remove.isPending,
  };
}

// -----------------------------------------------------------------------------
// Hook: usePropostaMT - Single proposal by ID
// -----------------------------------------------------------------------------

export function usePropostaMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async (): Promise<MTPropertyProposal | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('mt_property_proposals')
        .select(PROPOSAL_SELECT)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as MTPropertyProposal;
    },
    enabled: !!id && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

// -----------------------------------------------------------------------------
// Hook: usePropostaItemsMT - CRUD for proposal line items
// -----------------------------------------------------------------------------

export function usePropostaItemsMT(proposalId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [ITEMS_KEY, proposalId],
    queryFn: async (): Promise<MTPropertyProposalItem[]> => {
      if (!proposalId) return [];

      const { data, error } = await supabase
        .from('mt_property_proposal_items')
        .select('*')
        .eq('proposal_id', proposalId)
        .order('ordem', { ascending: true });

      if (error) { console.error('Erro ao buscar itens da proposta:', error); throw error; }
      return (data || []) as MTPropertyProposalItem[];
    },
    enabled: !!proposalId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  const createItem = useMutation({
    mutationFn: async (input: MTPropertyProposalItemCreate): Promise<MTPropertyProposalItem> => {
      if (!tenant && accessLevel !== 'platform') throw new Error('Tenant nao definido.');

      const { data, error } = await supabase
        .from('mt_property_proposal_items')
        .insert({
          ...input,
          tenant_id: tenant!.id,
          tipo: input.tipo ?? 'outro',
          quantidade: input.quantidade ?? 1,
          ordem: input.ordem ?? 0,
        })
        .select()
        .single();

      if (error) { console.error('Erro ao criar item de proposta:', error); throw error; }
      return data as MTPropertyProposalItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ITEMS_KEY, proposalId] });
      toast.success('Item adicionado!');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: MTPropertyProposalItemUpdate): Promise<MTPropertyProposalItem> => {
      const { data, error } = await supabase
        .from('mt_property_proposal_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) { console.error('Erro ao atualizar item de proposta:', error); throw error; }
      return data as MTPropertyProposalItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ITEMS_KEY, proposalId] });
      toast.success('Item atualizado!');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('mt_property_proposal_items')
        .delete()
        .eq('id', id);
      if (error) { console.error('Erro ao remover item de proposta:', error); throw error; }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ITEMS_KEY, proposalId] });
      toast.success('Item removido!');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    createItem: { mutate: createItem.mutate, mutateAsync: createItem.mutateAsync, isPending: createItem.isPending },
    updateItem: { mutate: updateItem.mutate, mutateAsync: updateItem.mutateAsync, isPending: updateItem.isPending },
    deleteItem: { mutate: deleteItem.mutate, mutateAsync: deleteItem.mutateAsync, isPending: deleteItem.isPending },
  };
}

// -----------------------------------------------------------------------------
// Hook: usePropostaHistoryMT - Read proposal history
// -----------------------------------------------------------------------------

export function usePropostaHistoryMT(proposalId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [HISTORY_KEY, proposalId],
    queryFn: async (): Promise<MTPropertyProposalHistory[]> => {
      if (!proposalId) return [];

      const { data, error } = await supabase
        .from('mt_property_proposal_history')
        .select(`
          *,
          usuario:mt_users (id, nome)
        `)
        .eq('proposal_id', proposalId)
        .order('created_at', { ascending: false });

      if (error) { console.error('Erro ao buscar historico da proposta:', error); throw error; }
      return (data || []) as MTPropertyProposalHistory[];
    },
    enabled: !!proposalId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

export default usePropostasMT;

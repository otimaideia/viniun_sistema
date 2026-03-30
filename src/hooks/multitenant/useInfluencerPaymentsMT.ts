// =============================================================================
// USE INFLUENCER PAYMENTS MT - Hook Multi-Tenant para Pagamentos de Influenciadoras
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type MTPaymentType = 'mensal' | 'post' | 'comissao' | 'bonus' | 'ajuste';
export type MTPaymentStatus = 'pendente' | 'aprovado' | 'pago' | 'cancelado';
export type MTPaymentMethod = 'pix' | 'transferencia' | 'permuta' | 'dinheiro';

export interface MTInfluencerPayment {
  id: string;
  tenant_id: string;
  influencer_id: string;
  contract_id: string | null;

  // Detalhes
  payment_type: MTPaymentType;
  amount: number;
  currency: string;
  payment_method: MTPaymentMethod | null;
  reference_period_start: string | null;
  reference_period_end: string | null;
  description: string | null;
  invoice_number: string | null;

  // Datas
  paid_at: string | null;
  due_date: string | null;

  // Status
  status: MTPaymentStatus;

  // Metadata
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;

  // Relations
  influencer?: {
    id: string;
    nome: string;
    nome_artistico: string | null;
    foto_perfil: string | null;
  };
  contract?: {
    id: string;
    tipo: string;
    status: string;
  };
}

export interface MTPaymentCreate {
  influencer_id: string;
  contract_id?: string | null;
  payment_type: MTPaymentType;
  amount: number;
  currency?: string;
  payment_method?: MTPaymentMethod;
  reference_period_start?: string;
  reference_period_end?: string;
  description?: string;
  invoice_number?: string;
  due_date?: string;
  status?: MTPaymentStatus;
  metadata?: Record<string, any>;
}

export interface MTPaymentUpdate extends Partial<MTPaymentCreate> {
  id: string;
}

export interface MTPaymentFilters {
  influencer_id?: string;
  contract_id?: string;
  status?: MTPaymentStatus;
  payment_type?: MTPaymentType;
  period_start?: string;
  period_end?: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-influencer-payments';

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function getErrorMessage(error: any): string {
  if (error?.message?.includes('Failed to fetch')) {
    return 'Erro de conexão. Verifique sua internet.';
  }

  const pgCode = error?.code;
  if (pgCode === '23503') {
    return 'Influenciadora ou contrato não encontrado.';
  }

  return error?.message || 'Erro desconhecido.';
}

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useInfluencerPaymentsMT(filters?: MTPaymentFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query Principal - Listar Pagamentos
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, filters?.influencer_id, filters?.status],
    queryFn: async (): Promise<MTInfluencerPayment[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_influencer_payments')
        .select(`
          *,
          influencer:mt_influencers!inner (id, nome, nome_artistico, foto_perfil),
          contract:mt_influencer_contracts (id, tipo, status)
        `)
        .order('created_at', { ascending: false });

      // Filtro por tenant
      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      // Filtros opcionais
      if (filters?.influencer_id) {
        q = q.eq('influencer_id', filters.influencer_id);
      }
      if (filters?.contract_id) {
        q = q.eq('contract_id', filters.contract_id);
      }
      if (filters?.status) {
        q = q.eq('status', filters.status);
      }
      if (filters?.payment_type) {
        q = q.eq('payment_type', filters.payment_type);
      }
      if (filters?.period_start) {
        q = q.gte('reference_period_start', filters.period_start);
      }
      if (filters?.period_end) {
        q = q.lte('reference_period_end', filters.period_end);
      }

      const { data, error} = await q;

      if (error) {
        console.error('Erro ao buscar pagamentos MT:', error);
        throw error;
      }

      return (data || []) as MTInfluencerPayment[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar Pagamento
  // ---------------------------------------------------------------------------

  const createPayment = useMutation({
    mutationFn: async (newPayment: MTPaymentCreate): Promise<MTInfluencerPayment> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const paymentData = {
        ...newPayment,
        tenant_id: tenant!.id,
        currency: newPayment.currency || 'BRL',
        status: newPayment.status || 'pendente',
      };

      const { data, error } = await supabase
        .from('mt_influencer_payments')
        .insert(paymentData)
        .select(`
          *,
          influencer:mt_influencers (id, nome, nome_artistico, foto_perfil),
          contract:mt_influencer_contracts (id, tipo, status)
        `)
        .single();

      if (error) {
        console.error('Erro ao criar pagamento MT:', error);
        throw error;
      }

      return data as MTInfluencerPayment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Pagamento criado com sucesso!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Pagamento
  // ---------------------------------------------------------------------------

  const updatePayment = useMutation({
    mutationFn: async ({ id, ...updates }: MTPaymentUpdate): Promise<MTInfluencerPayment> => {
      if (!id) {
        throw new Error('ID do pagamento é obrigatório.');
      }

      const { data, error } = await supabase
        .from('mt_influencer_payments')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          influencer:mt_influencers (id, nome, nome_artistico, foto_perfil),
          contract:mt_influencer_contracts (id, tipo, status)
        `)
        .single();

      if (error) {
        console.error('Erro ao atualizar pagamento MT:', error);
        throw error;
      }

      return data as MTInfluencerPayment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Pagamento atualizado!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Aprovar Pagamento
  // ---------------------------------------------------------------------------

  const approvePayment = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('mt_influencer_payments')
        .update({
          status: 'aprovado',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Erro ao aprovar pagamento:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Pagamento aprovado!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Marcar como Pago
  // ---------------------------------------------------------------------------

  const markAsPaid = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('mt_influencer_payments')
        .update({
          status: 'pago',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Erro ao marcar como pago:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Pagamento registrado!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Deletar Pagamento
  // ---------------------------------------------------------------------------

  const deletePayment = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('mt_influencer_payments')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar pagamento MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Pagamento removido!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const getTotalPendente = () => {
    return query.data?.filter(p => p.status === 'pendente').reduce((sum, p) => sum + p.amount, 0) || 0;
  };

  const getTotalPago = () => {
    return query.data?.filter(p => p.status === 'pago').reduce((sum, p) => sum + p.amount, 0) || 0;
  };

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    payments: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    stats: {
      totalPendente: getTotalPendente(),
      totalPago: getTotalPago(),
      total: (query.data?.length || 0),
    },

    createPayment: {
      mutate: createPayment.mutate,
      mutateAsync: createPayment.mutateAsync,
      isPending: createPayment.isPending,
    },
    updatePayment: {
      mutate: updatePayment.mutate,
      mutateAsync: updatePayment.mutateAsync,
      isPending: updatePayment.isPending,
    },
    approvePayment: {
      mutate: approvePayment.mutate,
      mutateAsync: approvePayment.mutateAsync,
      isPending: approvePayment.isPending,
    },
    markAsPaid: {
      mutate: markAsPaid.mutate,
      mutateAsync: markAsPaid.mutateAsync,
      isPending: markAsPaid.isPending,
    },
    deletePayment: {
      mutate: deletePayment.mutate,
      mutateAsync: deletePayment.mutateAsync,
      isPending: deletePayment.isPending,
    },
  };
}

// -----------------------------------------------------------------------------
// Hook: Buscar Pagamento por ID
// -----------------------------------------------------------------------------

export function useInfluencerPaymentMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async (): Promise<MTInfluencerPayment | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('mt_influencer_payments')
        .select(`
          *,
          influencer:mt_influencers (id, nome, nome_artistico, foto_perfil),
          contract:mt_influencer_contracts (id, tipo, status)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as MTInfluencerPayment;
    },
    enabled: !!id && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

export default useInfluencerPaymentsMT;

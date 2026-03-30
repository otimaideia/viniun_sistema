import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { InfluenciadoraPagamento, InfluenciadoraPagamentoInsert, InfluenciadoraPagamentoUpdate } from '@/types/influenciadora';

interface PagamentoFilters {
  influenciadoraId?: string;
  status?: string;
  tipo?: string;
  dataInicio?: string;
  dataFim?: string;
}

interface PagamentoMetrics {
  totalPago: number;
  totalPendente: number;
  totalAprovado: number;
  pagamentosNoMes: number;
}

/**
 * @deprecated Use useInfluenciadoraPagamentosAdapter instead for proper multi-tenant isolation.
 */
export function useInfluenciadoraPagamentos(filters: PagamentoFilters = {}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Buscar pagamentos
  const {
    data: pagamentos,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['influenciadora-pagamentos', filters],
    queryFn: async () => {
      let query = supabase
        .from('mt_influencer_payments')
        .select(`
          *,
          influenciadora:mt_influencers(id, nome_completo, nome_artistico),
          contrato:mt_influencer_contracts(id, numero_contrato, tipo_contrato)
        `)
        .order('created_at', { ascending: false });

      if (filters.influenciadoraId) {
        query = query.eq('influenciadora_id', filters.influenciadoraId);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.tipo) {
        query = query.eq('tipo', filters.tipo);
      }

      if (filters.dataInicio) {
        query = query.gte('created_at', filters.dataInicio);
      }

      if (filters.dataFim) {
        query = query.lte('created_at', filters.dataFim);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as InfluenciadoraPagamento[];
    },
  });

  // Calcular metricas
  const metrics: PagamentoMetrics = {
    totalPago: pagamentos?.filter(p => p.status === 'pago').reduce((acc, p) => acc + (p.valor_liquido || 0), 0) || 0,
    totalPendente: pagamentos?.filter(p => p.status === 'pendente').reduce((acc, p) => acc + (p.valor_liquido || 0), 0) || 0,
    totalAprovado: pagamentos?.filter(p => p.status === 'aprovado').reduce((acc, p) => acc + (p.valor_liquido || 0), 0) || 0,
    pagamentosNoMes: pagamentos?.filter(p => {
      const now = new Date();
      const paymentDate = new Date(p.created_at);
      return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear();
    }).length || 0,
  };

  // Criar pagamento
  const createPagamento = useMutation({
    mutationFn: async (pagamento: InfluenciadoraPagamentoInsert) => {
      const { data, error } = await supabase
        .from('mt_influencer_payments')
        .insert(pagamento)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influenciadora-pagamentos'] });
      toast({
        title: 'Pagamento registrado',
        description: 'O pagamento foi registrado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao registrar pagamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Atualizar pagamento
  const updatePagamento = useMutation({
    mutationFn: async ({ id, ...pagamento }: InfluenciadoraPagamentoUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('mt_influencer_payments')
        .update(pagamento)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influenciadora-pagamentos'] });
      toast({
        title: 'Pagamento atualizado',
        description: 'O pagamento foi atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar pagamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Aprovar pagamento
  const aprovarPagamento = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('mt_influencer_payments')
        .update({
          status: 'aprovado',
          aprovado_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influenciadora-pagamentos'] });
      toast({
        title: 'Pagamento aprovado',
        description: 'O pagamento foi aprovado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao aprovar pagamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Marcar como pago
  const marcarComoPago = useMutation({
    mutationFn: async ({ id, comprovante_url }: { id: string; comprovante_url?: string }) => {
      const { data, error } = await supabase
        .from('mt_influencer_payments')
        .update({
          status: 'pago',
          data_pagamento: new Date().toISOString().split('T')[0],
          comprovante_url,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influenciadora-pagamentos'] });
      toast({
        title: 'Pagamento realizado',
        description: 'O pagamento foi marcado como realizado.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao marcar pagamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Cancelar pagamento
  const cancelarPagamento = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('mt_influencer_payments')
        .update({ status: 'cancelado' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influenciadora-pagamentos'] });
      toast({
        title: 'Pagamento cancelado',
        description: 'O pagamento foi cancelado.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao cancelar pagamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    pagamentos,
    metrics,
    isLoading,
    error,
    refetch,
    createPagamento,
    updatePagamento,
    aprovarPagamento,
    marcarComoPago,
    cancelarPagamento,
  };
}

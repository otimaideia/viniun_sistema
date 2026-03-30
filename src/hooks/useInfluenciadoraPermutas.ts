// =============================================================================
// USE INFLUENCIADORA PERMUTAS - Hook Multi-Tenant para Permutas/Trades
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

// =============================================================================
// Types - Mapeados para as colunas reais da tabela MT
// =============================================================================

export interface MTInfluencerTrade {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  influencer_id: string;
  contract_id: string | null;
  service_id: string | null;
  trade_type: string; // 'procedure' | 'product' | 'service'
  credit_amount: number;
  used_amount: number;
  balance_amount: number;
  valid_from: string | null;
  valid_until: string | null;
  description: string | null;
  status: string; // 'pending' | 'scheduled' | 'completed' | 'cancelled'
  redeemed_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  influencer?: {
    id: string;
    nome: string;
    nome_artistico: string | null;
  } | null;
  contract?: {
    id: string;
    credito_permuta: number | null;
  } | null;
  service?: {
    id: string;
    nome: string;
  } | null;
  franchise?: {
    id: string;
    nome_fantasia: string;
  } | null;
}

export interface MTInfluencerTradeCreate {
  influencer_id: string;
  contract_id?: string | null;
  service_id?: string | null;
  franchise_id?: string | null;
  trade_type?: string;
  credit_amount: number;
  used_amount?: number;
  description?: string | null;
  status?: string;
  valid_from?: string | null;
  valid_until?: string | null;
  notes?: string | null;
}

// Interface adaptada para compatibilidade com código legado
export interface InfluenciadoraPermutaAdaptada {
  id: string;
  influenciadora_id: string;
  contrato_id: string | null;
  servico_id: string | null;
  unidade_id: string | null;
  tipo_permuta: string;
  valor_credito: number;
  valor_utilizado: number;
  valor_saldo: number;
  descricao: string | null;
  status: string;
  data_realizacao: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
  // Relacionamentos adaptados
  influenciadora?: {
    id: string;
    nome_completo: string;
    nome_artistico: string | null;
  };
  contrato?: {
    id: string;
    credito_permuta: number | null;
  };
  servico?: {
    id: string;
    nome: string;
  };
  unidade?: {
    id: string;
    nome: string;
  };
}

interface PermutaFilters {
  influenciadoraId?: string;
  status?: string;
}

interface PermutaMetrics {
  creditoTotal: number;
  creditoUtilizado: number;
  creditoDisponivel: number;
  permutasRealizadas: number;
  permutasPendentes: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

function mapStatusToMT(status: string): string {
  const statusMap: Record<string, string> = {
    agendado: 'scheduled',
    realizado: 'completed',
    cancelado: 'cancelled',
    pendente: 'pending',
  };
  return statusMap[status] || status;
}

function mapStatusToLegacy(status: string): string {
  const statusMap: Record<string, string> = {
    scheduled: 'agendado',
    completed: 'realizado',
    cancelled: 'cancelado',
    pending: 'pendente',
  };
  return statusMap[status] || status;
}

function mapMTToAdaptado(trade: MTInfluencerTrade): InfluenciadoraPermutaAdaptada {
  return {
    id: trade.id,
    influenciadora_id: trade.influencer_id,
    contrato_id: trade.contract_id,
    servico_id: trade.service_id,
    unidade_id: trade.franchise_id,
    tipo_permuta: trade.trade_type || 'procedure',
    valor_credito: trade.credit_amount,
    valor_utilizado: trade.used_amount,
    valor_saldo: trade.balance_amount,
    descricao: trade.description,
    status: mapStatusToLegacy(trade.status),
    data_realizacao: trade.redeemed_at,
    notas: trade.notes,
    created_at: trade.created_at,
    updated_at: trade.updated_at,
    influenciadora: trade.influencer ? {
      id: trade.influencer.id,
      nome_completo: trade.influencer.nome,
      nome_artistico: trade.influencer.nome_artistico,
    } : undefined,
    contrato: trade.contract ? {
      id: trade.contract.id,
      credito_permuta: trade.contract.credito_permuta,
    } : undefined,
    servico: trade.service ? {
      id: trade.service.id,
      nome: trade.service.nome,
    } : undefined,
    unidade: trade.franchise ? {
      id: trade.franchise.id,
      nome: trade.franchise.nome_fantasia,
    } : undefined,
  };
}

// =============================================================================
// Hook Principal
// =============================================================================

export function useInfluenciadoraPermutas(filters: PermutaFilters = {}) {
  const { tenant, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ==========================================================================
  // Query: Buscar permutas
  // ==========================================================================
  const {
    data: permutasRaw,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['mt-influencer-trades', filters, tenant?.id],
    queryFn: async (): Promise<MTInfluencerTrade[]> => {
      let query = supabase
        .from('mt_influencer_trades')
        .select(`
          *,
          influencer:mt_influencers(id, nome, nome_artistico),
          contract:mt_influencer_contracts(id, credito_permuta),
          service:mt_services(id, nome),
          franchise:mt_franchises(id, nome_fantasia)
        `)
        .order('created_at', { ascending: false });

      if (filters.influenciadoraId) {
        query = query.eq('influencer_id', filters.influenciadoraId);
      }

      if (filters.status) {
        query = query.eq('status', mapStatusToMT(filters.status));
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      return (data || []) as MTInfluencerTrade[];
    },
    enabled: !isTenantLoading,
  });

  // Mapear para formato adaptado
  const permutas = permutasRaw?.map(mapMTToAdaptado) || [];

  // ==========================================================================
  // Query: Buscar crédito disponível (do contrato ativo)
  // ==========================================================================
  const {
    data: creditoContrato,
  } = useQuery({
    queryKey: ['mt-influencer-credito-permuta', filters.influenciadoraId],
    queryFn: async () => {
      if (!filters.influenciadoraId) return 0;

      const { data, error: fetchError } = await supabase
        .from('mt_influencer_contracts')
        .select('credito_permuta')
        .eq('influencer_id', filters.influenciadoraId)
        .eq('status', 'ativo')
        .maybeSingle();

      if (fetchError) throw fetchError;
      return data?.credito_permuta || 0;
    },
    enabled: !!filters.influenciadoraId && !isTenantLoading,
  });

  // ==========================================================================
  // Calcular métricas
  // ==========================================================================
  const creditoUtilizado = permutas
    .filter(p => p.status === 'realizado')
    .reduce((acc, p) => acc + (p.valor_utilizado || 0), 0);

  const metrics: PermutaMetrics = {
    creditoTotal: creditoContrato || 0,
    creditoUtilizado,
    creditoDisponivel: (creditoContrato || 0) - creditoUtilizado,
    permutasRealizadas: permutas.filter(p => p.status === 'realizado').length,
    permutasPendentes: permutas.filter(p => p.status === 'agendado').length,
  };

  // ==========================================================================
  // Mutation: Criar permuta (agendar procedimento)
  // ==========================================================================
  const createPermuta = useMutation({
    mutationFn: async (permuta: {
      influenciadora_id: string;
      contrato_id?: string;
      servico_id?: string;
      unidade_id?: string;
      valor_servico?: number;
      descricao?: string;
    }) => {
      if (!tenant) throw new Error('Tenant não carregado');

      // Verificar crédito disponível
      const { data: contrato } = await supabase
        .from('mt_influencer_contracts')
        .select('id, credito_permuta')
        .eq('influencer_id', permuta.influenciadora_id)
        .eq('status', 'ativo')
        .maybeSingle();

      if (!contrato) {
        throw new Error('Nenhum contrato ativo encontrado');
      }

      // Buscar permutas já utilizadas
      const { data: permutasUtilizadas } = await supabase
        .from('mt_influencer_trades')
        .select('used_amount')
        .eq('influencer_id', permuta.influenciadora_id)
        .eq('status', 'completed');

      const totalUtilizado = permutasUtilizadas?.reduce((acc, p) => acc + (p.used_amount || 0), 0) || 0;
      const creditoDisponivel = (contrato.credito_permuta || 0) - totalUtilizado;

      if (permuta.valor_servico && permuta.valor_servico > creditoDisponivel) {
        throw new Error('Crédito insuficiente para esta permuta');
      }

      const { data, error: insertError } = await supabase
        .from('mt_influencer_trades')
        .insert({
          tenant_id: tenant.id,
          influencer_id: permuta.influenciadora_id,
          contract_id: permuta.contrato_id || contrato.id,
          service_id: permuta.servico_id || null,
          franchise_id: permuta.unidade_id || null,
          trade_type: 'procedure',
          credit_amount: permuta.valor_servico || 0,
          used_amount: 0,
          balance_amount: permuta.valor_servico || 0,
          description: permuta.descricao || null,
          status: 'scheduled',
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-influencer-trades'] });
      queryClient.invalidateQueries({ queryKey: ['mt-influencer-credito-permuta'] });
      toast.success('Permuta agendada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao agendar permuta: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Atualizar permuta
  // ==========================================================================
  const updatePermuta = useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      descricao?: string;
      notas?: string;
      servico_id?: string;
      unidade_id?: string;
    }) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.descricao !== undefined) updateData.description = updates.descricao;
      if (updates.notas !== undefined) updateData.notes = updates.notas;
      if (updates.servico_id !== undefined) updateData.service_id = updates.servico_id;
      if (updates.unidade_id !== undefined) updateData.franchise_id = updates.unidade_id;

      const { data, error: updateError } = await supabase
        .from('mt_influencer_trades')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-influencer-trades'] });
      toast.success('Permuta atualizada');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar permuta: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Marcar como realizada
  // ==========================================================================
  const marcarComoRealizada = useMutation({
    mutationFn: async (id: string) => {
      // Buscar a permuta para saber o valor
      const { data: permuta } = await supabase
        .from('mt_influencer_trades')
        .select('credit_amount')
        .eq('id', id)
        .single();

      const { data, error: updateError } = await supabase
        .from('mt_influencer_trades')
        .update({
          status: 'completed',
          used_amount: permuta?.credit_amount || 0,
          balance_amount: 0,
          redeemed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-influencer-trades'] });
      queryClient.invalidateQueries({ queryKey: ['mt-influencer-credito-permuta'] });
      toast.success('Permuta marcada como realizada');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao marcar permuta: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Cancelar permuta
  // ==========================================================================
  const cancelarPermuta = useMutation({
    mutationFn: async (id: string) => {
      const { data, error: updateError } = await supabase
        .from('mt_influencer_trades')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-influencer-trades'] });
      queryClient.invalidateQueries({ queryKey: ['mt-influencer-credito-permuta'] });
      toast.success('Permuta cancelada');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao cancelar permuta: ${error.message}`);
    },
  });

  return {
    permutas,
    metrics,
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,
    createPermuta,
    updatePermuta,
    marcarComoRealizada,
    cancelarPermuta,
  };
}

export default useInfluenciadoraPermutas;

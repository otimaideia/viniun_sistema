import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { InfluenciadoraIndicacao } from '@/types/influenciadora';

interface IndicacaoFilters {
  influenciadoraId?: string;
  status?: string;
  dataInicio?: string;
  dataFim?: string;
}

interface IndicacaoMetrics {
  totalIndicacoes: number;
  indicacoesConvertidas: number;
  indicacoesPendentes: number;
  indicacoesPerdidas: number;
  taxaConversao: number;
}

/**
 * @deprecated Use useInfluenciadoraIndicacoesAdapter instead for proper multi-tenant isolation.
 */
export function useInfluenciadoraIndicacoes(filters: IndicacaoFilters = {}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Buscar indicacoes
  const {
    data: indicacoes,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['influenciadora-indicacoes', filters],
    queryFn: async () => {
      let query = supabase
        .from('mt_influencer_referrals')
        .select(`
          *,
          influenciadora:mt_influencers(id, nome_completo, nome_artistico, codigo),
          lead:mt_leads(id, nome, email, whatsapp, status, created_at)
        `)
        .order('created_at', { ascending: false });

      if (filters.influenciadoraId) {
        query = query.eq('influenciadora_id', filters.influenciadoraId);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.dataInicio) {
        query = query.gte('created_at', filters.dataInicio);
      }

      if (filters.dataFim) {
        query = query.lte('created_at', filters.dataFim);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as InfluenciadoraIndicacao[];
    },
  });

  // Calcular metricas
  const metrics: IndicacaoMetrics = {
    totalIndicacoes: indicacoes?.length || 0,
    indicacoesConvertidas: indicacoes?.filter(i => i.status === 'convertido').length || 0,
    indicacoesPendentes: indicacoes?.filter(i => i.status === 'pendente').length || 0,
    indicacoesPerdidas: indicacoes?.filter(i => i.status === 'perdido').length || 0,
    taxaConversao: indicacoes?.length
      ? (indicacoes.filter(i => i.status === 'convertido').length / indicacoes.length) * 100
      : 0,
  };

  // Atualizar status da indicacao
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'pendente' | 'convertido' | 'perdido' }) => {
      const updateData: Record<string, unknown> = { status };

      if (status === 'convertido') {
        updateData.data_conversao = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('mt_influencer_referrals')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['influenciadora-indicacoes'] });
      queryClient.invalidateQueries({ queryKey: ['influenciadoras'] });

      const statusLabels = {
        pendente: 'pendente',
        convertido: 'convertida',
        perdido: 'perdida',
      };

      toast({
        title: 'Status atualizado',
        description: `A indicacao foi marcada como ${statusLabels[variables.status]}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Marcar como convertido
  const marcarComoConvertido = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('mt_influencer_referrals')
        .update({
          status: 'convertido',
          data_conversao: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influenciadora-indicacoes'] });
      queryClient.invalidateQueries({ queryKey: ['influenciadoras'] });
      toast({
        title: 'Indicacao convertida',
        description: 'A indicacao foi marcada como convertida.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao converter indicacao',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Marcar como perdido
  const marcarComoPerdido = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('mt_influencer_referrals')
        .update({ status: 'perdido' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influenciadora-indicacoes'] });
      queryClient.invalidateQueries({ queryKey: ['influenciadoras'] });
      toast({
        title: 'Indicacao perdida',
        description: 'A indicacao foi marcada como perdida.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao marcar indicacao',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Buscar indicacoes por codigo
  const getIndicacoesByCodigo = async (codigo: string) => {
    const { data, error } = await supabase
      .from('mt_influencer_referrals')
      .select(`
        *,
        lead:mt_leads(id, nome, email, whatsapp, status, created_at)
      `)
      .eq('codigo_usado', codigo.toUpperCase())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as InfluenciadoraIndicacao[];
  };

  return {
    indicacoes,
    metrics,
    isLoading,
    error,
    refetch,
    updateStatus,
    marcarComoConvertido,
    marcarComoPerdido,
    getIndicacoesByCodigo,
  };
}

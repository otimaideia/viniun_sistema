import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { InfluenciadoraContrato, InfluenciadoraContratoInsert, InfluenciadoraContratoUpdate } from '@/types/influenciadora';

/**
 * @deprecated Use useInfluenciadoraContratosAdapter instead for proper multi-tenant isolation.
 */
export function useInfluenciadoraContratos(influenciadoraId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Buscar contratos de uma influenciadora
  const {
    data: contratos,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['influenciadora-contratos', influenciadoraId],
    queryFn: async () => {
      if (!influenciadoraId) return [];

      const { data, error } = await supabase
        .from('mt_influencer_contracts')
        .select(`
          *,
          influenciadora:mt_influencers(id, nome_completo, nome_artistico)
        `)
        .eq('influenciadora_id', influenciadoraId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as InfluenciadoraContrato[];
    },
    enabled: !!influenciadoraId,
  });

  // Buscar contrato ativo
  const contratoAtivo = contratos?.find(c => c.status === 'ativo');

  // Criar contrato
  const createContrato = useMutation({
    mutationFn: async (contrato: InfluenciadoraContratoInsert) => {
      const { data, error } = await supabase
        .from('mt_influencer_contracts')
        .insert(contrato)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influenciadora-contratos'] });
      toast({
        title: 'Contrato criado',
        description: 'O contrato foi criado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar contrato',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Atualizar contrato
  const updateContrato = useMutation({
    mutationFn: async ({ id, ...contrato }: InfluenciadoraContratoUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('mt_influencer_contracts')
        .update(contrato)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influenciadora-contratos'] });
      toast({
        title: 'Contrato atualizado',
        description: 'O contrato foi atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar contrato',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Encerrar contrato
  const encerrarContrato = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('mt_influencer_contracts')
        .update({ status: 'encerrado' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influenciadora-contratos'] });
      toast({
        title: 'Contrato encerrado',
        description: 'O contrato foi encerrado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao encerrar contrato',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    contratos,
    contratoAtivo,
    isLoading,
    error,
    refetch,
    createContrato,
    updateContrato,
    encerrarContrato,
  };
}

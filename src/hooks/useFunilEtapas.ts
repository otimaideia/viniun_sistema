import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { FunilEtapa, FunilEtapaCreate, FunilEtapaUpdate } from '@/types/funil';

const QUERY_KEY = 'funil_etapas';

/**
 * @deprecated Use useFunilEtapasAdapter instead for proper multi-tenant isolation.
 */
export function useFunilEtapas(funilId: string | undefined) {
  const {
    data: etapas = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, funilId],
    queryFn: async () => {
      if (!funilId) return [];

      const { data, error } = await supabase
        .from('mt_funnel_stages')
        .select('*')
        .eq('funil_id', funilId)
        .order('ordem');

      if (error) throw error;
      return data as FunilEtapa[];
    },
    enabled: !!funilId,
  });

  return { etapas, isLoading, error, refetch };
}

export function useFunilEtapa(etapaId: string | undefined) {
  const {
    data: etapa,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, 'single', etapaId],
    queryFn: async () => {
      if (!etapaId) return null;

      const { data, error } = await supabase
        .from('mt_funnel_stages')
        .select('*')
        .eq('id', etapaId)
        .single();

      if (error) throw error;
      return data as FunilEtapa;
    },
    enabled: !!etapaId,
  });

  return { etapa, isLoading, error, refetch };
}

export function useFunilEtapasMutations() {
  const queryClient = useQueryClient();

  const createEtapa = useMutation({
    mutationFn: async (data: FunilEtapaCreate) => {
      const { data: etapa, error } = await supabase
        .from('mt_funnel_stages')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return etapa as FunilEtapa;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.funil_id] });
      toast.success('Etapa criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar etapa: ${error.message}`);
    },
  });

  const updateEtapa = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FunilEtapaUpdate }) => {
      const { data: etapa, error } = await supabase
        .from('mt_funnel_stages')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return etapa as FunilEtapa;
    },
    onSuccess: (etapa) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, etapa.funil_id] });
      toast.success('Etapa atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar etapa: ${error.message}`);
    },
  });

  const deleteEtapa = useMutation({
    mutationFn: async ({ id, funilId }: { id: string; funilId: string }) => {
      const { error } = await supabase.from('mt_funnel_stages').delete().eq('id', id);

      if (error) throw error;
      return { id, funilId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.funilId] });
      toast.success('Etapa excluída com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir etapa: ${error.message}`);
    },
  });

  // Reordenar etapas
  const reorderEtapas = useMutation({
    mutationFn: async ({
      funilId,
      etapasOrdenadas,
    }: {
      funilId: string;
      etapasOrdenadas: { id: string; ordem: number }[];
    }) => {
      // Atualizar todas as ordens
      const promises = etapasOrdenadas.map(({ id, ordem }) =>
        supabase.from('mt_funnel_stages').update({ ordem }).eq('id', id)
      );

      await Promise.all(promises);
      return { funilId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.funilId] });
      toast.success('Etapas reordenadas!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao reordenar etapas: ${error.message}`);
    },
  });

  // Criar múltiplas etapas de uma vez (útil para templates)
  const createMultipleEtapas = useMutation({
    mutationFn: async (etapas: FunilEtapaCreate[]) => {
      const { data, error } = await supabase
        .from('mt_funnel_stages')
        .insert(etapas)
        .select();

      if (error) throw error;
      return data as FunilEtapa[];
    },
    onSuccess: (_, variables) => {
      if (variables.length > 0) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables[0].funil_id] });
      }
      toast.success('Etapas criadas com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar etapas: ${error.message}`);
    },
  });

  return {
    createEtapa,
    updateEtapa,
    deleteEtapa,
    reorderEtapas,
    createMultipleEtapas,
    isCreating: createEtapa.isPending,
    isUpdating: updateEtapa.isPending,
    isDeleting: deleteEtapa.isPending,
    isReordering: reorderEtapas.isPending,
  };
}

// Hook para buscar etapas por tipo
export function useFunilEtapasByTipo(funilId: string | undefined, tipo: 'ativa' | 'ganho' | 'perda') {
  const { etapas, isLoading, error } = useFunilEtapas(funilId);

  const etapasFiltradas = etapas.filter((e) => e.tipo === tipo);

  return { etapas: etapasFiltradas, isLoading, error };
}

// Hook para obter a primeira e última etapa
export function useFunilEtapasExtremos(funilId: string | undefined) {
  const { etapas, isLoading, error } = useFunilEtapas(funilId);

  const primeiraEtapa = etapas.length > 0 ? etapas[0] : null;
  const ultimaEtapa = etapas.length > 0 ? etapas[etapas.length - 1] : null;
  const etapaGanho = etapas.find((e) => e.tipo === 'ganho') || null;
  const etapaPerda = etapas.find((e) => e.tipo === 'perda') || null;

  return {
    primeiraEtapa,
    ultimaEtapa,
    etapaGanho,
    etapaPerda,
    isLoading,
    error,
  };
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Funil, FunilCreate, FunilUpdate, FunilEtapa, ETAPAS_PADRAO } from '@/types/funil';

const QUERY_KEY = 'funis';

/**
 * @deprecated Use useFunisAdapter instead for proper multi-tenant isolation.
 */
export function useFunis(options?: { includeTemplates?: boolean; apenasAtivos?: boolean }) {
  const { includeTemplates = true, apenasAtivos = true } = options || {};

  const {
    data: funis = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, { includeTemplates, apenasAtivos }],
    queryFn: async () => {
      let query = supabase
        .from('mt_funnels')
        .select('*')
        .order('created_at', { ascending: false });

      if (!includeTemplates) {
        query = query.eq('is_template', false);
      }

      if (apenasAtivos) {
        query = query.eq('ativo', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Funil[];
    },
  });

  return { funis, isLoading, error, refetch };
}

export function useFunil(funilId: string | undefined) {
  const {
    data: funil,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, funilId],
    queryFn: async () => {
      if (!funilId) return null;

      const { data, error } = await supabase
        .from('mt_funnels')
        .select('*')
        .eq('id', funilId)
        .single();

      if (error) throw error;
      return data as Funil;
    },
    enabled: !!funilId,
  });

  return { funil, isLoading, error, refetch };
}

export function useFunilMutations() {
  const queryClient = useQueryClient();

  const createFunil = useMutation({
    mutationFn: async (data: FunilCreate) => {
      const { data: funil, error } = await supabase
        .from('mt_funnels')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return funil as Funil;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Funil criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar funil: ${error.message}`);
    },
  });

  const updateFunil = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FunilUpdate }) => {
      const { data: funil, error } = await supabase
        .from('mt_funnels')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return funil as Funil;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Funil atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar funil: ${error.message}`);
    },
  });

  const deleteFunil = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mt_funnels').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Funil excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir funil: ${error.message}`);
    },
  });

  // Clonar um funil (de template ou outro funil)
  const cloneFunil = useMutation({
    mutationFn: async ({
      funilOrigemId,
      novoNome,
      franqueadoId,
    }: {
      funilOrigemId: string;
      novoNome: string;
      franqueadoId?: string;
    }) => {
      // 1. Buscar funil original
      const { data: funilOrigem, error: errorOrigem } = await supabase
        .from('mt_funnels')
        .select('*')
        .eq('id', funilOrigemId)
        .single();

      if (errorOrigem) throw errorOrigem;

      // 2. Criar novo funil
      const { data: novoFunil, error: errorFunil } = await supabase
        .from('mt_funnels')
        .insert({
          nome: novoNome,
          descricao: funilOrigem.descricao,
          franqueado_id: franqueadoId || null,
          is_template: false,
          template_origem_id: funilOrigemId,
        })
        .select()
        .single();

      if (errorFunil) throw errorFunil;

      // 3. Buscar etapas do funil original
      const { data: etapasOrigem, error: errorEtapas } = await supabase
        .from('mt_funnel_stages')
        .select('*')
        .eq('funil_id', funilOrigemId)
        .order('ordem');

      if (errorEtapas) throw errorEtapas;

      // 4. Criar mapa de IDs antigos -> novos (para automacao_destino_id)
      const idMap: Record<string, string> = {};

      // 5. Clonar etapas (primeira passagem sem automacao_destino_id)
      for (const etapa of etapasOrigem || []) {
        const { data: novaEtapa, error: errorNovaEtapa } = await supabase
          .from('mt_funnel_stages')
          .insert({
            funil_id: novoFunil.id,
            nome: etapa.nome,
            descricao: etapa.descricao,
            cor: etapa.cor,
            icone: etapa.icone,
            ordem: etapa.ordem,
            tipo: etapa.tipo,
            meta_dias: etapa.meta_dias,
            automacao_dias: etapa.automacao_dias,
            automacao_destino_id: null, // Será atualizado depois
          })
          .select()
          .single();

        if (errorNovaEtapa) throw errorNovaEtapa;
        idMap[etapa.id] = novaEtapa.id;
      }

      // 6. Atualizar automacao_destino_id com novos IDs
      for (const etapa of etapasOrigem || []) {
        if (etapa.automacao_destino_id && idMap[etapa.automacao_destino_id]) {
          await supabase
            .from('mt_funnel_stages')
            .update({ automacao_destino_id: idMap[etapa.automacao_destino_id] })
            .eq('id', idMap[etapa.id]);
        }
      }

      return novoFunil as Funil;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['funil_etapas'] });
      toast.success('Funil clonado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao clonar funil: ${error.message}`);
    },
  });

  // Criar funil com etapas padrão
  const createFunilComEtapasPadrao = useMutation({
    mutationFn: async ({
      funilData,
      etapas,
    }: {
      funilData: FunilCreate;
      etapas: Omit<FunilEtapa, 'id' | 'funil_id' | 'created_at'>[];
    }) => {
      // 1. Criar funil
      const { data: funil, error: errorFunil } = await supabase
        .from('mt_funnels')
        .insert(funilData)
        .select()
        .single();

      if (errorFunil) throw errorFunil;

      // 2. Criar etapas
      const etapasComFunilId = etapas.map((etapa) => ({
        ...etapa,
        funil_id: funil.id,
      }));

      const { error: errorEtapas } = await supabase
        .from('mt_funnel_stages')
        .insert(etapasComFunilId);

      if (errorEtapas) throw errorEtapas;

      return funil as Funil;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['funil_etapas'] });
      toast.success('Funil criado com etapas padrão!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar funil: ${error.message}`);
    },
  });

  return {
    createFunil,
    updateFunil,
    deleteFunil,
    cloneFunil,
    createFunilComEtapasPadrao,
    isCreating: createFunil.isPending,
    isUpdating: updateFunil.isPending,
    isDeleting: deleteFunil.isPending,
    isCloning: cloneFunil.isPending,
  };
}

// Hook para buscar templates disponíveis
export function useFunilTemplates() {
  const {
    data: templates = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, 'templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt_funnels')
        .select('*')
        .eq('is_template', true)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      return data as Funil[];
    },
  });

  return { templates, isLoading, error, refetch };
}

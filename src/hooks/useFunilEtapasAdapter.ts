import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { sanitizeObjectForJSON } from '@/utils/unicodeSanitizer';
import { toast } from 'sonner';
import type { FunilEtapa, FunilEtapaCreate, FunilEtapaUpdate, EtapaTipo } from '@/types/funil';

// =============================================================================
// HOOKS MT PARA ETAPAS DE FUNIL
// Usam tabela mt_funnel_stages com isolamento por tenant
// =============================================================================

const QUERY_KEY = 'mt-funnel-stages';

/**
 * Hook MT para listar etapas de um funil
 */
export function useFunilEtapasAdapter(funilId: string | undefined) {
  const { isLoading: isTenantLoading } = useTenantContext();

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
        .eq('funnel_id', funilId)
        .is('deleted_at', null)
        .order('ordem');

      if (error) throw error;
      return (data || []).map((item) => mapMTEtapaToLegacy(sanitizeObjectForJSON(item) as MTFunnelStage));
    },
    enabled: !!funilId && !isTenantLoading,
  });

  return { etapas, isLoading: isLoading || isTenantLoading, error, refetch, _mode: 'mt' as const };
}

/**
 * Hook MT para buscar uma etapa específica
 */
export function useFunilEtapaAdapter(etapaId: string | undefined) {
  const { isLoading: isTenantLoading } = useTenantContext();

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
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return mapMTEtapaToLegacy(sanitizeObjectForJSON(data) as MTFunnelStage);
    },
    enabled: !!etapaId && !isTenantLoading,
  });

  return { etapa, isLoading: isLoading || isTenantLoading, error, refetch, _mode: 'mt' as const };
}

/**
 * Hook MT para mutations de etapas
 */
export function useFunilEtapasMutationsAdapter() {
  const { tenant } = useTenantContext();
  const queryClient = useQueryClient();

  const createEtapa = useMutation({
    mutationFn: async (data: FunilEtapaCreate) => {
      const insertData = {
        tenant_id: tenant?.id,
        funnel_id: data.funil_id,
        nome: data.nome,
        descricao: data.descricao || null,
        cor: data.cor || '#3b82f6',
        icone: data.icone || 'circle',
        ordem: data.ordem,
        tipo: data.tipo || 'ativa',
        meta_dias: data.meta_dias || null,
        automacao_dias: data.automacao_dias || null,
        automacao_destino_id: data.automacao_destino_id || null,
      };

      const { data: etapa, error } = await supabase
        .from('mt_funnel_stages')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return mapMTEtapaToLegacy(etapa);
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
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (data.nome !== undefined) updateData.nome = data.nome;
      if (data.descricao !== undefined) updateData.descricao = data.descricao;
      if (data.cor !== undefined) updateData.cor = data.cor;
      if (data.icone !== undefined) updateData.icone = data.icone;
      if (data.ordem !== undefined) updateData.ordem = data.ordem;
      if (data.tipo !== undefined) updateData.tipo = data.tipo;
      if (data.meta_dias !== undefined) updateData.meta_dias = data.meta_dias;
      if (data.automacao_dias !== undefined) updateData.automacao_dias = data.automacao_dias;
      if (data.automacao_destino_id !== undefined) updateData.automacao_destino_id = data.automacao_destino_id;

      const { data: etapa, error } = await supabase
        .from('mt_funnel_stages')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return mapMTEtapaToLegacy(etapa);
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
      // Soft delete
      const { error } = await supabase
        .from('mt_funnel_stages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

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

  const reorderEtapas = useMutation({
    mutationFn: async ({
      funilId,
      etapasOrdenadas,
    }: {
      funilId: string;
      etapasOrdenadas: { id: string; ordem: number }[];
    }) => {
      const promises = etapasOrdenadas.map(({ id, ordem }) =>
        supabase
          .from('mt_funnel_stages')
          .update({ ordem, updated_at: new Date().toISOString() })
          .eq('id', id)
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

  const createMultipleEtapas = useMutation({
    mutationFn: async (etapas: FunilEtapaCreate[]) => {
      const insertData = etapas.map((etapa) => ({
        tenant_id: tenant?.id,
        funnel_id: etapa.funil_id,
        nome: etapa.nome,
        descricao: etapa.descricao || null,
        cor: etapa.cor || '#3b82f6',
        icone: etapa.icone || 'circle',
        ordem: etapa.ordem,
        tipo: etapa.tipo || 'ativa',
        meta_dias: etapa.meta_dias || null,
        automacao_dias: etapa.automacao_dias || null,
        automacao_destino_id: etapa.automacao_destino_id || null,
      }));

      const { data, error } = await supabase
        .from('mt_funnel_stages')
        .insert(insertData)
        .select();

      if (error) throw error;
      return (data || []).map(mapMTEtapaToLegacy);
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
    _mode: 'mt' as const,
  };
}

/**
 * Hook MT para buscar etapas por tipo
 */
export function useFunilEtapasByTipoAdapter(funilId: string | undefined, tipo: EtapaTipo) {
  const { etapas, isLoading, error } = useFunilEtapasAdapter(funilId);

  const etapasFiltradas = etapas.filter((e) => e.tipo === tipo);

  return { etapas: etapasFiltradas, isLoading, error, _mode: 'mt' as const };
}

/**
 * Hook MT para obter a primeira e última etapa
 */
export function useFunilEtapasExtremosAdapter(funilId: string | undefined) {
  const { etapas, isLoading, error } = useFunilEtapasAdapter(funilId);

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
    _mode: 'mt' as const,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

interface MTFunnelStage {
  id: string;
  tenant_id: string;
  funnel_id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  icone: string;
  ordem: number;
  tipo: EtapaTipo;
  meta_dias: number | null;
  automacao_dias: number | null;
  automacao_destino_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function mapMTEtapaToLegacy(mtStage: MTFunnelStage): FunilEtapa {
  return {
    id: mtStage.id,
    funil_id: mtStage.funnel_id,
    nome: mtStage.nome,
    descricao: mtStage.descricao,
    cor: mtStage.cor,
    icone: mtStage.icone,
    ordem: mtStage.ordem,
    tipo: mtStage.tipo,
    meta_dias: mtStage.meta_dias,
    automacao_dias: mtStage.automacao_dias,
    automacao_destino_id: mtStage.automacao_destino_id,
    created_at: mtStage.created_at,
  };
}

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  ParceriaIndicacao,
  ParceriaIndicacaoInsert,
  ParceriaIndicacaoUpdate,
  ParceriaIndicacaoFilters,
  ParceriaIndicacaoMetrics,
  IndicacaoStatus,
} from "@/types/parceria";

// =====================================================
// Query Keys
// =====================================================

export const parceriaIndicacoesKeys = {
  all: ["parceria-indicacoes"] as const,
  lists: () => [...parceriaIndicacoesKeys.all, "list"] as const,
  list: (filters: ParceriaIndicacaoFilters) => [...parceriaIndicacoesKeys.lists(), filters] as const,
  byParceria: (parceriaId: string) => [...parceriaIndicacoesKeys.all, "parceria", parceriaId] as const,
  metrics: (parceriaId: string) => [...parceriaIndicacoesKeys.all, "metrics", parceriaId] as const,
};

// =====================================================
// Hook Principal
// =====================================================

interface UseParceriaIndicacoes {
  filters?: ParceriaIndicacaoFilters;
}

/**
 * @deprecated Use useParceriaIndicacoesAdapter instead for proper multi-tenant isolation.
 */
export function useParceriaIndicacoes(options: UseParceriaIndicacoes = {}) {
  const { filters = {} } = options;
  const queryClient = useQueryClient();

  // =====================================================
  // Query: Listar Indicações
  // =====================================================

  const {
    data: indicacoes = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: parceriaIndicacoesKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from("mt_partnership_referrals")
        .select(`
          *,
          lead:mt_leads!lead_id(
            id, nome, email, whatsapp, status, created_at
          ),
          parceria:mt_partnerships!parceria_id(
            id, nome_fantasia, codigo_indicacao, logo_url
          )
        `)
        .order("data_indicacao", { ascending: false });

      // Aplicar filtros
      if (filters.parceria_id) {
        query = query.eq("parceria_id", filters.parceria_id);
      }

      if (filters.lead_id) {
        query = query.eq("lead_id", filters.lead_id);
      }

      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      if (filters.periodo_inicio) {
        query = query.gte("data_indicacao", filters.periodo_inicio);
      }

      if (filters.periodo_fim) {
        query = query.lte("data_indicacao", filters.periodo_fim);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filtro de busca textual (client-side)
      let result = data as ParceriaIndicacao[];

      if (filters.search) {
        const search = filters.search.toLowerCase();
        result = result.filter(
          (i) =>
            i.lead?.nome?.toLowerCase().includes(search) ||
            i.lead?.email?.toLowerCase().includes(search) ||
            i.parceria?.nome_fantasia?.toLowerCase().includes(search) ||
            i.codigo_usado?.toLowerCase().includes(search)
        );
      }

      return result;
    },
  });

  // =====================================================
  // Query: Métricas por Parceria
  // =====================================================

  const getMetrics = useCallback(async (parceriaId: string): Promise<ParceriaIndicacaoMetrics> => {
    const { data, error } = await supabase
      .from("mt_partnership_referrals")
      .select("status")
      .eq("parceria_id", parceriaId);

    if (error) throw error;

    const total = data?.length || 0;
    const convertidas = data?.filter((i) => i.status === "convertido").length || 0;
    const pendentes = data?.filter((i) => i.status === "pendente").length || 0;
    const perdidas = data?.filter((i) => i.status === "perdido").length || 0;
    const canceladas = data?.filter((i) => i.status === "cancelado").length || 0;

    return {
      total,
      convertidas,
      pendentes,
      perdidas,
      canceladas,
      taxa_conversao: total > 0 ? Math.round((convertidas / total) * 100 * 10) / 10 : 0,
    };
  }, []);

  // =====================================================
  // Mutation: Criar Indicação
  // =====================================================

  const createMutation = useMutation({
    mutationFn: async (data: ParceriaIndicacaoInsert) => {
      const { data: indicacao, error } = await supabase
        .from("mt_partnership_referrals")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return indicacao as ParceriaIndicacao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parceriaIndicacoesKeys.all });
      toast.success("Indicação registrada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao criar indicação:", error);
      toast.error("Erro ao registrar indicação");
    },
  });

  // =====================================================
  // Mutation: Atualizar Status
  // =====================================================

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: IndicacaoStatus }) => {
      const updateData: Partial<ParceriaIndicacao> = { status };

      // Se convertido, registrar data de conversão
      if (status === "convertido") {
        updateData.data_conversao = new Date().toISOString();
      }

      const { error } = await supabase
        .from("mt_partnership_referrals")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parceriaIndicacoesKeys.all });
      toast.success("Status atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    },
  });

  // =====================================================
  // Mutation: Atualizar Indicação
  // =====================================================

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ParceriaIndicacaoUpdate }) => {
      const { error } = await supabase
        .from("mt_partnership_referrals")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parceriaIndicacoesKeys.all });
      toast.success("Indicação atualizada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar indicação:", error);
      toast.error("Erro ao atualizar indicação");
    },
  });

  // =====================================================
  // Mutation: Deletar Indicação
  // =====================================================

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mt_partnership_referrals").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parceriaIndicacoesKeys.all });
      toast.success("Indicação removida com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao deletar indicação:", error);
      toast.error("Erro ao remover indicação");
    },
  });

  // =====================================================
  // Atalhos para Mudança de Status
  // =====================================================

  const marcarComoConvertido = useCallback(
    (id: string) => updateStatusMutation.mutateAsync({ id, status: "convertido" }),
    [updateStatusMutation]
  );

  const marcarComoPerdido = useCallback(
    (id: string) => updateStatusMutation.mutateAsync({ id, status: "perdido" }),
    [updateStatusMutation]
  );

  const marcarComoCancelado = useCallback(
    (id: string) => updateStatusMutation.mutateAsync({ id, status: "cancelado" }),
    [updateStatusMutation]
  );

  // =====================================================
  // Return
  // =====================================================

  return {
    // Dados
    indicacoes,

    // Estados
    isLoading,
    error,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending || updateStatusMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Ações
    refetch,
    createIndicacao: createMutation.mutateAsync,
    updateIndicacao: updateMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,
    deleteIndicacao: deleteMutation.mutateAsync,

    // Atalhos
    marcarComoConvertido,
    marcarComoPerdido,
    marcarComoCancelado,

    // Métricas
    getMetrics,
  };
}

// =====================================================
// Hook: Indicações de uma Parceria Específica
// =====================================================

export function useIndicacoesByParceria(parceriaId: string | undefined) {
  const {
    data: indicacoes = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: parceriaIndicacoesKeys.byParceria(parceriaId || ""),
    queryFn: async () => {
      if (!parceriaId) return [];

      const { data, error } = await supabase
        .from("mt_partnership_referrals")
        .select(`
          *,
          lead:mt_leads!lead_id(
            id, nome, email, whatsapp, status, created_at
          )
        `)
        .eq("parceria_id", parceriaId)
        .order("data_indicacao", { ascending: false });

      if (error) throw error;
      return data as ParceriaIndicacao[];
    },
    enabled: !!parceriaId,
  });

  // Calcular métricas
  const metrics: ParceriaIndicacaoMetrics = {
    total: indicacoes.length,
    convertidas: indicacoes.filter((i) => i.status === "convertido").length,
    pendentes: indicacoes.filter((i) => i.status === "pendente").length,
    perdidas: indicacoes.filter((i) => i.status === "perdido").length,
    canceladas: indicacoes.filter((i) => i.status === "cancelado").length,
    taxa_conversao:
      indicacoes.length > 0
        ? Math.round(
            (indicacoes.filter((i) => i.status === "convertido").length / indicacoes.length) * 100 * 10
          ) / 10
        : 0,
  };

  return {
    indicacoes,
    metrics,
    isLoading,
    error,
    refetch,
  };
}

export default useParceriaIndicacoes;

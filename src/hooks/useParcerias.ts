import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type {
  Parceria,
  ParceriaInsert,
  ParceriaUpdate,
  ParceriaFilters,
  ParceriaKPIs,
  ParceriaRanking,
  calcularTaxaConversao,
} from "@/types/parceria";

// =====================================================
// Query Keys
// =====================================================

export const parceriasKeys = {
  all: ["parcerias"] as const,
  lists: () => [...parceriasKeys.all, "list"] as const,
  list: (filters: ParceriaFilters) => [...parceriasKeys.lists(), filters] as const,
  details: () => [...parceriasKeys.all, "detail"] as const,
  detail: (id: string) => [...parceriasKeys.details(), id] as const,
  byCodigo: (codigo: string) => [...parceriasKeys.all, "codigo", codigo] as const,
  kpis: () => [...parceriasKeys.all, "kpis"] as const,
  ranking: () => [...parceriasKeys.all, "ranking"] as const,
};

// =====================================================
// Hook Principal
// =====================================================

interface UseParcerias {
  filters?: ParceriaFilters;
}

/**
 * @deprecated Use useParceriasAdapter instead for proper multi-tenant isolation.
 */
export function useParcerias(options: UseParcerias = {}) {
  const { filters = {} } = options;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // =====================================================
  // Query: Listar Parcerias
  // =====================================================

  const {
    data: parcerias = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: parceriasKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from("mt_partnerships")
        .select(`
          *,
          beneficios:mt_partnership_benefits(*)
        `)
        .order("created_at", { ascending: false });

      // Aplicar filtros
      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      if (filters.ramo_atividade) {
        query = query.eq("ramo_atividade", filters.ramo_atividade);
      }

      if (filters.franqueado_id) {
        query = query.eq("franqueado_id", filters.franqueado_id);
      }

      if (filters.cidade) {
        query = query.ilike("cidade", `%${filters.cidade}%`);
      }

      if (filters.estado) {
        query = query.eq("estado", filters.estado);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filtro de busca textual (client-side para múltiplos campos)
      let result = data as Parceria[];

      if (filters.search) {
        const search = filters.search.toLowerCase();
        result = result.filter(
          (p) =>
            p.nome_fantasia?.toLowerCase().includes(search) ||
            p.razao_social?.toLowerCase().includes(search) ||
            p.cnpj?.includes(search) ||
            p.codigo_indicacao?.toLowerCase().includes(search) ||
            p.responsavel_nome?.toLowerCase().includes(search) ||
            p.responsavel_email?.toLowerCase().includes(search) ||
            p.cidade?.toLowerCase().includes(search)
        );
      }

      return result;
    },
  });

  // =====================================================
  // Query: KPIs
  // =====================================================

  const { data: kpis } = useQuery({
    queryKey: parceriasKeys.kpis(),
    queryFn: async (): Promise<ParceriaKPIs> => {
      // Buscar dados agregados
      const { data: parceriasData, error: parceriasError } = await supabase
        .from("mt_partnerships")
        .select("id, status, quantidade_indicacoes");

      if (parceriasError) throw parceriasError;

      const { data: indicacoesData, error: indicacoesError } = await supabase
        .from("mt_partnership_referrals")
        .select("status");

      if (indicacoesError) throw indicacoesError;

      const { data: beneficiosData, error: beneficiosError } = await supabase
        .from("mt_partnership_benefits")
        .select("ativo");

      if (beneficiosError) throw beneficiosError;

      // Calcular métricas
      const total = parceriasData?.length || 0;
      const ativas = parceriasData?.filter((p) => p.status === "ativo").length || 0;
      const inativas = parceriasData?.filter((p) => p.status === "inativo").length || 0;
      const pendentes = parceriasData?.filter((p) => p.status === "pendente").length || 0;

      const totalIndicacoes = indicacoesData?.length || 0;
      const convertidas = indicacoesData?.filter((i) => i.status === "convertido").length || 0;
      const indicacoesPendentes = indicacoesData?.filter((i) => i.status === "pendente").length || 0;
      const perdidas = indicacoesData?.filter((i) => i.status === "perdido").length || 0;

      const beneficiosAtivos = beneficiosData?.filter((b) => b.ativo).length || 0;

      return {
        total_parcerias: total,
        parcerias_ativas: ativas,
        parcerias_inativas: inativas,
        parcerias_pendentes: pendentes,
        total_indicacoes: totalIndicacoes,
        indicacoes_convertidas: convertidas,
        indicacoes_pendentes: indicacoesPendentes,
        indicacoes_perdidas: perdidas,
        taxa_conversao: totalIndicacoes > 0 ? Math.round((convertidas / totalIndicacoes) * 100 * 10) / 10 : 0,
        beneficios_ativos: beneficiosAtivos,
      };
    },
  });

  // =====================================================
  // Query: Ranking de Parcerias
  // =====================================================

  const { data: ranking } = useQuery({
    queryKey: parceriasKeys.ranking(),
    queryFn: async (): Promise<ParceriaRanking[]> => {
      const { data, error } = await supabase
        .from("mt_partnerships")
        .select(`
          id,
          nome_fantasia,
          codigo_indicacao,
          logo_url,
          quantidade_indicacoes
        `)
        .eq("status", "ativo")
        .order("quantidade_indicacoes", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Buscar indicações convertidas para cada parceria
      const rankings: ParceriaRanking[] = await Promise.all(
        (data || []).map(async (p, index) => {
          const { data: indicacoes } = await supabase
            .from("mt_partnership_referrals")
            .select("status, data_indicacao")
            .eq("parceria_id", p.id)
            .order("data_indicacao", { ascending: false });

          const convertidas = indicacoes?.filter((i) => i.status === "convertido").length || 0;
          const total = indicacoes?.length || 0;
          const ultimaIndicacao = indicacoes?.[0]?.data_indicacao;

          return {
            posicao: index + 1,
            parceria_id: p.id,
            nome_fantasia: p.nome_fantasia,
            codigo_indicacao: p.codigo_indicacao,
            logo_url: p.logo_url,
            total_indicacoes: total,
            indicacoes_convertidas: convertidas,
            taxa_conversao: total > 0 ? Math.round((convertidas / total) * 100 * 10) / 10 : 0,
            ultima_indicacao: ultimaIndicacao,
          };
        })
      );

      return rankings;
    },
  });

  // =====================================================
  // Mutation: Criar Parceria
  // =====================================================

  const createMutation = useMutation({
    mutationFn: async (data: ParceriaInsert) => {
      const { data: parceria, error } = await supabase
        .from("mt_partnerships")
        .insert({
          ...data,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return parceria as Parceria;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parceriasKeys.all });
      toast.success("Parceria criada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao criar parceria:", error);
      if (error.code === "23505" && error.message?.includes("cnpj")) {
        toast.error("CNPJ já cadastrado em outra parceria");
      } else {
        toast.error("Erro ao criar parceria");
      }
    },
  });

  // =====================================================
  // Mutation: Atualizar Parceria
  // =====================================================

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ParceriaUpdate }) => {
      const { data: parceria, error } = await supabase
        .from("mt_partnerships")
        .update({
          ...data,
          updated_by: user?.id,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return parceria as Parceria;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: parceriasKeys.all });
      queryClient.invalidateQueries({ queryKey: parceriasKeys.detail(id) });
      toast.success("Parceria atualizada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar parceria:", error);
      if (error.code === "23505" && error.message?.includes("cnpj")) {
        toast.error("CNPJ já cadastrado em outra parceria");
      } else {
        toast.error("Erro ao atualizar parceria");
      }
    },
  });

  // =====================================================
  // Mutation: Deletar Parceria
  // =====================================================

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mt_partnerships").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parceriasKeys.all });
      toast.success("Parceria removida com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao deletar parceria:", error);
      toast.error("Erro ao remover parceria");
    },
  });

  // =====================================================
  // Mutation: Atualizar Status
  // =====================================================

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Parceria["status"] }) => {
      const { error } = await supabase
        .from("mt_partnerships")
        .update({ status, updated_by: user?.id })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parceriasKeys.all });
      toast.success("Status atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    },
  });

  // =====================================================
  // Funções de Busca Individual
  // =====================================================

  const getParceria = useCallback(async (id: string): Promise<Parceria | null> => {
    const { data, error } = await supabase
      .from("mt_partnerships")
      .select(`
        *,
        beneficios:mt_partnership_benefits(*),
        contatos:mt_partnership_contacts(*)
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Erro ao buscar parceria:", error);
      return null;
    }

    return data as Parceria;
  }, []);

  const getParceriaByCodigo = useCallback(async (codigo: string): Promise<Parceria | null> => {
    const { data, error } = await supabase
      .from("mt_partnerships")
      .select(`
        *,
        beneficios:mt_partnership_benefits(*)
      `)
      .eq("codigo_indicacao", codigo.toUpperCase())
      .eq("status", "ativo")
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar parceria por código:", error);
      return null;
    }

    return data as Parceria | null;
  }, []);

  // =====================================================
  // Validações
  // =====================================================

  const checkCNPJExists = useCallback(async (cnpj: string, excludeId?: string): Promise<boolean> => {
    const cleanCNPJ = cnpj.replace(/\D/g, "");
    let query = supabase.from("mt_partnerships").select("id").eq("cnpj", cleanCNPJ);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data } = await query.maybeSingle();
    return !!data;
  }, []);

  // =====================================================
  // Return
  // =====================================================

  return {
    // Dados
    parcerias,
    kpis,
    ranking,

    // Estados
    isLoading,
    error,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Ações
    refetch,
    createParceria: createMutation.mutateAsync,
    updateParceria: updateMutation.mutateAsync,
    deleteParceria: deleteMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,

    // Buscas
    getParceria,
    getParceriaByCodigo,

    // Validações
    checkCNPJExists,
  };
}

// =====================================================
// Hook: Parceria Individual
// =====================================================

export function useParceria(id: string | undefined) {
  const queryClient = useQueryClient();

  const {
    data: parceria,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: parceriasKeys.detail(id || ""),
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("mt_partnerships")
        .select(`
          *,
          beneficios:mt_partnership_benefits(*),
          contatos:mt_partnership_contacts(*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Parceria;
    },
    enabled: !!id,
  });

  return {
    parceria,
    isLoading,
    error,
    refetch,
  };
}

// =====================================================
// Hook: Busca por Código (para formulário público)
// =====================================================

export function useParceriaByCodigo(codigo: string | null) {
  const {
    data: parceria,
    isLoading,
    error,
  } = useQuery({
    queryKey: parceriasKeys.byCodigo(codigo || ""),
    queryFn: async () => {
      if (!codigo) return null;

      const { data, error } = await supabase
        .from("mt_partnerships")
        .select(`
          id,
          nome_fantasia,
          codigo_indicacao,
          logo_url,
          descricao_curta,
          website,
          beneficios:mt_partnership_benefits(*)
        `)
        .eq("codigo_indicacao", codigo.toUpperCase())
        .eq("status", "ativo")
        .maybeSingle();

      if (error) throw error;
      return data as Partial<Parceria> | null;
    },
    enabled: !!codigo,
  });

  return {
    parceria,
    isLoading,
    error,
    exists: !!parceria,
  };
}

export default useParcerias;

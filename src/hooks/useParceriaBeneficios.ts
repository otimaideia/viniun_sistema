import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  ParceriaBeneficio,
  ParceriaBeneficioInsert,
  ParceriaBeneficioUpdate,
} from "@/types/parceria";

// =====================================================
// Query Keys
// =====================================================

export const parceriaBeneficiosKeys = {
  all: ["parceria-beneficios"] as const,
  byParceria: (parceriaId: string) => [...parceriaBeneficiosKeys.all, parceriaId] as const,
};

// =====================================================
// Hook Principal
// =====================================================

/**
 * @deprecated Use useParceriaBeneficiosAdapter instead for proper multi-tenant isolation.
 */
export function useParceriaBeneficios(parceriaId: string | undefined) {
  const queryClient = useQueryClient();

  // =====================================================
  // Query: Listar Benefícios
  // =====================================================

  const {
    data: beneficios = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: parceriaBeneficiosKeys.byParceria(parceriaId || ""),
    queryFn: async () => {
      if (!parceriaId) return [];

      const { data, error } = await supabase
        .from("mt_partnership_benefits")
        .select("*")
        .eq("parceria_id", parceriaId)
        .order("ordem", { ascending: true });

      if (error) throw error;
      return data as ParceriaBeneficio[];
    },
    enabled: !!parceriaId,
  });

  // =====================================================
  // Mutation: Criar Benefício
  // =====================================================

  const createMutation = useMutation({
    mutationFn: async (data: ParceriaBeneficioInsert) => {
      // Se marcado como destaque, desmarcar outros
      if (data.destaque) {
        await supabase
          .from("mt_partnership_benefits")
          .update({ destaque: false })
          .eq("parceria_id", data.parceria_id);
      }

      // Calcular próxima ordem
      const { data: existing } = await supabase
        .from("mt_partnership_benefits")
        .select("ordem")
        .eq("parceria_id", data.parceria_id)
        .order("ordem", { ascending: false })
        .limit(1);

      const nextOrdem = existing && existing.length > 0 ? existing[0].ordem + 1 : 0;

      const { data: beneficio, error } = await supabase
        .from("mt_partnership_benefits")
        .insert({ ...data, ordem: data.ordem ?? nextOrdem })
        .select()
        .single();

      if (error) throw error;
      return beneficio as ParceriaBeneficio;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parceriaBeneficiosKeys.all });
      toast.success("Benefício adicionado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao criar benefício:", error);
      toast.error("Erro ao adicionar benefício");
    },
  });

  // =====================================================
  // Mutation: Atualizar Benefício
  // =====================================================

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ParceriaBeneficioUpdate }) => {
      // Se marcado como destaque, desmarcar outros
      if (data.destaque && parceriaId) {
        await supabase
          .from("mt_partnership_benefits")
          .update({ destaque: false })
          .eq("parceria_id", parceriaId)
          .neq("id", id);
      }

      const { error } = await supabase
        .from("mt_partnership_benefits")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parceriaBeneficiosKeys.all });
      toast.success("Benefício atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar benefício:", error);
      toast.error("Erro ao atualizar benefício");
    },
  });

  // =====================================================
  // Mutation: Deletar Benefício
  // =====================================================

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mt_partnership_benefits").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parceriaBeneficiosKeys.all });
      toast.success("Benefício removido com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao deletar benefício:", error);
      toast.error("Erro ao remover benefício");
    },
  });

  // =====================================================
  // Mutation: Reordenar Benefícios
  // =====================================================

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        supabase.from("mt_partnership_benefits").update({ ordem: index }).eq("id", id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parceriaBeneficiosKeys.all });
    },
    onError: (error) => {
      console.error("Erro ao reordenar benefícios:", error);
      toast.error("Erro ao reordenar benefícios");
    },
  });

  // =====================================================
  // Funções Auxiliares
  // =====================================================

  const toggleAtivo = useCallback(
    (id: string, ativo: boolean) => updateMutation.mutateAsync({ id, data: { ativo } }),
    [updateMutation]
  );

  const toggleDestaque = useCallback(
    (id: string, destaque: boolean) => updateMutation.mutateAsync({ id, data: { destaque } }),
    [updateMutation]
  );

  // =====================================================
  // Dados Derivados
  // =====================================================

  const beneficiosAtivos = beneficios.filter((b) => b.ativo);
  const beneficioDestaque = beneficios.find((b) => b.destaque && b.ativo);

  // =====================================================
  // Return
  // =====================================================

  return {
    // Dados
    beneficios,
    beneficiosAtivos,
    beneficioDestaque,

    // Estados
    isLoading,
    error,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isReordering: reorderMutation.isPending,

    // Ações
    refetch,
    createBeneficio: createMutation.mutateAsync,
    updateBeneficio: updateMutation.mutateAsync,
    deleteBeneficio: deleteMutation.mutateAsync,
    reorderBeneficios: reorderMutation.mutateAsync,

    // Atalhos
    toggleAtivo,
    toggleDestaque,
  };
}

export default useParceriaBeneficios;

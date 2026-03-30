import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Vaga, VagaWithDetails, VagaStatus } from "@/types/recrutamento";
import { toast } from "sonner";

/**
 * @deprecated Use useVagasAdapter instead for proper multi-tenant isolation.
 */
export function useVagas() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["vagas"],
    queryFn: async (): Promise<VagaWithDetails[]> => {
      // Buscar vagas com unidade
      const { data: vagas, error } = await supabase
        .from("mt_job_positions")
        .select(`
          *,
          unidade:mt_franchises(id, nome_fantasia, cidade, estado)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching vagas:", error);
        throw error;
      }

      // Buscar contagem de candidatos por vaga
      const { data: candidatosCounts, error: countError } = await supabase
        .from("mt_candidates")
        .select("vaga_id");

      if (countError) {
        console.error("Error fetching candidatos count:", countError);
      }

      // Mapear contagem de candidatos
      const countMap = (candidatosCounts || []).reduce((acc, c) => {
        if (c.vaga_id) {
          acc[c.vaga_id] = (acc[c.vaga_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return (vagas || []).map((v) => ({
        ...v,
        total_candidatos: countMap[v.id] || 0,
      }));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (vaga: Partial<Vaga>) => {
      const { error } = await supabase
        .from("mt_job_positions")
        .insert(vaga);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vagas"] });
      toast.success("Vaga criada com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating vaga:", error);
      toast.error("Erro ao criar vaga");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Vaga> & { id: string }) => {
      const { error } = await supabase
        .from("mt_job_positions")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vagas"] });
      toast.success("Vaga atualizada!");
    },
    onError: (error) => {
      console.error("Error updating vaga:", error);
      toast.error("Erro ao atualizar vaga");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: VagaStatus }) => {
      const { error } = await supabase
        .from("mt_job_positions")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vagas"] });
      toast.success("Status atualizado!");
    },
    onError: (error) => {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mt_job_positions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vagas"] });
      toast.success("Vaga removida!");
    },
    onError: (error) => {
      console.error("Error deleting vaga:", error);
      toast.error("Erro ao remover vaga");
    },
  });

  return {
    vagas: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    createVaga: createMutation.mutate,
    updateVaga: updateMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    deleteVaga: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

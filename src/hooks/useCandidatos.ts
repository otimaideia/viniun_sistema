import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Candidato, CandidatoWithDetails, CandidatoStatus } from "@/types/recrutamento";
import { toast } from "sonner";

/**
 * @deprecated Use useCandidatosAdapter instead for proper multi-tenant isolation.
 */
export function useCandidatos() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["candidatos"],
    queryFn: async (): Promise<CandidatoWithDetails[]> => {
      const { data, error } = await supabase
        .from("mt_candidates")
        .select(`
          *,
          vaga:mt_job_positions(id, titulo),
          unidade_interesse:mt_franchises(id, nome_fantasia)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching candidatos:", error);
        throw error;
      }

      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (candidato: Partial<Candidato>) => {
      const { error } = await supabase
        .from("mt_candidates")
        .insert(candidato);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidatos"] });
      queryClient.invalidateQueries({ queryKey: ["vagas"] });
      toast.success("Candidato cadastrado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating candidato:", error);
      toast.error("Erro ao cadastrar candidato");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Candidato> & { id: string }) => {
      const { error } = await supabase
        .from("mt_candidates")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidatos"] });
      toast.success("Candidato atualizado!");
    },
    onError: (error) => {
      console.error("Error updating candidato:", error);
      toast.error("Erro ao atualizar candidato");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CandidatoStatus }) => {
      const { error } = await supabase
        .from("mt_candidates")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidatos"] });
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
        .from("mt_candidates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidatos"] });
      queryClient.invalidateQueries({ queryKey: ["vagas"] });
      toast.success("Candidato removido!");
    },
    onError: (error) => {
      console.error("Error deleting candidato:", error);
      toast.error("Erro ao remover candidato");
    },
  });

  return {
    candidatos: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    createCandidato: createMutation.mutate,
    updateCandidato: updateMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    deleteCandidato: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Entrevista, EntrevistaWithDetails, EntrevistaStatus } from "@/types/recrutamento";
import { toast } from "sonner";

/**
 * @deprecated Use useEntrevistasAdapter instead for proper multi-tenant isolation.
 */
export function useEntrevistas() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["entrevistas"],
    queryFn: async (): Promise<EntrevistaWithDetails[]> => {
      const { data, error } = await supabase
        .from("mt_interviews")
        .select(`
          *,
          candidato:mt_candidates(id, nome, telefone, email),
          entrevistador:mt_users(id, full_name, email)
        `)
        .order("data_entrevista", { ascending: true });

      if (error) {
        console.error("Error fetching entrevistas:", error);
        throw error;
      }

      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (entrevista: Partial<Entrevista>) => {
      const { error } = await supabase
        .from("mt_interviews")
        .insert(entrevista);

      if (error) throw error;

      // Atualizar status do candidato para "entrevista_agendada"
      if (entrevista.candidato_id) {
        await supabase
          .from("mt_candidates")
          .update({ 
            status: "entrevista_agendada",
            updated_at: new Date().toISOString()
          })
          .eq("id", entrevista.candidato_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entrevistas"] });
      queryClient.invalidateQueries({ queryKey: ["candidatos"] });
      toast.success("Entrevista agendada com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating entrevista:", error);
      toast.error("Erro ao agendar entrevista");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Entrevista> & { id: string }) => {
      const { error } = await supabase
        .from("mt_interviews")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entrevistas"] });
      toast.success("Entrevista atualizada!");
    },
    onError: (error) => {
      console.error("Error updating entrevista:", error);
      toast.error("Erro ao atualizar entrevista");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EntrevistaStatus }) => {
      const { error } = await supabase
        .from("mt_interviews")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entrevistas"] });
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
        .from("mt_interviews")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entrevistas"] });
      toast.success("Entrevista removida!");
    },
    onError: (error) => {
      console.error("Error deleting entrevista:", error);
      toast.error("Erro ao remover entrevista");
    },
  });

  return {
    entrevistas: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    createEntrevista: createMutation.mutate,
    updateEntrevista: updateMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    deleteEntrevista: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

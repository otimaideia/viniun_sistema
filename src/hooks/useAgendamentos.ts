import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Agendamento, AgendamentoWithDetails, AgendamentoStatus } from "@/types/agendamento";
import { toast } from "sonner";
import { useUserProfile } from "./useUserProfile";

/**
 * @deprecated Use useAgendamentosAdapter instead for proper multi-tenant isolation.
 */
export function useAgendamentos() {
  const queryClient = useQueryClient();
  const { canViewAllLeads, unidadeId, isLoading: isLoadingProfile } = useUserProfile();

  const query = useQuery({
    queryKey: ["agendamentos", canViewAllLeads, unidadeId],
    queryFn: async (): Promise<AgendamentoWithDetails[]> => {
      let queryBuilder = supabase
        .from("mt_appointments")
        .select(`
          *,
          unidade:mt_franchises(id, nome_fantasia),
          responsavel:mt_users(id, full_name, email)
        `);

      // Filtra por unidade se o usuário for "unidade"
      if (!canViewAllLeads && unidadeId) {
        queryBuilder = queryBuilder.eq("unidade_id", unidadeId);
      }

      const { data, error } = await queryBuilder
        .order("data_agendamento", { ascending: true })
        .order("hora_inicio", { ascending: true });

      if (error) {
        console.error("Error fetching agendamentos:", error);
        throw error;
      }

      return data || [];
    },
    enabled: !isLoadingProfile, // Espera carregar o perfil antes de buscar
  });

  const createMutation = useMutation({
    mutationFn: async (agendamento: Partial<Agendamento>) => {
      const { error } = await supabase
        .from("mt_appointments")
        .insert(agendamento);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
      toast.success("Agendamento criado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating agendamento:", error);
      toast.error("Erro ao criar agendamento");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Agendamento> & { id: string }) => {
      const { error } = await supabase
        .from("mt_appointments")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
      toast.success("Agendamento atualizado!");
    },
    onError: (error) => {
      console.error("Error updating agendamento:", error);
      toast.error("Erro ao atualizar agendamento");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AgendamentoStatus }) => {
      const { error } = await supabase
        .from("mt_appointments")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
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
        .from("mt_appointments")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
      toast.success("Agendamento removido!");
    },
    onError: (error) => {
      console.error("Error deleting agendamento:", error);
      toast.error("Erro ao remover agendamento");
    },
  });

  return {
    agendamentos: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    createAgendamento: createMutation.mutate,
    updateAgendamento: updateMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    deleteAgendamento: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Franqueado } from "@/types/franqueado";
import { toast } from "sonner";

/**
 * @deprecated Use useFranqueadosAdapter instead for proper multi-tenant isolation.
 */
export function useFranqueados() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["mt-franchises"],
    queryFn: async (): Promise<Franqueado[]> => {
      const { data, error } = await supabase
        .from("mt_franchises")
        .select("*")
        .order("nome_fantasia", { ascending: true });

      if (error) {
        console.error("Error fetching franqueados:", error);
        throw error;
      }

      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (franqueado: Partial<Franqueado>) => {
      const { error } = await supabase
        .from("mt_franchises")
        .insert(franqueado);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-franchises"] });
      toast.success("Franqueado cadastrado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating franqueado:", error);
      toast.error("Erro ao cadastrar franqueado");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Franqueado> & { id: string }) => {
      const { error } = await supabase
        .from("mt_franchises")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-franchises"] });
      toast.success("Franqueado atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating franqueado:", error);
      toast.error("Erro ao atualizar franqueado");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mt_franchises")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-franchises"] });
      toast.success("Franqueado removido com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting franqueado:", error);
      toast.error("Erro ao remover franqueado");
    },
  });

  const generateTokenMutation = useMutation({
    mutationFn: async (id: string) => {
      // Generate a secure random token
      const token = crypto.randomUUID() + "-" + crypto.randomUUID();
      
      const { error } = await supabase
        .from("mt_franchises")
        .update({ api_token: token, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      return token;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-franchises"] });
      toast.success("Token de integração gerado com sucesso!");
    },
    onError: (error) => {
      console.error("Error generating token:", error);
      toast.error("Erro ao gerar token de integração");
    },
  });

  return {
    franqueados: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createFranqueado: createMutation.mutate,
    updateFranqueado: updateMutation.mutate,
    deleteFranqueado: deleteMutation.mutate,
    generateToken: generateTokenMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isGeneratingToken: generateTokenMutation.isPending,
  };
}

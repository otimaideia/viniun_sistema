import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PromocaoCadastro } from "@/types/promocao";
import { LeadStatus } from "@/types/lead-mt";
import { toast } from "sonner";
import { useUserProfile } from "./useUserProfile";

export function usePromocaoCadastros() {
  const queryClient = useQueryClient();
  const { canViewAllLeads, unidadeId, isLoading: isProfileLoading } = useUserProfile();
  
  const { data: cadastros = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["promocao-cadastros", canViewAllLeads, unidadeId],
    queryFn: async () => {
      // Se usuário é de unidade, busca o nome da franquia para filtrar
      let franqueadoNome: string | null = null;
      if (!canViewAllLeads && unidadeId) {
        const { data: franqueado } = await supabase
          .from("mt_franchises")
          .select("nome_fantasia")
          .eq("id", unidadeId)
          .single();
        franqueadoNome = franqueado?.nome_fantasia || null;
      }

      // Busca cadastros
      // Nota: promocao_cadastros usa campo "unidade" (texto), não tem franqueado_id
      let query = supabase
        .from("mt_promotion_registrations")
        .select("*")
        .order("created_at", { ascending: false });

      // Filtra pelo nome da unidade se o usuário for de franquia
      if (!canViewAllLeads && franqueadoNome) {
        query = query.eq("unidade", franqueadoNome);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao buscar cadastros:", error);
        throw error;
      }

      // Retorna os dados diretamente, usando o campo "unidade" que já é o nome
      return (data || []).map((row: any) => ({
        ...row,
      })) as PromocaoCadastro[];
    },
    enabled: !isProfileLoading,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      console.log("Atualizando status:", { id, status });
      
      const { data, error } = await supabase
        .from("mt_promotion_registrations")
        .update({ status })
        .eq("id", id)
        .select();

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }
      
      console.log("Status atualizado com sucesso:", data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promocao-cadastros"] });
      toast.success("Status atualizado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar status:", error);
      toast.error(`Erro ao atualizar status: ${error?.message || "Erro desconhecido"}`);
    },
  });

  const updateCadastroMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PromocaoCadastro> }) => {
      console.log("Atualizando cadastro:", { id, data });
      
      const { data: updated, error } = await supabase
        .from("mt_promotion_registrations")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }
      
      console.log("Cadastro atualizado com sucesso:", updated);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promocao-cadastros"] });
      toast.success("Cadastro atualizado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar cadastro:", error);
      toast.error(`Erro ao atualizar cadastro: ${error?.message || "Erro desconhecido"}`);
    },
  });

  return { 
    cadastros, 
    isLoading, 
    error, 
    refetch, 
    isFetching,
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
    updateCadastro: updateCadastroMutation.mutateAsync,
    isUpdatingCadastro: updateCadastroMutation.isPending,
  };
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Servico, FranqueadoServico, ServicoImagem } from "@/types/servico";
import { toast } from "sonner";

/**
 * @deprecated Use useServicosAdapter instead for proper multi-tenant isolation.
 */
export function useServicos() {
  const queryClient = useQueryClient();

  const servicosQuery = useQuery({
    queryKey: ["mt-services"],
    queryFn: async (): Promise<Servico[]> => {
      const { data, error } = await supabase
        .from("mt_services")
        .select("*")
        .order("nome", { ascending: true });

      if (error) {
        console.error("Error fetching servicos:", error);
        throw error;
      }

      return data || [];
    },
  });

  const franqueadoServicosQuery = useQuery({
    queryKey: ["mt-franchise-services"],
    queryFn: async (): Promise<FranqueadoServico[]> => {
      const { data, error } = await supabase
        .from("mt_franchise_services")
        .select("*");

      if (error) {
        console.error("Error fetching franqueado servicos:", error);
        throw error;
      }

      return data || [];
    },
  });

  const createServicoMutation = useMutation({
    mutationFn: async (servico: Partial<Servico>) => {
      const { error } = await supabase
        .from("mt_services")
        .insert(servico);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-services"] });
      toast.success("Serviço cadastrado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating servico:", error);
      toast.error("Erro ao cadastrar serviço");
    },
  });

  const updateServicoMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Servico> & { id: string }) => {
      const { error } = await supabase
        .from("mt_services")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-services"] });
      toast.success("Serviço atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating servico:", error);
      toast.error("Erro ao atualizar serviço");
    },
  });

  const deleteServicoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mt_services")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-services"] });
      toast.success("Serviço removido com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting servico:", error);
      toast.error("Erro ao remover serviço");
    },
  });

  // Vincular/desvincular serviços de franqueados
  const toggleFranqueadoServicoMutation = useMutation({
    mutationFn: async ({ franqueadoId, servicoId, ativo }: { franqueadoId: string; servicoId: string; ativo: boolean }) => {
      if (ativo) {
        // Adicionar vínculo
        const { error } = await supabase
          .from("mt_franchise_services")
          .insert({ franqueado_id: franqueadoId, servico_id: servicoId, ativo: true });

        if (error) throw error;
      } else {
        // Remover vínculo
        const { error } = await supabase
          .from("mt_franchise_services")
          .delete()
          .eq("franqueado_id", franqueadoId)
          .eq("servico_id", servicoId);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-franchise-services"] });
    },
    onError: (error) => {
      console.error("Error toggling franqueado servico:", error);
      toast.error("Erro ao atualizar vínculo");
    },
  });

  // Atualizar múltiplos serviços de uma franquia de uma vez
  const updateFranqueadoServicosMutation = useMutation({
    mutationFn: async ({ franqueadoId, servicoIds }: { franqueadoId: string; servicoIds: string[] }) => {
      // Remove todos os vínculos existentes
      const { error: deleteError } = await supabase
        .from("mt_franchise_services")
        .delete()
        .eq("franqueado_id", franqueadoId);

      if (deleteError) throw deleteError;

      // Adiciona os novos vínculos
      if (servicoIds.length > 0) {
        const { error: insertError } = await supabase
          .from("mt_franchise_services")
          .insert(servicoIds.map(servicoId => ({
            franqueado_id: franqueadoId,
            servico_id: servicoId,
            ativo: true,
          })));

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-franchise-services"] });
      toast.success("Serviços da franquia atualizados!");
    },
    onError: (error) => {
      console.error("Error updating franqueado servicos:", error);
      toast.error("Erro ao atualizar serviços da franquia");
    },
  });

  // Helper para obter serviços de uma franquia
  const getServicosByFranqueado = (franqueadoId: string) => {
    const vinculos = franqueadoServicosQuery.data || [];
    const servicoIds = vinculos
      .filter(v => v.franqueado_id === franqueadoId && v.ativo)
      .map(v => v.servico_id);

    return (servicosQuery.data || []).filter(s => servicoIds.includes(s.id));
  };

  // Buscar imagens de um serviço específico
  const fetchServicoImagens = async (servicoId: string): Promise<ServicoImagem[]> => {
    const { data, error } = await supabase
      .from("mt_service_images")
      .select("*")
      .eq("servico_id", servicoId)
      .order("ordem", { ascending: true });

    if (error) {
      console.error("Error fetching servico imagens:", error);
      return [];
    }

    return data || [];
  };

  // Salvar imagens da galeria (sincroniza com banco)
  const saveServicoImagensMutation = useMutation({
    mutationFn: async ({ servicoId, imagens }: { servicoId: string; imagens: Omit<ServicoImagem, 'id' | 'created_at'>[] }) => {
      // Remove imagens existentes
      const { error: deleteError } = await supabase
        .from("mt_service_images")
        .delete()
        .eq("servico_id", servicoId);

      if (deleteError) throw deleteError;

      // Insere novas imagens
      if (imagens.length > 0) {
        const { error: insertError } = await supabase
          .from("mt_service_images")
          .insert(imagens.map((img, index) => ({
            servico_id: servicoId,
            url: img.url,
            ordem: img.ordem ?? index,
            legenda: img.legenda || null
          })));

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-services"] });
    },
    onError: (error) => {
      console.error("Error saving servico imagens:", error);
      toast.error("Erro ao salvar imagens do serviço");
    },
  });

  // Adicionar uma única imagem à galeria
  const addServicoImagemMutation = useMutation({
    mutationFn: async ({ servicoId, url, ordem, legenda }: { servicoId: string; url: string; ordem?: number; legenda?: string }) => {
      // Busca a maior ordem atual
      const { data: existingImages } = await supabase
        .from("mt_service_images")
        .select("ordem")
        .eq("servico_id", servicoId)
        .order("ordem", { ascending: false })
        .limit(1);

      const maxOrdem = existingImages?.[0]?.ordem ?? -1;

      const { error } = await supabase
        .from("mt_service_images")
        .insert({
          servico_id: servicoId,
          url,
          ordem: ordem ?? maxOrdem + 1,
          legenda: legenda || null
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-services"] });
    },
    onError: (error) => {
      console.error("Error adding servico imagem:", error);
      toast.error("Erro ao adicionar imagem");
    },
  });

  // Remover uma imagem da galeria
  const deleteServicoImagemMutation = useMutation({
    mutationFn: async (imagemId: string) => {
      const { error } = await supabase
        .from("mt_service_images")
        .delete()
        .eq("id", imagemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-services"] });
    },
    onError: (error) => {
      console.error("Error deleting servico imagem:", error);
      toast.error("Erro ao remover imagem");
    },
  });

  return {
    servicos: servicosQuery.data || [],
    franqueadoServicos: franqueadoServicosQuery.data || [],
    isLoading: servicosQuery.isLoading || franqueadoServicosQuery.isLoading,
    error: servicosQuery.error || franqueadoServicosQuery.error,
    refetch: () => {
      servicosQuery.refetch();
      franqueadoServicosQuery.refetch();
    },
    createServico: createServicoMutation.mutate,
    updateServico: updateServicoMutation.mutate,
    deleteServico: deleteServicoMutation.mutate,
    toggleFranqueadoServico: toggleFranqueadoServicoMutation.mutate,
    updateFranqueadoServicos: updateFranqueadoServicosMutation.mutate,
    updateFranqueadoServicosAsync: updateFranqueadoServicosMutation.mutateAsync,
    getServicosByFranqueado,
    // Funções de galeria de imagens
    fetchServicoImagens,
    saveServicoImagens: saveServicoImagensMutation.mutate,
    saveServicoImagensAsync: saveServicoImagensMutation.mutateAsync,
    addServicoImagem: addServicoImagemMutation.mutate,
    deleteServicoImagem: deleteServicoImagemMutation.mutate,
    isCreating: createServicoMutation.isPending,
    isUpdating: updateServicoMutation.isPending,
    isDeleting: deleteServicoMutation.isPending,
    isSavingImagens: saveServicoImagensMutation.isPending,
  };
}

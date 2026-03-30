import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ServicoImagem } from "@/types/servico";
import { toast } from "sonner";

/**
 * @deprecated Use useServicoImagensAdapter instead for proper multi-tenant isolation.
 */
export function useServicoImagens(servicoId?: string) {
  const queryClient = useQueryClient();

  // Buscar imagens de um serviço específico
  const imagensQuery = useQuery({
    queryKey: ["mt-service-images", servicoId],
    queryFn: async (): Promise<ServicoImagem[]> => {
      if (!servicoId) return [];

      const { data, error } = await supabase
        .from("mt_service_images")
        .select("*")
        .eq("service_id", servicoId)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Error fetching servico imagens:", error);
        throw error;
      }

      return data || [];
    },
    enabled: !!servicoId,
  });

  // Buscar todas as imagens de todos os serviços (para cache/otimização)
  const allImagensQuery = useQuery({
    queryKey: ["mt-service-images-all"],
    queryFn: async (): Promise<ServicoImagem[]> => {
      const { data, error } = await supabase
        .from("mt_service_images")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Error fetching all servico imagens:", error);
        throw error;
      }

      return data || [];
    },
  });

  // Adicionar uma nova imagem
  const addImagemMutation = useMutation({
    mutationFn: async (imagem: Omit<ServicoImagem, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("mt_service_images")
        .insert(imagem)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["mt-service-images", data.service_id] });
      queryClient.invalidateQueries({ queryKey: ["mt-service-images-all"] });
      toast.success("Imagem adicionada!");
    },
    onError: (error) => {
      console.error("Error adding imagem:", error);
      toast.error("Erro ao adicionar imagem");
    },
  });

  // Adicionar múltiplas imagens de uma vez
  const addMultipleImagensMutation = useMutation({
    mutationFn: async ({ servicoId, urls }: { servicoId: string; urls: string[] }) => {
      // Buscar a maior display_order atual
      const { data: existing } = await supabase
        .from("mt_service_images")
        .select("display_order")
        .eq("service_id", servicoId)
        .order("display_order", { ascending: false })
        .limit(1);

      const startOrdem = (existing?.[0]?.display_order ?? -1) + 1;

      const imagens = urls.map((url, index) => ({
        service_id: servicoId,
        url,
        display_order: startOrdem + index,
        legenda: null,
      }));

      const { data, error } = await supabase
        .from("mt_service_images")
        .insert(imagens)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["mt-service-images", variables.servicoId] });
      queryClient.invalidateQueries({ queryKey: ["mt-service-images-all"] });
      toast.success(`${_.length} imagens adicionadas!`);
    },
    onError: (error) => {
      console.error("Error adding multiple images:", error);
      toast.error("Erro ao adicionar imagens");
    },
  });

  // Atualizar imagem (legenda, display_order)
  const updateImagemMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ServicoImagem> & { id: string }) => {
      const { error } = await supabase
        .from("mt_service_images")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-service-images"] });
      queryClient.invalidateQueries({ queryKey: ["mt-service-images-all"] });
    },
    onError: (error) => {
      console.error("Error updating imagem:", error);
      toast.error("Erro ao atualizar imagem");
    },
  });

  // Remover imagem
  const deleteImagemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mt_service_images")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-service-images"] });
      queryClient.invalidateQueries({ queryKey: ["mt-service-images-all"] });
      toast.success("Imagem removida!");
    },
    onError: (error) => {
      console.error("Error deleting imagem:", error);
      toast.error("Erro ao remover imagem");
    },
  });

  // Reordenar imagens
  const reorderImagensMutation = useMutation({
    mutationFn: async (imagens: { id: string; display_order: number }[]) => {
      const updates = imagens.map((img) =>
        supabase
          .from("mt_service_images")
          .update({ display_order: img.display_order })
          .eq("id", img.id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-service-images"] });
      queryClient.invalidateQueries({ queryKey: ["mt-service-images-all"] });
    },
    onError: (error) => {
      console.error("Error reordering images:", error);
      toast.error("Erro ao reordenar imagens");
    },
  });

  // Substituir todas as imagens de um serviço
  const replaceAllImagensMutation = useMutation({
    mutationFn: async ({ servicoId, urls }: { servicoId: string; urls: string[] }) => {
      // Remover todas as imagens existentes
      const { error: deleteError } = await supabase
        .from("mt_service_images")
        .delete()
        .eq("service_id", servicoId);

      if (deleteError) throw deleteError;

      // Adicionar novas imagens
      if (urls.length > 0) {
        const imagens = urls.map((url, index) => ({
          service_id: servicoId,
          url,
          display_order: index,
          legenda: null,
        }));

        const { error: insertError } = await supabase
          .from("mt_service_images")
          .insert(imagens);

        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["mt-service-images", variables.servicoId] });
      queryClient.invalidateQueries({ queryKey: ["mt-service-images-all"] });
      toast.success("Galeria atualizada!");
    },
    onError: (error) => {
      console.error("Error replacing images:", error);
      toast.error("Erro ao atualizar galeria");
    },
  });

  // Helper para obter imagens de um serviço específico do cache
  const getImagensByServico = (sId: string): ServicoImagem[] => {
    const all = allImagensQuery.data || [];
    return all.filter((img) => img.service_id === sId).sort((a, b) => a.display_order - b.display_order);
  };

  return {
    // Dados
    imagens: imagensQuery.data || [],
    allImagens: allImagensQuery.data || [],
    isLoading: imagensQuery.isLoading,
    isLoadingAll: allImagensQuery.isLoading,
    error: imagensQuery.error,

    // Mutations
    addImagem: addImagemMutation.mutate,
    addMultipleImagens: addMultipleImagensMutation.mutate,
    updateImagem: updateImagemMutation.mutate,
    deleteImagem: deleteImagemMutation.mutate,
    reorderImagens: reorderImagensMutation.mutate,
    replaceAllImagens: replaceAllImagensMutation.mutate,
    replaceAllImagensAsync: replaceAllImagensMutation.mutateAsync,

    // Estados das mutations
    isAdding: addImagemMutation.isPending || addMultipleImagensMutation.isPending,
    isUpdating: updateImagemMutation.isPending,
    isDeleting: deleteImagemMutation.isPending,
    isReordering: reorderImagensMutation.isPending,
    isReplacing: replaceAllImagensMutation.isPending,

    // Helpers
    getImagensByServico,
    refetch: () => {
      imagensQuery.refetch();
      allImagensQuery.refetch();
    },
  };
}

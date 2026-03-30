import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MarketingService } from "@/services/marketing-service";
import type { MarketingAsset, MarketingAssetFormData } from "@/types/marketing";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from "./useUserProfile";

const QUERY_KEY = "marketing-assets";

export function useMarketingAssets() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { canViewAllLeads, unidadeId, isLoading: isLoadingProfile } = useUserProfile();

  const {
    data: assets = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, canViewAllLeads, unidadeId],
    queryFn: () => MarketingService.getAssets(canViewAllLeads ? undefined : unidadeId),
    enabled: !isLoadingProfile,
  });

  const createMutation = useMutation({
    mutationFn: (data: MarketingAssetFormData) => MarketingService.createAsset(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({
        title: "Asset criado",
        description: "O asset foi criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar asset",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MarketingAssetFormData> }) =>
      MarketingService.updateAsset(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({
        title: "Asset atualizado",
        description: "O asset foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar asset",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => MarketingService.deleteAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({
        title: "Asset excluído",
        description: "O asset foi excluído com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir asset",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, bucket, fileName }: { file: File; bucket?: string; fileName?: string }) =>
      MarketingService.uploadFile(file, bucket, fileName),
    onError: (error: Error) => {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Upload múltiplos assets em paralelo
  const uploadMultipleAssets = async (
    files: File[],
    baseData: Partial<MarketingAssetFormData>,
    onProgress?: (completed: number, total: number, fileName: string) => void
  ): Promise<{ success: number; failed: number; errors: string[] }> => {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    const uploadPromises = files.map(async (file, index) => {
      try {
        // Upload do arquivo
        const fileUrl = await MarketingService.uploadFile(file);

        // Obter dimensões da imagem se for imagem
        let dimensoes = {};
        if (file.type.startsWith("image/")) {
          dimensoes = await new Promise<{ width: number; height: number }>((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.width, height: img.height });
            img.onerror = () => resolve({ width: 0, height: 0 });
            img.src = URL.createObjectURL(file);
          });
        }

        // Criar o asset
        await MarketingService.createAsset({
          nome: file.name.split(".")[0],
          tipo: baseData.tipo || "imagem",
          categoria: baseData.categoria,
          unidade_id: baseData.unidade_id,
          campanha_id: baseData.campanha_id,
          file_url: fileUrl,
          file_size: file.size,
          file_type: file.type,
          tags: baseData.tags || [],
          dimensoes,
          ativo: baseData.ativo ?? true,
        });

        results.success++;
        onProgress?.(results.success + results.failed, files.length, file.name);
      } catch (error) {
        results.failed++;
        results.errors.push(`${file.name}: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
        onProgress?.(results.success + results.failed, files.length, file.name);
      }
    });

    await Promise.all(uploadPromises);

    // Invalidar cache após uploads
    if (results.success > 0) {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    }

    return results;
  };

  // Stats computados
  const stats = {
    total: assets.length,
    imagens: assets.filter((a) => a.tipo === "imagem").length,
    videos: assets.filter((a) => a.tipo === "video").length,
    banners: assets.filter((a) => a.tipo === "banner").length,
    logos: assets.filter((a) => a.tipo === "logo").length,
    artesSociais: assets.filter((a) => a.tipo === "arte_social").length,
  };

  return {
    assets,
    isLoading: isLoading || isLoadingProfile,
    error,
    refetch,
    stats,
    createAsset: createMutation.mutateAsync,
    updateAsset: (id: string, data: Partial<MarketingAssetFormData>) =>
      updateMutation.mutateAsync({ id, data }),
    deleteAsset: deleteMutation.mutateAsync,
    uploadFile: uploadMutation.mutateAsync,
    uploadMultipleAssets,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isUploading: uploadMutation.isPending,
  };
}

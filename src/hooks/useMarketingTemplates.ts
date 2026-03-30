import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MarketingService } from "@/services/marketing-service";
import type { MarketingTemplate, MarketingTemplateFormData } from "@/types/marketing";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from "./useUserProfile";

const QUERY_KEY = "marketing-templates";

export function useMarketingTemplates() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { canViewAllLeads, unidadeId, isLoading: isLoadingProfile } = useUserProfile();

  const {
    data: templates = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, canViewAllLeads, unidadeId],
    queryFn: () => MarketingService.getTemplates(canViewAllLeads ? undefined : unidadeId),
    enabled: !isLoadingProfile,
  });

  const createMutation = useMutation({
    mutationFn: (data: MarketingTemplateFormData) => MarketingService.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({
        title: "Template criado",
        description: "O template foi criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MarketingTemplateFormData> }) =>
      MarketingService.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({
        title: "Template atualizado",
        description: "O template foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => MarketingService.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({
        title: "Template excluído",
        description: "O template foi excluído com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    templates,
    isLoading: isLoading || isLoadingProfile,
    error,
    refetch,
    createTemplate: createMutation.mutateAsync,
    updateTemplate: (id: string, data: Partial<MarketingTemplateFormData>) =>
      updateMutation.mutateAsync({ id, data }),
    deleteTemplate: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

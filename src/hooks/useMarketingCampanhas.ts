import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MarketingService } from "@/services/marketing-service";
import type { MarketingCampanha, MarketingCampanhaFormData } from "@/types/marketing";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from "./useUserProfile";

const QUERY_KEY = "marketing-campanhas";

export function useMarketingCampanhas() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { canViewAllLeads, unidadeId, isLoading: isLoadingProfile } = useUserProfile();

  const {
    data: campanhas = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, canViewAllLeads, unidadeId],
    queryFn: () => MarketingService.getCampanhas(canViewAllLeads ? undefined : unidadeId),
    enabled: !isLoadingProfile,
  });

  const createMutation = useMutation({
    mutationFn: (data: MarketingCampanhaFormData) => MarketingService.createCampanha(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({
        title: "Campanha criada",
        description: "A campanha foi criada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar campanha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MarketingCampanhaFormData> }) =>
      MarketingService.updateCampanha(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({
        title: "Campanha atualizada",
        description: "A campanha foi atualizada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar campanha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => MarketingService.deleteCampanha(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({
        title: "Campanha excluída",
        description: "A campanha foi excluída com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir campanha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Controle para evitar múltiplas atualizações
  const autoUpdateRef = useRef<Set<string>>(new Set());

  // Atualizar status automaticamente para campanhas expiradas
  useEffect(() => {
    if (campanhas.length === 0) return;

    const hoje = new Date().toISOString().split("T")[0];

    campanhas.forEach((campanha) => {
      // Só atualiza se:
      // 1. Status é 'ativa'
      // 2. Tem data_fim definida
      // 3. data_fim já passou
      // 4. Ainda não foi atualizada nesta sessão
      if (
        campanha.status === "ativa" &&
        campanha.data_fim &&
        campanha.data_fim < hoje &&
        !autoUpdateRef.current.has(campanha.id)
      ) {
        // Marca como já processada para evitar loop
        autoUpdateRef.current.add(campanha.id);

        // Atualiza silenciosamente (sem toast)
        MarketingService.updateCampanha(campanha.id, { status: "finalizada" })
          .then(() => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
          })
          .catch((error) => {
            console.error(`Erro ao finalizar campanha ${campanha.nome}:`, error);
            // Remove do set para tentar novamente
            autoUpdateRef.current.delete(campanha.id);
          });
      }
    });
  }, [campanhas, queryClient]);

  // Stats computados
  const stats = {
    total: campanhas.length,
    ativas: campanhas.filter((c) => c.status === "ativa").length,
    pausadas: campanhas.filter((c) => c.status === "pausada").length,
    finalizadas: campanhas.filter((c) => c.status === "finalizada").length,
    totalBudget: campanhas.reduce((sum, c) => sum + (c.budget_estimado || 0), 0),
    totalLeads: campanhas.reduce((sum, c) => sum + (c.leads_gerados || 0), 0),
    totalConversoes: campanhas.reduce((sum, c) => sum + (c.conversoes || 0), 0),
    taxaConversao: campanhas.reduce((sum, c) => sum + (c.leads_gerados || 0), 0) > 0
      ? (campanhas.reduce((sum, c) => sum + (c.conversoes || 0), 0) /
         campanhas.reduce((sum, c) => sum + (c.leads_gerados || 0), 0)) * 100
      : 0,
  };

  return {
    campanhas,
    isLoading: isLoading || isLoadingProfile,
    error,
    refetch,
    stats,
    createCampanha: createMutation.mutateAsync,
    updateCampanha: (id: string, data: Partial<MarketingCampanhaFormData>) =>
      updateMutation.mutateAsync({ id, data }),
    deleteCampanha: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

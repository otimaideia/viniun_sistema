import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Campanha, CampanhaFormData, CampanhaStats } from "@/types/campanha";
import { toast } from "sonner";

/**
 * @deprecated Use useCampanhasAdapter instead for proper multi-tenant isolation.
 */
export function useCampanhas(franqueadoId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["mt-campaigns", franqueadoId],
    queryFn: async (): Promise<Campanha[]> => {
      let queryBuilder = supabase
        .from("mt_campaigns")
        .select(`
          *,
          franqueado:mt_franchises(nome_fantasia)
        `)
        .order("created_at", { ascending: false });

      if (franqueadoId) {
        queryBuilder = queryBuilder.eq("franqueado_id", franqueadoId);
      }

      const { data: campanhas, error } = await queryBuilder;

      if (error) {
        console.error("Error fetching campanhas:", error);
        throw error;
      }

      if (!campanhas) return [];

      // Buscar contagem de leads por campanha
      const campanhaIds = campanhas.map((c) => c.id);

      const { data: leadsCount } = await supabase
        .from("mt_leads")
        .select("campanha_id")
        .in("campanha_id", campanhaIds);

      // Calcular contagem de leads por campanha
      const countMap = new Map<string, number>();
      leadsCount?.forEach((l) => {
        if (l.campanha_id) {
          countMap.set(l.campanha_id, (countMap.get(l.campanha_id) || 0) + 1);
        }
      });

      return campanhas.map((c) => {
        const leadsTotal = countMap.get(c.id) || 0;
        const cpl = c.orcamento_mensal && leadsTotal > 0
          ? c.orcamento_mensal / leadsTotal
          : 0;

        return {
          ...c,
          franqueado_nome: c.franqueado?.nome_fantasia,
          leads_count: leadsTotal,
          cpl: Math.round(cpl * 100) / 100,
        };
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CampanhaFormData) => {
      const { error } = await supabase.from("mt_campaigns").insert({
        nome: data.nome,
        tipo: data.tipo,
        status: data.status || "ativa",
        orcamento_mensal: data.orcamento_mensal || null,
        franqueado_id: data.franqueado_id || null,
        data_inicio: data.data_inicio || null,
        data_fim: data.data_fim || null,
        descricao: data.descricao || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-campaigns"] });
      toast.success("Campanha criada com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating campanha:", error);
      toast.error("Erro ao criar campanha");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CampanhaFormData> & { id: string }) => {
      const { error } = await supabase
        .from("mt_campaigns")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-campaigns"] });
      toast.success("Campanha atualizada com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating campanha:", error);
      toast.error("Erro ao atualizar campanha");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mt_campaigns")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-campaigns"] });
      toast.success("Campanha removida com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting campanha:", error);
      toast.error("Erro ao remover campanha");
    },
  });

  // Calcular estatísticas
  const getStats = (): CampanhaStats => {
    const campanhas = query.data || [];
    const ativas = campanhas.filter((c) => c.status === "ativa");

    return {
      total: campanhas.length,
      ativas: ativas.length,
      leads_total: campanhas.reduce((acc, c) => acc + (c.leads_count || 0), 0),
      orcamento_total: ativas.reduce((acc, c) => acc + (c.orcamento_mensal || 0), 0),
    };
  };

  return {
    campanhas: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    stats: getStats(),
    createCampanha: createMutation.mutate,
    updateCampanha: updateMutation.mutate,
    deleteCampanha: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

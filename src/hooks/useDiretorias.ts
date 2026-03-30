import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Diretoria, DiretoriaFormData, DiretoriaStats } from "@/types/diretoria";
import { toast } from "sonner";

/**
 * @deprecated Use useDiretoriasAdapter instead for proper multi-tenant isolation.
 * This hook queries mt_directorates WITHOUT tenant filtering via TenantContext.
 * Ref: gap-analysis Phase 5, item L-4
 */
export function useDiretorias() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["mt-directorates"],
    queryFn: async (): Promise<Diretoria[]> => {
      // Buscar diretorias
      const { data: diretorias, error } = await supabase
        .from("mt_directorates")
        .select("*")
        .order("nome", { ascending: true });

      if (error) {
        console.error("Error fetching diretorias:", error);
        throw error;
      }

      if (!diretorias) return [];

      // Buscar contagem de franquias por diretoria
      const { data: franqueados } = await supabase
        .from("mt_franchises")
        .select("diretoria_id");

      // Calcular contagem
      const countMap = new Map<string, number>();
      franqueados?.forEach((f) => {
        if (f.diretoria_id) {
          countMap.set(f.diretoria_id, (countMap.get(f.diretoria_id) || 0) + 1);
        }
      });

      return diretorias.map((d) => ({
        ...d,
        franquias_count: countMap.get(d.id) || 0,
      }));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: DiretoriaFormData) => {
      const { error } = await supabase.from("mt_directorates").insert({
        nome: data.nome,
        regiao: data.regiao || null,
        descricao: data.descricao || null,
        responsavel_id: data.responsavel_id || null,
        is_active: data.is_active ?? true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-directorates"] });
      toast.success("Diretoria criada com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating diretoria:", error);
      toast.error("Erro ao criar diretoria");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: DiretoriaFormData & { id: string }) => {
      const { error } = await supabase
        .from("mt_directorates")
        .update({
          nome: data.nome,
          regiao: data.regiao || null,
          descricao: data.descricao || null,
          responsavel_id: data.responsavel_id || null,
          is_active: data.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-directorates"] });
      toast.success("Diretoria atualizada com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating diretoria:", error);
      toast.error("Erro ao atualizar diretoria");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Primeiro, desvincula franquias
      await supabase
        .from("mt_franchises")
        .update({ diretoria_id: null })
        .eq("diretoria_id", id);

      // Depois, deleta a diretoria
      const { error } = await supabase
        .from("mt_directorates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-directorates"] });
      queryClient.invalidateQueries({ queryKey: ["yeslaser-franqueados"] });
      toast.success("Diretoria removida com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting diretoria:", error);
      toast.error("Erro ao remover diretoria");
    },
  });

  const vincularFranquiaMutation = useMutation({
    mutationFn: async ({
      franqueadoId,
      diretoriaId,
    }: {
      franqueadoId: string;
      diretoriaId: string | null;
    }) => {
      const { error } = await supabase
        .from("mt_franchises")
        .update({ diretoria_id: diretoriaId })
        .eq("id", franqueadoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-directorates"] });
      queryClient.invalidateQueries({ queryKey: ["yeslaser-franqueados"] });
      toast.success("Franquia vinculada com sucesso!");
    },
    onError: (error) => {
      console.error("Error linking franquia:", error);
      toast.error("Erro ao vincular franquia");
    },
  });

  // Calcular estatísticas
  const getStats = (): DiretoriaStats => {
    const diretorias = query.data || [];
    return {
      total: diretorias.length,
      ativas: diretorias.filter((d) => d.is_active).length,
      inativas: diretorias.filter((d) => !d.is_active).length,
    };
  };

  return {
    diretorias: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    stats: getStats(),
    createDiretoria: createMutation.mutate,
    updateDiretoria: updateMutation.mutate,
    deleteDiretoria: deleteMutation.mutate,
    vincularFranquia: vincularFranquiaMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

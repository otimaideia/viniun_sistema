import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Meta, MetaFormData, MetaHistorico, MetaStats, MetaStatus } from "@/types/meta";
import { toast } from "sonner";

function calcularStatus(meta: Meta): MetaStatus {
  const percentual = meta.valor_meta > 0 ? (meta.valor_atual / meta.valor_meta) * 100 : 0;
  const hoje = new Date();
  const dataFim = new Date(meta.data_fim);

  if (percentual >= 100) return "atingida";
  if (dataFim < hoje) return "expirada";
  if (percentual >= 80) return "proxima";
  return "em_andamento";
}

/**
 * @deprecated Use useMetasAdapter instead for proper multi-tenant isolation.
 * This hook queries mt_goals WITHOUT tenant filtering via TenantContext.
 */
export function useMetas(franqueadoId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["mt-goals", franqueadoId],
    queryFn: async (): Promise<Meta[]> => {
      let queryBuilder = supabase
        .from("mt_goals")
        .select(`
          *,
          franqueado:mt_franchises(nome_fantasia)
        `)
        .order("data_fim", { ascending: true });

      if (franqueadoId) {
        queryBuilder = queryBuilder.eq("franqueado_id", franqueadoId);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error("Error fetching metas:", error);
        throw error;
      }

      return (data || []).map((meta) => {
        const percentual = meta.valor_meta > 0
          ? Math.round((meta.valor_atual / meta.valor_meta) * 100)
          : 0;

        return {
          ...meta,
          percentual,
          status: calcularStatus({ ...meta, percentual } as Meta),
          franqueado_nome: meta.franqueado?.nome_fantasia,
        };
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: MetaFormData) => {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase.from("mt_goals").insert({
        titulo: data.titulo,
        tipo: data.tipo,
        valor_meta: data.valor_meta,
        valor_atual: 0,
        data_inicio: data.data_inicio,
        data_fim: data.data_fim,
        franqueado_id: data.franqueado_id || null,
        usuario_id: userData.user?.id || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-goals"] });
      toast.success("Meta criada com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating meta:", error);
      toast.error("Erro ao criar meta");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<MetaFormData> & { id: string }) => {
      const { error } = await supabase
        .from("mt_goals")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-goals"] });
      toast.success("Meta atualizada com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating meta:", error);
      toast.error("Erro ao atualizar meta");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mt_goals")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-goals"] });
      toast.success("Meta removida com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting meta:", error);
      toast.error("Erro ao remover meta");
    },
  });

  const atualizarProgressoMutation = useMutation({
    mutationFn: async ({ id, novoValor }: { id: string; novoValor: number }) => {
      const { data: userData } = await supabase.auth.getUser();

      // Buscar valor atual
      const { data: metaAtual } = await supabase
        .from("mt_goals")
        .select("valor_atual")
        .eq("id", id)
        .single();

      // Registrar no histórico
      await supabase.from("mt_goals_historico").insert({
        meta_id: id,
        valor_anterior: metaAtual?.valor_atual || 0,
        valor_novo: novoValor,
        usuario_id: userData.user?.id || null,
      });

      // Atualizar meta
      const { error } = await supabase
        .from("mt_goals")
        .update({
          valor_atual: novoValor,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-goals"] });
      toast.success("Progresso atualizado!");
    },
    onError: (error) => {
      console.error("Error updating progress:", error);
      toast.error("Erro ao atualizar progresso");
    },
  });

  // Buscar histórico de uma meta
  const getHistorico = async (metaId: string): Promise<MetaHistorico[]> => {
    const { data, error } = await supabase
      .from("mt_goals_historico")
      .select("*")
      .eq("meta_id", metaId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching historico:", error);
      return [];
    }

    return data || [];
  };

  // Calcular estatísticas
  const getStats = (): MetaStats => {
    const metas = query.data || [];
    const atingidas = metas.filter((m) => m.status === "atingida").length;
    const emAndamento = metas.filter(
      (m) => m.status === "em_andamento" || m.status === "proxima"
    ).length;

    const totalPercentual = metas.reduce((acc, m) => acc + (m.percentual || 0), 0);
    const progressoMedio = metas.length > 0 ? Math.round(totalPercentual / metas.length) : 0;

    return {
      total: metas.length,
      atingidas,
      em_andamento: emAndamento,
      progresso_medio: progressoMedio,
    };
  };

  return {
    metas: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    stats: getStats(),
    createMeta: createMutation.mutate,
    updateMeta: updateMutation.mutate,
    deleteMeta: deleteMutation.mutate,
    atualizarProgresso: atualizarProgressoMutation.mutate,
    getHistorico,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

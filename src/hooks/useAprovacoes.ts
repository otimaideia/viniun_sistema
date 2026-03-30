import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UsuarioAprovacao {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  avatar_url: string | null;
  status: "pendente" | "ativo" | "rejeitado";
  role: string | null;
  franqueado_id: string | null;
  franqueado_nome: string | null;
  aprovado_por: string | null;
  aprovado_em: string | null;
  motivo_rejeicao: string | null;
  created_at: string;
}

export interface AprovacaoStats {
  pendentes: number;
  aprovados: number;
  rejeitados: number;
}

/**
 * @deprecated Use useAprovacoesAdapter instead for proper multi-tenant isolation.
 */
export function useAprovacoes() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["mt-approvals"],
    queryFn: async (): Promise<{
      pendentes: UsuarioAprovacao[];
      aprovados: UsuarioAprovacao[];
      rejeitados: UsuarioAprovacao[];
    }> => {
      const { data: profiles, error } = await supabase
        .from("mt_users")
        .select(`
          *,
          franqueado:mt_franchises(nome_fantasia)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching profiles:", error);
        throw error;
      }

      const usuarios = (profiles || []).map((p) => ({
        id: p.id,
        nome: p.nome || "Sem nome",
        email: p.email || "",
        telefone: p.telefone,
        avatar_url: p.avatar_url,
        status: p.status || "pendente",
        role: p.role,
        franqueado_id: p.franqueado_id,
        franqueado_nome: p.franqueado?.nome_fantasia || null,
        aprovado_por: p.aprovado_por,
        aprovado_em: p.aprovado_em,
        motivo_rejeicao: p.motivo_rejeicao,
        created_at: p.created_at,
      })) as UsuarioAprovacao[];

      return {
        pendentes: usuarios.filter((u) => u.status === "pendente"),
        aprovados: usuarios.filter((u) => u.status === "ativo"),
        rejeitados: usuarios.filter((u) => u.status === "rejeitado"),
      };
    },
  });

  const aprovarMutation = useMutation({
    mutationFn: async ({
      userId,
      role,
      franqueadoId,
    }: {
      userId: string;
      role: string;
      franqueadoId?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("mt_users")
        .update({
          status: "ativo",
          role,
          franqueado_id: franqueadoId || null,
          aprovado_por: userData.user?.id,
          aprovado_em: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-approvals"] });
      toast.success("Usuário aprovado com sucesso!");
    },
    onError: (error) => {
      console.error("Error approving user:", error);
      toast.error("Erro ao aprovar usuário");
    },
  });

  const rejeitarMutation = useMutation({
    mutationFn: async ({
      userId,
      motivo,
    }: {
      userId: string;
      motivo?: string;
    }) => {
      const { error } = await supabase
        .from("mt_users")
        .update({
          status: "rejeitado",
          motivo_rejeicao: motivo || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-approvals"] });
      toast.success("Usuário rejeitado");
    },
    onError: (error) => {
      console.error("Error rejecting user:", error);
      toast.error("Erro ao rejeitar usuário");
    },
  });

  const reativarMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("mt_users")
        .update({
          status: "pendente",
          motivo_rejeicao: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-approvals"] });
      toast.success("Usuário reativado para aprovação");
    },
    onError: (error) => {
      console.error("Error reactivating user:", error);
      toast.error("Erro ao reativar usuário");
    },
  });

  // Calcular estatísticas
  const getStats = (): AprovacaoStats => {
    const data = query.data;
    return {
      pendentes: data?.pendentes.length || 0,
      aprovados: data?.aprovados.length || 0,
      rejeitados: data?.rejeitados.length || 0,
    };
  };

  return {
    pendentes: query.data?.pendentes || [],
    aprovados: query.data?.aprovados || [],
    rejeitados: query.data?.rejeitados || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    stats: getStats(),
    aprovarUsuario: aprovarMutation.mutate,
    rejeitarUsuario: rejeitarMutation.mutate,
    reativarUsuario: reativarMutation.mutate,
    isAprovando: aprovarMutation.isPending,
    isRejeitando: rejeitarMutation.isPending,
    isReativando: reativarMutation.isPending,
  };
}

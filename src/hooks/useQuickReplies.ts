import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface QuickReply {
  id: string;
  sessao_id: string | null;
  titulo: string;
  mensagem: string;
  categoria: string | null;
  atalho: string | null;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuickReplyCreate {
  titulo: string;
  mensagem: string;
  categoria?: string;
  atalho?: string;
  is_global?: boolean;
}

const QUERY_KEY = "quick_replies";

// Categorias padrão
export const QUICK_REPLY_CATEGORIES = [
  { value: "saudacao", label: "Saudação" },
  { value: "agendamento", label: "Agendamento" },
  { value: "servicos", label: "Serviços" },
  { value: "precos", label: "Preços" },
  { value: "localizacao", label: "Localização" },
  { value: "horario", label: "Horário" },
  { value: "confirmacao", label: "Confirmação" },
  { value: "cancelamento", label: "Cancelamento" },
  { value: "outros", label: "Outros" },
];

/**
 * @deprecated Use useQuickRepliesAdapter instead for proper multi-tenant isolation.
 */
export function useQuickReplies(sessaoId: string | undefined) {
  const queryClient = useQueryClient();

  // Buscar quick replies (sessão específica + globais)
  const {
    data: quickReplies = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, sessaoId],
    queryFn: async () => {
      // Buscar quick replies da sessão e globais
      const query = supabase
        .from("mt_whatsapp_quick_replies")
        .select("*")
        .order("categoria")
        .order("titulo");

      if (sessaoId) {
        query.or(`sessao_id.eq.${sessaoId},is_global.eq.true`);
      } else {
        query.eq("is_global", true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as QuickReply[];
    },
    enabled: true,
  });

  // Criar quick reply
  const createQuickReply = useMutation({
    mutationFn: async (data: QuickReplyCreate) => {
      const { data: reply, error } = await supabase
        .from("mt_whatsapp_quick_replies")
        .insert({
          sessao_id: data.is_global ? null : sessaoId,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return reply as QuickReply;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Resposta rápida criada!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar resposta rápida: ${error.message}`);
    },
  });

  // Atualizar quick reply
  const updateQuickReply = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<QuickReplyCreate>;
    }) => {
      const { data: reply, error } = await supabase
        .from("mt_whatsapp_quick_replies")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return reply as QuickReply;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Resposta rápida atualizada!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  // Deletar quick reply
  const deleteQuickReply = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mt_whatsapp_quick_replies")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Resposta rápida removida!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  // Agrupar por categoria
  const groupedByCategory = quickReplies.reduce((acc, reply) => {
    const cat = reply.categoria || "outros";
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(reply);
    return acc;
  }, {} as Record<string, QuickReply[]>);

  // Buscar por atalho
  const findByAtalho = (atalho: string) => {
    return quickReplies.find(
      (qr) => qr.atalho?.toLowerCase() === atalho.toLowerCase()
    );
  };

  // Buscar por texto
  const search = (query: string) => {
    const q = query.toLowerCase();
    return quickReplies.filter(
      (qr) =>
        qr.titulo.toLowerCase().includes(q) ||
        qr.mensagem.toLowerCase().includes(q) ||
        qr.atalho?.toLowerCase().includes(q)
    );
  };

  return {
    quickReplies,
    groupedByCategory,
    isLoading,
    error,
    refetch,
    createQuickReply,
    updateQuickReply,
    deleteQuickReply,
    findByAtalho,
    search,
    isCreating: createQuickReply.isPending,
    isUpdating: updateQuickReply.isPending,
    isDeleting: deleteQuickReply.isPending,
  };
}

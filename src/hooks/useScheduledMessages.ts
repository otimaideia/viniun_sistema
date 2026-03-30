import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from "./useUserProfile";
import type { ScheduledMessage, ScheduledMessageFormData } from "@/types/scheduled-message";

const QUERY_KEY = "scheduled-messages";

/**
 * @deprecated Use useScheduledMessagesAdapter instead for proper multi-tenant isolation.
 */
export function useScheduledMessages(sessaoId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { canViewAllLeads, unidadeId, isLoading: isLoadingProfile } = useUserProfile();

  // Query para buscar mensagens agendadas
  const {
    data: messages = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, sessaoId, canViewAllLeads, unidadeId],
    queryFn: async () => {
      let query = supabase
        .from("mt_scheduled_messages")
        .select(`
          *,
          mt_whatsapp_sessions (
            id,
            nome,
            session_name
          ),
          mt_marketing_templates (
            id,
            nome_template
          ),
          mt_marketing_campaigns (
            id,
            nome
          )
        `)
        .order("agendado_para", { ascending: true });

      // Filtrar por sessão específica se fornecido
      if (sessaoId) {
        query = query.eq("sessao_id", sessaoId);
      }

      // Filtrar por unidade se não for admin
      if (!canViewAllLeads && unidadeId) {
        query = query.eq("unidade_id", unidadeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ScheduledMessage[];
    },
    enabled: !isLoadingProfile,
  });

  // Mutation para criar mensagem agendada
  const createMutation = useMutation({
    mutationFn: async (data: ScheduledMessageFormData) => {
      const { data: user } = await supabase.auth.getUser();

      const { data: result, error } = await supabase
        .from("mt_scheduled_messages")
        .insert({
          ...data,
          created_by: user.user?.id,
          unidade_id: data.unidade_id || unidadeId,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({
        title: "Mensagem agendada",
        description: "A mensagem foi agendada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao agendar mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar mensagem
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<ScheduledMessageFormData>;
    }) => {
      const { data: result, error } = await supabase
        .from("mt_scheduled_messages")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({
        title: "Mensagem atualizada",
        description: "A mensagem agendada foi atualizada.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para cancelar mensagem
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mt_scheduled_messages")
        .update({ status: "cancelada" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({
        title: "Mensagem cancelada",
        description: "O agendamento foi cancelado.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao cancelar mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar mensagem
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mt_scheduled_messages")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({
        title: "Mensagem excluida",
        description: "A mensagem agendada foi excluida.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Stats calculadas
  const stats = {
    total: messages.length,
    pendentes: messages.filter((m) => m.status === "pendente").length,
    enviadas: messages.filter((m) => m.status === "enviada").length,
    falharam: messages.filter((m) => m.status === "falhou").length,
    canceladas: messages.filter((m) => m.status === "cancelada").length,
    proximas: messages
      .filter((m) => m.status === "pendente" && new Date(m.agendado_para) > new Date())
      .slice(0, 5),
  };

  return {
    messages,
    isLoading: isLoading || isLoadingProfile,
    error,
    refetch,
    stats,
    createMessage: createMutation.mutateAsync,
    updateMessage: (id: string, data: Partial<ScheduledMessageFormData>) =>
      updateMutation.mutateAsync({ id, data }),
    cancelMessage: cancelMutation.mutateAsync,
    deleteMessage: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isCanceling: cancelMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

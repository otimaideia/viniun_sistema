import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface RecordHistoryParams {
  leadId: string;
  actionType: string;
  actionDescription: string;
  oldValue?: string | null;
  newValue?: string | null;
}

// Interface para mt_lead_activities (histórico)
interface HistoryEntry {
  id: string;
  lead_id: string;
  tipo: string;               // action_type → tipo
  descricao: string;          // action_description → descricao
  status_anterior: string | null;  // old_value → status_anterior
  status_novo: string | null;      // new_value → status_novo
  user_id: string | null;     // changed_by → user_id
  user_nome: string | null;   // changed_by_name → user_nome
  dados: any;                 // dados extras em JSON
  created_at: string;
  // Campos de compatibilidade para código legado
  action_type?: string;
  action_description?: string;
  old_value?: string | null;
  new_value?: string | null;
  changed_by?: string | null;
  changed_by_name?: string | null;
  performed_by_name?: string | null;
}

export function useLeadHistory(leadId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const historyQuery = useQuery({
    queryKey: ["lead-history", leadId],
    queryFn: async (): Promise<HistoryEntry[]> => {
      if (!leadId) return [];

      const { data, error } = await supabase
        .from("mt_lead_activities")
        .select("id, lead_id, tipo, descricao, status_anterior, status_novo, user_id, user_nome, dados, created_at")
        .eq("lead_id", leadId)
        .neq("tipo", "note")  // Excluir notas do histórico
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching lead history:", error);
        throw error;
      }

      // Mapear para formato de compatibilidade com código legado
      return (data || []).map(item => ({
        ...item,
        // Campos MT
        tipo: item.tipo,
        descricao: item.descricao,
        status_anterior: item.status_anterior,
        status_novo: item.status_novo,
        user_id: item.user_id,
        user_nome: item.user_nome,
        // Campos de compatibilidade legado
        action_type: item.tipo,
        action_description: item.descricao,
        old_value: item.status_anterior,
        new_value: item.status_novo,
        changed_by: item.user_id,
        changed_by_name: item.user_nome,
        performed_by_name: item.user_nome,
      }));
    },
    enabled: !!leadId,
  });

  const recordHistoryMutation = useMutation({
    mutationFn: async ({
      leadId,
      actionType,
      actionDescription,
      oldValue,
      newValue
    }: RecordHistoryParams) => {
      if (!user) throw new Error("User not authenticated");

      const userName = user.email?.split("@")[0] || "Usuário";

      // Inserir na tabela mt_lead_activities
      const { error } = await supabase
        .from("mt_lead_activities")
        .insert({
          lead_id: leadId,
          tipo: actionType,               // action_type → tipo
          titulo: actionDescription,      // título curto
          descricao: actionDescription,   // action_description → descricao
          user_id: user.id,               // changed_by → user_id
          user_nome: userName,            // changed_by_name → user_nome
          status_anterior: oldValue,      // old_value → status_anterior
          status_novo: newValue,          // new_value → status_novo
        });

      if (error) throw error;

      // Also update the lead's last_action fields
      const { error: updateError } = await supabase
        .from("mt_leads")
        .update({
          last_action_type: actionType,
          last_action_timestamp: new Date().toISOString(),
        })
        .eq("id", leadId);

      if (updateError) {
        console.error("Error updating lead last action:", updateError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["mt-leads"] });
      if (leadId) {
        queryClient.invalidateQueries({ queryKey: ["lead-history", leadId] });
      }
    },
  });

  return {
    history: historyQuery.data || [],
    isLoading: historyQuery.isLoading,
    recordHistory: recordHistoryMutation.mutateAsync,
    isRecording: recordHistoryMutation.isPending,
  };
}

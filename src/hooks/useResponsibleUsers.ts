import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useLeadHistory } from "./useLeadHistory";
import { useTenantContext } from "@/contexts/TenantContext";

interface ResponsibleUser {
  id: string;
  name: string;
  email: string;
}

export function useResponsibleUsers() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { recordHistory } = useLeadHistory();
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  // Fetch all approved users that can be assigned as responsible
  const query = useQuery({
    queryKey: ["responsible-users", tenant?.id, franchise?.id],
    queryFn: async (): Promise<ResponsibleUser[]> => {
      let q = supabase
        .from("mt_users")
        .select("id, nome, email")
        .eq("status", "ativo")
        .order("nome", { ascending: true });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      const { data, error } = await q;

      if (error) {
        console.error("Error fetching users:", error);
        throw error;
      }

      return (data || []).map((profile) => ({
        id: profile.id,
        name: profile.nome || profile.email?.split("@")[0] || "Usuário",
        email: profile.email || "",
      }));
    },
  });

  const assignResponsibleMutation = useMutation({
    mutationFn: async ({ 
      leadId, 
      responsibleId, 
      previousResponsibleName 
    }: { 
      leadId: string; 
      responsibleId: string | null;
      previousResponsibleName?: string;
    }) => {
      const { error } = await supabase
        .from("mt_leads")
        .update({ 
          responsible_id: responsibleId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId);

      if (error) throw error;

      // Get new responsible name
      const newResponsible = query.data?.find(u => u.id === responsibleId);
      const newResponsibleName = newResponsible?.name || "Sem responsável";

      // Record history
      await recordHistory({
        leadId,
        actionType: "responsible_changed",
        actionDescription: "Responsável alterado",
        oldValue: previousResponsibleName || "-",
        newValue: newResponsibleName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Responsável atualizado!");
    },
    onError: (error) => {
      console.error("Error assigning responsible:", error);
      toast.error("Erro ao atribuir responsável");
    },
  });

  return {
    users: query.data || [],
    isLoading: query.isLoading,
    assignResponsible: assignResponsibleMutation.mutate,
    isAssigning: assignResponsibleMutation.isPending,
  };
}

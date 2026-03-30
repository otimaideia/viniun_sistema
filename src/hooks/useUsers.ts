import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserWithRole, AppRole } from "@/types/user";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

/**
 * @deprecated Use useUsersAdapter instead for proper multi-tenant isolation.
 */
export function useUsers() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["mt-users"],
    queryFn: async (): Promise<UserWithRole[]> => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("mt_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        throw profilesError;
      }

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from("mt_user_roles")
        .select("*");

      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
        throw rolesError;
      }

      // Combine profiles with roles
      return (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.id);
        return {
          ...profile,
          role: (userRole?.role as AppRole) || "unidade",
        };
      });
    },
  });

  const approveUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("mt_users")
        .update({
          is_approved: true,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-users"] });
      toast.success("Usuário aprovado com sucesso!");
    },
    onError: (error) => {
      console.error("Error approving user:", error);
      toast.error("Erro ao aprovar usuário");
    },
  });

  const rejectUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("mt_users")
        .update({
          is_approved: false,
          approved_by: null,
          approved_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-users"] });
      toast.success("Aprovação revogada");
    },
    onError: (error) => {
      console.error("Error rejecting user:", error);
      toast.error("Erro ao revogar aprovação");
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Check if role exists
      const { data: existing } = await supabase
        .from("mt_user_roles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("mt_user_roles")
          .update({ role })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("mt_user_roles")
          .insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-users"] });
      toast.success("Nível de acesso atualizado!");
    },
    onError: (error) => {
      console.error("Error updating role:", error);
      toast.error("Erro ao atualizar nível de acesso");
    },
  });

  const updateUnidadeMutation = useMutation({
    mutationFn: async ({ userId, unidadeId }: { userId: string; unidadeId: string | null }) => {
      const { error } = await supabase
        .from("mt_users")
        .update({ 
          unidade_id: unidadeId,
          updated_at: new Date().toISOString() 
        })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-users"] });
      toast.success("Unidade atualizada!");
    },
    onError: (error) => {
      console.error("Error updating unidade:", error);
      toast.error("Erro ao atualizar unidade");
    },
  });

  return {
    users: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    approveUser: approveUserMutation.mutate,
    rejectUser: rejectUserMutation.mutate,
    updateRole: updateRoleMutation.mutate,
    updateUnidade: updateUnidadeMutation.mutate,
    isApproving: approveUserMutation.isPending,
    isUpdatingRole: updateRoleMutation.isPending,
  };
}

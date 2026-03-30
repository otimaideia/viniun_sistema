import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UserProfile, AppRole } from "@/types/user";

/**
 * @deprecated Use useUserProfileAdapter instead for proper multi-tenant isolation.
 */
export function useUserProfile() {
  const { user } = useAuth();

  const profileQuery = useQuery({
    queryKey: ["mt-profile", user?.id],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("mt_users")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }

      return data;
    },
    enabled: !!user?.id,
  });

  const roleQuery = useQuery({
    queryKey: ["mt-userRole", profileQuery.data?.id],
    queryFn: async (): Promise<AppRole> => {
      if (!profileQuery.data?.id) return "unidade";

      // Busca roles do usuário com join na tabela mt_roles
      const { data, error } = await supabase
        .from("mt_user_roles")
        .select("role:mt_roles(codigo, nivel)")
        .eq("user_id", profileQuery.data.id)
        .eq("is_active", true);

      if (error) {
        console.error("Error fetching role:", error);
        return "unidade";
      }

      if (!data || data.length === 0) return "unidade";

      // Prioriza o role pelo nível (1=platform_admin, 2=tenant_admin, 3=franchise_admin)
      const roles = data.map(d => (d.role as any)?.codigo).filter(Boolean);
      const niveis = data.map(d => (d.role as any)?.nivel).filter(Boolean);

      const minNivel = Math.min(...niveis);
      if (minNivel === 1) return "admin"; // platform_admin
      if (minNivel === 2) return "admin"; // tenant_admin
      if (minNivel === 3) return "central"; // franchise_admin
      return "unidade";
    },
    enabled: !!profileQuery.data?.id,
  });

  const isLoading = profileQuery.isLoading || roleQuery.isLoading;
  
  // Só determina o role após o loading completar
  const role: AppRole = roleQuery.data || "unidade";
  
  // Flags de role - só são confiáveis após o loading
  const isAdmin = !isLoading && role === "admin";
  const isCentral = !isLoading && role === "central";
  const isUnidade = !isLoading && role === "unidade";
  
  return {
    profile: profileQuery.data,
    role,
    isAdmin,
    isCentral,
    isUnidade,
    // Admin e Central podem ver todos os leads
    canViewAllLeads: isAdmin || isCentral,
    // Apenas Admin pode editar configurações gerais
    canEditConfig: isAdmin,
    isApproved: profileQuery.data?.status === 'ativo',
    isLoading,
    unidadeId: profileQuery.data?.unidade_id || null,
    refetch: () => {
      profileQuery.refetch();
      roleQuery.refetch();
    },
  };
}

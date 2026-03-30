import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Tipos MT
export type MTAccessLevel = "platform" | "tenant" | "franchise" | "user";
export type MTUserStatus = "ativo" | "pendente" | "inativo" | "bloqueado";

export interface MTUserProfile {
  id: string;
  auth_user_id: string;
  tenant_id: string;
  franchise_id: string | null;
  access_level: MTAccessLevel;
  email: string;
  nome: string;
  nome_curto: string | null;
  avatar_url: string | null;
  telefone: string | null;
  whatsapp: string | null;
  cargo: string | null;
  departamento: string | null;
  status: MTUserStatus;
  ultimo_login: string | null;
  created_at: string;
  updated_at: string;
  // Dados do tenant
  tenant?: {
    id: string;
    slug: string;
    nome_fantasia: string;
  };
  // Dados da franquia
  franchise?: {
    id: string;
    nome: string;
    codigo: string;
  };
}

export function useUserProfileMT() {
  const { user } = useAuth();

  const profileQuery = useQuery({
    queryKey: ["mt-user-profile", user?.id],
    queryFn: async (): Promise<MTUserProfile | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("mt_users")
        .select(`
          *,
          tenant:mt_tenants(id, slug, nome_fantasia),
          franchise:mt_franchises(id, nome, codigo)
        `)
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("[useUserProfileMT] Error fetching profile:", error);
        return null;
      }

      return data as MTUserProfile;
    },
    enabled: !!user?.id,
  });

  const isLoading = profileQuery.isLoading;
  const profile = profileQuery.data;

  // Mapear access_level para roles compatíveis com o sistema atual
  const accessLevel = profile?.access_level || "user";

  // Flags de role baseadas em access_level
  const isPlatformAdmin = !isLoading && accessLevel === "platform";
  const isTenantAdmin = !isLoading && accessLevel === "tenant";
  const isFranchiseAdmin = !isLoading && accessLevel === "franchise";
  const isUser = !isLoading && accessLevel === "user";

  // Compatibilidade com sistema legacy
  const isAdmin = isPlatformAdmin || isTenantAdmin;
  const isCentral = isFranchiseAdmin;
  const isUnidade = isUser;

  // Status de aprovação baseado no status MT
  const isApproved = !isLoading && profile?.status === "ativo";

  return {
    profile,
    // Access level MT
    accessLevel,
    isPlatformAdmin,
    isTenantAdmin,
    isFranchiseAdmin,
    isUser,
    // Compatibilidade legacy
    role: isPlatformAdmin ? "admin" : isTenantAdmin ? "admin" : isFranchiseAdmin ? "central" : "unidade",
    isAdmin,
    isCentral,
    isUnidade,
    // Permissões
    canViewAllLeads: isPlatformAdmin || isTenantAdmin,
    canEditConfig: isPlatformAdmin || isTenantAdmin,
    isApproved,
    isLoading,
    // IDs de contexto
    tenantId: profile?.tenant_id || null,
    franchiseId: profile?.franchise_id || null,
    unidadeId: profile?.franchise_id || null, // Compatibilidade
    // Dados relacionados
    tenant: profile?.tenant || null,
    franchise: profile?.franchise || null,
    refetch: () => profileQuery.refetch(),
  };
}

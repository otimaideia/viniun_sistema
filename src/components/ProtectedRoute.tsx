import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfileAdapter } from "@/hooks/useUserProfileAdapter";
import { useTenantContext } from "@/contexts/TenantContext";
import { useUserPermissions } from "@/hooks/multitenant/useUserPermissions";
import { Loader2, ShieldAlert } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireFranchiseAdmin?: boolean;
  /** Codigo do modulo para verificacao de permissao (ex: "leads", "whatsapp") */
  module?: string;
}

// Verifica se deve usar autenticação MT
function shouldUseMTAuth(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("USE_MT_AUTH") === "true";
}

export function ProtectedRoute({ children, requireAdmin = false, requireFranchiseAdmin = false, module }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const useMT = shouldUseMTAuth();
  const { canAccess, isLoading: isPermissionsLoading } = useUserPermissions();

  // Hooks legacy
  const { isApproved: legacyIsApproved, isAdmin: legacyIsAdmin, isLoading: profileLoading } = useUserProfileAdapter();

  // Hooks MT - usamos try/catch pois o TenantContext pode não estar disponível
  let mtUser = null;
  let mtAccessLevel = "user";
  let mtIsLoading = false;

  try {
    const tenantContext = useTenantContext();
    mtUser = tenantContext.user;
    mtAccessLevel = tenantContext.accessLevel;
    mtIsLoading = tenantContext.isLoading;
  } catch {
    // TenantContext não disponível - usar apenas legacy
  }

  // Determinar valores baseado no modo
  // Sistema é 100% MT - SEMPRE esperar MT context carregar antes de decidir
  // Fallback para legacy APENAS se MT finalizou carregamento e não achou user
  const mtFinishedWithUser = !mtIsLoading && !!mtUser;
  const mtFinishedWithoutUser = !mtIsLoading && !mtUser;
  const effectiveUseMT = mtFinishedWithUser;

  // Se MT ainda está carregando, mostrar loading (não cair no legacy prematuramente)
  const isLoading = mtIsLoading ? true : (effectiveUseMT ? false : profileLoading);
  const isApproved = effectiveUseMT
    ? (mtUser?.status === "ativo")
    : legacyIsApproved;
  const isAdmin = effectiveUseMT
    ? (mtAccessLevel === "platform" || mtAccessLevel === "tenant")
    : legacyIsAdmin;
  const isFranchiseAdmin = effectiveUseMT
    ? (mtAccessLevel === "platform" || mtAccessLevel === "tenant" || mtAccessLevel === "franchise")
    : legacyIsAdmin;

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Show loading while fetching profile
  if (isLoading) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to pending approval page if not approved
  if (!isApproved) {
    return <Navigate to="/aguardando-aprovacao" replace />;
  }

  // Check admin requirement
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Check franchise admin requirement (platform, tenant, or franchise admin)
  if (requireFranchiseAdmin && !isFranchiseAdmin) {
    return <Navigate to="/" replace />;
  }

  // Check module-level permission (granular MT permission)
  if (module) {
    if (isPermissionsLoading) {
      return (
        <div className="min-h-svh flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!canAccess(module, 'view')) {
      return (
        <div className="min-h-svh flex flex-col items-center justify-center bg-background text-center p-8">
          <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground mb-6">
            Voce nao tem permissao para acessar este modulo.
          </p>
          <a href="/" className="text-primary hover:underline">
            Voltar ao Dashboard
          </a>
        </div>
      );
    }
  }

  return <>{children}</>;
}

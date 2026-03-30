import { ReactNode } from 'react';
import { useUserPermissions } from '@/hooks/multitenant/useUserPermissions';

interface PermissionGateProps {
  /** Codigo do modulo (ex: "leads", "whatsapp") */
  module: string;
  /** Acao necessaria (padrao: view) */
  action?: 'view' | 'create' | 'edit' | 'delete';
  /** Conteudo a exibir se tiver permissao */
  children: ReactNode;
  /** Conteudo alternativo se nao tiver permissao */
  fallback?: ReactNode;
  /** Se true, exibe loading enquanto carrega permissoes */
  showLoading?: boolean;
}

/**
 * Componente wrapper que controla exibicao baseado em permissoes MT.
 *
 * @example
 * ```tsx
 * <PermissionGate module="leads" action="create">
 *   <Button>Novo Lead</Button>
 * </PermissionGate>
 *
 * <PermissionGate module="relatorios" action="view" fallback={<p>Sem acesso</p>}>
 *   <RelatoriosList />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  module,
  action = 'view',
  children,
  fallback = null,
  showLoading = false,
}: PermissionGateProps) {
  const { canAccess, isLoading } = useUserPermissions();

  if (isLoading && showLoading) {
    return <div className="animate-pulse bg-muted h-8 w-24 rounded" />;
  }

  if (isLoading) {
    return null;
  }

  if (!canAccess(module, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface RequirePermissionProps {
  /** Codigo do modulo */
  module: string;
  /** Acao necessaria */
  action?: 'view' | 'create' | 'edit' | 'delete';
  /** Conteudo a exibir se tiver permissao */
  children: ReactNode;
  /** Redirecionar para esta rota se nao tiver permissao */
  redirectTo?: string;
}

/**
 * Componente para protecao de rotas inteiras.
 * Redireciona ou mostra erro se nao tiver permissao.
 *
 * @example
 * ```tsx
 * <RequirePermission module="configuracoes" redirectTo="/">
 *   <ConfiguracoesPage />
 * </RequirePermission>
 * ```
 */
export function RequirePermission({
  module,
  action = 'view',
  children,
  redirectTo,
}: RequirePermissionProps) {
  const { canAccess, isLoading } = useUserPermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!canAccess(module, action)) {
    if (redirectTo) {
      window.location.href = redirectTo;
      return null;
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-8">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground">
          Voce nao tem permissao para acessar este recurso.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Hook helper para verificacoes rapidas em componentes
 */
export function useCanAccess(module: string) {
  const { canAccess, isLoading } = useUserPermissions();

  return {
    canView: canAccess(module, 'view'),
    canCreate: canAccess(module, 'create'),
    canEdit: canAccess(module, 'edit'),
    canDelete: canAccess(module, 'delete'),
    isLoading,
  };
}

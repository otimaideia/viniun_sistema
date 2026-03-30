// =============================================================================
// PERMISSION GUARD - Componente para controle de acesso por permissão
// =============================================================================
//
// Uso:
//   // Oculta botão se usuário não tem permissão de criar leads
//   <PermissionGuard module="leads" action="create">
//     <Button>Novo Lead</Button>
//   </PermissionGuard>
//
//   // Mostra fallback se não tem permissão
//   <PermissionGuard permission="leads.delete" fallback={<span>Sem permissão</span>}>
//     <Button variant="destructive">Excluir</Button>
//   </PermissionGuard>
//
//   // Verificação por permissão específica
//   <PermissionGuard permission="whatsapp.sessions.sync">
//     <Button>Sincronizar</Button>
//   </PermissionGuard>
//
// =============================================================================

import React from 'react';
import { useUserPermissions } from '@/hooks/multitenant/useUserPermissions';

interface PermissionGuardProps {
  /** Código de permissão específico (ex: "leads.delete", "whatsapp.sessions.sync") */
  permission?: string;
  /** Módulo para verificar (ex: "leads", "whatsapp") */
  module?: string;
  /** Ação dentro do módulo */
  action?: 'view' | 'create' | 'edit' | 'delete' | 'sync' | 'manage';
  /** Conteúdo a renderizar se tiver permissão */
  children: React.ReactNode;
  /** Conteúdo a renderizar se NÃO tiver permissão (padrão: null = oculta) */
  fallback?: React.ReactNode;
}

/**
 * Guard de permissão - renderiza children apenas se o usuário tiver permissão.
 * Admins (platform, tenant, franchise) sempre têm acesso.
 * Para role 'user', verifica permissões do cargo atribuído.
 */
export function PermissionGuard({
  permission,
  module,
  action,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { hasPermission, canAccess, isLoading } = useUserPermissions();

  // Durante o carregamento, não renderiza (evita flash de conteúdo não autorizado)
  if (isLoading) return null;

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (module) {
    hasAccess = canAccess(module, action);
  } else {
    // Sem restrição especificada: sempre renderiza
    hasAccess = true;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Hook auxiliar para verificar permissões em lógica imperativa
 *
 * @example
 * const { canCreate, canDelete } = useModulePermissions('leads');
 * <Button disabled={!canCreate}>Novo Lead</Button>
 */
export function useModulePermissions(moduleCode: string) {
  const { canAccess, isLoading } = useUserPermissions();

  return {
    isLoading,
    canView: canAccess(moduleCode, 'view'),
    canCreate: canAccess(moduleCode, 'create'),
    canEdit: canAccess(moduleCode, 'edit'),
    canDelete: canAccess(moduleCode, 'delete'),
    canSync: canAccess(moduleCode, 'sync'),
    canManage: canAccess(moduleCode, 'manage'),
  };
}

export default PermissionGuard;

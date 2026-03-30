// =============================================================================
// USE WHATSAPP PERMISSIONS ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para permissões de WhatsApp usando tabelas MT
// SISTEMA 100% MT - Usa useWhatsAppPermissionsMT diretamente
//
// =============================================================================

import { useWhatsAppPermissionsMT, useMyWhatsAppSessionsMT } from './multitenant/useWhatsAppPermissionsMT';
import type { MTWhatsAppSession } from '@/types/whatsapp-mt';

// -----------------------------------------------------------------------------
// Hook: Permissões de WhatsApp - 100% MT
// -----------------------------------------------------------------------------

export function useWhatsAppPermissionsAdapter(sessionId?: string) {
  const mtHook = useWhatsAppPermissionsMT(sessionId);

  return {
    // Permissões do usuário atual
    myPermissions: mtHook.myPermissions,
    canView: mtHook.canView,
    canSend: mtHook.canSend,
    canManage: mtHook.canManage,
    canDeleteMessages: mtHook.canDeleteMessages,
    canExport: mtHook.canExport,
    canAssign: mtHook.canAssign,
    isLoading: mtHook.isLoading,

    // Permissões da sessão (admin)
    sessionPermissions: mtHook.sessionPermissions,
    isLoadingPermissions: mtHook.isLoadingPermissions,

    // Mutations
    grantPermission: mtHook.grantPermission,
    revokePermission: mtHook.revokePermission,
    updatePermission: mtHook.updatePermission,
    setDefaultSession: mtHook.setDefaultSession,

    // Marcador MT
    _mode: 'mt' as const,
  };
}

// -----------------------------------------------------------------------------
// Hook: Minhas Sessões WhatsApp - 100% MT
// -----------------------------------------------------------------------------

export function useMyWhatsAppSessionsAdapter() {
  const mtHook = useMyWhatsAppSessionsMT();

  return {
    sessions: mtHook.sessions as MTWhatsAppSession[],
    isLoading: mtHook.isLoading,
    error: mtHook.error,
    refetch: mtHook.refetch,
    _mode: 'mt' as const,
  };
}

export default useWhatsAppPermissionsAdapter;

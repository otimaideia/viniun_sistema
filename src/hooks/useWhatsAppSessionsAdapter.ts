// =============================================================================
// USE WHATSAPP SESSIONS ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para sessões de WhatsApp usando tabelas MT
// SISTEMA 100% MT - Usa useWhatsAppSessionsMT diretamente
//
// =============================================================================

import { useWhatsAppSessionsMT, useWhatsAppSessionMT } from './multitenant/useWhatsAppSessionsMT';
import type { MTWhatsAppSession, CreateMTSessionInput, UpdateMTSessionInput } from '@/types/whatsapp-mt';

// -----------------------------------------------------------------------------
// Interface do Adapter
// -----------------------------------------------------------------------------

export interface WhatsAppSessionsAdapterResult {
  sessions: MTWhatsAppSession[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  createSession: {
    mutateAsync: (input: CreateMTSessionInput) => Promise<MTWhatsAppSession>;
    isPending: boolean;
  };
  updateSession: {
    mutateAsync: (input: UpdateMTSessionInput) => Promise<MTWhatsAppSession>;
    isPending: boolean;
  };
  deleteSession: {
    mutateAsync: (id: string) => Promise<void>;
    isPending: boolean;
  };
  updateStatus: {
    mutateAsync: (params: { id: string; status: string; qr_code?: string | null }) => Promise<unknown>;
    isPending: boolean;
  };
  _mode: 'mt';
}

// -----------------------------------------------------------------------------
// Hook: Lista de Sessões - 100% MT
// -----------------------------------------------------------------------------

export function useWhatsAppSessionsAdapter(franqueadoId?: string): WhatsAppSessionsAdapterResult {
  const mtHook = useWhatsAppSessionsMT(
    franqueadoId ? { franchise_id: franqueadoId } : undefined
  );

  return {
    sessions: mtHook.sessions,
    isLoading: mtHook.isLoading,
    error: mtHook.error as Error | null,
    refetch: mtHook.refetch,
    createSession: {
      mutateAsync: mtHook.createSession.mutateAsync,
      isPending: mtHook.isCreating,
    },
    updateSession: {
      mutateAsync: mtHook.updateSession.mutateAsync,
      isPending: mtHook.isUpdating,
    },
    deleteSession: {
      mutateAsync: mtHook.deleteSession.mutateAsync,
      isPending: mtHook.isDeleting,
    },
    updateStatus: {
      mutateAsync: async (params) => mtHook.updateStatus.mutateAsync({
        id: params.id,
        status: params.status as MTWhatsAppSession['status'],
        qr_code: params.qr_code,
      }),
      isPending: mtHook.updateStatus.isPending,
    },
    _mode: 'mt',
  };
}

// -----------------------------------------------------------------------------
// Hook: Sessão Individual - 100% MT
// -----------------------------------------------------------------------------

export function useWhatsAppSessionAdapter(sessionId: string | undefined) {
  const mtHook = useWhatsAppSessionMT(sessionId);

  return {
    session: mtHook.session,
    isLoading: mtHook.isLoading,
    error: mtHook.error,
    refetch: mtHook.refetch,
    _mode: 'mt' as const,
  };
}

export default useWhatsAppSessionsAdapter;

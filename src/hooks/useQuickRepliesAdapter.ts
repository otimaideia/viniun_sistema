// =============================================================================
// USE QUICK REPLIES ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter 100% MT para respostas rápidas do WhatsApp
// SISTEMA 100% MT - Usa useWhatsAppQuickRepliesMT diretamente
//
// =============================================================================

import { useTenantContext } from '@/contexts/TenantContext';
import { useWhatsAppQuickRepliesMT } from './multitenant/useWhatsAppQuickRepliesMT';
import type { MTWhatsAppQuickReply, CreateQuickReplyInput } from '@/types/whatsapp-mt';

// =============================================================================
// Re-export Types with Legacy Names
// =============================================================================

export type QuickReply = MTWhatsAppQuickReply;
export type QuickReplyCreate = CreateQuickReplyInput;

// Categorias padrão para respostas rápidas
export const QUICK_REPLY_CATEGORIES = [
  'Saudações',
  'Informações',
  'Agendamento',
  'Promoções',
  'Suporte',
  'Cobrança',
  'Geral',
];

// =============================================================================
// Hook Principal
// =============================================================================

export function useQuickRepliesAdapter(sessaoId: string | undefined) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  // Use the MT hook directly
  const mt = useWhatsAppQuickRepliesMT(sessaoId);

  return {
    ...mt,
    // Map MT names to legacy interface
    quickReplies: mt.quickReplies,
    isLoading: mt.isLoading || isTenantLoading,
    error: mt.error,
    refetch: mt.refetch,
    createQuickReply: mt.createQuickReply.mutateAsync,
    updateQuickReply: mt.updateQuickReply.mutateAsync,
    deleteQuickReply: mt.deleteQuickReply.mutateAsync,
    getByShortcut: mt.getByShortcut,
    getByCategory: mt.getByCategory,
    isCreating: mt.isCreating,
    isUpdating: mt.isUpdating,
    isDeleting: mt.isDeleting,

    // Context info
    tenant,
    franchise,
    accessLevel,

    _mode: 'mt' as const,
  };
}

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getQuickRepliesMode(): 'mt' {
  return 'mt';
}

export default useQuickRepliesAdapter;

// =============================================================================
// USE CLIENTE AUTH ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para autenticação de clientes
// SISTEMA 100% MT - Usa useClienteAuth internamente
//
// =============================================================================

import { useClienteAuth, VerificationMethod } from './useClienteAuth';

// Re-export types
export type { VerificationMethod };

// -----------------------------------------------------------------------------
// Adapter Principal - 100% MT
// -----------------------------------------------------------------------------

export function useClienteAuthAdapter() {
  const hook = useClienteAuth();
  return { ...hook, _mode: 'mt' as const };
}

export default useClienteAuthAdapter;

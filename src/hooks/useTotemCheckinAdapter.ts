// =============================================================================
// USE TOTEM CHECKIN ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para check-in via totem
// SISTEMA 100% MT - Usa useTotemCheckin internamente
//
// =============================================================================

import { useTotemCheckin } from './useTotemCheckin';

// -----------------------------------------------------------------------------
// Adapter Principal - 100% MT
// -----------------------------------------------------------------------------

export function useTotemCheckinAdapter() {
  const hook = useTotemCheckin();
  return { ...hook, _mode: 'mt' as const };
}

export default useTotemCheckinAdapter;

// =============================================================================
// USE GOOGLE DRIVE SYNC ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para sincronização com Google Drive
// SISTEMA 100% MT - Usa useGoogleDriveSync internamente
//
// =============================================================================

import { useGoogleDriveSync } from './useGoogleDriveSync';

// -----------------------------------------------------------------------------
// Adapter Principal - 100% MT
// -----------------------------------------------------------------------------

export function useGoogleDriveSyncAdapter() {
  const hook = useGoogleDriveSync();

  return {
    ...hook,
    _mode: 'mt' as const,
  };
}

export default useGoogleDriveSyncAdapter;

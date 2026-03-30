// =============================================================================
// USE STORAGE UPLOAD ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para upload de arquivos no Storage
// SISTEMA 100% MT - Usa useStorageUpload internamente
//
// =============================================================================

import { useStorageUpload } from './useStorageUpload';

// -----------------------------------------------------------------------------
// Adapter Principal - 100% MT
// -----------------------------------------------------------------------------

export function useStorageUploadAdapter() {
  const hook = useStorageUpload();

  return {
    ...hook,
    _mode: 'mt' as const,
  };
}

export default useStorageUploadAdapter;

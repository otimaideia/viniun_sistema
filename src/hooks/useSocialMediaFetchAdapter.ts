// =============================================================================
// USE SOCIAL MEDIA FETCH ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para busca de dados de redes sociais
// SISTEMA 100% MT - Usa useSocialMediaFetch internamente
//
// =============================================================================

import { useSocialMediaFetch, parseUsernameFromUrl } from './useSocialMediaFetch';
import type { SocialMediaProfile, SupportedPlatforms, FetchStatus } from './useSocialMediaFetch';

// Re-exportar tipos e funções
export type { SocialMediaProfile, SupportedPlatforms, FetchStatus };
export { parseUsernameFromUrl };

// -----------------------------------------------------------------------------
// Adapter Principal - 100% MT
// -----------------------------------------------------------------------------

export function useSocialMediaFetchAdapter() {
  const hook = useSocialMediaFetch();

  return {
    ...hook,
    _mode: 'mt' as const,
  };
}

export default useSocialMediaFetchAdapter;

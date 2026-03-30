// =============================================================================
// USE ONBOARDING ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para onboarding de novos tenants
// SISTEMA 100% MT - Usa useOnboarding internamente
//
// =============================================================================

import { useOnboarding, ONBOARDING_STEPS } from './useOnboarding';

// Re-export types and constants
export { ONBOARDING_STEPS };
export type {
  DadosEmpresa,
  DadosEndereco,
  DadosResponsavel,
  DadosBranding,
  DadosConfiguracoes,
  DadosPlano,
  DadosModulos,
  DadosAdminMaster,
  DadosFranquia,
  OnboardingData,
} from './useOnboarding';

// -----------------------------------------------------------------------------
// Adapter Principal - 100% MT
// -----------------------------------------------------------------------------

export function useOnboardingAdapter() {
  const hook = useOnboarding();
  return { ...hook, _mode: 'mt' as const };
}

export default useOnboardingAdapter;

// =============================================================================
// USE SERVICO IMAGENS ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para imagens de serviços
// SISTEMA 100% MT - Usa useServicoImagens internamente
//
// =============================================================================

import { useServicoImagens } from './useServicoImagens';

// Re-exportar tipos
export type { ServicoImagem } from '@/types/servico';

// -----------------------------------------------------------------------------
// Adapter Principal - 100% MT
// -----------------------------------------------------------------------------

export function useServicoImagensAdapter(servicoId?: string) {
  const hook = useServicoImagens(servicoId);

  return {
    ...hook,
    _mode: 'mt' as const,
  };
}

export default useServicoImagensAdapter;

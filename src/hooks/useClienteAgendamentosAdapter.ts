// =============================================================================
// USE CLIENTE AGENDAMENTOS ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para agendamentos de clientes
// SISTEMA 100% MT - Usa useClienteAgendamentos internamente
//
// =============================================================================

import { useClienteAgendamentos } from './useClienteAgendamentos';

// -----------------------------------------------------------------------------
// Adapter Principal - 100% MT
// -----------------------------------------------------------------------------

export function useClienteAgendamentosAdapter(leadId: string | undefined) {
  const hook = useClienteAgendamentos(leadId);
  return { ...hook, _mode: 'mt' as const };
}

export default useClienteAgendamentosAdapter;

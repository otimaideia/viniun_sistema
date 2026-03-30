// =============================================================================
// Adapter: Contratos de Influenciadoras (MT → Legacy)
// =============================================================================

import { useInfluencerContractsMT, useInfluencerContractMT } from './multitenant/useInfluencerContractsMT';
import type {
  MTInfluencerContract,
  MTContractCreate,
  MTContractUpdate,
  MTContractFilters,
  MTContractType,
  MTContractStatus,
} from './multitenant/useInfluencerContractsMT';

// Re-exportar tipos para compatibilidade
export type {
  MTInfluencerContract as InfluencerContract,
  MTContractCreate as ContractCreate,
  MTContractUpdate as ContractUpdate,
  MTContractFilters as ContractFilters,
  MTContractType as ContractType,
  MTContractStatus as ContractStatus,
};

// Adapter principal
export function useInfluenciadoraContratos(filters?: MTContractFilters) {
  return useInfluencerContractsMT(filters);
}

// Adapter individual
export function useInfluenciadoraContrato(id: string | undefined) {
  return useInfluencerContractMT(id);
}

// Exportação default
export default useInfluenciadoraContratos;

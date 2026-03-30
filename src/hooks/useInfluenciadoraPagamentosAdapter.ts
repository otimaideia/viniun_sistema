// =============================================================================
// Adapter: Pagamentos de Influenciadoras (MT → Legacy)
// =============================================================================

import { useInfluencerPaymentsMT, useInfluencerPaymentMT } from './multitenant/useInfluencerPaymentsMT';
import type {
  MTInfluencerPayment,
  MTPaymentCreate,
  MTPaymentUpdate,
  MTPaymentFilters,
  MTPaymentType,
  MTPaymentStatus,
  MTPaymentMethod,
} from './multitenant/useInfluencerPaymentsMT';

// Re-exportar tipos para compatibilidade
export type {
  MTInfluencerPayment as InfluencerPayment,
  MTPaymentCreate as PaymentCreate,
  MTPaymentUpdate as PaymentUpdate,
  MTPaymentFilters as PaymentFilters,
  MTPaymentType as PaymentType,
  MTPaymentStatus as PaymentStatus,
  MTPaymentMethod as PaymentMethod,
};

// Adapter principal
export function useInfluenciadoraPagamentos(filters?: MTPaymentFilters) {
  return useInfluencerPaymentsMT(filters);
}

// Adapter individual
export function useInfluenciadoraPagamento(id: string | undefined) {
  return useInfluencerPaymentMT(id);
}

// Exportação default
export default useInfluenciadoraPagamentos;

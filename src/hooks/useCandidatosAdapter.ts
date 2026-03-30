// =============================================================================
// USE CANDIDATOS ADAPTER - Delegação para useCandidatosMT
// =============================================================================
// Thin wrapper que re-exporta do hook MT real.
// Mantido para compatibilidade com imports existentes.
// Novos códigos devem importar diretamente de useCandidatosMT.
// =============================================================================

import { useCandidatosMT, useCandidatoMT } from './multitenant/useCandidatosMT';

export { useCandidatoMT };
export type { CandidatoStatus } from '@/types/recrutamento';

export function useCandidatosAdapter() {
  return useCandidatosMT();
}

export default useCandidatosAdapter;

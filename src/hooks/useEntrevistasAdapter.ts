// =============================================================================
// USE ENTREVISTAS ADAPTER - Delegação para useEntrevistasMT
// =============================================================================
// Thin wrapper que re-exporta do hook MT real.
// Mantido para compatibilidade com imports existentes.
// Novos códigos devem importar diretamente de useEntrevistasMT.
// =============================================================================

import { useEntrevistasMT, useEntrevistaMT } from './multitenant/useEntrevistasMT';

export { useEntrevistaMT };
export type { EntrevistaStatus, EntrevistaTipo } from '@/types/recrutamento';

export function useEntrevistasAdapter() {
  return useEntrevistasMT();
}

export default useEntrevistasAdapter;

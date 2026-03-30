// =============================================================================
// USE VAGAS ADAPTER - Delegação para useVagasMT
// =============================================================================
// Thin wrapper que re-exporta do hook MT real.
// Mantido para compatibilidade com imports existentes.
// Novos códigos devem importar diretamente de useVagasMT.
// =============================================================================

import { useVagasMT, useVagaMT } from './multitenant/useVagasMT';

export { useVagaMT };
export type { VagaStatus } from '@/types/recrutamento';

export function useVagasAdapter() {
  return useVagasMT();
}

export default useVagasAdapter;

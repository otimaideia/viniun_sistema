// =============================================================================
// USE AUDIO RECORDER ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para gravação de áudio
// SISTEMA 100% MT - Usa useAudioRecorder internamente
//
// =============================================================================

import { useAudioRecorder, formatAudioDuration } from './useAudioRecorder';
import type { AudioRecorderState, UseAudioRecorderReturn } from './useAudioRecorder';

// Re-exportar tipos e funções
export type { AudioRecorderState, UseAudioRecorderReturn };
export { formatAudioDuration };

// -----------------------------------------------------------------------------
// Adapter Principal - 100% MT
// -----------------------------------------------------------------------------

export function useAudioRecorderAdapter(): UseAudioRecorderReturn & { _mode: 'mt' } {
  const hook = useAudioRecorder();

  return {
    ...hook,
    _mode: 'mt' as const,
  };
}

export default useAudioRecorderAdapter;

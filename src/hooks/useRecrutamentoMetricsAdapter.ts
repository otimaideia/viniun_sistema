// =============================================================================
// USE RECRUTAMENTO METRICS ADAPTER - Delegação para useRecrutamentoMetricsMT
// =============================================================================
// Thin wrapper que re-exporta do hook MT real.
// Mantido para compatibilidade com imports existentes.
// Novos códigos devem importar diretamente de useRecrutamentoMetricsMT.
// =============================================================================

import { useRecrutamentoMetricsMT } from './multitenant/useRecrutamentoMetricsMT';

export function useRecrutamentoMetricsAdapter() {
  const result = useRecrutamentoMetricsMT();

  return {
    metrics: {
      ...result.metrics,
      // Backward compat: old code used "vagasPublicadas" instead of "vagasAbertas"
      vagasPublicadas: result.metrics.vagasAbertas,
      // Old code used "candidatosEntrevistaAgendada" instead of "candidatosEntrevista"
      candidatosEntrevistaAgendada: result.metrics.candidatosEntrevista,
      // Old code used "candidatosPorVaga" (number) — same name in new hook
      candidatosPorVaga: result.metrics.mediaCandidatosPorVaga,
    },
    isLoading: result.isLoading,

    // Helpers individuais (backward compat)
    totalVagas: result.metrics.totalVagas,
    vagasPublicadas: result.metrics.vagasAbertas,
    totalCandidatos: result.metrics.totalCandidatos,
    candidatosNovos: result.metrics.candidatosNovos,
    totalEntrevistas: result.metrics.totalEntrevistas,
    entrevistasHoje: result.metrics.entrevistasHoje,
    taxaAprovacao: result.metrics.taxaAprovacao,
  };
}

export default useRecrutamentoMetricsAdapter;

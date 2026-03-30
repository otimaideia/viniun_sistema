import { useMemo } from 'react';
import { useVagasMT } from './useVagasMT';
import { useCandidatosMT } from './useCandidatosMT';
import { useEntrevistasMT } from './useEntrevistasMT';
import type { RecrutamentoMetrics } from '@/types/recrutamento';

// =============================================================================
// HOOK: useRecrutamentoMetricsMT
// =============================================================================

export function useRecrutamentoMetricsMT() {
  const { vagas, isLoading: isLoadingVagas } = useVagasMT();
  const { candidatos, isLoading: isLoadingCandidatos } = useCandidatosMT();
  const { entrevistas, isLoading: isLoadingEntrevistas } = useEntrevistasMT();

  const metrics = useMemo<RecrutamentoMetrics>(() => {
    // Vagas
    const totalVagas = vagas.length;
    const vagasAbertas = vagas.filter(v => v.status === 'aberta').length;
    const vagasRascunho = vagas.filter(v => v.status === 'rascunho').length;
    const vagasPausadas = vagas.filter(v => v.status === 'pausada').length;
    const vagasEncerradas = vagas.filter(v => v.status === 'encerrada').length;

    // Candidatos
    const totalCandidatos = candidatos.length;
    const candidatosNovos = candidatos.filter(c => c.status === 'novo').length;
    const candidatosEmAnalise = candidatos.filter(c => c.status === 'em_analise').length;
    const candidatosEntrevista = candidatos.filter(c => c.status === 'entrevista').length;
    const candidatosAprovados = candidatos.filter(c => c.status === 'aprovado').length;
    const candidatosReprovados = candidatos.filter(c => c.status === 'reprovado').length;
    const candidatosDesistiu = candidatos.filter(c => c.status === 'desistiu').length;
    const candidatosContratados = candidatos.filter(c => c.status === 'contratado').length;

    // Entrevistas
    const totalEntrevistas = entrevistas.length;
    const entrevistasAgendadas = entrevistas.filter(e => e.status === 'agendada' || e.status === 'confirmada').length;
    const entrevistasRealizadas = entrevistas.filter(e => e.status === 'realizada').length;
    const entrevistasCanceladas = entrevistas.filter(e => e.status === 'cancelada').length;
    const entrevistasNoShow = entrevistas.filter(e => e.status === 'no_show').length;

    // Entrevistas hoje
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const entrevistasHoje = entrevistas.filter(e => {
      const d = new Date(e.data_entrevista);
      return d >= todayStart && d < todayEnd && (e.status === 'agendada' || e.status === 'confirmada');
    }).length;

    // Entrevistas esta semana
    const dayOfWeek = todayStart.getDay();
    const monday = new Date(todayStart);
    monday.setDate(todayStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 7);

    const entrevistasSemana = entrevistas.filter(e => {
      const d = new Date(e.data_entrevista);
      return d >= monday && d < sunday && (e.status === 'agendada' || e.status === 'confirmada');
    }).length;

    // KPIs
    const processados = candidatosAprovados + candidatosReprovados;
    const taxaAprovacao = processados > 0
      ? Math.round((candidatosAprovados / processados) * 100)
      : 0;

    const entrevistasFinalizadas = entrevistasRealizadas + entrevistasCanceladas + entrevistasNoShow;
    const taxaRealizacaoEntrevistas = entrevistasFinalizadas > 0
      ? Math.round((entrevistasRealizadas / entrevistasFinalizadas) * 100)
      : 0;

    const mediaCandidatosPorVaga = vagasAbertas > 0
      ? Math.round((totalCandidatos / vagasAbertas) * 10) / 10
      : 0;

    return {
      totalVagas,
      vagasAbertas,
      vagasRascunho,
      vagasPausadas,
      vagasEncerradas,
      totalCandidatos,
      candidatosNovos,
      candidatosEmAnalise,
      candidatosEntrevista,
      candidatosAprovados,
      candidatosReprovados,
      candidatosDesistiu,
      candidatosContratados,
      totalEntrevistas,
      entrevistasAgendadas,
      entrevistasHoje,
      entrevistasSemana,
      entrevistasRealizadas,
      entrevistasCanceladas,
      entrevistasNoShow,
      taxaAprovacao,
      taxaRealizacaoEntrevistas,
      mediaCandidatosPorVaga,
      pipeline: {
        novos: candidatosNovos,
        analise: candidatosEmAnalise,
        entrevista: candidatosEntrevista,
        aprovados: candidatosAprovados,
        reprovados: candidatosReprovados,
        contratados: candidatosContratados,
      },
    };
  }, [vagas, candidatos, entrevistas]);

  return {
    metrics,
    isLoading: isLoadingVagas || isLoadingCandidatos || isLoadingEntrevistas,
    vagas,
    candidatos,
    entrevistas,
  };
}

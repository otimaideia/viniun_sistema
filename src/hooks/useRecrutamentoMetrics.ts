import { useMemo } from "react";
import { useVagas } from "./useVagas";
import { useCandidatos } from "./useCandidatos";
import { useEntrevistas } from "./useEntrevistas";
import { 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek,
  isWithinInterval,
  parseISO
} from "date-fns";

export function useRecrutamentoMetrics() {
  const { vagas, isLoading: isLoadingVagas } = useVagas();
  const { candidatos, isLoading: isLoadingCandidatos } = useCandidatos();
  const { entrevistas, isLoading: isLoadingEntrevistas } = useEntrevistas();

  const metrics = useMemo(() => {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    // Vagas
    const vagasAtivas = vagas.filter((v) => v.status === "publicada").length;
    const vagasPausadas = vagas.filter((v) => v.status === "pausada").length;
    const vagasEncerradas = vagas.filter((v) => v.status === "encerrada").length;

    // Candidatos por status
    const candidatosNovos = candidatos.filter((c) => c.status === "novo").length;
    const candidatosEmAnalise = candidatos.filter((c) => c.status === "em_analise").length;
    const candidatosEntrevista = candidatos.filter((c) => c.status === "entrevista_agendada").length;
    const candidatosAprovados = candidatos.filter((c) => c.status === "aprovado").length;
    const candidatosReprovados = candidatos.filter((c) => c.status === "reprovado").length;

    // Entrevistas
    const entrevistasHoje = entrevistas.filter((e) => {
      const date = parseISO(e.data_entrevista);
      return isWithinInterval(date, { start: todayStart, end: todayEnd }) && 
             e.status === "agendada";
    });

    const entrevistasSemana = entrevistas.filter((e) => {
      const date = parseISO(e.data_entrevista);
      return isWithinInterval(date, { start: weekStart, end: weekEnd });
    });

    const entrevistasRealizadas = entrevistas.filter((e) => e.status === "realizada").length;
    const entrevistasCanceladas = entrevistas.filter((e) => e.status === "cancelada").length;

    // Taxas
    const totalProcessados = candidatosAprovados + candidatosReprovados;
    const taxaAprovacao = totalProcessados > 0 
      ? Math.round((candidatosAprovados / totalProcessados) * 100) 
      : 0;

    const taxaRealizacaoEntrevistas = entrevistas.length > 0
      ? Math.round((entrevistasRealizadas / entrevistas.length) * 100)
      : 0;

    // Média de candidatos por vaga ativa
    const mediaCandidatosPorVaga = vagasAtivas > 0
      ? Math.round(candidatos.length / vagasAtivas)
      : 0;

    return {
      // Vagas
      totalVagas: vagas.length,
      vagasAtivas,
      vagasPausadas,
      vagasEncerradas,

      // Candidatos
      totalCandidatos: candidatos.length,
      candidatosNovos,
      candidatosEmAnalise,
      candidatosEntrevista,
      candidatosAprovados,
      candidatosReprovados,
      aguardandoTriagem: candidatosNovos + candidatosEmAnalise,

      // Entrevistas
      totalEntrevistas: entrevistas.length,
      entrevistasHoje: entrevistasHoje.length,
      entrevistasSemana: entrevistasSemana.length,
      entrevistasRealizadas,
      entrevistasCanceladas,

      // Taxas
      taxaAprovacao,
      taxaRealizacaoEntrevistas,
      mediaCandidatosPorVaga,

      // Pipeline resumido
      pipeline: {
        novos: candidatosNovos,
        analise: candidatosEmAnalise,
        entrevista: candidatosEntrevista,
        aprovados: candidatosAprovados,
        reprovados: candidatosReprovados,
      },
    };
  }, [vagas, candidatos, entrevistas]);

  return {
    metrics,
    isLoading: isLoadingVagas || isLoadingCandidatos || isLoadingEntrevistas,
  };
}

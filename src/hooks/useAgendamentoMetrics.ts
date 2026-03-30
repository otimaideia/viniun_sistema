import { useMemo } from "react";
import { useAgendamentos } from "./useAgendamentos";
import { 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  isWithinInterval,
  parseISO,
  addDays
} from "date-fns";

export function useAgendamentoMetrics() {
  const { agendamentos, isLoading } = useAgendamentos();

  const metrics = useMemo(() => {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    const next7DaysEnd = addDays(today, 7);

    // Filtrar agendamentos por período
    const agendamentosHoje = agendamentos.filter((a) => {
      const date = parseISO(a.data_agendamento);
      return isWithinInterval(date, { start: todayStart, end: todayEnd });
    });

    const agendamentosProximos7Dias = agendamentos.filter((a) => {
      const date = parseISO(a.data_agendamento);
      return isWithinInterval(date, { start: todayStart, end: next7DaysEnd });
    });

    const agendamentosSemana = agendamentos.filter((a) => {
      const date = parseISO(a.data_agendamento);
      return isWithinInterval(date, { start: weekStart, end: weekEnd });
    });

    const agendamentosMes = agendamentos.filter((a) => {
      const date = parseISO(a.data_agendamento);
      return isWithinInterval(date, { start: monthStart, end: monthEnd });
    });

    // Contagens por status
    const countByStatus = (list: typeof agendamentos, status: string) =>
      list.filter((a) => a.status === status).length;

    // Métricas
    return {
      // Totais
      total: agendamentos.length,
      hoje: agendamentosHoje.length,
      proximos7Dias: agendamentosProximos7Dias.length,
      semana: agendamentosSemana.length,
      mes: agendamentosMes.length,

      // Por status (geral)
      agendados: countByStatus(agendamentos, "agendado"),
      confirmados: countByStatus(agendamentos, "confirmado"),
      realizados: countByStatus(agendamentos, "realizado"),
      cancelados: countByStatus(agendamentos, "cancelado"),
      naoCompareceu: countByStatus(agendamentos, "nao_compareceu"),

      // Por status (hoje)
      hojeAgendados: countByStatus(agendamentosHoje, "agendado"),
      hojeConfirmados: countByStatus(agendamentosHoje, "confirmado"),
      hojeRealizados: countByStatus(agendamentosHoje, "realizado"),

      // Taxas
      taxaRealizacao: agendamentos.length > 0 
        ? Math.round((countByStatus(agendamentos, "realizado") / agendamentos.length) * 100) 
        : 0,
      taxaComparecimento: agendamentos.length > 0
        ? Math.round(
            ((countByStatus(agendamentos, "realizado") + countByStatus(agendamentos, "confirmado")) /
              (agendamentos.length - countByStatus(agendamentos, "agendado"))) *
              100
          ) || 0
        : 0,
    };
  }, [agendamentos]);

  return {
    metrics,
    isLoading,
  };
}

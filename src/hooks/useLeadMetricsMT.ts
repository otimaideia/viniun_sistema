// =============================================================================
// USE LEAD METRICS MT - Hook Multi-Tenant para Métricas de Leads
// =============================================================================
//
// Este hook calcula métricas, taxas de conversão e dados de tendência
// para leads no sistema multi-tenant.
//
// =============================================================================

import { useMemo } from 'react';
import {
  startOfDay,
  endOfDay,
  subMonths,
  parseISO,
  isWithinInterval,
  format,
  eachDayOfInterval,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { MTLead, LeadStatus } from '@/types/lead-mt';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ConversionMetrics {
  taxaContato: number;
  taxaAgendamento: number;
  taxaComparecimento: number;
  taxaFechamento: number;
}

export interface FunnelData {
  etapa: string;
  quantidade: number;
  percentual: number;
  conversaoAnterior: number;
}

export interface TrendDataPoint {
  data: string;
  recebidos: number;
  contatados: number;
  agendados: number;
  comparecimentos: number;
  convertidos: number;
}

export interface LeadMetricsResult {
  filteredLeads: MTLead[];
  conversionMetrics: ConversionMetrics;
  funnelData: FunnelData[];
  trendData: TrendDataPoint[];
  cumulativeTrendData: TrendDataPoint[];
  totalLeads: number;
  metrics: {
    total: number;
    novos: number;
    emContato: number;
    agendados: number;
    convertidos: number;
    perdidos: number;
    taxaConversao: number;
    valorPipeline: number;
    ticketMedio: number;
  };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Mapeia status MT para estágio numérico do funil
 */
const getStatusStage = (status?: LeadStatus): number => {
  const stages: Record<LeadStatus, number> = {
    novo: 1,
    contato: 2,
    agendado: 3,
    confirmado: 4,
    atendido: 5,
    convertido: 6,
    perdido: 0,
    cancelado: 0,
    aguardando: 2,
    recontato: 2,
  };
  return status ? stages[status] : 0;
};

/**
 * Verifica se lead alcançou pelo menos determinado estágio
 */
const reachedStage = (lead: MTLead, minStage: number): boolean => {
  const stage = getStatusStage(lead.status);
  return stage >= minStage || lead.convertido === true;
};

/**
 * Filtra leads por intervalo de data
 */
const filterByDateRange = (leads: MTLead[], start: Date, end: Date): MTLead[] => {
  return leads.filter(lead => {
    try {
      const leadDate = parseISO(lead.created_at);
      return isWithinInterval(leadDate, { start, end });
    } catch {
      return false;
    }
  });
};

/**
 * Calcula taxas de conversão para um conjunto de leads
 */
const calculateRates = (leads: MTLead[]) => {
  const recebidos = leads.length;
  const contatados = leads.filter(l => reachedStage(l, 2)).length;
  const agendados = leads.filter(l => reachedStage(l, 3)).length;
  const compareceram = leads.filter(l => reachedStage(l, 5)).length;
  const convertidos = leads.filter(l => l.convertido || l.status === 'convertido').length;

  return {
    taxaContato: recebidos > 0 ? (contatados / recebidos) * 100 : 0,
    taxaAgendamento: contatados > 0 ? (agendados / contatados) * 100 : 0,
    taxaComparecimento: agendados > 0 ? (compareceram / agendados) * 100 : 0,
    taxaFechamento: compareceram > 0 ? (convertidos / compareceram) * 100 : 0,
    recebidos,
    contatados,
    agendados,
    compareceram,
    convertidos,
  };
};

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useLeadMetricsMT(
  leads: MTLead[],
  dateRange?: { start: Date; end: Date } | null
): LeadMetricsResult {
  // Filtrar por data se fornecido
  const filteredLeads = useMemo(() => {
    if (!dateRange) return leads;
    return filterByDateRange(leads, dateRange.start, dateRange.end);
  }, [leads, dateRange]);

  // Métricas de conversão
  const conversionMetrics = useMemo((): ConversionMetrics => {
    const rates = calculateRates(filteredLeads);
    return {
      taxaContato: rates.taxaContato,
      taxaAgendamento: rates.taxaAgendamento,
      taxaComparecimento: rates.taxaComparecimento,
      taxaFechamento: rates.taxaFechamento,
    };
  }, [filteredLeads]);

  // Dados do funil
  const funnelData = useMemo((): FunnelData[] => {
    const rates = calculateRates(filteredLeads);

    return [
      {
        etapa: 'Leads Recebidos',
        quantidade: rates.recebidos,
        percentual: 100,
        conversaoAnterior: 100,
      },
      {
        etapa: 'Contato Iniciado',
        quantidade: rates.contatados,
        percentual: rates.recebidos > 0 ? (rates.contatados / rates.recebidos) * 100 : 0,
        conversaoAnterior: rates.recebidos > 0 ? (rates.contatados / rates.recebidos) * 100 : 0,
      },
      {
        etapa: 'Agendamento',
        quantidade: rates.agendados,
        percentual: rates.recebidos > 0 ? (rates.agendados / rates.recebidos) * 100 : 0,
        conversaoAnterior: rates.contatados > 0 ? (rates.agendados / rates.contatados) * 100 : 0,
      },
      {
        etapa: 'Comparecimento',
        quantidade: rates.compareceram,
        percentual: rates.recebidos > 0 ? (rates.compareceram / rates.recebidos) * 100 : 0,
        conversaoAnterior: rates.agendados > 0 ? (rates.compareceram / rates.agendados) * 100 : 0,
      },
      {
        etapa: 'Cliente Convertido',
        quantidade: rates.convertidos,
        percentual: rates.recebidos > 0 ? (rates.convertidos / rates.recebidos) * 100 : 0,
        conversaoAnterior: rates.compareceram > 0 ? (rates.convertidos / rates.compareceram) * 100 : 0,
      },
    ];
  }, [filteredLeads]);

  // Dados de tendência (diários)
  const trendData = useMemo((): TrendDataPoint[] => {
    const now = new Date();
    const thirtyDaysAgo = subMonths(now, 1);

    const rangeStart = dateRange?.start || thirtyDaysAgo;
    const rangeEnd = dateRange?.end || now;

    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

      // Leads atualizados neste dia (progresso no funil)
      const dayLeadsByUpdate = leads.filter(lead => {
        try {
          const updateDate = parseISO(lead.updated_at);
          return isWithinInterval(updateDate, { start: dayStart, end: dayEnd });
        } catch {
          return false;
        }
      });

      // Leads criados neste dia
      const dayLeadsByCreation = leads.filter(lead => {
        try {
          const creationDate = parseISO(lead.created_at);
          return isWithinInterval(creationDate, { start: dayStart, end: dayEnd });
        } catch {
          return false;
        }
      });

      const ratesByUpdate = calculateRates(dayLeadsByUpdate);

      return {
        data: format(day, 'dd/MM', { locale: ptBR }),
        recebidos: dayLeadsByCreation.length,
        contatados: ratesByUpdate.contatados,
        agendados: ratesByUpdate.agendados,
        comparecimentos: ratesByUpdate.compareceram,
        convertidos: ratesByUpdate.convertidos,
      };
    });
  }, [leads, dateRange]);

  // Dados acumulados
  const cumulativeTrendData = useMemo((): TrendDataPoint[] => {
    let cumRecebidos = 0;
    let cumContatados = 0;
    let cumAgendados = 0;
    let cumComparecimentos = 0;
    let cumConvertidos = 0;

    return trendData.map(point => {
      cumRecebidos += point.recebidos;
      cumContatados += point.contatados;
      cumAgendados += point.agendados;
      cumComparecimentos += point.comparecimentos;
      cumConvertidos += point.convertidos;

      return {
        data: point.data,
        recebidos: cumRecebidos,
        contatados: cumContatados,
        agendados: cumAgendados,
        comparecimentos: cumComparecimentos,
        convertidos: cumConvertidos,
      };
    });
  }, [trendData]);

  // Métricas gerais
  const metrics = useMemo(() => {
    const total = filteredLeads.length;
    const novos = filteredLeads.filter(l => l.status === 'novo').length;
    const emContato = filteredLeads.filter(l => ['contato', 'aguardando', 'recontato'].includes(l.status || '')).length;
    const agendados = filteredLeads.filter(l => ['agendado', 'confirmado'].includes(l.status || '')).length;
    const convertidos = filteredLeads.filter(l => l.convertido || l.status === 'convertido').length;
    const perdidos = filteredLeads.filter(l => ['perdido', 'cancelado'].includes(l.status || '')).length;

    const taxaConversao = total > 0 ? (convertidos / total) * 100 : 0;

    const valorPipeline = filteredLeads.reduce((acc, l) => {
      return acc + (l.valor_estimado || 0);
    }, 0);

    const valorConvertidos = filteredLeads
      .filter(l => l.convertido)
      .reduce((acc, l) => acc + (l.valor_conversao || l.valor_estimado || 0), 0);

    const ticketMedio = convertidos > 0 ? valorConvertidos / convertidos : 0;

    return {
      total,
      novos,
      emContato,
      agendados,
      convertidos,
      perdidos,
      taxaConversao: Math.round(taxaConversao * 100) / 100,
      valorPipeline,
      ticketMedio,
    };
  }, [filteredLeads]);

  return {
    filteredLeads,
    conversionMetrics,
    funnelData,
    trendData,
    cumulativeTrendData,
    totalLeads: filteredLeads.length,
    metrics,
  };
}

// -----------------------------------------------------------------------------
// Hook: Métricas por Origem
// -----------------------------------------------------------------------------

export function useLeadMetricsByOrigemMT(leads: MTLead[]) {
  return useMemo(() => {
    const origemMap: Record<string, {
      total: number;
      convertidos: number;
      valorTotal: number;
      taxaConversao: number;
    }> = {};

    leads.forEach(lead => {
      const origem = lead.origem || 'Não informado';

      if (!origemMap[origem]) {
        origemMap[origem] = {
          total: 0,
          convertidos: 0,
          valorTotal: 0,
          taxaConversao: 0,
        };
      }

      origemMap[origem].total++;

      if (lead.convertido || lead.status === 'convertido') {
        origemMap[origem].convertidos++;
        origemMap[origem].valorTotal += lead.valor_conversao || lead.valor_estimado || 0;
      }
    });

    // Calcular taxa de conversão
    Object.keys(origemMap).forEach(origem => {
      const data = origemMap[origem];
      data.taxaConversao = data.total > 0 ? (data.convertidos / data.total) * 100 : 0;
    });

    return origemMap;
  }, [leads]);
}

// -----------------------------------------------------------------------------
// Hook: Métricas por Responsável
// -----------------------------------------------------------------------------

export function useLeadMetricsByResponsavelMT(leads: MTLead[]) {
  return useMemo(() => {
    const responsavelMap: Record<string, {
      nome: string;
      total: number;
      convertidos: number;
      valorTotal: number;
      taxaConversao: number;
    }> = {};

    leads.forEach(lead => {
      const responsavelId = lead.atribuido_para || 'sem_atribuicao';
      const responsavelNome = lead.responsavel?.nome || 'Sem atribuição';

      if (!responsavelMap[responsavelId]) {
        responsavelMap[responsavelId] = {
          nome: responsavelNome,
          total: 0,
          convertidos: 0,
          valorTotal: 0,
          taxaConversao: 0,
        };
      }

      responsavelMap[responsavelId].total++;

      if (lead.convertido || lead.status === 'convertido') {
        responsavelMap[responsavelId].convertidos++;
        responsavelMap[responsavelId].valorTotal += lead.valor_conversao || lead.valor_estimado || 0;
      }
    });

    // Calcular taxa de conversão
    Object.keys(responsavelMap).forEach(id => {
      const data = responsavelMap[id];
      data.taxaConversao = data.total > 0 ? (data.convertidos / data.total) * 100 : 0;
    });

    return responsavelMap;
  }, [leads]);
}

// -----------------------------------------------------------------------------
// Hook: Métricas por Período (Comparativo)
// -----------------------------------------------------------------------------

export function useLeadMetricsComparisonMT(
  leads: MTLead[],
  currentPeriod: { start: Date; end: Date },
  previousPeriod: { start: Date; end: Date }
) {
  return useMemo(() => {
    const currentLeads = filterByDateRange(leads, currentPeriod.start, currentPeriod.end);
    const previousLeads = filterByDateRange(leads, previousPeriod.start, previousPeriod.end);

    const currentRates = calculateRates(currentLeads);
    const previousRates = calculateRates(previousLeads);

    const calcVariation = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      current: {
        total: currentLeads.length,
        convertidos: currentRates.convertidos,
        taxaConversao: currentLeads.length > 0 ? (currentRates.convertidos / currentLeads.length) * 100 : 0,
      },
      previous: {
        total: previousLeads.length,
        convertidos: previousRates.convertidos,
        taxaConversao: previousLeads.length > 0 ? (previousRates.convertidos / previousLeads.length) * 100 : 0,
      },
      variation: {
        total: calcVariation(currentLeads.length, previousLeads.length),
        convertidos: calcVariation(currentRates.convertidos, previousRates.convertidos),
      },
    };
  }, [leads, currentPeriod, previousPeriod]);
}

export default useLeadMetricsMT;

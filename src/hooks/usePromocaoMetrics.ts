import { useMemo } from "react";
import { PromocaoCadastro, PromocaoIndicacao } from "@/types/promocao";
import { Franqueado } from "@/types/franqueado";
import { isWithinInterval, parseISO, format, eachDayOfInterval, startOfDay, endOfDay, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FunnelData {
  etapa: string;
  quantidade: number;
  percentual: number;
  conversaoAnterior: number;
}

interface TrendDataPoint {
  data: string;
  cadastros: number;
  indicacoes: number;
}

export function usePromocaoMetrics(
  cadastros: PromocaoCadastro[],
  indicacoes: PromocaoIndicacao[],
  dateRange?: { start: Date; end: Date } | null,
  unidadeFilter?: string,
  franqueados?: Franqueado[]
) {
  const filteredCadastros = useMemo(() => {
    let filtered = cadastros;
    
    if (unidadeFilter && unidadeFilter !== "all") {
      filtered = filtered.filter(c => c.unidade === unidadeFilter);
    }
    
    if (dateRange) {
      filtered = filtered.filter(c => {
        try {
          const date = parseISO(c.created_at);
          return isWithinInterval(date, { start: dateRange.start, end: dateRange.end });
        } catch {
          return false;
        }
      });
    }
    
    return filtered;
  }, [cadastros, dateRange, unidadeFilter]);

  const filteredIndicacoes = useMemo(() => {
    const filteredCadastroIds = new Set(filteredCadastros.map(c => c.id));
    
    let filtered = indicacoes.filter(i => filteredCadastroIds.has(i.cadastro_id));
    
    if (dateRange) {
      filtered = filtered.filter(i => {
        try {
          const date = parseISO(i.created_at);
          return isWithinInterval(date, { start: dateRange.start, end: dateRange.end });
        } catch {
          return false;
        }
      });
    }
    
    return filtered;
  }, [indicacoes, filteredCadastros, dateRange]);

  const funnelData = useMemo((): FunnelData[] => {
    const totalCadastros = filteredCadastros.length;
    const totalIndicacoes = filteredIndicacoes.length;
    const cadastrosComIndicacao = filteredCadastros.filter(c => (c.quantidade_indicacoes || 0) > 0).length;
    const aceitaContato = filteredCadastros.filter(c => c.aceita_contato).length;
    const maxIndicacoesPossiveis = totalCadastros * 5; // 100% = total cadastros x 5
    
    return [
      { 
        etapa: "Total Cadastros", 
        quantidade: totalCadastros, 
        percentual: 100,
        conversaoAnterior: 100
      },
      { 
        etapa: "Aceita Contato", 
        quantidade: aceitaContato, 
        percentual: totalCadastros > 0 ? (aceitaContato / totalCadastros) * 100 : 0,
        conversaoAnterior: totalCadastros > 0 ? (aceitaContato / totalCadastros) * 100 : 0
      },
      { 
        etapa: "Indicaram Amigos", 
        quantidade: cadastrosComIndicacao, 
        percentual: totalCadastros > 0 ? (cadastrosComIndicacao / totalCadastros) * 100 : 0,
        conversaoAnterior: aceitaContato > 0 ? (cadastrosComIndicacao / aceitaContato) * 100 : 0
      },
      { 
        etapa: "Total Indicações", 
        quantidade: totalIndicacoes, 
        percentual: maxIndicacoesPossiveis > 0 ? (totalIndicacoes / maxIndicacoesPossiveis) * 100 : 0,
        conversaoAnterior: cadastrosComIndicacao > 0 ? (totalIndicacoes / cadastrosComIndicacao) * 100 : 0
      },
    ];
  }, [filteredCadastros, filteredIndicacoes]);

  const trendData = useMemo((): TrendDataPoint[] => {
    const now = new Date();
    const thirtyDaysAgo = subMonths(now, 1);
    
    const rangeStart = dateRange?.start || thirtyDaysAgo;
    const rangeEnd = dateRange?.end || now;
    
    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      
      const dayCadastros = filteredCadastros.filter(c => {
        try {
          const date = parseISO(c.created_at);
          return isWithinInterval(date, { start: dayStart, end: dayEnd });
        } catch {
          return false;
        }
      }).length;
      
      const dayIndicacoes = filteredIndicacoes.filter(i => {
        try {
          const date = parseISO(i.created_at);
          return isWithinInterval(date, { start: dayStart, end: dayEnd });
        } catch {
          return false;
        }
      }).length;
      
      return {
        data: format(day, "dd/MM", { locale: ptBR }),
        cadastros: dayCadastros,
        indicacoes: dayIndicacoes,
      };
    });
  }, [filteredCadastros, filteredIndicacoes, dateRange]);

  const cumulativeTrendData = useMemo(() => {
    let cumCadastros = 0;
    let cumIndicacoes = 0;

    return trendData.map(point => {
      cumCadastros += point.cadastros;
      cumIndicacoes += point.indicacoes;

      return {
        data: point.data,
        cadastros: cumCadastros,
        indicacoes: cumIndicacoes,
      };
    });
  }, [trendData]);

  const unidades = useMemo(() => 
    (franqueados || []).map(f => f.nome_fantasia).filter(Boolean).sort() as string[],
    [franqueados]
  );

  return {
    filteredCadastros,
    filteredIndicacoes,
    funnelData,
    trendData,
    cumulativeTrendData,
    unidades,
    totalCadastros: filteredCadastros.length,
    totalIndicacoes: filteredIndicacoes.length,
  };
}

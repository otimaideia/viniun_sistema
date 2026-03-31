import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeObjectForJSON } from '@/utils/unicodeSanitizer';
import type { FunilEtapa } from '@/types/funil';

// ============================================
// Tipos para métricas
// ============================================
export interface EtapaMetrics {
  etapa_id: string;
  etapa_nome: string;
  etapa_cor: string;
  etapa_tipo: 'ativa' | 'ganho' | 'perda';
  total_leads: number;
  valor_total: number;
  tempo_medio_dias: number;
  leads_esfriando: number;
}

export interface ConversaoMetrics {
  etapa_origem_id: string;
  etapa_origem_nome: string;
  etapa_destino_id: string;
  etapa_destino_nome: string;
  total_movimentos: number;
  percentual: number;
}

export interface FunilOverview {
  total_leads: number;
  total_valor: number;
  leads_ganhos: number;
  leads_perdidos: number;
  taxa_conversao: number;
  tempo_medio_fechamento: number;
  leads_novos_periodo: number;
  valor_ganho_periodo: number;
}

export interface ResponsavelMetrics {
  responsavel_id: string;
  responsavel_nome: string;
  total_leads: number;
  valor_total: number;
  leads_ganhos: number;
  taxa_conversao: number;
}

// ============================================
// Hook: useFunilMetrics
// Métricas gerais do funil
// ============================================
export function useFunilMetrics(funilId: string | undefined, periodo?: { inicio: Date; fim: Date }) {
  const { data: metrics, isLoading, error, refetch } = useQuery({
    queryKey: ['funil-metrics', funilId, periodo?.inicio?.toISOString(), periodo?.fim?.toISOString()],
    queryFn: async () => {
      if (!funilId) return null;

      // Buscar todos os leads do funil com suas etapas
      const { data: leads, error: leadsError } = await supabase
        .from('mt_funnel_leads')
        .select(`
          *,
          etapa:mt_funnel_stages(id, nome, cor, tipo, meta_dias),
          responsavel:mt_users(id, full_name)
        `)
        .eq('funil_id', funilId);

      if (leadsError) throw leadsError;

      // Buscar etapas do funil
      const { data: etapas, error: etapasError } = await supabase
        .from('mt_funnel_stages')
        .select('*')
        .eq('funil_id', funilId)
        .order('ordem');

      if (etapasError) throw etapasError;

      // Buscar histórico para análise de conversão (mt_funnel_stage_history)
      const { data: historico, error: historicoError } = await supabase
        .from('mt_funnel_stage_history')
        .select('*')
        .eq('funnel_id', funilId)
        .not('next_stage_id', 'is', null)
        .order('created_at', { ascending: false });

      if (historicoError) throw historicoError;

      // Sanitizar dados para remover surrogates inválidos
      const sanitizedLeads = (leads || []).map((l: any) => sanitizeObjectForJSON(l));
      const sanitizedEtapas = (etapas || []).map((e: any) => sanitizeObjectForJSON(e));

      // Histórico já filtrado pelo funil via query
      const historicoFunil = (historico || []).map((h: any) => sanitizeObjectForJSON(h));

      // Calcular métricas por etapa
      const etapasMetrics: EtapaMetrics[] = sanitizedEtapas.map((etapa: any) => {
        const leadsNaEtapa = sanitizedLeads.filter((l: any) => l.etapa_id === etapa.id);
        const now = new Date();

        // Calcular tempo médio na etapa
        const temposMedios = leadsNaEtapa
          .filter((l) => l.data_etapa)
          .map((l) => {
            const dataEtapa = new Date(l.data_etapa);
            return Math.floor((now.getTime() - dataEtapa.getTime()) / (1000 * 60 * 60 * 24));
          });

        const tempoMedio = temposMedios.length > 0
          ? temposMedios.reduce((a, b) => a + b, 0) / temposMedios.length
          : 0;

        // Contar leads esfriando (acima da meta)
        const leadsEsfriando = leadsNaEtapa.filter((l) => {
          if (!etapa.meta_dias || !l.data_etapa) return false;
          const dataEtapa = new Date(l.data_etapa);
          const diasNaEtapa = Math.floor(
            (now.getTime() - dataEtapa.getTime()) / (1000 * 60 * 60 * 24)
          );
          return diasNaEtapa > etapa.meta_dias;
        }).length;

        return {
          etapa_id: etapa.id,
          etapa_nome: etapa.nome,
          etapa_cor: etapa.cor,
          etapa_tipo: etapa.tipo as 'ativa' | 'ganho' | 'perda',
          total_leads: leadsNaEtapa.length,
          valor_total: leadsNaEtapa.reduce((acc, l) => acc + (l.valor_estimado || 0), 0),
          tempo_medio_dias: Math.round(tempoMedio * 10) / 10,
          leads_esfriando: leadsEsfriando,
        };
      });

      // Calcular conversão entre etapas (stage_id = origem, next_stage_id = destino)
      const conversaoMap = new Map<string, number>();
      historicoFunil.forEach((h: any) => {
        if (h.stage_id && h.next_stage_id) {
          const key = `${h.stage_id}->${h.next_stage_id}`;
          conversaoMap.set(key, (conversaoMap.get(key) || 0) + 1);
        }
      });

      const conversaoMetrics: ConversaoMetrics[] = [];
      conversaoMap.forEach((total, key) => {
        const [origemId, destinoId] = key.split('->');
        const origem = sanitizedEtapas.find((e: any) => e.id === origemId);
        const destino = sanitizedEtapas.find((e: any) => e.id === destinoId);

        if (origem && destino) {
          const totalOrigem = historicoFunil.filter(
            (h: any) => h.stage_id === origemId
          ).length;

          conversaoMetrics.push({
            etapa_origem_id: origemId,
            etapa_origem_nome: origem.nome,
            etapa_destino_id: destinoId,
            etapa_destino_nome: destino.nome,
            total_movimentos: total,
            percentual: totalOrigem > 0 ? Math.round((total / totalOrigem) * 100) : 0,
          });
        }
      });

      // Métricas por responsável
      const responsavelMap = new Map<string, {
        id: string;
        nome: string;
        leads: any[];
      }>();

      sanitizedLeads.forEach((lead: any) => {
        const resp = lead.responsavel as { id: string; full_name: string } | null;
        if (resp) {
          if (!responsavelMap.has(resp.id)) {
            responsavelMap.set(resp.id, { id: resp.id, nome: resp.full_name, leads: [] });
          }
          responsavelMap.get(resp.id)!.leads.push(lead);
        }
      });

      const responsavelMetrics: ResponsavelMetrics[] = [];
      responsavelMap.forEach((data) => {
        const etapasGanho = sanitizedEtapas.filter((e: any) => e.tipo === 'ganho').map((e: any) => e.id);
        const leadsGanhos = data.leads.filter((l) => etapasGanho.includes(l.etapa_id));

        responsavelMetrics.push({
          responsavel_id: data.id,
          responsavel_nome: data.nome,
          total_leads: data.leads.length,
          valor_total: data.leads.reduce((acc, l) => acc + (l.valor_estimado || 0), 0),
          leads_ganhos: leadsGanhos.length,
          taxa_conversao: data.leads.length > 0
            ? Math.round((leadsGanhos.length / data.leads.length) * 100)
            : 0,
        });
      });

      // Overview geral
      const etapasGanho = sanitizedEtapas.filter((e: any) => e.tipo === 'ganho').map((e: any) => e.id);
      const etapasPerda = sanitizedEtapas.filter((e: any) => e.tipo === 'perda').map((e: any) => e.id);

      const leadsGanhos = sanitizedLeads.filter((l: any) => etapasGanho.includes(l.etapa_id));
      const leadsPerdidos = sanitizedLeads.filter((l: any) => etapasPerda.includes(l.etapa_id));

      // Leads novos no período (últimos 30 dias por padrão)
      const dataInicio = periodo?.inicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const dataFim = periodo?.fim || new Date();

      const leadsNovosPeriodo = sanitizedLeads.filter((l: any) => {
        const dataEntrada = new Date(l.data_entrada);
        return dataEntrada >= dataInicio && dataEntrada <= dataFim;
      });

      const overview: FunilOverview = {
        total_leads: sanitizedLeads.length,
        total_valor: sanitizedLeads.reduce((acc: number, l: any) => acc + (l.valor_estimado || 0), 0),
        leads_ganhos: leadsGanhos.length,
        leads_perdidos: leadsPerdidos.length,
        taxa_conversao: sanitizedLeads.length > 0
          ? Math.round((leadsGanhos.length / sanitizedLeads.length) * 100)
          : 0,
        tempo_medio_fechamento: 0, // Requires lead stage change history tracking to calculate average days to close
        leads_novos_periodo: leadsNovosPeriodo.length,
        valor_ganho_periodo: leadsGanhos.reduce((acc, l) => acc + (l.valor_estimado || 0), 0),
      };

      return {
        overview,
        etapasMetrics,
        conversaoMetrics,
        responsavelMetrics,
      };
    },
    enabled: !!funilId,
    staleTime: 30000, // 30 segundos
  });

  return {
    overview: metrics?.overview || null,
    etapasMetrics: metrics?.etapasMetrics || [],
    conversaoMetrics: metrics?.conversaoMetrics || [],
    responsavelMetrics: metrics?.responsavelMetrics || [],
    isLoading,
    error,
    refetch,
  };
}

// ============================================
// Hook: useFunilChartData
// Dados formatados para gráficos
// ============================================
export function useFunilChartData(funilId: string | undefined) {
  const { etapasMetrics, isLoading, error } = useFunilMetrics(funilId);

  // Dados para gráfico de funil (excluindo etapas finais)
  const funnelData = etapasMetrics
    .filter((e) => e.etapa_tipo === 'ativa')
    .map((e, index, arr) => {
      // Calcular percentual relativo ao primeiro estágio
      const maxLeads = arr[0]?.total_leads || 1;
      return {
        name: e.etapa_nome,
        value: e.total_leads,
        fill: e.etapa_cor,
        percentage: Math.round((e.total_leads / maxLeads) * 100),
      };
    });

  // Dados para gráfico de valor por etapa
  const valorData = etapasMetrics.map((e) => ({
    name: e.etapa_nome,
    valor: e.valor_total,
    leads: e.total_leads,
    fill: e.etapa_cor,
  }));

  // Dados para gráfico de tempo médio
  const tempoData = etapasMetrics
    .filter((e) => e.etapa_tipo === 'ativa')
    .map((e) => ({
      name: e.etapa_nome,
      dias: e.tempo_medio_dias,
      fill: e.etapa_cor,
    }));

  return {
    funnelData,
    valorData,
    tempoData,
    isLoading,
    error,
  };
}

// ============================================
// Hook: useLeadHistory
// Histórico completo de um lead
// ============================================
export function useLeadHistory(funilLeadId: string | undefined) {
  const { data: history = [], isLoading, error } = useQuery({
    queryKey: ['funil-lead-history', funilLeadId],
    queryFn: async () => {
      if (!funilLeadId) return [];

      const { data, error } = await supabase
        .from('mt_funnel_stage_history')
        .select(`
          *,
          stage:mt_funnel_stages!stage_id(id, nome, cor),
          next_stage:mt_funnel_stages!next_stage_id(id, nome, cor),
          mover:mt_users!moved_by(id, nome)
        `)
        .eq('funnel_lead_id', funilLeadId)
        .order('entered_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((item: any) => sanitizeObjectForJSON(item));
    },
    enabled: !!funilLeadId,
  });

  return { history, isLoading, error };
}

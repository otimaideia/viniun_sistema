import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';

// =============================================================================
// HOOKS MT PARA MÉTRICAS DE FUNIL
// Usam tabelas mt_funnel_leads, mt_funnel_stages com isolamento por tenant
// =============================================================================

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

const QUERY_KEY = 'mt-funnel-metrics';

/**
 * Hook MT para métricas gerais do funil
 */
export function useFunilMetricsAdapter(
  funilId: string | undefined,
  periodo?: { inicio: Date; fim: Date }
) {
  const { tenant, isLoading: isTenantLoading } = useTenantContext();

  const { data: metrics, isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEY, funilId, tenant?.id, periodo?.inicio?.toISOString(), periodo?.fim?.toISOString()],
    queryFn: async () => {
      if (!funilId) return null;

      // Buscar leads do funil com etapas
      const { data: leads, error: leadsError } = await supabase
        .from('mt_funnel_leads')
        .select(`
          *,
          etapa:mt_funnel_stages(id, nome, cor, tipo, meta_dias),
          responsavel:mt_users(id, nome, email)
        `)
        .eq('funnel_id', funilId)
        .is('deleted_at', null);

      if (leadsError) throw leadsError;

      // Buscar etapas do funil
      const { data: etapas, error: etapasError } = await supabase
        .from('mt_funnel_stages')
        .select('*')
        .eq('funnel_id', funilId)
        .is('deleted_at', null)
        .order('ordem');

      if (etapasError) throw etapasError;

      // Calcular métricas por etapa
      const etapasMetrics: EtapaMetrics[] = (etapas || []).map((etapa) => {
        const leadsNaEtapa = (leads || []).filter((l) => l.stage_id === etapa.id);
        const now = new Date();

        // Calcular tempo médio na etapa
        const temposMedios = leadsNaEtapa
          .filter((l) => l.stage_entered_at)
          .map((l) => {
            const dataEtapa = new Date(l.stage_entered_at);
            return Math.floor((now.getTime() - dataEtapa.getTime()) / (1000 * 60 * 60 * 24));
          });

        const tempoMedio = temposMedios.length > 0
          ? temposMedios.reduce((a, b) => a + b, 0) / temposMedios.length
          : 0;

        // Contar leads esfriando (acima da meta)
        const leadsEsfriando = leadsNaEtapa.filter((l) => {
          if (!etapa.meta_dias || !l.stage_entered_at) return false;
          const dataEtapa = new Date(l.stage_entered_at);
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
          valor_total: leadsNaEtapa.reduce((acc, l) => acc + (l.estimated_value || 0), 0),
          tempo_medio_dias: Math.round(tempoMedio * 10) / 10,
          leads_esfriando: leadsEsfriando,
        };
      });

      // Métricas por responsável
      const responsavelMap = new Map<string, {
        id: string;
        nome: string;
        leads: typeof leads;
      }>();

      (leads || []).forEach((lead) => {
        const resp = lead.responsavel as { id: string; nome: string } | null;
        if (resp) {
          if (!responsavelMap.has(resp.id)) {
            responsavelMap.set(resp.id, { id: resp.id, nome: resp.nome, leads: [] });
          }
          responsavelMap.get(resp.id)!.leads.push(lead);
        }
      });

      const responsavelMetrics: ResponsavelMetrics[] = [];
      responsavelMap.forEach((data) => {
        const etapasGanho = (etapas || []).filter((e) => e.tipo === 'ganho').map((e) => e.id);
        const leadsGanhos = data.leads.filter((l) => etapasGanho.includes(l.stage_id));

        responsavelMetrics.push({
          responsavel_id: data.id,
          responsavel_nome: data.nome,
          total_leads: data.leads.length,
          valor_total: data.leads.reduce((acc, l) => acc + (l.estimated_value || 0), 0),
          leads_ganhos: leadsGanhos.length,
          taxa_conversao: data.leads.length > 0
            ? Math.round((leadsGanhos.length / data.leads.length) * 100)
            : 0,
        });
      });

      // Overview geral
      const etapasGanho = (etapas || []).filter((e) => e.tipo === 'ganho').map((e) => e.id);
      const etapasPerda = (etapas || []).filter((e) => e.tipo === 'perda').map((e) => e.id);

      const leadsGanhos = (leads || []).filter((l) => etapasGanho.includes(l.stage_id));
      const leadsPerdidos = (leads || []).filter((l) => etapasPerda.includes(l.stage_id));

      // Leads novos no período
      const dataInicio = periodo?.inicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const dataFim = periodo?.fim || new Date();

      const leadsNovosPeriodo = (leads || []).filter((l) => {
        const dataEntrada = new Date(l.created_at);
        return dataEntrada >= dataInicio && dataEntrada <= dataFim;
      });

      const overview: FunilOverview = {
        total_leads: (leads || []).length,
        total_valor: (leads || []).reduce((acc, l) => acc + (l.estimated_value || 0), 0),
        leads_ganhos: leadsGanhos.length,
        leads_perdidos: leadsPerdidos.length,
        taxa_conversao: (leads || []).length > 0
          ? Math.round((leadsGanhos.length / (leads || []).length) * 100)
          : 0,
        tempo_medio_fechamento: 0,
        leads_novos_periodo: leadsNovosPeriodo.length,
        valor_ganho_periodo: leadsGanhos.reduce((acc, l) => acc + (l.estimated_value || 0), 0),
      };

      return {
        overview,
        etapasMetrics,
        conversaoMetrics: [] as ConversaoMetrics[], // Requires MT stage change history for conversion metrics
        responsavelMetrics,
      };
    },
    enabled: !!funilId && !isTenantLoading,
    staleTime: 30000,
  });

  return {
    overview: metrics?.overview || null,
    etapasMetrics: metrics?.etapasMetrics || [],
    conversaoMetrics: metrics?.conversaoMetrics || [],
    responsavelMetrics: metrics?.responsavelMetrics || [],
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,
    _mode: 'mt' as const,
  };
}

/**
 * Hook MT para dados formatados para gráficos
 */
export function useFunilChartDataAdapter(funilId: string | undefined) {
  const { etapasMetrics, isLoading, error } = useFunilMetricsAdapter(funilId);

  // Dados para gráfico de funil (excluindo etapas finais)
  const funnelData = etapasMetrics
    .filter((e) => e.etapa_tipo === 'ativa')
    .map((e, index, arr) => {
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
    _mode: 'mt' as const,
  };
}

/**
 * Hook MT para histórico de um lead no funil
 */
export function useLeadHistoryAdapter(funilLeadId: string | undefined) {
  const { isLoading: isTenantLoading } = useTenantContext();

  const { data: history = [], isLoading, error } = useQuery({
    queryKey: ['mt-funnel-lead-history', funilLeadId],
    queryFn: async () => {
      if (!funilLeadId) return [];

      // Buscar atividades do lead relacionadas ao funil
      const { data, error } = await supabase
        .from('mt_lead_activities')
        .select('*')
        .eq('lead_id', funilLeadId)
        .in('tipo', ['funil_entrada', 'funil_movimentacao', 'funil_saida'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!funilLeadId && !isTenantLoading,
  });

  return { history, isLoading: isLoading || isTenantLoading, error, _mode: 'mt' as const };
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';

// =============================================================================
// HOOKS MT PARA MÉTRICAS DE LEADS
// Usam tabelas mt_leads com isolamento por tenant
// =============================================================================

const QUERY_KEY = 'mt-lead-metrics';

export interface LeadMetrics {
  total: number;
  novos: number;
  em_contato: number;
  agendados: number;
  convertidos: number;
  perdidos: number;
  taxa_conversao: number;
  valor_pipeline: number;
  leads_por_origem: Record<string, number>;
  leads_por_status: Record<string, number>;
  leads_por_responsavel: Array<{
    responsavel_id: string;
    responsavel_nome: string;
    total: number;
    convertidos: number;
    taxa_conversao: number;
  }>;
  tendencia: {
    leads_hoje: number;
    leads_semana: number;
    leads_mes: number;
    crescimento_percentual: number;
  };
}

/**
 * Hook MT para métricas de leads
 */
export function useLeadMetricsAdapter(franchiseId?: string) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const effectiveFranchiseId = franchiseId || franchise?.id;

  const { data: metrics, isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, effectiveFranchiseId, accessLevel],
    queryFn: async () => {
      // Buscar todos os leads para calcular métricas
      let query = supabase
        .from('mt_leads')
        .select(`
          id,
          status,
          origem,
          valor_estimado,
          responsavel_id,
          franchise_id,
          created_at,
          updated_at,
          responsavel:mt_users!responsavel_id(id, nome)
        `)
        .is('deleted_at', null);

      // Filtrar por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && effectiveFranchiseId) {
        query = query.eq('franchise_id', effectiveFranchiseId);
      } else if (accessLevel !== 'platform' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      }

      // Filtrar por franquia se especificado
      if (effectiveFranchiseId && accessLevel !== 'franchise') {
        query = query.eq('franchise_id', effectiveFranchiseId);
      }

      const { data: leads, error } = await query;

      if (error) throw error;

      const leadsList = leads || [];
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Contadores por status
      const statusCounts: Record<string, number> = {};
      const origemCounts: Record<string, number> = {};
      const responsavelMap = new Map<string, {
        id: string;
        nome: string;
        total: number;
        convertidos: number;
      }>();

      let valorPipeline = 0;
      let novos = 0;
      let emContato = 0;
      let agendados = 0;
      let convertidos = 0;
      let perdidos = 0;
      let leadsHoje = 0;
      let leadsSemana = 0;
      let leadsMes = 0;
      let leadsMesAnterior = 0;

      for (const lead of leadsList) {
        const status = lead.status || 'novo';
        const origem = lead.origem || 'site';
        const createdAt = new Date(lead.created_at);

        // Contar por status
        statusCounts[status] = (statusCounts[status] || 0) + 1;

        // Contar por origem
        origemCounts[origem] = (origemCounts[origem] || 0) + 1;

        // Contadores de status específicos
        if (status === 'novo') novos++;
        else if (status === 'em_contato' || status === 'contatado') emContato++;
        else if (status === 'agendado') agendados++;
        else if (status === 'convertido' || status === 'ganho') convertidos++;
        else if (status === 'perdido' || status === 'descartado') perdidos++;

        // Valor do pipeline (leads ativos)
        if (!['perdido', 'descartado', 'convertido', 'ganho'].includes(status)) {
          valorPipeline += lead.valor_estimado || 0;
        }

        // Contar por período
        if (createdAt >= todayStart) leadsHoje++;
        if (createdAt >= weekAgo) leadsSemana++;
        if (createdAt >= monthAgo) leadsMes++;
        if (createdAt >= twoMonthsAgo && createdAt < monthAgo) leadsMesAnterior++;

        // Agrupar por responsável
        if (lead.responsavel_id) {
          const resp = lead.responsavel as { id: string; nome: string } | null;
          const respId = lead.responsavel_id;
          const respNome = resp?.nome || 'Não identificado';

          if (!responsavelMap.has(respId)) {
            responsavelMap.set(respId, {
              id: respId,
              nome: respNome,
              total: 0,
              convertidos: 0,
            });
          }

          const respData = responsavelMap.get(respId)!;
          respData.total++;
          if (status === 'convertido' || status === 'ganho') {
            respData.convertidos++;
          }
        }
      }

      // Calcular taxa de conversão
      const totalAtivos = leadsList.length - perdidos;
      const taxaConversao = totalAtivos > 0
        ? Math.round((convertidos / totalAtivos) * 100 * 10) / 10
        : 0;

      // Calcular crescimento
      const crescimentoPercentual = leadsMesAnterior > 0
        ? Math.round(((leadsMes - leadsMesAnterior) / leadsMesAnterior) * 100 * 10) / 10
        : leadsMes > 0 ? 100 : 0;

      // Métricas por responsável
      const leadsPorResponsavel = Array.from(responsavelMap.values()).map(r => ({
        responsavel_id: r.id,
        responsavel_nome: r.nome,
        total: r.total,
        convertidos: r.convertidos,
        taxa_conversao: r.total > 0
          ? Math.round((r.convertidos / r.total) * 100 * 10) / 10
          : 0,
      })).sort((a, b) => b.total - a.total);

      const result: LeadMetrics = {
        total: leadsList.length,
        novos,
        em_contato: emContato,
        agendados,
        convertidos,
        perdidos,
        taxa_conversao: taxaConversao,
        valor_pipeline: valorPipeline,
        leads_por_origem: origemCounts,
        leads_por_status: statusCounts,
        leads_por_responsavel: leadsPorResponsavel,
        tendencia: {
          leads_hoje: leadsHoje,
          leads_semana: leadsSemana,
          leads_mes: leadsMes,
          crescimento_percentual: crescimentoPercentual,
        },
      };

      return result;
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 60000, // Cache por 1 minuto
  });

  return {
    data: metrics || {
      total: 0,
      novos: 0,
      em_contato: 0,
      agendados: 0,
      convertidos: 0,
      perdidos: 0,
      taxa_conversao: 0,
      valor_pipeline: 0,
      leads_por_origem: {},
      leads_por_status: {},
      leads_por_responsavel: [],
      tendencia: {
        leads_hoje: 0,
        leads_semana: 0,
        leads_mes: 0,
        crescimento_percentual: 0,
      },
    },
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,
    _mode: 'mt' as const,
  };
}

/**
 * Hook MT para métricas de leads por origem
 */
export function useLeadMetricsByOrigemAdapter(franchiseId?: string) {
  const { data, isLoading, error, refetch } = useLeadMetricsAdapter(franchiseId);

  return {
    data: data.leads_por_origem,
    isLoading,
    error,
    refetch,
    _mode: 'mt' as const,
  };
}

/**
 * Hook MT para métricas de leads por responsável
 */
export function useLeadMetricsByResponsavelAdapter(franchiseId?: string) {
  const { data, isLoading, error, refetch } = useLeadMetricsAdapter(franchiseId);

  return {
    data: data.leads_por_responsavel,
    isLoading,
    error,
    refetch,
    _mode: 'mt' as const,
  };
}

/**
 * Hook MT para tendência de leads
 */
export function useLeadTendenciaAdapter(franchiseId?: string) {
  const { data, isLoading, error, refetch } = useLeadMetricsAdapter(franchiseId);

  return {
    data: data.tendencia,
    isLoading,
    error,
    refetch,
    _mode: 'mt' as const,
  };
}

export default useLeadMetricsAdapter;

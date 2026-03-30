import { useQuery } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import type {
  MTDashboardBoardWidget,
  WidgetData,
  WidgetQueryConfig,
} from '@/types/dashboard';
import { ALLOWED_DATA_SOURCES } from '@/types/dashboard';

// =============================================================================
// DASHBOARD WIDGET DATA - Query Engine
// Translates widget query_config into Supabase queries with tenant isolation
// =============================================================================

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function applyScopeFilter(
  query: any,
  scope: string,
  tenant: any,
  franchise: any,
  user: any
) {
  if (scope === 'user' && user?.id) {
    query = query.or(
      `responsible_id.eq.${user.id},user_id.eq.${user.id},created_by.eq.${user.id}`
    );
  } else if (scope === 'franchise' && franchise?.id) {
    query = query.eq('franchise_id', franchise.id);
  }
  // tenant scope: RLS handles this automatically
  return query;
}

function getPeriodDates(period: string): { start: string; end: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const DAY_MS = 86400000;

  switch (period) {
    case 'today':
      return {
        start: today.toISOString(),
        end: new Date(today.getTime() + DAY_MS).toISOString(),
      };
    case 'week': {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return {
        start: weekStart.toISOString(),
        end: new Date(today.getTime() + DAY_MS).toISOString(),
      };
    }
    case 'month': {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        start: monthStart.toISOString(),
        end: new Date(today.getTime() + DAY_MS).toISOString(),
      };
    }
    case 'quarter': {
      const qMonth = Math.floor(today.getMonth() / 3) * 3;
      return {
        start: new Date(today.getFullYear(), qMonth, 1).toISOString(),
        end: new Date(today.getTime() + DAY_MS).toISOString(),
      };
    }
    case 'year':
      return {
        start: new Date(today.getFullYear(), 0, 1).toISOString(),
        end: new Date(today.getTime() + DAY_MS).toISOString(),
      };
    default:
      return {
        start: new Date(today.getTime() - 30 * DAY_MS).toISOString(),
        end: new Date(today.getTime() + DAY_MS).toISOString(),
      };
  }
}

function applyPeriodFilter(query: any, period: string | undefined) {
  if (!period) return query;
  const dates = getPeriodDates(period);
  return query.gte('created_at', dates.start).lt('created_at', dates.end);
}

function applyStaticFilters(query: any, filters: Record<string, any> | undefined) {
  if (!filters) return query;
  Object.entries(filters).forEach(([key, val]) => {
    if (typeof val === 'string') {
      query = query.eq(key, val);
    }
  });
  return query;
}

// -----------------------------------------------------------------------------
// Query Builders (one per widget tipo)
// -----------------------------------------------------------------------------

async function queryKPI(
  tableName: string,
  qc: WidgetQueryConfig,
  tenant: any,
  franchise: any,
  user: any
): Promise<WidgetData> {
  const scope = qc.scope || 'franchise';

  // Handle special select operations
  if (qc.select === 'top_converter') {
    return queryTopConverter(tableName, qc, tenant, franchise, user);
  }

  let query = supabase.from(tableName).select('*', { count: 'exact', head: true });
  query = applyScopeFilter(query, scope, tenant, franchise, user);
  query = applyPeriodFilter(query, qc.period);
  query = applyStaticFilters(query, qc.filters);

  const { count, error } = await query;
  if (error) { console.warn('[WidgetData] Query error:', error.message); return {}; }
  return { value: count || 0 };
}

async function queryTopConverter(
  tableName: string,
  qc: WidgetQueryConfig,
  tenant: any,
  franchise: any,
  user: any
): Promise<WidgetData> {
  const scope = qc.scope || 'franchise';
  let query = supabase.from(tableName).select('atribuido_para, nome, status');
  query = applyScopeFilter(query, scope, tenant, franchise, user);
  query = applyPeriodFilter(query, qc.period);

  const { data, error } = await query;
  if (error) { console.warn('[WidgetData] Query error:', error.message); return {}; }

  // Count conversions by responsible
  const conversions: Record<string, number> = {};
  (data || []).forEach((item: any) => {
    if (item.status === 'convertido' && item.atribuido_para) {
      conversions[item.atribuido_para] = (conversions[item.atribuido_para] || 0) + 1;
    }
  });

  const topEntry = Object.entries(conversions).sort((a, b) => b[1] - a[1])[0];
  return { value: topEntry ? topEntry[1] : 0, label: topEntry ? topEntry[0] : '-' };
}

async function queryTable(
  tableName: string,
  qc: WidgetQueryConfig,
  tenant: any,
  franchise: any,
  user: any
): Promise<WidgetData> {
  const scope = qc.scope || 'franchise';

  // Handle aggregated table selects
  if (qc.select === 'count_by_responsible') {
    return queryCountByResponsible(tableName, qc, tenant, franchise, user);
  }

  const selectCols = qc.columns ? qc.columns.join(', ') : '*';
  let query = supabase.from(tableName).select(selectCols);
  query = applyScopeFilter(query, scope, tenant, franchise, user);
  query = applyPeriodFilter(query, qc.period);
  query = applyStaticFilters(query, qc.filters);

  query = query.limit(qc.limit || 10);
  if (qc.order_by) {
    const [col, dir] = qc.order_by.split(' ');
    // Only apply order if column looks safe (no special chars)
    if (/^[a-z_]+$/i.test(col)) {
      query = query.order(col, { ascending: dir !== 'desc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query;
  // Gracefully handle column-not-found errors instead of throwing
  if (error) {
    console.warn(`[WidgetData] Table query error: ${error.message}`);
    return { items: [] };
  }
  return { items: data || [] };
}

async function queryCountByResponsible(
  tableName: string,
  qc: WidgetQueryConfig,
  tenant: any,
  franchise: any,
  user: any
): Promise<WidgetData> {
  const scope = qc.scope || 'franchise';
  let query = supabase.from(tableName).select('atribuido_para, status');
  query = applyScopeFilter(query, scope, tenant, franchise, user);
  query = applyPeriodFilter(query, qc.period);

  const { data, error } = await query;
  if (error) { console.warn('[WidgetData] Query error:', error.message); return {}; }

  // Aggregate by responsible
  const stats: Record<string, { total: number; convertidos: number; ativos: number }> = {};
  (data || []).forEach((item: any) => {
    const responsible = item.atribuido_para || 'Não atribuído';
    if (!stats[responsible]) stats[responsible] = { total: 0, convertidos: 0, ativos: 0 };
    stats[responsible].total++;
    if (item.status === 'convertido') stats[responsible].convertidos++;
    if (!['perdido', 'cancelado', 'convertido'].includes(item.status || '')) {
      stats[responsible].ativos++;
    }
  });

  // Resolve user names from mt_users
  const userIds = Object.keys(stats).filter(id => id !== 'Não atribuído');
  let nameMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('mt_users')
      .select('id, nome')
      .in('id', userIds);
    if (users) {
      users.forEach((u: any) => { nameMap[u.id] = u.nome; });
    }
  }

  const items = Object.entries(stats)
    .map(([id, s]) => ({
      Responsável: nameMap[id] || (id === 'Não atribuído' ? id : id.slice(0, 8) + '...'),
      'Total Leads': s.total,
      Convertidos: s.convertidos,
      Ativos: s.ativos,
      'Taxa (%)': s.total > 0 ? Math.round((s.convertidos / s.total) * 100) : 0,
    }))
    .sort((a, b) => b.Convertidos - a.Convertidos)
    .slice(0, 10);

  return { items };
}

async function queryChart(
  tableName: string,
  widgetNome: string,
  qc: WidgetQueryConfig,
  tenant: any,
  franchise: any,
  user: any
): Promise<WidgetData> {
  const scope = qc.scope || 'franchise';

  // Handle special chart selects
  if (qc.select === 'conversion_by_user') {
    return queryConversionByUser(tableName, widgetNome, qc, tenant, franchise, user);
  }

  let query = supabase.from(tableName).select('*');
  query = applyScopeFilter(query, scope, tenant, franchise, user);
  query = applyPeriodFilter(query, qc.period);
  query = applyStaticFilters(query, qc.filters);
  query = query.limit(qc.limit || 500);

  const { data, error } = await query;
  if (error) { console.warn('[WidgetData] Query error:', error.message); return {}; }

  if (qc.group_by && data) {
    const grouped: Record<string, number> = {};

    data.forEach((item: any) => {
      let key: string;
      if (qc.group_by === 'day') {
        key = new Date(item.created_at).toLocaleDateString('pt-BR', {
          weekday: 'short',
          day: '2-digit',
        });
      } else if (qc.group_by === 'month') {
        key = new Date(item.created_at).toLocaleDateString('pt-BR', { month: 'short' });
      } else if (qc.group_by === 'day_of_week') {
        key = new Date(item.created_at).toLocaleDateString('pt-BR', { weekday: 'long' });
      } else {
        key = String(item[qc.group_by!] || 'Outros');
      }
      grouped[key] = (grouped[key] || 0) + 1;
    });

    const seriesData = Object.entries(grouped).map(([label, value]) => ({
      label,
      value,
    }));
    return { series: [{ name: widgetNome, data: seriesData }] };
  }

  return { items: data || [] };
}

async function queryFunnel(
  tableName: string,
  qc: WidgetQueryConfig,
  tenant: any,
  franchise: any,
  user: any
): Promise<WidgetData> {
  const scope = qc.scope || 'franchise';
  let query = supabase.from(tableName).select('status');
  query = applyScopeFilter(query, scope, tenant, franchise, user);
  query = applyPeriodFilter(query, qc.period);
  query = query.limit(1000);

  const { data, error } = await query;
  if (error) { console.warn('[WidgetData] Query error:', error.message); return {}; }

  const statusOrder = ['novo', 'contatado', 'agendado', 'compareceu', 'convertido'];
  const statusLabels: Record<string, string> = {
    novo: 'Novos',
    contatado: 'Contatados',
    agendado: 'Agendados',
    compareceu: 'Compareceram',
    convertido: 'Convertidos',
  };

  const counts: Record<string, number> = {};
  (data || []).forEach((item: any) => {
    const s = (item.status || 'novo').toLowerCase();
    counts[s] = (counts[s] || 0) + 1;
  });

  const total = data?.length || 1;
  let prevCount = total;

  const stages = statusOrder.map((status, i) => {
    const quantidade = counts[status] || 0;
    const percentual = (quantidade / total) * 100;
    const conversaoAnterior = prevCount > 0 ? (quantidade / prevCount) * 100 : 0;
    prevCount = quantidade || prevCount;
    return {
      etapa: statusLabels[status] || status,
      quantidade,
      percentual,
      conversaoAnterior: i === 0 ? 100 : conversaoAnterior,
    };
  });

  return { stages };
}

async function queryProgress(
  tableName: string,
  qc: WidgetQueryConfig,
  tenant: any,
  franchise: any,
  user: any
): Promise<WidgetData> {
  const scope = qc.scope || 'franchise';
  let query = supabase.from(tableName).select('*', { count: 'exact', head: true });
  query = applyScopeFilter(query, scope, tenant, franchise, user);
  query = applyPeriodFilter(query, qc.period);
  query = applyStaticFilters(query, qc.filters);

  const { count, error } = await query;
  if (error) { console.warn('[WidgetData] Query error:', error.message); return {}; }

  const current = count || 0;
  const target = (qc as any).target || 100;
  return {
    progress: {
      current,
      target,
      percent: Math.min((current / target) * 100, 100),
    },
  };
}

async function queryConversionByUser(
  tableName: string,
  widgetNome: string,
  qc: WidgetQueryConfig,
  tenant: any,
  franchise: any,
  user: any
): Promise<WidgetData> {
  const scope = qc.scope || 'franchise';
  let query = supabase.from(tableName).select('atribuido_para, status');
  query = applyScopeFilter(query, scope, tenant, franchise, user);
  query = applyPeriodFilter(query, qc.period);

  const { data, error } = await query;
  if (error) { console.warn('[WidgetData] Query error:', error.message); return {}; }

  const stats: Record<string, { total: number; convertidos: number }> = {};
  (data || []).forEach((item: any) => {
    const responsible = item.atribuido_para || 'Não atribuído';
    if (!stats[responsible]) stats[responsible] = { total: 0, convertidos: 0 };
    stats[responsible].total++;
    if (item.status === 'convertido') stats[responsible].convertidos++;
  });

  // Resolve user names
  const userIds = Object.keys(stats).filter(id => id !== 'Não atribuído');
  let nameMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('mt_users')
      .select('id, nome')
      .in('id', userIds);
    if (users) {
      users.forEach((u: any) => { nameMap[u.id] = u.nome; });
    }
  }

  const seriesData = Object.entries(stats)
    .map(([id, s]) => {
      const fullName = nameMap[id] || id;
      return {
        label: fullName.split(' ')[0] || fullName,
        value: s.total > 0 ? Math.round((s.convertidos / s.total) * 100) : 0,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return { series: [{ name: widgetNome, data: seriesData }] };
}

// -----------------------------------------------------------------------------
// Main Hook
// -----------------------------------------------------------------------------

export function useDashboardWidgetData(widget: MTDashboardBoardWidget) {
  const { tenant, franchise, user } = useTenantContext();

  // Serialize query_config to a stable string to prevent infinite re-renders
  const queryConfigKey = JSON.stringify(widget.query_config);

  return useQuery<WidgetData>({
    queryKey: [
      'mt-dashboard-widget-data',
      widget.id,
      widget.data_source,
      queryConfigKey,
      tenant?.id,
      franchise?.id,
    ],
    retry: 2, // Limit retries to prevent infinite loop on 400 errors
    queryFn: async (): Promise<WidgetData> => {
      const tableName = ALLOWED_DATA_SOURCES[widget.data_source];
      if (!tableName) return {};

      const qc = widget.query_config;

      switch (widget.tipo) {
        case 'kpi':
          return queryKPI(tableName, qc, tenant, franchise, user);

        case 'table':
        case 'list':
          return queryTable(tableName, qc, tenant, franchise, user);

        case 'chart':
          return queryChart(tableName, widget.nome, qc, tenant, franchise, user);

        case 'funnel':
          return queryFunnel(tableName, qc, tenant, franchise, user);

        case 'progress':
          return queryProgress(tableName, qc, tenant, franchise, user);

        default:
          // calendar or unknown types: return count as fallback
          if (qc.select === 'count') {
            return queryKPI(tableName, qc, tenant, franchise, user);
          }
          return {};
      }
    },
    enabled: !!widget?.id && !!tenant?.id,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}

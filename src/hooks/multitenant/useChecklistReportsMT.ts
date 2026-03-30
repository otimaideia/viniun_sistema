import { useQuery } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hooks para relatórios de checklist diário.
 */

// Relatório diário: agregação por usuário
export function useDailyReport(date: string) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: ['mt-checklist-report-daily', tenant?.id, franchise?.id, date],
    queryFn: async () => {
      let q = (supabase.from('mt_checklist_daily') as any)
        .select(`
          id, user_id, status, total_items, items_concluidos, items_nao_concluidos,
          percentual_conclusao, started_at, completed_at,
          user:mt_users!mt_checklist_daily_user_id_fkey(id, nome, cargo),
          template:mt_checklist_templates(id, nome, cor),
          items:mt_checklist_daily_items(id, status, timer_elapsed_seconds, duracao_min, has_nao_conformidade, concluido_em)
        `)
        .eq('data', date);

      if (accessLevel === 'tenant' && tenant) q = q.eq('tenant_id', tenant.id);
      else if (accessLevel === 'franchise' && franchise) q = q.eq('franchise_id', franchise.id);

      const { data, error } = await q;
      if (error) throw error;
      return data as DailyReportRow[];
    },
    enabled: !isTenantLoading && !!date && (!!tenant || accessLevel === 'platform'),
  });
}

// Tendência de conclusão no período
export function useTrendReport(startDate: string, endDate: string) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: ['mt-checklist-report-trend', tenant?.id, franchise?.id, startDate, endDate],
    queryFn: async () => {
      let q = (supabase.from('mt_checklist_daily') as any)
        .select('data, percentual_conclusao, status')
        .gte('data', startDate)
        .lte('data', endDate)
        .order('data', { ascending: true });

      if (accessLevel === 'tenant' && tenant) q = q.eq('tenant_id', tenant.id);
      else if (accessLevel === 'franchise' && franchise) q = q.eq('franchise_id', franchise.id);

      const { data, error } = await q;
      if (error) throw error;

      // Agrupar por data → média de conclusão
      const byDate: Record<string, { total: number; sum: number; count: number }> = {};
      for (const row of (data || [])) {
        if (!byDate[row.data]) byDate[row.data] = { total: 0, sum: 0, count: 0 };
        byDate[row.data].sum += row.percentual_conclusao;
        byDate[row.data].count += 1;
      }

      return Object.entries(byDate).map(([date, { sum, count }]) => ({
        data: date,
        percentual: Math.round(sum / count),
      }));
    },
    enabled: !isTenantLoading && !!startDate && !!endDate && (!!tenant || accessLevel === 'platform'),
  });
}

// Comparação entre colaboradores
export function useEmployeeComparison(startDate: string, endDate: string) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: ['mt-checklist-report-employees', tenant?.id, franchise?.id, startDate, endDate],
    queryFn: async () => {
      let q = (supabase.from('mt_checklist_daily') as any)
        .select(`
          user_id, percentual_conclusao,
          user:mt_users!mt_checklist_daily_user_id_fkey(id, nome)
        `)
        .gte('data', startDate)
        .lte('data', endDate);

      if (accessLevel === 'tenant' && tenant) q = q.eq('tenant_id', tenant.id);
      else if (accessLevel === 'franchise' && franchise) q = q.eq('franchise_id', franchise.id);

      const { data, error } = await q;
      if (error) throw error;

      const byUser: Record<string, { nome: string; sum: number; count: number }> = {};
      for (const row of (data || [])) {
        const uid = row.user_id;
        if (!byUser[uid]) byUser[uid] = { nome: row.user?.nome || 'N/A', sum: 0, count: 0 };
        byUser[uid].sum += row.percentual_conclusao;
        byUser[uid].count += 1;
      }

      return Object.entries(byUser)
        .map(([_, { nome, sum, count }]) => ({
          nome,
          percentual: Math.round(sum / count),
          checklists: count,
        }))
        .sort((a, b) => b.percentual - a.percentual);
    },
    enabled: !isTenantLoading && !!startDate && !!endDate && (!!tenant || accessLevel === 'platform'),
  });
}

// Items mais perdidos (Pareto)
export function useMostMissedItems(startDate: string, endDate: string) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: ['mt-checklist-report-missed', tenant?.id, franchise?.id, startDate, endDate],
    queryFn: async () => {
      // Buscar daily_items com status nao_feito ou pulado no período
      let q = (supabase.from('mt_checklist_daily_items') as any)
        .select(`
          titulo, status,
          daily:mt_checklist_daily!inner(data, tenant_id, franchise_id)
        `)
        .in('status', ['nao_feito', 'pulado'])
        .gte('daily.data', startDate)
        .lte('daily.data', endDate);

      if (accessLevel === 'tenant' && tenant) q = q.eq('daily.tenant_id', tenant.id);
      else if (accessLevel === 'franchise' && franchise) q = q.eq('daily.franchise_id', franchise.id);

      const { data, error } = await q;
      if (error) throw error;

      const byTitle: Record<string, number> = {};
      for (const item of (data || [])) {
        byTitle[item.titulo] = (byTitle[item.titulo] || 0) + 1;
      }

      return Object.entries(byTitle)
        .map(([titulo, vezes]) => ({ titulo, vezes }))
        .sort((a, b) => b.vezes - a.vezes)
        .slice(0, 10);
    },
    enabled: !isTenantLoading && !!startDate && !!endDate && (!!tenant || accessLevel === 'platform'),
  });
}

// Análise de tempo: planejado vs real
export function useTimeAnalysis(startDate: string, endDate: string) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: ['mt-checklist-report-time', tenant?.id, franchise?.id, startDate, endDate],
    queryFn: async () => {
      let q = (supabase.from('mt_checklist_daily_items') as any)
        .select(`
          titulo, categoria, duracao_min, timer_elapsed_seconds, status,
          daily:mt_checklist_daily!inner(data, tenant_id, franchise_id)
        `)
        .eq('status', 'concluido')
        .gt('timer_elapsed_seconds', 0)
        .gte('daily.data', startDate)
        .lte('daily.data', endDate);

      if (accessLevel === 'tenant' && tenant) q = q.eq('daily.tenant_id', tenant.id);
      else if (accessLevel === 'franchise' && franchise) q = q.eq('daily.franchise_id', franchise.id);

      const { data, error } = await q;
      if (error) throw error;

      // Agrupar por categoria
      const byCat: Record<string, { planejado: number; real: number; count: number }> = {};
      for (const item of (data || [])) {
        const cat = item.categoria || 'Outros';
        if (!byCat[cat]) byCat[cat] = { planejado: 0, real: 0, count: 0 };
        byCat[cat].planejado += (item.duracao_min || 0) * 60;
        byCat[cat].real += item.timer_elapsed_seconds || 0;
        byCat[cat].count += 1;
      }

      return Object.entries(byCat).map(([categoria, { planejado, real }]) => ({
        categoria,
        planejado_min: Math.round(planejado / 60),
        real_min: Math.round(real / 60),
      }));
    },
    enabled: !isTenantLoading && !!startDate && !!endDate && (!!tenant || accessLevel === 'platform'),
  });
}

// Relatório de não-conformidades
export function useNCReport(startDate: string, endDate: string) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: ['mt-checklist-report-nc', tenant?.id, franchise?.id, startDate, endDate],
    queryFn: async () => {
      let q = (supabase.from('mt_checklist_daily_items') as any)
        .select(`
          id, titulo, nao_conformidade_descricao, nao_conformidade_acao, updated_at,
          daily:mt_checklist_daily!inner(
            data, tenant_id, franchise_id,
            user:mt_users!mt_checklist_daily_user_id_fkey(id, nome)
          )
        `)
        .eq('has_nao_conformidade', true)
        .gte('daily.data', startDate)
        .lte('daily.data', endDate);

      if (accessLevel === 'tenant' && tenant) q = q.eq('daily.tenant_id', tenant.id);
      else if (accessLevel === 'franchise' && franchise) q = q.eq('daily.franchise_id', franchise.id);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as NCReportRow[];
    },
    enabled: !isTenantLoading && !!startDate && !!endDate && (!!tenant || accessLevel === 'platform'),
  });
}

// Types locais
interface DailyReportRow {
  id: string;
  user_id: string;
  status: string;
  total_items: number;
  items_concluidos: number;
  items_nao_concluidos: number;
  percentual_conclusao: number;
  started_at: string | null;
  completed_at: string | null;
  user?: { id: string; nome: string; cargo: string | null };
  template?: { id: string; nome: string; cor: string };
  items?: {
    id: string;
    status: string;
    timer_elapsed_seconds: number;
    duracao_min: number;
    has_nao_conformidade: boolean;
    concluido_em: string | null;
  }[];
}

interface NCReportRow {
  id: string;
  titulo: string;
  nao_conformidade_descricao: string | null;
  nao_conformidade_acao: string | null;
  updated_at: string;
  daily?: {
    data: string;
    user?: { id: string; nome: string };
  };
}

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import type { ComparativoData, ComparativoCategory } from '@/types/financeiro';

export function useFinanceiroComparativoMT(
  periodA?: { from: string; to: string; label: string },
  periodB?: { from: string; to: string; label: string }
) {
  const [data, setData] = useState<ComparativoData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchComparativo = useCallback(async () => {
    if (!periodA || !periodB) return;
    setIsLoading(true);
    try {
      const fetchPeriod = async (from: string, to: string) => {
        let query = supabase
          .from('mt_financial_transactions')
          .select('tipo, valor, status, category_id, category:mt_financial_categories(id, nome)')
          .is('deleted_at', null)
          .eq('status', 'pago')
          .gte('data_competencia', from)
          .lte('data_competencia', to);

        if (tenant?.id) query = query.eq('tenant_id', tenant.id);
        if (franchise?.id && accessLevel === 'franchise') query = query.eq('franchise_id', franchise.id);

        const { data } = await query;
        return (data || []) as any[];
      };

      const [txA, txB] = await Promise.all([
        fetchPeriod(periodA.from, periodA.to),
        fetchPeriod(periodB.from, periodB.to),
      ]);

      const sumByTipo = (txs: any[], tipo: string) => txs.filter(t => t.tipo === tipo).reduce((s, t) => s + t.valor, 0);

      const receitasA = sumByTipo(txA, 'receita');
      const despesasA = sumByTipo(txA, 'despesa');
      const receitasB = sumByTipo(txB, 'receita');
      const despesasB = sumByTipo(txB, 'despesa');

      const growthPct = (a: number, b: number) => b === 0 ? (a > 0 ? 100 : 0) : ((a - b) / b) * 100;

      // Agrupar por categoria
      const categoryMap = new Map<string, { nome: string; a: number; b: number }>();

      txA.forEach(t => {
        const catId = t.category_id || 'sem-categoria';
        const catNome = t.category?.nome || 'Sem Categoria';
        const entry = categoryMap.get(catId) || { nome: catNome, a: 0, b: 0 };
        entry.a += t.valor;
        categoryMap.set(catId, entry);
      });

      txB.forEach(t => {
        const catId = t.category_id || 'sem-categoria';
        const catNome = t.category?.nome || 'Sem Categoria';
        const entry = categoryMap.get(catId) || { nome: catNome, a: 0, b: 0 };
        entry.b += t.valor;
        categoryMap.set(catId, entry);
      });

      const byCategory: ComparativoCategory[] = Array.from(categoryMap.entries())
        .map(([catId, { nome, a, b }]) => ({
          category_id: catId === 'sem-categoria' ? null : catId,
          category_nome: nome,
          periodA_value: a,
          periodB_value: b,
          change_pct: growthPct(a, b),
          delta: a - b,
        }))
        .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));

      setData({
        periodA: { receitas: receitasA, despesas: despesasA, lucro: receitasA - despesasA, label: periodA.label },
        periodB: { receitas: receitasB, despesas: despesasB, lucro: receitasB - despesasB, label: periodB.label },
        growth: {
          receitas_pct: growthPct(receitasA, receitasB),
          despesas_pct: growthPct(despesasA, despesasB),
          lucro_pct: growthPct(receitasA - despesasA, receitasB - despesasB),
        },
        byCategory,
      });
    } catch (err) {
      console.error('Erro ao carregar comparativo:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel, periodA?.from, periodA?.to, periodB?.from, periodB?.to]);

  useEffect(() => {
    if ((tenant?.id || accessLevel === 'platform') && periodA && periodB) fetchComparativo();
  }, [fetchComparativo, tenant?.id, accessLevel, periodA?.from, periodA?.to, periodB?.from, periodB?.to]);

  return { data, isLoading, refetch: fetchComparativo };
}

// Hook para tendência dos últimos N meses
export function useFinanceiroTrendMT(lastNMonths: number = 6) {
  const [trend, setTrend] = useState<Array<{ month: string; receitas: number; despesas: number; lucro: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchTrend = useCallback(async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - lastNMonths + 1, 1);
      const fromStr = from.toISOString().split('T')[0];
      const toStr = now.toISOString().split('T')[0];

      let query = supabase
        .from('mt_financial_transactions')
        .select('tipo, valor, data_competencia')
        .is('deleted_at', null)
        .eq('status', 'pago')
        .gte('data_competencia', fromStr)
        .lte('data_competencia', toStr);

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);
      if (franchise?.id && accessLevel === 'franchise') query = query.eq('franchise_id', franchise.id);

      const { data: txs } = await query;

      // Agrupar por mês
      const monthMap = new Map<string, { receitas: number; despesas: number }>();

      for (let i = 0; i < lastNMonths; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - lastNMonths + 1 + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthMap.set(key, { receitas: 0, despesas: 0 });
      }

      (txs || []).forEach((t: any) => {
        const month = t.data_competencia?.substring(0, 7);
        if (month && monthMap.has(month)) {
          const entry = monthMap.get(month)!;
          if (t.tipo === 'receita') entry.receitas += t.valor;
          else entry.despesas += t.valor;
        }
      });

      const result = Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, { receitas, despesas }]) => ({
          month,
          receitas,
          despesas,
          lucro: receitas - despesas,
        }));

      setTrend(result);
    } catch (err) {
      console.error('Erro ao carregar tendência:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel, lastNMonths]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchTrend();
  }, [fetchTrend, tenant?.id, accessLevel]);

  return { trend, isLoading, refetch: fetchTrend };
}

import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  FinancialProjection,
  FinancialProjectionCreate,
  ProjectionLine,
  ProjectionLineCreate,
  ProjectionSection,
  LineComparison,
  MonthSummary,
} from '@/types/projecao';
import { getMonthLabel, getMonthDateRange } from '@/types/projecao';

// =============================================================================
// HOOK: useProjectionsMT
// Lista + CRUD de projeções financeiras
// =============================================================================

export function useProjectionsMT() {
  const [projections, setProjections] = useState<FinancialProjection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchProjections = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = (supabase as any)
        .from('mt_financial_projections')
        .select('*, franchise:mt_franchises(id, nome)')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);
      if (franchise?.id && accessLevel === 'franchise') query = query.eq('franchise_id', franchise.id);

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setProjections((data || []) as FinancialProjection[]);
    } catch (err) {
      console.error('Erro ao carregar projeções:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar projeções'));
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') {
      fetchProjections();
    }
  }, [fetchProjections, tenant?.id, accessLevel]);

  // Criar projeção + linhas em batch
  const createProjection = useCallback(async (
    header: FinancialProjectionCreate,
    lines: ProjectionLineCreate[],
    fileUrl?: string
  ): Promise<FinancialProjection> => {
    if (!tenant?.id && accessLevel !== 'platform') throw new Error('Tenant não definido');

    // 1. Criar header
    const { data: proj, error: projErr } = await (supabase as any)
      .from('mt_financial_projections')
      .insert({
        tenant_id: tenant?.id,
        franchise_id: header.franchise_id || franchise?.id || null,
        nome: header.nome,
        descricao: header.descricao || null,
        data_inicio: header.data_inicio,
        total_meses: header.total_meses || 60,
        investimento_inicial: header.investimento_inicial || null,
        tir_projetada: header.tir_projetada || null,
        vpl_projetado: header.vpl_projetado || null,
        roi_projetado: header.roi_projetado || null,
        payback_mes: header.payback_mes || null,
        lucratividade_media: header.lucratividade_media || null,
        lucro_liquido_medio: header.lucro_liquido_medio || null,
        investimento_detalhado: header.investimento_detalhado || null,
        parcelamentos: header.parcelamentos || null,
        file_name: header.file_name || null,
        file_url: fileUrl || null,
      })
      .select('*, franchise:mt_franchises(id, nome)')
      .single();

    if (projErr) throw projErr;

    // 2. Inserir linhas em chunks de 50
    const chunkSize = 50;
    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunk = lines.slice(i, i + chunkSize).map(line => ({
        tenant_id: tenant?.id,
        projection_id: proj.id,
        secao: line.secao,
        codigo: line.codigo,
        nome: line.nome,
        tipo: line.tipo,
        percentual: line.percentual ?? null,
        base_calculo: line.base_calculo ?? null,
        valores: line.valores,
        category_id: line.category_id ?? null,
        match_rule: line.match_rule ?? null,
        ordem: line.ordem,
        is_subtotal: line.is_subtotal ?? false,
        indent_level: line.indent_level ?? 0,
      }));

      const { error: lineErr } = await (supabase as any)
        .from('mt_financial_projection_lines')
        .insert(chunk);

      if (lineErr) throw lineErr;
    }

    toast.success(`Projeção "${header.nome}" importada com ${lines.length} linhas`);
    await fetchProjections();
    return proj as FinancialProjection;
  }, [tenant?.id, franchise?.id, accessLevel, fetchProjections]);

  // Soft delete
  const deleteProjection = useCallback(async (id: string) => {
    const { error } = await (supabase as any)
      .from('mt_financial_projections')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', id);

    if (error) throw error;
    setProjections(prev => prev.filter(p => p.id !== id));
    toast.success('Projeção removida');
  }, []);

  return {
    projections,
    isLoading,
    error,
    refetch: fetchProjections,
    createProjection,
    deleteProjection,
  };
}

// =============================================================================
// HOOK: useProjectionMT
// Detalhe de uma projeção com suas linhas agrupadas por seção
// =============================================================================

export function useProjectionMT(projectionId: string | undefined) {
  const [projection, setProjection] = useState<FinancialProjection | null>(null);
  const [lines, setLines] = useState<ProjectionLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { tenant, accessLevel } = useTenantContext();

  const fetchData = useCallback(async () => {
    if (!projectionId) return;
    setIsLoading(true);
    setError(null);
    try {
      // Fetch projection header
      const { data: proj, error: projErr } = await (supabase as any)
        .from('mt_financial_projections')
        .select('*, franchise:mt_franchises(id, nome)')
        .eq('id', projectionId)
        .single();

      if (projErr) throw projErr;
      setProjection(proj as FinancialProjection);

      // Fetch all lines ordered by section + ordem
      const { data: lineData, error: lineErr } = await (supabase as any)
        .from('mt_financial_projection_lines')
        .select('*')
        .eq('projection_id', projectionId)
        .order('secao', { ascending: true })
        .order('ordem', { ascending: true });

      if (lineErr) throw lineErr;
      setLines((lineData || []) as ProjectionLine[]);
    } catch (err) {
      console.error('Erro ao carregar projeção:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar projeção'));
    } finally {
      setIsLoading(false);
    }
  }, [projectionId]);

  useEffect(() => {
    if (projectionId && (tenant?.id || accessLevel === 'platform')) {
      fetchData();
    }
  }, [fetchData, projectionId, tenant?.id, accessLevel]);

  // Linhas agrupadas por seção
  const linesBySection = useMemo(() => {
    const grouped: Record<ProjectionSection, ProjectionLine[]> = {
      dre: [],
      despesas_fixas: [],
      faturamento: [],
      payback: [],
    };
    for (const line of lines) {
      if (grouped[line.secao]) {
        grouped[line.secao].push(line);
      }
    }
    return grouped;
  }, [lines]);

  // Update a line's category_id mapping
  const updateLineMapping = useCallback(async (
    lineId: string,
    categoryId: string | null,
    matchRule?: Record<string, any> | null
  ) => {
    const updates: Record<string, any> = { category_id: categoryId };
    if (matchRule !== undefined) updates.match_rule = matchRule;

    const { error } = await (supabase as any)
      .from('mt_financial_projection_lines')
      .update(updates)
      .eq('id', lineId);

    if (error) throw error;

    setLines(prev => prev.map(l =>
      l.id === lineId ? { ...l, category_id: categoryId, ...(matchRule !== undefined ? { match_rule: matchRule } : {}) } : l
    ));
    toast.success('Mapeamento atualizado');
  }, []);

  return {
    projection,
    lines,
    linesBySection,
    isLoading,
    error,
    refetch: fetchData,
    updateLineMapping,
  };
}

// =============================================================================
// HOOK: useProjectionComparisonMT
// Comparação linha-a-linha: projetado vs realizado
// =============================================================================

export function useProjectionComparisonMT(
  projectionId: string | undefined,
  mesInicio: number = 1,
  mesFim: number = 12
) {
  const [lineComparisons, setLineComparisons] = useState<LineComparison[]>([]);
  const [monthSummaries, setMonthSummaries] = useState<MonthSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { tenant, accessLevel } = useTenantContext();

  const fetchComparison = useCallback(async () => {
    if (!projectionId) return;
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch projection + lines
      const { data: proj, error: projErr } = await (supabase as any)
        .from('mt_financial_projections')
        .select('*')
        .eq('id', projectionId)
        .single();

      if (projErr) throw projErr;
      const projection = proj as FinancialProjection;

      const { data: lineData, error: lineErr } = await (supabase as any)
        .from('mt_financial_projection_lines')
        .select('*')
        .eq('projection_id', projectionId)
        .order('secao')
        .order('ordem');

      if (lineErr) throw lineErr;
      const lines = (lineData || []) as ProjectionLine[];

      // 2. Calculate full date range for the requested months
      const rangeStart = getMonthDateRange(projection.data_inicio, mesInicio);
      const rangeEnd = getMonthDateRange(projection.data_inicio, mesFim);

      // 3. Fetch ALL transactions in the date range (one query)
      let txQuery = (supabase as any)
        .from('mt_financial_transactions')
        .select('id, tipo, valor, category_id, data_competencia, descricao, status')
        .is('deleted_at', null)
        .neq('status', 'cancelado')
        .gte('data_competencia', rangeStart.inicio)
        .lte('data_competencia', rangeEnd.fim);

      if (tenant?.id) txQuery = txQuery.eq('tenant_id', tenant.id);
      // If projection has franchise_id, filter by it
      if (projection.franchise_id) txQuery = txQuery.eq('franchise_id', projection.franchise_id);

      const { data: txData, error: txErr } = await txQuery;
      if (txErr) throw txErr;
      const transactions = (txData || []) as any[];

      // 4. Group transactions by month number
      const txByMonth: Record<number, any[]> = {};
      for (let m = mesInicio; m <= mesFim; m++) {
        txByMonth[m] = [];
      }

      for (const tx of transactions) {
        // Determine which month this transaction belongs to
        const txDate = new Date(tx.data_competencia);
        const projStart = new Date(projection.data_inicio);
        const monthDiff = (txDate.getFullYear() - projStart.getFullYear()) * 12
          + (txDate.getMonth() - projStart.getMonth()) + 1;

        if (monthDiff >= mesInicio && monthDiff <= mesFim) {
          if (!txByMonth[monthDiff]) txByMonth[monthDiff] = [];
          txByMonth[monthDiff].push(tx);
        }
      }

      // 5. Build line comparisons
      const comparisons: LineComparison[] = lines.map(line => {
        const realizado: Record<string, number> = {};
        const variacao: Record<string, number> = {};

        for (let m = mesInicio; m <= mesFim; m++) {
          const mKey = String(m);
          const projetado = line.valores[mKey] ?? 0;
          let real = 0;

          const monthTxs = txByMonth[m] || [];

          if (line.is_subtotal || line.tipo === 'indicador') {
            // Subtotals and indicators: calculate from aggregated data
            if (line.codigo === 'custo_total' || line.codigo === 'total_despesas_fixas') {
              real = monthTxs.filter((t: any) => t.tipo === 'despesa').reduce((s: number, t: any) => s + Number(t.valor), 0);
            } else if (line.codigo === 'resultado_liquido') {
              const rec = monthTxs.filter((t: any) => t.tipo === 'receita').reduce((s: number, t: any) => s + Number(t.valor), 0);
              const desp = monthTxs.filter((t: any) => t.tipo === 'despesa').reduce((s: number, t: any) => s + Number(t.valor), 0);
              real = rec - desp;
            } else if (line.codigo === 'margem_liquida') {
              const rec = monthTxs.filter((t: any) => t.tipo === 'receita').reduce((s: number, t: any) => s + Number(t.valor), 0);
              const desp = monthTxs.filter((t: any) => t.tipo === 'despesa').reduce((s: number, t: any) => s + Number(t.valor), 0);
              real = rec > 0 ? ((rec - desp) / rec) * 100 : 0;
            } else if (line.codigo === 'fat_bruto' || line.codigo === 'faturamento_bruto') {
              real = monthTxs.filter((t: any) => t.tipo === 'receita').reduce((s: number, t: any) => s + Number(t.valor), 0);
            } else if (line.codigo === 'lucro_mensal') {
              const rec = monthTxs.filter((t: any) => t.tipo === 'receita').reduce((s: number, t: any) => s + Number(t.valor), 0);
              const desp = monthTxs.filter((t: any) => t.tipo === 'despesa').reduce((s: number, t: any) => s + Number(t.valor), 0);
              real = rec - desp;
            }
            // Other subtotals/indicators: leave as 0 (no direct transaction mapping)
          } else if (line.category_id) {
            // Has a mapped category — sum transactions of that category
            real = monthTxs
              .filter((t: any) => t.category_id === line.category_id)
              .reduce((s: number, t: any) => s + Number(t.valor), 0);
          } else if (line.match_rule) {
            // Has match rules — apply them
            real = applyMatchRule(monthTxs, line.match_rule);
          } else {
            // No mapping — sum by tipo
            if (line.tipo === 'receita') {
              real = monthTxs.filter((t: any) => t.tipo === 'receita').reduce((s: number, t: any) => s + Number(t.valor), 0);
            } else if (line.tipo === 'despesa') {
              real = monthTxs.filter((t: any) => t.tipo === 'despesa').reduce((s: number, t: any) => s + Number(t.valor), 0);
            }
          }

          realizado[mKey] = real;
          variacao[mKey] = projetado !== 0 ? ((real - projetado) / Math.abs(projetado)) * 100 : (real !== 0 ? 100 : 0);
        }

        return { line, realizado, variacao };
      });

      setLineComparisons(comparisons);

      // 6. Build month summaries
      const summaries: MonthSummary[] = [];
      for (let m = mesInicio; m <= mesFim; m++) {
        const mKey = String(m);
        const monthTxs = txByMonth[m] || [];
        const range = getMonthDateRange(projection.data_inicio, m);

        // Projected totals from DRE lines
        const projRecLine = lines.find(l => l.secao === 'dre' && l.codigo === 'faturamento_bruto');
        const projDespLine = lines.find(l => l.secao === 'dre' && l.codigo === 'custo_total');
        const projResultLine = lines.find(l => l.secao === 'dre' && l.codigo === 'resultado_liquido');

        const projReceitas = projRecLine?.valores[mKey] ?? 0;
        const projDespesas = projDespLine?.valores[mKey] ?? 0;
        const projResultado = projResultLine?.valores[mKey] ?? (projReceitas - projDespesas);
        const projMargem = projReceitas > 0 ? (projResultado / projReceitas) * 100 : 0;

        const realReceitas = monthTxs.filter((t: any) => t.tipo === 'receita').reduce((s: number, t: any) => s + Number(t.valor), 0);
        const realDespesas = monthTxs.filter((t: any) => t.tipo === 'despesa').reduce((s: number, t: any) => s + Number(t.valor), 0);
        const realResultado = realReceitas - realDespesas;
        const realMargem = realReceitas > 0 ? (realResultado / realReceitas) * 100 : 0;

        summaries.push({
          mes: m,
          mes_label: getMonthLabel(projection.data_inicio, m),
          data_inicio: range.inicio,
          data_fim: range.fim,
          proj_receitas: projReceitas,
          proj_despesas: projDespesas,
          proj_resultado: projResultado,
          proj_margem: projMargem,
          real_receitas: realReceitas,
          real_despesas: realDespesas,
          real_resultado: realResultado,
          real_margem: realMargem,
          var_receita_pct: projReceitas !== 0 ? ((realReceitas - projReceitas) / Math.abs(projReceitas)) * 100 : 0,
          var_despesa_pct: projDespesas !== 0 ? ((realDespesas - projDespesas) / Math.abs(projDespesas)) * 100 : 0,
          var_resultado_pct: projResultado !== 0 ? ((realResultado - projResultado) / Math.abs(projResultado)) * 100 : 0,
        });
      }

      setMonthSummaries(summaries);
    } catch (err) {
      console.error('Erro ao comparar projeção:', err);
      setError(err instanceof Error ? err : new Error('Erro ao comparar projeção'));
    } finally {
      setIsLoading(false);
    }
  }, [projectionId, mesInicio, mesFim, tenant?.id, accessLevel]);

  useEffect(() => {
    if (projectionId && (tenant?.id || accessLevel === 'platform')) {
      fetchComparison();
    }
  }, [fetchComparison, projectionId, tenant?.id, accessLevel]);

  return {
    lineComparisons,
    monthSummaries,
    isLoading,
    error,
    refetch: fetchComparison,
  };
}

// =============================================================================
// HELPER: Apply match_rule to filter transactions
// =============================================================================

function applyMatchRule(transactions: any[], rule: Record<string, any>): number {
  let filtered = [...transactions];

  if (rule.tipo) {
    filtered = filtered.filter(t => t.tipo === rule.tipo);
  }
  if (rule.descricao_contains) {
    const term = String(rule.descricao_contains).toLowerCase();
    filtered = filtered.filter(t => String(t.descricao || '').toLowerCase().includes(term));
  }
  if (rule.descricao_starts_with) {
    const term = String(rule.descricao_starts_with).toLowerCase();
    filtered = filtered.filter(t => String(t.descricao || '').toLowerCase().startsWith(term));
  }
  if (rule.category_ids && Array.isArray(rule.category_ids)) {
    filtered = filtered.filter(t => rule.category_ids.includes(t.category_id));
  }

  return filtered.reduce((s, t) => s + Number(t.valor), 0);
}

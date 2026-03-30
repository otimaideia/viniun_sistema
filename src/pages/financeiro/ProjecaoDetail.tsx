import { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Target, TrendingUp, TrendingDown, DollarSign, BarChart3, ArrowLeft, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { useProjectionMT, useProjectionComparisonMT } from '@/hooks/multitenant/useProjectionsMT';
import { SECTION_LABELS } from '@/types/projecao';
import type { ProjectionSection, LineComparison } from '@/types/projecao';

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatCompact(value: number) {
  if (Math.abs(value) >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
  return formatCurrency(value);
}

function formatPercent(value: number | null) {
  if (value === null || value === undefined) return '-';
  return `${(value * 100).toFixed(1)}%`;
}

function formatVariation(pct: number) {
  if (pct === 0) return '0%';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

function variationColor(pct: number, inverted = false) {
  // For expenses: positive variation = bad (red), negative = good (green)
  // For revenue: positive = good (green), negative = bad (red)
  if (pct === 0) return 'text-muted-foreground';
  const isGood = inverted ? pct < 0 : pct > 0;
  return isGood ? 'text-green-600' : 'text-red-600';
}

function variationBg(pct: number, inverted = false) {
  if (pct === 0) return '';
  const isGood = inverted ? pct < 0 : pct > 0;
  return isGood ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20';
}

// Determine if variation is "inverted" (lower is better for expenses)
function isExpenseLine(line: LineComparison): boolean {
  return line.line.tipo === 'despesa' || line.line.codigo === 'custo_total';
}

export default function ProjecaoDetail() {
  const { id } = useParams();
  const { projection, lines, linesBySection, isLoading } = useProjectionMT(id);

  // Period selector (12-month windows)
  const [periodoIdx, setPeriodoIdx] = useState(0);
  const mesInicio = periodoIdx * 12 + 1;
  const mesFim = mesInicio + 11;

  const { lineComparisons, monthSummaries, isLoading: isComparing } = useProjectionComparisonMT(id, mesInicio, mesFim);

  // Group comparisons by section
  const comparisonsBySection = useMemo(() => {
    const grouped: Record<ProjectionSection, LineComparison[]> = {
      dre: [], despesas_fixas: [], faturamento: [], payback: [],
    };
    for (const comp of lineComparisons) {
      if (grouped[comp.line.secao]) {
        grouped[comp.line.secao].push(comp);
      }
    }
    return grouped;
  }, [lineComparisons]);

  // Summary cards data
  const periodSummary = useMemo(() => {
    if (monthSummaries.length === 0) return null;
    const totals = monthSummaries.reduce((acc, m) => ({
      projRec: acc.projRec + m.proj_receitas,
      projDesp: acc.projDesp + m.proj_despesas,
      projRes: acc.projRes + m.proj_resultado,
      realRec: acc.realRec + m.real_receitas,
      realDesp: acc.realDesp + m.real_despesas,
      realRes: acc.realRes + m.real_resultado,
    }), { projRec: 0, projDesp: 0, projRes: 0, realRec: 0, realDesp: 0, realRes: 0 });

    return {
      ...totals,
      varRec: totals.projRec !== 0 ? ((totals.realRec - totals.projRec) / Math.abs(totals.projRec)) * 100 : 0,
      varDesp: totals.projDesp !== 0 ? ((totals.realDesp - totals.projDesp) / Math.abs(totals.projDesp)) * 100 : 0,
      varRes: totals.projRes !== 0 ? ((totals.realRes - totals.projRes) / Math.abs(totals.projRes)) * 100 : 0,
      projMargem: totals.projRec > 0 ? (totals.projRes / totals.projRec) * 100 : 0,
      realMargem: totals.realRec > 0 ? (totals.realRes / totals.realRec) * 100 : 0,
    };
  }, [monthSummaries]);

  // Period options
  const totalMeses = projection?.total_meses || 60;
  const periodos = Array.from({ length: Math.ceil(totalMeses / 12) }, (_, i) => ({
    idx: i,
    label: `Ano ${i + 1} (Meses ${i * 12 + 1}-${Math.min((i + 1) * 12, totalMeses)})`,
  }));

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Carregando projeção...</div>;
  }

  if (!projection) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Projeção não encontrada</div>;
  }

  // Chart data
  const chartData = monthSummaries.map(m => ({
    name: m.mes_label,
    'Faturamento Proj': m.proj_receitas,
    'Faturamento Real': m.real_receitas,
    'Resultado Proj': m.proj_resultado,
    'Resultado Real': m.real_resultado,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/financeiro" className="hover:text-foreground">Financeiro</Link>
            <span>/</span>
            <Link to="/financeiro/projecao" className="hover:text-foreground">Projeção</Link>
            <span>/</span>
            <span>{projection.nome}</span>
          </div>
          <h1 className="text-2xl font-bold">{projection.nome}</h1>
          <div className="flex items-center gap-3 mt-1">
            {projection.franchise && <Badge variant="outline">{projection.franchise.nome}</Badge>}
            <span className="text-muted-foreground text-sm">{projection.total_meses} meses</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Period selector */}
          <Select value={String(periodoIdx)} onValueChange={(v) => setPeriodoIdx(Number(v))}>
            <SelectTrigger className="w-[250px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodos.map(p => (
                <SelectItem key={p.idx} value={String(p.idx)}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" asChild>
            <Link to="/financeiro/projecao"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Link>
          </Button>
        </div>
      </div>

      {/* KPI badges */}
      <div className="flex flex-wrap gap-3">
        <Badge variant="outline" className="px-3 py-1">
          Investimento: {formatCurrency(projection.investimento_inicial)}
        </Badge>
        <Badge variant="outline" className="px-3 py-1">
          PayBack: Mês {projection.payback_mes || '-'}
        </Badge>
        <Badge variant="outline" className="px-3 py-1">
          TIR: {formatPercent(projection.tir_projetada)}
        </Badge>
        <Badge variant="outline" className="px-3 py-1">
          ROI: {projection.roi_projetado ? `${projection.roi_projetado.toFixed(1)}x` : '-'}
        </Badge>
        <Badge variant="outline" className="px-3 py-1">
          VPL: {formatCurrency(projection.vpl_projetado)}
        </Badge>
      </div>

      {/* No real data banner */}
      {periodSummary && periodSummary.realRec === 0 && periodSummary.realDesp === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Exibindo apenas dados projetados</p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Ainda não há transações financeiras reais cadastradas para comparação.
              Cadastre receitas e despesas no módulo Financeiro para ver a comparação Projetado vs Real.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {periodSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SummaryCard
            title="Faturamento"
            projected={periodSummary.projRec}
            actual={periodSummary.realRec}
            variation={periodSummary.varRec}
            icon={<TrendingUp className="h-5 w-5 text-green-500" />}
          />
          <SummaryCard
            title="Custos Totais"
            projected={periodSummary.projDesp}
            actual={periodSummary.realDesp}
            variation={periodSummary.varDesp}
            inverted
            icon={<TrendingDown className="h-5 w-5 text-red-500" />}
          />
          <SummaryCard
            title="Resultado Líquido"
            projected={periodSummary.projRes}
            actual={periodSummary.realRes}
            variation={periodSummary.varRes}
            icon={<DollarSign className="h-5 w-5 text-blue-500" />}
          />
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Margem Líquida</p>
                  {periodSummary.realRec !== 0 ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold">{periodSummary.realMargem.toFixed(1)}%</span>
                      <span className="text-xs text-muted-foreground">proj: {periodSummary.projMargem.toFixed(1)}%</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold">{periodSummary.projMargem.toFixed(1)}%</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1">projetado</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground italic">Sem dados reais ainda</p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 5 Tabs */}
      <Tabs defaultValue="visao_geral" className="w-full">
        <TabsList className="w-full flex flex-wrap">
          <TabsTrigger value="visao_geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="dre">DRE Comparativo</TabsTrigger>
          <TabsTrigger value="despesas">Despesas Fixas</TabsTrigger>
          <TabsTrigger value="faturamento">Faturamento</TabsTrigger>
          <TabsTrigger value="payback">PayBack</TabsTrigger>
        </TabsList>

        {/* Tab 1: Visão Geral */}
        <TabsContent value="visao_geral">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Faturamento Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Faturamento: Projetado vs Real</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="Faturamento Proj" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Faturamento Real" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Resultado Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Resultado Líquido: Projetado vs Real</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    <ReferenceLine y={0} stroke="#666" />
                    <Bar dataKey="Resultado Proj" fill="#94a3b8" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Resultado Real" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: DRE Comparativo */}
        <TabsContent value="dre">
          <ComparisonTable
            comparisons={comparisonsBySection.dre}
            mesInicio={mesInicio}
            mesFim={mesFim}
            isLoading={isComparing}
            dataInicio={projection.data_inicio}
          />
        </TabsContent>

        {/* Tab 3: Despesas Fixas */}
        <TabsContent value="despesas">
          <ComparisonTable
            comparisons={comparisonsBySection.despesas_fixas}
            mesInicio={mesInicio}
            mesFim={mesFim}
            isLoading={isComparing}
            dataInicio={projection.data_inicio}
          />
        </TabsContent>

        {/* Tab 4: Faturamento */}
        <TabsContent value="faturamento">
          <ComparisonTable
            comparisons={comparisonsBySection.faturamento}
            mesInicio={mesInicio}
            mesFim={mesFim}
            isLoading={isComparing}
            dataInicio={projection.data_inicio}
          />
        </TabsContent>

        {/* Tab 5: PayBack */}
        <TabsContent value="payback">
          <div className="space-y-6">
            {/* PayBack chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Saldo Acumulado: Projetado vs Real</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const saldoLine = comparisonsBySection.payback.find(c => c.line.codigo === 'saldo_acumulado');
                  if (!saldoLine) return <p className="text-muted-foreground text-sm">Dados de saldo não disponíveis</p>;
                  const paybackData = Array.from({ length: mesFim - mesInicio + 1 }, (_, i) => {
                    const m = mesInicio + i;
                    const mKey = String(m);
                    return {
                      name: `M${m}`,
                      'Projetado': saldoLine.line.valores[mKey] ?? 0,
                      'Realizado': saldoLine.realizado[mKey] ?? 0,
                    };
                  });
                  return (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={paybackData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Legend />
                        <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="Projetado" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="Realizado" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  );
                })()}
              </CardContent>
            </Card>

            {/* PayBack table */}
            <ComparisonTable
              comparisons={comparisonsBySection.payback}
              mesInicio={mesInicio}
              mesFim={mesFim}
              isLoading={isComparing}
              dataInicio={projection.data_inicio}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function SummaryCard({ title, projected, actual, variation, inverted = false, icon }: {
  title: string;
  projected: number;
  actual: number;
  variation: number;
  inverted?: boolean;
  icon: React.ReactNode;
}) {
  const hasRealData = actual !== 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {icon}
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            {hasRealData ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold">{formatCurrency(actual)}</span>
                  <span className={`text-sm font-medium ${variationColor(variation, inverted)}`}>
                    {formatVariation(variation)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Proj: {formatCurrency(projected)}</p>
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold">{formatCurrency(projected)}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1">projetado</Badge>
                </div>
                <p className="text-xs text-muted-foreground italic">Sem dados reais ainda</p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ComparisonTable({ comparisons, mesInicio, mesFim, isLoading, dataInicio }: {
  comparisons: LineComparison[];
  mesInicio: number;
  mesFim: number;
  isLoading: boolean;
  dataInicio: string;
}) {
  if (isLoading) {
    return <div className="flex items-center justify-center py-8 text-muted-foreground">Calculando comparação...</div>;
  }

  if (comparisons.length === 0) {
    return <div className="flex items-center justify-center py-8 text-muted-foreground">Nenhuma linha nesta seção</div>;
  }

  const months = Array.from({ length: mesFim - mesInicio + 1 }, (_, i) => mesInicio + i);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px] sticky left-0 bg-background z-10 border-r">Linha</TableHead>
                <TableHead className="text-center w-16 border-r">%</TableHead>
                {months.map(m => (
                  <TableHead key={m} colSpan={3} className="text-center border-r min-w-[240px]">
                    Mês {m}
                  </TableHead>
                ))}
              </TableRow>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10 border-r" />
                <TableHead className="border-r" />
                {months.map(m => (
                  <TableHead key={m} className="border-r" colSpan={3}>
                    <div className="flex text-xs">
                      <span className="flex-1 text-center text-muted-foreground">Proj</span>
                      <span className="flex-1 text-center">Real</span>
                      <span className="flex-1 text-center">Δ%</span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisons.map((comp) => {
                const inverted = isExpenseLine(comp);
                return (
                  <TableRow key={comp.line.id} className={comp.line.is_subtotal ? 'font-bold bg-muted/30' : ''}>
                    <TableCell className="sticky left-0 bg-background z-10 border-r">
                      <span style={{ paddingLeft: `${(comp.line.indent_level || 0) * 16}px` }}>
                        {comp.line.nome}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground border-r font-mono">
                      {comp.line.percentual != null ? `${(comp.line.percentual * 100).toFixed(1)}%` : ''}
                    </TableCell>
                    {months.map(m => {
                      const mKey = String(m);
                      const proj = comp.line.valores[mKey] ?? 0;
                      const real = comp.realizado[mKey] ?? 0;
                      const varPct = comp.variacao[mKey] ?? 0;
                      const isIndicator = comp.line.tipo === 'indicador';
                      const fmtVal = (v: number) => isIndicator && comp.line.codigo === 'margem_liquida'
                        ? `${v.toFixed(1)}%`
                        : formatCompact(v);

                      return (
                        <TableCell key={m} className={`border-r p-0 ${variationBg(varPct, inverted)}`} colSpan={3}>
                          <div className="flex text-xs font-mono">
                            <span className="flex-1 text-center py-2 text-muted-foreground">{fmtVal(proj)}</span>
                            <span className="flex-1 text-center py-2 font-medium">{real !== 0 ? fmtVal(real) : '-'}</span>
                            <span className={`flex-1 text-center py-2 font-medium ${variationColor(varPct, inverted)}`}>
                              {real !== 0 ? formatVariation(varPct) : '-'}
                            </span>
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

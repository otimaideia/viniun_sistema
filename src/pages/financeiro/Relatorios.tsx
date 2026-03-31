import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Download, Calendar, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useFinancialTransactionsMT, useFinancialCategoriesMT } from '@/hooks/multitenant/useFinanceiroMT';
import { useFinanceiroComparativoMT } from '@/hooks/multitenant/useFinanceiroComparativoMT';
import type { FinancialTransactionFilters, DREData } from '@/types/financeiro';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

type PeriodType = 'month' | 'quarter' | 'year';

function getPeriodRange(type: PeriodType): { from: string; to: string; label: string } {
  const now = new Date();
  let from: Date;
  let to: Date;
  let label: string;

  switch (type) {
    case 'month':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      label = from.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      break;
    case 'quarter':
      const q = Math.floor(now.getMonth() / 3);
      from = new Date(now.getFullYear(), q * 3, 1);
      to = new Date(now.getFullYear(), q * 3 + 3, 0);
      label = `${q + 1}o Trimestre ${now.getFullYear()}`;
      break;
    case 'year':
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date(now.getFullYear(), 11, 31);
      label = `Ano ${now.getFullYear()}`;
      break;
  }

  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
    label,
  };
}

function exportCSV(transactions: Record<string, unknown>[], periodLabel: string) {
  const header = ['Tipo', 'Descricao', 'Valor', 'Categoria', 'Status', 'Data Competencia', 'Data Vencimento', 'Forma Pagamento'];
  const rows = transactions.map((t) => [
    t.tipo,
    `"${(t.descricao || '').replace(/"/g, '""')}"`,
    t.valor.toFixed(2),
    t.category?.nome || '',
    t.status,
    t.data_competencia,
    t.data_vencimento || '',
    t.forma_pagamento || '',
  ]);

  const csv = [header.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `relatorio-financeiro-${periodLabel.replace(/\s+/g, '-').toLowerCase()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function getMonthRange(year: number, month: number) {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
    label: from.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
  };
}

export default function Relatorios() {
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const period = getPeriodRange(periodType);

  // Comparativo: mês atual vs mês anterior por padrão
  const now = new Date();
  const [compA, setCompA] = useState(() => {
    const d = getMonthRange(now.getFullYear(), now.getMonth());
    return { from: d.from, to: d.to, label: d.label };
  });
  const [compB, setCompB] = useState(() => {
    const d = getMonthRange(now.getFullYear(), now.getMonth() - 1);
    return { from: d.from, to: d.to, label: d.label };
  });
  const { data: comparativo, isLoading: compLoading } = useFinanceiroComparativoMT(compA, compB);

  const filters: FinancialTransactionFilters = useMemo(() => ({
    date_from: period.from,
    date_to: period.to,
  }), [period.from, period.to]);

  const { transactions, isLoading } = useFinancialTransactionsMT(filters);
  const { categories } = useFinancialCategoriesMT();

  const dre: DREData = useMemo(() => {
    const paid = transactions.filter((t) => t.status === 'pago');

    // Use category tipo field for classification instead of keyword matching
    const receitaCategoryIds = new Set(categories.filter((c) => c.tipo === 'receita').map((c) => c.id));
    const despesaCategoryIds = new Set(categories.filter((c) => c.tipo === 'despesa').map((c) => c.id));

    const receitas = paid.filter((t) => t.tipo === 'receita');
    const despesas = paid.filter((t) => t.tipo === 'despesa');

    const receitaBruta = receitas.reduce((s, t) => s + t.valor, 0);

    // Deductions: receita-type transactions whose category is despesa-type (e.g. tax/deduction categories miscategorized)
    // Since categories already have tipo, deductions = 0 in a clean setup
    const deducoes = 0;

    const receitaLiquida = receitaBruta - deducoes;

    // All despesas are operational costs
    const despesaTotal = despesas.reduce((s, t) => s + t.valor, 0);

    const lucroBruto = receitaLiquida;
    const despesasOperacionais = despesaTotal;
    const lucroOperacional = lucroBruto - despesasOperacionais;

    // No sub-classification without extra fields; resultado financeiro = 0
    const resultadoFinanceiro = 0;
    const lucroLiquido = lucroOperacional + resultadoFinanceiro;

    return {
      periodo: period.label,
      receita_bruta: receitaBruta,
      deducoes,
      receita_liquida: receitaLiquida,
      custos_servicos: 0,
      lucro_bruto: lucroBruto,
      despesas_operacionais: despesasOperacionais,
      lucro_operacional: lucroOperacional,
      resultado_financeiro: resultadoFinanceiro,
      lucro_liquido: lucroLiquido,
    };
  }, [transactions, categories, period.label]);

  const dreRows = [
    { label: 'Receita Bruta', value: dre.receita_bruta, bold: true, indent: 0 },
    { label: '(-) Deducoes', value: -dre.deducoes, bold: false, indent: 1 },
    { label: '= Receita Liquida', value: dre.receita_liquida, bold: true, indent: 0, separator: true },
    { label: '(-) Custos de Servicos', value: -dre.custos_servicos, bold: false, indent: 1 },
    { label: '= Lucro Bruto', value: dre.lucro_bruto, bold: true, indent: 0, separator: true },
    { label: '(-) Despesas Operacionais', value: -dre.despesas_operacionais, bold: false, indent: 1 },
    { label: '= Lucro Operacional', value: dre.lucro_operacional, bold: true, indent: 0, separator: true },
    { label: '(+/-) Resultado Financeiro', value: dre.resultado_financeiro, bold: false, indent: 1 },
    { label: '= Lucro Liquido', value: dre.lucro_liquido, bold: true, indent: 0, highlight: true },
  ];

  // Dados para gráfico comparativo
  const compChartData = comparativo ? [
    { name: 'Receitas', [compA.label]: comparativo.periodA.receitas, [compB.label]: comparativo.periodB.receitas },
    { name: 'Despesas', [compA.label]: comparativo.periodA.despesas, [compB.label]: comparativo.periodB.despesas },
    { name: 'Lucro', [compA.label]: comparativo.periodA.lucro, [compB.label]: comparativo.periodB.lucro },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/financeiro" className="hover:text-foreground">Financeiro</Link>
            <span>/</span>
            <span>Relatorios</span>
          </div>
          <h1 className="text-2xl font-bold">Relatorios Financeiros</h1>
        </div>
      </div>

      <Tabs defaultValue="dre">
        <TabsList>
          <TabsTrigger value="dre">
            <FileText className="h-4 w-4 mr-2" />
            DRE
          </TabsTrigger>
          <TabsTrigger value="comparativo">
            <TrendingUp className="h-4 w-4 mr-2" />
            Comparativo
          </TabsTrigger>
        </TabsList>

        {/* DRE Tab */}
        <TabsContent value="dre" className="space-y-6">
          <div className="flex items-center gap-2">
            <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
              <SelectTrigger className="w-[160px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Mes Atual</SelectItem>
                <SelectItem value="quarter">Trimestre</SelectItem>
                <SelectItem value="year">Ano</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => exportCSV(transactions, period.label)} disabled={isLoading || transactions.length === 0}>
              <Download className="h-4 w-4 mr-2" /> Exportar
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                DRE - Demonstracao de Resultado do Exercicio
              </CardTitle>
              <p className="text-sm text-muted-foreground">Periodo: {period.label}</p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">Carregando...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60%]">Descricao</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dreRows.map((row, i) => (
                      <TableRow key={i} className={row.highlight ? 'bg-muted/50' : row.separator ? 'border-t-2' : ''}>
                        <TableCell className={`${row.bold ? 'font-bold' : ''}`} style={{ paddingLeft: `${row.indent * 24 + 16}px` }}>
                          {row.label}
                        </TableCell>
                        <TableCell className={`text-right ${row.bold ? 'font-bold' : ''} ${row.value >= 0 ? 'text-green-600' : 'text-red-600'} ${row.highlight ? 'text-lg' : ''}`}>
                          {formatCurrency(Math.abs(row.value))}
                          {row.value < 0 && ' (-)'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">Margem Bruta</p>
                <p className="text-2xl font-bold text-blue-600">
                  {dre.receita_bruta > 0 ? ((dre.lucro_bruto / dre.receita_bruta) * 100).toFixed(1) : '0.0'}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">Margem Operacional</p>
                <p className="text-2xl font-bold text-blue-600">
                  {dre.receita_bruta > 0 ? ((dre.lucro_operacional / dre.receita_bruta) * 100).toFixed(1) : '0.0'}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">Margem Liquida</p>
                <p className={`text-2xl font-bold ${dre.lucro_liquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {dre.receita_bruta > 0 ? ((dre.lucro_liquido / dre.receita_bruta) * 100).toFixed(1) : '0.0'}%
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Comparativo Tab */}
        <TabsContent value="comparativo" className="space-y-6">
          {/* Period Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4 space-y-2">
                <Label className="text-sm font-medium">Período A (Atual)</Label>
                <div className="flex gap-2">
                  <Input type="date" value={compA.from} onChange={(e) => setCompA(p => ({ ...p, from: e.target.value, label: 'Período A' }))} />
                  <Input type="date" value={compA.to} onChange={(e) => setCompA(p => ({ ...p, to: e.target.value }))} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 space-y-2">
                <Label className="text-sm font-medium">Período B (Anterior)</Label>
                <div className="flex gap-2">
                  <Input type="date" value={compB.from} onChange={(e) => setCompB(p => ({ ...p, from: e.target.value, label: 'Período B' }))} />
                  <Input type="date" value={compB.to} onChange={(e) => setCompB(p => ({ ...p, to: e.target.value }))} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Growth Cards */}
          {comparativo && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">Crescimento Receitas</p>
                  <p className={`text-2xl font-bold ${comparativo.growth.receitas_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {comparativo.growth.receitas_pct >= 0 ? '+' : ''}{comparativo.growth.receitas_pct.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">Variação Despesas</p>
                  <p className={`text-2xl font-bold ${comparativo.growth.despesas_pct <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {comparativo.growth.despesas_pct >= 0 ? '+' : ''}{comparativo.growth.despesas_pct.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">Crescimento Lucro</p>
                  <p className={`text-2xl font-bold ${comparativo.growth.lucro_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {comparativo.growth.lucro_pct >= 0 ? '+' : ''}{comparativo.growth.lucro_pct.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Comparison Bar Chart */}
          {comparativo && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Comparativo Visual</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={compChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis tickFormatter={(v) => formatCurrency(v)} fontSize={11} width={90} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey={compA.label} fill="#3b82f6" name={compA.label} />
                    <Bar dataKey={compB.label} fill="#94a3b8" name={compB.label} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Category Breakdown */}
          {comparativo && comparativo.byCategory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Variação por Categoria</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">{compA.label}</TableHead>
                      <TableHead className="text-right">{compB.label}</TableHead>
                      <TableHead className="text-right">Variação</TableHead>
                      <TableHead className="text-right">Delta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparativo.byCategory.slice(0, 15).map((cat, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{cat.category_nome}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Math.abs(cat.periodA_value))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Math.abs(cat.periodB_value))}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={cat.change_pct >= 0 ? 'default' : 'destructive'} className="text-xs">
                            {cat.change_pct >= 0 ? '+' : ''}{cat.change_pct.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${cat.delta >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(Math.abs(cat.delta))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {compLoading && (
            <div className="flex items-center justify-center h-32 text-muted-foreground">Carregando comparativo...</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useState, useMemo, Fragment } from 'react';
import { Link } from 'react-router-dom';
import {
  Download, ArrowUpRight, ArrowDownRight, Wallet, TrendingUp,
  Calendar, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useFinancialTransactionsMT, useFinancialAccountsMT } from '@/hooks/multitenant/useFinanceiroMT';
import { TRANSACTION_STATUS_LABELS } from '@/types/financeiro';
import type { TransactionStatus, FinancialTransactionFilters, FinancialTransaction } from '@/types/financeiro';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
}

const statusColors: Record<TransactionStatus, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  pago: 'bg-green-100 text-green-800',
  cancelado: 'bg-gray-100 text-gray-800',
  atrasado: 'bg-red-100 text-red-800',
};

interface DayGroup {
  data: string;
  transactions: FinancialTransaction[];
  entradas: number;
  saidas: number;
  saldo: number;
  saldo_acumulado: number;
}

function exportFluxoCSV(groups: DayGroup[], periodLabel: string) {
  const header = ['Data', 'Descricao', 'Categoria', 'Status', 'Entradas', 'Saidas', 'Saldo Dia', 'Saldo Acumulado'];
  const rows: string[][] = [];

  groups.forEach((g) => {
    g.transactions.forEach((tx) => {
      rows.push([
        tx.data_competencia,
        `"${(tx.descricao || '').replace(/"/g, '""')}"`,
        tx.category?.nome || '',
        TRANSACTION_STATUS_LABELS[tx.status],
        tx.tipo === 'receita' ? tx.valor.toFixed(2) : '',
        tx.tipo === 'despesa' ? tx.valor.toFixed(2) : '',
        '',
        '',
      ]);
    });
    // Summary row for day
    rows.push([
      g.data,
      '"TOTAL DO DIA"',
      '',
      '',
      g.entradas.toFixed(2),
      g.saidas.toFixed(2),
      g.saldo.toFixed(2),
      g.saldo_acumulado.toFixed(2),
    ]);
  });

  const csv = [header.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fluxo-caixa-${periodLabel}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function FluxoCaixa() {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(now.toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState<string>('all');
  const [includePending, setIncludePending] = useState(true);

  const filters: FinancialTransactionFilters = useMemo(() => ({
    date_from: dateFrom,
    date_to: dateTo,
    account_id: accountId !== 'all' ? accountId : undefined,
  }), [dateFrom, dateTo, accountId]);

  const { transactions, isLoading, refetch } = useFinancialTransactionsMT(filters);
  const { accounts } = useFinancialAccountsMT();

  // Filtrar por status (excluir cancelados, e pendentes se toggle off)
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.status === 'cancelado') return false;
      if (!includePending && tx.status !== 'pago') return false;
      return true;
    });
  }, [transactions, includePending]);

  // Ordenar por data
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => a.data_competencia.localeCompare(b.data_competencia));
  }, [filtered]);

  // Saldo inicial da conta selecionada (simplificado: 0 se "todas")
  const saldoInicial = useMemo(() => {
    if (accountId === 'all') return 0;
    const acc = accounts.find((a) => a.id === accountId);
    // Não temos saldo histórico, usamos 0 como base do período
    return 0;
  }, [accountId, accounts]);

  // Agrupar por dia
  const grouped: DayGroup[] = useMemo(() => {
    const map = new Map<string, FinancialTransaction[]>();
    sorted.forEach((tx) => {
      const key = tx.data_competencia;
      const arr = map.get(key) || [];
      arr.push(tx);
      map.set(key, arr);
    });

    let acumulado = saldoInicial;
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, txs]) => {
        const entradas = txs.filter((t) => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);
        const saidas = txs.filter((t) => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0);
        const saldo = entradas - saidas;
        acumulado += saldo;
        return { data, transactions: txs, entradas, saidas, saldo, saldo_acumulado: acumulado };
      });
  }, [sorted, saldoInicial]);

  // Totais
  const totals = useMemo(() => {
    const entradas = grouped.reduce((s, g) => s + g.entradas, 0);
    const saidas = grouped.reduce((s, g) => s + g.saidas, 0);
    const saldoFinal = grouped.length > 0 ? grouped[grouped.length - 1].saldo_acumulado : saldoInicial;
    return { entradas, saidas, saldoFinal };
  }, [grouped, saldoInicial]);

  // Dados para gráfico
  const chartData = useMemo(() => {
    return grouped.map((g) => ({
      data: g.data.slice(5), // MM-DD
      saldo: g.saldo_acumulado,
      entradas: g.entradas,
      saidas: g.saidas,
    }));
  }, [grouped]);

  const periodLabel = `${dateFrom}_${dateTo}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/financeiro" className="hover:text-foreground">Financeiro</Link>
            <span>/</span>
            <span>Fluxo de Caixa</span>
          </div>
          <h1 className="text-2xl font-bold">Fluxo de Caixa Detalhado</h1>
          <p className="text-sm text-muted-foreground mt-1">Movimentacao dia a dia com saldo acumulado</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => exportFluxoCSV(grouped, periodLabel)} disabled={grouped.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label className="text-xs text-muted-foreground">De</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Ate</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Conta</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todas as contas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as contas</SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pb-1">
              <Switch id="include-pending" checked={includePending} onCheckedChange={setIncludePending} />
              <Label htmlFor="include-pending" className="text-sm cursor-pointer">Incluir pendentes</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Saldo Inicial</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(saldoInicial)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Total Entradas</span>
            </div>
            <p className="text-xl font-bold text-green-600">{formatCurrency(totals.entradas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownRight className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Total Saidas</span>
            </div>
            <p className="text-xl font-bold text-red-600">{formatCurrency(totals.saidas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Saldo Final</span>
            </div>
            <p className={`text-xl font-bold ${totals.saldoFinal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totals.saldoFinal)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Fluxo de Caixa */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Movimentacao Dia a Dia
            <Badge variant="secondary" className="ml-2">{sorted.length} lancamentos</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">Carregando...</div>
          ) : grouped.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Nenhum lancamento no periodo selecionado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Data</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead className="text-right w-[120px]">Entradas</TableHead>
                  <TableHead className="text-right w-[120px]">Saidas</TableHead>
                  <TableHead className="text-right w-[120px]">Saldo Dia</TableHead>
                  <TableHead className="text-right w-[130px]">Acumulado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.map((group) => (
                  <Fragment key={group.data}>
                    {/* Cabeçalho do dia */}
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableCell className="font-semibold whitespace-nowrap" colSpan={2}>
                        {formatDate(group.data)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold text-green-700">
                        {group.entradas > 0 ? formatCurrency(group.entradas) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold text-red-700">
                        {group.saidas > 0 ? formatCurrency(group.saidas) : '-'}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-sm font-semibold ${group.saldo >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatCurrency(group.saldo)}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-sm font-bold ${group.saldo_acumulado >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                        {formatCurrency(group.saldo_acumulado)}
                      </TableCell>
                    </TableRow>
                    {/* Lançamentos do dia */}
                    {group.transactions.map((tx) => (
                      <TableRow
                        key={tx.id}
                        className={tx.status !== 'pago' ? 'opacity-60' : ''}
                      >
                        <TableCell />
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={tx.status !== 'pago' ? 'italic' : ''}>{tx.descricao}</span>
                            {tx.category && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{tx.category.nome}</Badge>
                            )}
                            {tx.status !== 'pago' && (
                              <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${statusColors[tx.status]}`}>
                                {TRANSACTION_STATUS_LABELS[tx.status]}
                              </Badge>
                            )}
                            {tx.parcela_atual && tx.parcela_total && (
                              <span className="text-[10px] text-muted-foreground">
                                {tx.parcela_atual}/{tx.parcela_total}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {tx.tipo === 'receita' ? (
                            <span className="text-green-600">{formatCurrency(tx.valor)}</span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {tx.tipo === 'despesa' ? (
                            <span className="text-red-600">{formatCurrency(tx.valor)}</span>
                          ) : null}
                        </TableCell>
                        <TableCell />
                        <TableCell />
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Gráfico Saldo Acumulado */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolucao do Saldo Acumulado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" fontSize={12} />
                <YAxis tickFormatter={(v) => formatCurrency(v)} fontSize={11} width={90} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Line type="monotone" dataKey="saldo" stroke="#8b5cf6" name="Saldo Acumulado" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

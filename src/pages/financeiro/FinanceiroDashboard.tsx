import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, AlertTriangle, Landmark,
  Plus, ArrowUpRight, ArrowDownRight, RefreshCw, Clock, Flame, Target,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useFinanceiroDashboardMT } from '@/hooks/multitenant/useFinanceiroMT';
import { useFinanceiroTrendMT } from '@/hooks/multitenant/useFinanceiroComparativoMT';

const COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function FinanceiroDashboard() {
  const navigate = useNavigate();
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(now.toISOString().split('T')[0]);

  const { metrics, fluxoCaixa, isLoading, refetch } = useFinanceiroDashboardMT({
    from: dateFrom,
    to: dateTo,
  });

  const { trend } = useFinanceiroTrendMT(6);

  // Calcular burn rate (média de despesas dos últimos 3 meses do trend)
  const burnRate = trend.length >= 3
    ? trend.slice(-3).reduce((s, t) => s + t.despesas, 0) / 3
    : trend.length > 0
    ? trend.reduce((s, t) => s + t.despesas, 0) / trend.length
    : 0;

  // Comparativo mês atual vs anterior
  const mesAtual = trend.length > 0 ? trend[trend.length - 1] : null;
  const mesAnterior = trend.length > 1 ? trend[trend.length - 2] : null;
  const growthReceita = mesAnterior && mesAnterior.receitas > 0
    ? ((mesAtual!.receitas - mesAnterior.receitas) / mesAnterior.receitas) * 100
    : 0;
  const growthDespesa = mesAnterior && mesAnterior.despesas > 0
    ? ((mesAtual!.despesas - mesAnterior.despesas) / mesAnterior.despesas) * 100
    : 0;

  const pieData = metrics
    ? [
        { name: 'Receitas', value: metrics.receita_total },
        { name: 'Despesas', value: metrics.despesa_total },
      ]
    : [];

  const kpis = metrics
    ? [
        { label: 'Receita Total', value: formatCurrency(metrics.receita_total), icon: TrendingUp, color: 'text-green-600' },
        { label: 'Despesa Total', value: formatCurrency(metrics.despesa_total), icon: TrendingDown, color: 'text-red-600' },
        { label: 'Lucro Liquido', value: formatCurrency(metrics.lucro_liquido), icon: DollarSign, color: metrics.lucro_liquido >= 0 ? 'text-green-600' : 'text-red-600' },
        { label: 'Margem Liquida', value: `${metrics.margem_liquida.toFixed(1)}%`, icon: ArrowUpRight, color: 'text-blue-600' },
        { label: 'A Pagar Vencidas', value: formatCurrency(metrics.contas_a_pagar_vencidas), icon: AlertTriangle, color: 'text-yellow-600' },
        { label: 'A Receber Vencidas', value: formatCurrency(metrics.contas_a_receber_vencidas || 0), icon: AlertTriangle, color: 'text-orange-600' },
        ...(metrics.total_vencidos ? [{ label: 'Total Vencidos', value: `${metrics.total_vencidos}`, icon: AlertTriangle, color: 'text-red-500' }] : []),
        { label: 'Saldo em Contas', value: formatCurrency(metrics.saldo_total_contas), icon: Landmark, color: 'text-purple-600' },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Visao geral financeira</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
          <span className="text-muted-foreground">a</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button onClick={() => navigate('/financeiro/lancamentos/novo')}>
          <Plus className="h-4 w-4 mr-2" /> Novo Lancamento
        </Button>
        <Button variant="outline" onClick={() => navigate('/financeiro/contas/novo')}>
          <Wallet className="h-4 w-4 mr-2" /> Nova Conta
        </Button>
        <Button variant="outline" asChild>
          <Link to="/financeiro/lancamentos">
            <ArrowDownRight className="h-4 w-4 mr-2" /> Lancamentos
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/financeiro/relatorios">
            <ArrowUpRight className="h-4 w-4 mr-2" /> Relatorios
          </Link>
        </Button>
      </div>

      {/* KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4">
          {kpis.map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                </div>
                <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Fluxo de Caixa</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link to="/financeiro/fluxo-caixa">Ver Detalhado</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {fluxoCaixa.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Sem dados no periodo selecionado
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={fluxoCaixa}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" tickFormatter={(v) => v.slice(5)} fontSize={12} />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} fontSize={11} width={90} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="entradas" fill="#22c55e" name="Entradas" />
                  <Bar dataKey="saidas" fill="#ef4444" name="Saidas" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receita vs Despesa</CardTitle>
          </CardHeader>
          <CardContent>
            {!metrics || (metrics.receita_total === 0 && metrics.despesa_total === 0) ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Sem dados
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tendência 6 Meses + Comparativo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Line Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Tendência - Últimos 6 Meses</CardTitle>
          </CardHeader>
          <CardContent>
            {trend.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickFormatter={(v) => v.slice(5)} fontSize={12} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} fontSize={11} width={50} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="receitas" stroke="#22c55e" name="Receitas" strokeWidth={2} />
                  <Line type="monotone" dataKey="despesas" stroke="#ef4444" name="Despesas" strokeWidth={2} />
                  <Line type="monotone" dataKey="lucro" stroke="#3b82f6" name="Lucro" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Comparativo + Burn Rate */}
        <div className="space-y-4">
          {/* Comparativo Rápido */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Comparativo Mês
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mesAtual && mesAnterior ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Receitas</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{formatCurrency(mesAtual.receitas)}</span>
                      <Badge variant={growthReceita >= 0 ? 'default' : 'destructive'} className="text-xs">
                        {growthReceita >= 0 ? '+' : ''}{growthReceita.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Despesas</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{formatCurrency(mesAtual.despesas)}</span>
                      <Badge variant={growthDespesa <= 0 ? 'default' : 'destructive'} className="text-xs">
                        {growthDespesa >= 0 ? '+' : ''}{growthDespesa.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="text-sm font-medium">Lucro</span>
                    <span className={`text-sm font-bold ${mesAtual.lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(mesAtual.lucro)}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Dados insuficientes</p>
              )}
            </CardContent>
          </Card>

          {/* Burn Rate */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                Burn Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(burnRate)}</p>
              <p className="text-xs text-muted-foreground mt-1">Média mensal de despesas (3 meses)</p>
              {metrics && metrics.saldo_total_contas > 0 && burnRate > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>{(metrics.saldo_total_contas / burnRate).toFixed(1)}</strong> meses de reserva
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ponto de Equilíbrio */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                Ponto de Equilíbrio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(burnRate)}</p>
              <p className="text-xs text-muted-foreground mt-1">Receita mínima necessária/mês</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alertas de Vencimento */}
      {metrics && metrics.total_vencidos > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-4 w-4" />
              Alertas de Vencimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {metrics.contas_a_pagar_vencidas > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">A Pagar</Badge>
                  <span className="text-sm font-medium">{formatCurrency(metrics.contas_a_pagar_vencidas)}</span>
                </div>
              )}
              {(metrics.contas_a_receber_vencidas || 0) > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-orange-600 border-orange-600">A Receber</Badge>
                  <span className="text-sm font-medium">{formatCurrency(metrics.contas_a_receber_vencidas || 0)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  DollarSign,
  Loader2,
  ArrowLeft,
  TrendingUp,
  Calendar,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAITokenUsageMT } from '@/hooks/multitenant/useAITokenUsageMT';
import { useYESiaConfigMT } from '@/hooks/multitenant/useYESiaConfigMT';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AITokenDashboard() {
  const navigate = useNavigate();
  const { tenant, isLoading: isTenantLoading } = useTenantContext();
  const { todayUsage, monthUsage, isLoading: isUsageLoading } = useAITokenUsageMT();
  const { config } = useYESiaConfigMT();

  const formatCurrency = (value: number, currency: string = 'BRL') =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);

  const formatNumber = (value: number) =>
    new Intl.NumberFormat('pt-BR').format(value);

  // Calculate weekly cost
  const weekCostBrl = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    return monthUsage.byDay
      .filter((d: any) => d.date >= weekAgoStr)
      .reduce((sum: number, d: any) => sum + d.cost_brl, 0);
  }, [monthUsage.byDay]);

  // Chart data
  const chartData = useMemo(() => {
    return monthUsage.byDay.map((d: any) => ({
      date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      custo: Number(d.cost_brl.toFixed(2)),
      requisicoes: d.requests,
    }));
  }, [monthUsage.byDay]);

  // Cost by provider
  const providerData = useMemo(() => {
    return monthUsage.byProvider.map((p: any) => ({
      provider: p.provider,
      requests: p.requests,
      tokens: p.tokens,
      cost_usd: p.cost_usd,
    }));
  }, [monthUsage.byProvider]);

  // Limit progress
  const monthlyLimitUsd = config?.monthly_limit_usd;
  const dailyLimitUsd = config?.daily_limit_usd;
  const monthCostUsd = monthUsage.totals.cost_usd;
  const todayCostUsd = todayUsage.cost_usd;

  const monthPercentUsed = monthlyLimitUsd ? (monthCostUsd / monthlyLimitUsd) * 100 : 0;
  const dayPercentUsed = dailyLimitUsd ? (todayCostUsd / dailyLimitUsd) * 100 : 0;

  if (isTenantLoading || isUsageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Button variant="ghost" size="sm" onClick={() => navigate('/ia')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              YESia
            </Button>
            <span>/</span>
            <span>Custos e Uso</span>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Custos e Uso de IA
          </h1>
          <p className="text-muted-foreground">
            Acompanhe o consumo de tokens e custos
            {tenant && ` - ${tenant.nome_fantasia}`}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoje</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(todayUsage.cost_brl)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(todayUsage.requests)} req · {formatNumber(todayUsage.tokens)} tokens
            </p>
            {dailyLimitUsd && (
              <div className="mt-2">
                <Progress value={Math.min(dayPercentUsed, 100)} className="h-1.5" />
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(todayCostUsd, 'USD')} / {formatCurrency(dailyLimitUsd, 'USD')} limite
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(weekCostBrl)}
            </div>
            <p className="text-xs text-muted-foreground">
              Ultimos 7 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(monthUsage.totals.cost_brl)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(monthUsage.totals.requests)} req · {formatNumber(monthUsage.totals.tokens)} tokens
            </p>
            {monthlyLimitUsd && (
              <div className="mt-2">
                <Progress
                  value={Math.min(monthPercentUsed, 100)}
                  className={`h-1.5 ${monthPercentUsed > 80 ? '[&>div]:bg-destructive' : ''}`}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(monthCostUsd, 'USD')} / {formatCurrency(monthlyLimitUsd, 'USD')} limite
                  {monthPercentUsed > 80 && (
                    <span className="text-destructive ml-1">
                      <AlertTriangle className="h-3 w-3 inline" /> {monthPercentUsed.toFixed(0)}%
                    </span>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Limites</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Diario:</span>
                <span className="font-medium">
                  {dailyLimitUsd ? formatCurrency(dailyLimitUsd, 'USD') : 'Sem limite'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mensal:</span>
                <span className="font-medium">
                  {monthlyLimitUsd ? formatCurrency(monthlyLimitUsd, 'USD') : 'Sem limite'}
                </span>
              </div>
            </div>
            <Button
              variant="link"
              className="p-0 h-auto text-xs mt-2"
              onClick={() => navigate('/ia/config')}
            >
              Configurar limites
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Chart: Cost by Day */}
      <Card>
        <CardHeader>
          <CardTitle>Custo Diario (R$)</CardTitle>
          <CardDescription>Custo por dia no mes atual</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Nenhum dado de consumo neste mes
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'custo') return [formatCurrency(value), 'Custo'];
                    return [formatNumber(value), 'Requisicoes'];
                  }}
                />
                <Legend />
                <Bar dataKey="custo" fill="#6366f1" name="Custo (R$)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Cost by Provider */}
      <Card>
        <CardHeader>
          <CardTitle>Custo por Provedor</CardTitle>
          <CardDescription>Distribuicao de custos entre provedores de IA no mes</CardDescription>
        </CardHeader>
        <CardContent>
          {providerData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              Nenhum dado de consumo neste mes
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provedor</TableHead>
                  <TableHead className="text-right">Requisicoes</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Custo (USD)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providerData.map((p: any) => (
                  <TableRow key={p.provider}>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {p.provider}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(p.requests)}</TableCell>
                    <TableCell className="text-right">{formatNumber(p.tokens)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(p.cost_usd, 'USD')}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(monthUsage.totals.requests)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(monthUsage.totals.tokens)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(monthUsage.totals.cost_usd, 'USD')}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

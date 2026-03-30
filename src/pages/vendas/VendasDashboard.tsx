import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Percent,
  Clock,
  BarChart3,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useVendasDashboardMT, useVendasMT } from '@/hooks/multitenant/useVendasMT';
import { SALE_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/types/vendas';
import type { SaleStatus } from '@/types/vendas';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const statusColor: Record<SaleStatus, string> = {
  orcamento: 'bg-gray-100 text-gray-700',
  aprovado: 'bg-blue-100 text-blue-700',
  concluido: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-700',
};

export default function VendasDashboard() {
  const navigate = useNavigate();
  const { metrics, isLoading: isLoadingMetrics } = useVendasDashboardMT();
  const { sales, isLoading: isLoadingSales } = useVendasMT();

  const recentSales = (sales || []).slice(0, 20);

  // Group sales by month (last 6 months) for the bar chart
  const chartData = useMemo(() => {
    if (!sales || sales.length === 0) return [];

    const now = new Date();
    const months: { key: string; label: string; total: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      months.push({ key, label, total: 0 });
    }

    for (const sale of sales) {
      if (!sale.data_venda) continue;
      const saleDate = new Date(sale.data_venda);
      const saleKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
      const month = months.find((m) => m.key === saleKey);
      if (month) {
        month.total += sale.valor_total || 0;
      }
    }

    return months.map((m) => ({ name: m.label, total: m.total }));
  }, [sales]);

  const kpis = [
    {
      title: 'Receita Total',
      value: formatCurrency(metrics?.receita_total || 0),
      description: 'Vendas concluidas',
      icon: DollarSign,
    },
    {
      title: 'Receita do Mes',
      value: formatCurrency(metrics?.receita_mes_atual || 0),
      description: `${metrics?.vendas_mes_atual || 0} vendas no mes`,
      icon: TrendingUp,
    },
    {
      title: 'Ticket Medio',
      value: formatCurrency(metrics?.ticket_medio || 0),
      description: 'Por venda concluida',
      icon: BarChart3,
    },
    {
      title: 'Total de Vendas',
      value: String(metrics?.total_vendas || 0),
      description: 'Todas as vendas',
      icon: ShoppingCart,
    },
    {
      title: 'Comissoes Pendentes',
      value: formatCurrency(metrics?.comissoes_pendentes || 0),
      description: 'Aguardando aprovacao',
      icon: Clock,
    },
    {
      title: 'Margem Media',
      value: formatCurrency(metrics?.margem_media || 0),
      description: 'Por venda concluida',
      icon: Percent,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendas</h1>
          <p className="text-sm text-muted-foreground">Dashboard de vendas e indicadores</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/vendas/tabela-precos')}>
            Tabela de Precos
          </Button>
          <Button variant="outline" onClick={() => navigate('/vendas/comissoes')}>
            Comissoes
          </Button>
          <Button onClick={() => navigate('/vendas/novo')}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Venda
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {isLoadingMetrics ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-7 w-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {kpis.map((kpi) => (
            <Card key={kpi.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                <kpi.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className="text-xs text-muted-foreground">{kpi.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sales by month chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Vendas por Periodo</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center border border-dashed rounded-lg text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Sem dados de vendas</p>
              </div>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) =>
                      new Intl.NumberFormat('pt-BR', { notation: 'compact', compactDisplay: 'short', style: 'currency', currency: 'BRL' }).format(v)
                    }
                  />
                  <RechartsTooltip
                    formatter={(value: number) => [formatCurrency(value), 'Total']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Sales */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Vendas Recentes</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/vendas/todas')}>
            Ver todas <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingSales ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : recentSales.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma venda registrada.
            </p>
          ) : (
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/vendas/${sale.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{sale.cliente_nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {sale.numero_venda || sale.id.slice(0, 8)} &middot;{' '}
                      {sale.forma_pagamento
                        ? PAYMENT_METHOD_LABELS[sale.forma_pagamento]
                        : 'Sem pagamento'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <Badge variant="secondary" className={statusColor[sale.status]}>
                      {SALE_STATUS_LABELS[sale.status]}
                    </Badge>
                    <span className="text-sm font-semibold whitespace-nowrap">
                      {formatCurrency(sale.valor_total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

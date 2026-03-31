// Dashboard de Analytics para Formularios Viniun
// Exibe estatisticas de conversao, abandono e metricas de performance

import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  Eye,
  MousePointerClick,
  Send,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Percent,
  Activity,
  BarChart3,
  Users,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { FormularioStats, FormularioDailyStats } from '@/types/formulario';

interface FormularioAnalyticsDashboardProps {
  formularioId: string;
  formularioNome?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon,
  trend,
  loading,
}) => {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {description}
          {trend && (
            <Badge
              variant={trend.isPositive ? 'default' : 'destructive'}
              className="gap-1"
            >
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {trend.value}%
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Cores para graficos
const COLORS = {
  primary: '#10b981',
  secondary: '#3b82f6',
  warning: '#f59e0b',
  danger: '#ef4444',
  muted: '#6b7280',
  views: '#8b5cf6',
  starts: '#3b82f6',
  submits: '#10b981',
  abandons: '#ef4444',
};

const ABANDONMENT_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export const FormularioAnalyticsDashboard: React.FC<FormularioAnalyticsDashboardProps> = ({
  formularioId,
  formularioNome,
}) => {
  const [stats, setStats] = useState<FormularioStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchStats();
  }, [formularioId, period]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      // Calcular stats manualmente a partir da tabela de analytics
      await fetchStatsManually();
    } catch (err) {
      console.error('Erro ao buscar estatisticas:', err);
      setError('Nao foi possivel carregar as estatisticas');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatsManually = async () => {
    try {
      // Buscar eventos de analytics
      const daysAgo = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data: events, error: eventsError } = await supabase
        .from('mt_form_analytics')
        .select('*')
        .eq('formulario_id', formularioId)
        .gte('created_at', startDate.toISOString());

      if (eventsError) throw eventsError;

      // Calcular estatisticas
      const views = events?.filter((e) => e.evento === 'view').length || 0;
      const starts = events?.filter((e) => e.evento === 'start').length || 0;
      const submits = events?.filter((e) => e.evento === 'submit').length || 0;
      const abandons = events?.filter((e) => e.evento === 'abandon').length || 0;

      // Calcular tempo medio
      const submitEvents = events?.filter((e) => e.evento === 'submit' && e.tempo_total_segundos) || [];
      const avgTime = submitEvents.length > 0
        ? submitEvents.reduce((sum, e) => sum + (e.tempo_total_segundos || 0), 0) / submitEvents.length
        : 0;

      // Calcular abandono por etapa
      const abandonEvents = events?.filter((e) => e.evento === 'abandon' && e.etapa_atual) || [];
      const abandonByStep: Record<string, number> = {};
      abandonEvents.forEach((e) => {
        const step = `Etapa ${e.etapa_atual}`;
        abandonByStep[step] = (abandonByStep[step] || 0) + 1;
      });

      // Calcular breakdown diario
      const dailyBreakdown: FormularioDailyStats[] = [];
      const eventsByDate: Record<string, { views: number; starts: number; submits: number; abandons: number }> = {};

      events?.forEach((e) => {
        const date = new Date(e.created_at).toISOString().split('T')[0];
        if (!eventsByDate[date]) {
          eventsByDate[date] = { views: 0, starts: 0, submits: 0, abandons: 0 };
        }
        if (e.evento === 'view') eventsByDate[date].views++;
        if (e.evento === 'start') eventsByDate[date].starts++;
        if (e.evento === 'submit') eventsByDate[date].submits++;
        if (e.evento === 'abandon') eventsByDate[date].abandons++;
      });

      Object.entries(eventsByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([date, counts]) => {
          dailyBreakdown.push({ date, ...counts });
        });

      setStats({
        total_views: views,
        total_starts: starts,
        total_submits: submits,
        total_abandons: abandons,
        conversion_rate: views > 0 ? (submits / views) * 100 : 0,
        avg_time_seconds: avgTime,
        abandonment_by_step: abandonByStep,
        daily_breakdown: dailyBreakdown,
      });
    } catch (err) {
      console.error('Erro ao calcular estatisticas:', err);
      setError('Nao foi possivel carregar as estatisticas');
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  // Preparar dados para grafico de abandono por etapa
  const abandonmentData = stats?.abandonment_by_step
    ? Object.entries(stats.abandonment_by_step).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  // Preparar dados para grafico de funil
  const funnelData = stats
    ? [
        { name: 'Visualizacoes', value: stats.total_views, fill: COLORS.views },
        { name: 'Iniciados', value: stats.total_starts, fill: COLORS.starts },
        { name: 'Enviados', value: stats.total_submits, fill: COLORS.submits },
      ]
    : [];

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-8 text-center">
          <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com periodo */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Analytics</h2>
          {formularioNome && (
            <p className="text-sm text-muted-foreground">{formularioNome}</p>
          )}
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <TabsList>
            <TabsTrigger value="7d">7 dias</TabsTrigger>
            <TabsTrigger value="30d">30 dias</TabsTrigger>
            <TabsTrigger value="90d">90 dias</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Cards de estatisticas principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Visualizacoes"
          value={stats?.total_views || 0}
          description="Total de visualizacoes"
          icon={<Eye className="h-4 w-4" />}
          loading={loading}
        />
        <StatCard
          title="Iniciados"
          value={stats?.total_starts || 0}
          description="Usuarios que comecaram a preencher"
          icon={<MousePointerClick className="h-4 w-4" />}
          loading={loading}
        />
        <StatCard
          title="Enviados"
          value={stats?.total_submits || 0}
          description="Formularios completados"
          icon={<Send className="h-4 w-4" />}
          loading={loading}
        />
        <StatCard
          title="Taxa de Conversao"
          value={stats ? `${stats.conversion_rate.toFixed(1)}%` : '0%'}
          description="Visualizacoes -> Envios"
          icon={<Percent className="h-4 w-4" />}
          loading={loading}
        />
      </div>

      {/* Segunda linha de metricas */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Abandonos"
          value={stats?.total_abandons || 0}
          description="Usuarios que desistiram"
          icon={<XCircle className="h-4 w-4" />}
          loading={loading}
        />
        <StatCard
          title="Tempo Medio"
          value={stats ? formatTime(stats.avg_time_seconds) : '0s'}
          description="Para completar o formulario"
          icon={<Clock className="h-4 w-4" />}
          loading={loading}
        />
        <StatCard
          title="Taxa de Inicio"
          value={
            stats && stats.total_views > 0
              ? `${((stats.total_starts / stats.total_views) * 100).toFixed(1)}%`
              : '0%'
          }
          description="Visualizacoes -> Inicio"
          icon={<Activity className="h-4 w-4" />}
          loading={loading}
        />
      </div>

      {/* Graficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Grafico de evolucao diaria */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Evolucao Diaria
            </CardTitle>
            <CardDescription>
              Visualizacoes, inicios e envios por dia
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : stats?.daily_breakdown && stats.daily_breakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stats.daily_breakdown}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis fontSize={12} tickLine={false} />
                  <Tooltip
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString('pt-BR')
                    }
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="views"
                    name="Visualizacoes"
                    stroke={COLORS.views}
                    fill={COLORS.views}
                    fillOpacity={0.2}
                  />
                  <Area
                    type="monotone"
                    dataKey="starts"
                    name="Iniciados"
                    stroke={COLORS.starts}
                    fill={COLORS.starts}
                    fillOpacity={0.2}
                  />
                  <Area
                    type="monotone"
                    dataKey="submits"
                    name="Enviados"
                    stroke={COLORS.submits}
                    fill={COLORS.submits}
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum dado disponivel para o periodo selecionado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grafico de funil */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Funil de Conversao
            </CardTitle>
            <CardDescription>
              Jornada do usuario no formulario
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : stats ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" fontSize={12} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    fontSize={12}
                    tickLine={false}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum dado disponivel
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grafico de abandono por etapa */}
        {abandonmentData.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Abandono por Etapa
              </CardTitle>
              <CardDescription>
                Em qual etapa os usuarios desistem
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={abandonmentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {abandonmentData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={ABANDONMENT_COLORS[index % ABANDONMENT_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col justify-center space-y-2">
                    {abandonmentData.map((item, index) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor:
                                ABANDONMENT_COLORS[index % ABANDONMENT_COLORS.length],
                            }}
                          />
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <span className="text-sm font-medium">
                          {item.value} abandonos
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default FormularioAnalyticsDashboard;

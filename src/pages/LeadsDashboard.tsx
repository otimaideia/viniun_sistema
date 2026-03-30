import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLeadMetricsAdapter } from "@/hooks/useLeadMetricsAdapter";
import { useLeadsAdapter } from "@/hooks/useLeadsAdapter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ConversionFunnel } from "@/components/dashboard/ConversionFunnel";
import {
  Users,
  UserPlus,
  Phone,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  RefreshCw
} from "lucide-react";
import { format, subDays, isAfter, eachDayOfInterval, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

// Cores para gráficos
const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7c43",
  "#a855f7",
];

const STATUS_COLORS: Record<string, string> = {
  novo: "#3b82f6",
  em_contato: "#f59e0b",
  contatado: "#f59e0b",
  agendado: "#8b5cf6",
  convertido: "#22c55e",
  ganho: "#22c55e",
  perdido: "#ef4444",
  descartado: "#6b7280",
};

const STATUS_LABELS: Record<string, string> = {
  novo: "Novo",
  em_contato: "Em Contato",
  contatado: "Contatado",
  agendado: "Agendado",
  convertido: "Convertido",
  ganho: "Ganho",
  perdido: "Perdido",
  descartado: "Descartado",
};

// Helper para formatar datas com segurança
const safeFormatDate = (dateValue: string | Date | null | undefined, formatStr: string): string | null => {
  if (!dateValue) return null;
  const date = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
  return isValid(date) ? format(date, formatStr) : null;
};

// Helper para converter data com segurança
const safeParseDate = (dateValue: string | Date | null | undefined): Date | null => {
  if (!dateValue) return null;
  const date = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
  return isValid(date) ? date : null;
};

// Componente de Card de Métrica
function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  onClick,
  color = "primary",
  isLoading = false,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  onClick?: () => void;
  color?: "primary" | "success" | "warning" | "destructive" | "muted";
  isLoading?: boolean;
}) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    warning: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
    destructive: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    muted: "bg-muted text-muted-foreground",
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-8 w-20" />
          </div>
          <Skeleton className="h-4 w-24 mt-2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className={`p-2.5 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <span className="text-2xl font-bold">{value}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{title}</span>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-xs ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
              {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{trend >= 0 ? "+" : ""}{trend}%</span>
              {trendLabel && <span className="text-muted-foreground">({trendLabel})</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function LeadsDashboard() {
  const navigate = useNavigate();
  const { data: metrics, isLoading: metricsLoading, refetch } = useLeadMetricsAdapter();
  const { leads, isLoading: leadsLoading } = useLeadsAdapter();

  const isLoading = metricsLoading || leadsLoading;

  // Dados para gráfico de evolução (últimos 7 dias)
  const evolutionData = useMemo(() => {
    if (!leads.length) return [];

    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date(),
    });

    return last7Days.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const leadsOnDay = leads.filter(lead => {
        const createdDate = safeParseDate(lead.created_at);
        return createdDate && format(createdDate, "yyyy-MM-dd") === dayStr;
      });

      return {
        date: format(day, "EEE", { locale: ptBR }),
        fullDate: format(day, "dd/MM"),
        leads: leadsOnDay.length,
      };
    });
  }, [leads]);

  // Dados para gráfico de pizza (por origem)
  const origemData = useMemo(() => {
    const origens = metrics.leads_por_origem;
    return Object.entries(origens)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, " "),
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // Top 6 origens
  }, [metrics.leads_por_origem]);

  // Dados para gráfico de barras (por status)
  const statusData = useMemo(() => {
    const statuses = metrics.leads_por_status;
    return Object.entries(statuses)
      .map(([name, value]) => ({
        name: STATUS_LABELS[name] || name,
        value,
        fill: STATUS_COLORS[name] || "#8884d8",
      }))
      .sort((a, b) => b.value - a.value);
  }, [metrics.leads_por_status]);

  // Dados do funil
  const funnelData = useMemo(() => {
    return [
      { name: "Novos", value: metrics.novos, color: "#3b82f6" },
      { name: "Em Contato", value: metrics.em_contato, color: "#f59e0b" },
      { name: "Agendados", value: metrics.agendados, color: "#8b5cf6" },
      { name: "Convertidos", value: metrics.convertidos, color: "#22c55e" },
    ];
  }, [metrics]);

  // Formatador de moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard de Leads</h1>
          <p className="text-muted-foreground">
            Visão geral das métricas e desempenho de leads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={() => navigate("/leads/novo")}>
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total de Leads"
          value={metrics.total}
          icon={Users}
          trend={metrics.tendencia.crescimento_percentual}
          trendLabel="vs mês anterior"
          onClick={() => navigate("/leads")}
          isLoading={isLoading}
        />
        <MetricCard
          title="Novos Hoje"
          value={metrics.tendencia.leads_hoje}
          icon={UserPlus}
          color="primary"
          isLoading={isLoading}
        />
        <MetricCard
          title="Taxa de Conversão"
          value={`${metrics.taxa_conversao}%`}
          icon={Target}
          color="success"
          isLoading={isLoading}
        />
        <MetricCard
          title="Pipeline"
          value={formatCurrency(metrics.valor_pipeline)}
          icon={DollarSign}
          color="warning"
          isLoading={isLoading}
        />
      </div>

      {/* Métricas Secundárias */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Novos"
          value={metrics.novos}
          icon={Clock}
          color="primary"
          isLoading={isLoading}
        />
        <MetricCard
          title="Em Contato"
          value={metrics.em_contato}
          icon={Phone}
          color="warning"
          isLoading={isLoading}
        />
        <MetricCard
          title="Agendados"
          value={metrics.agendados}
          icon={Calendar}
          color="primary"
          isLoading={isLoading}
        />
        <MetricCard
          title="Convertidos"
          value={metrics.convertidos}
          icon={CheckCircle2}
          color="success"
          isLoading={isLoading}
        />
        <MetricCard
          title="Perdidos"
          value={metrics.perdidos}
          icon={AlertCircle}
          color="destructive"
          isLoading={isLoading}
        />
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Evolução Semanal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Evolução de Leads (7 dias)
            </CardTitle>
            <CardDescription>
              Novos leads cadastrados por dia
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={evolutionData}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${value} leads`, "Leads"]}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        return payload[0].payload.fullDate;
                      }
                      return label;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="leads"
                    stroke="hsl(var(--primary))"
                    fill="url(#colorLeads)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Distribuição por Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Distribuição por Status
            </CardTitle>
            <CardDescription>
              Quantidade de leads em cada etapa
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={statusData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${value} leads`, "Quantidade"]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Segunda linha de gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Leads por Origem */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Leads por Origem
            </CardTitle>
            <CardDescription>
              De onde vêm os leads
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : origemData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Sem dados de origem
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={origemData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {origemData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${value} leads`, "Quantidade"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Funil de Conversão */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Funil de Conversão
            </CardTitle>
            <CardDescription>
              Jornada do lead até a conversão
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <div className="space-y-4">
                {funnelData.map((stage, index) => {
                  const percentage = metrics.total > 0
                    ? Math.round((stage.value / metrics.total) * 100)
                    : 0;
                  const prevValue = index > 0 ? funnelData[index - 1].value : metrics.total;
                  const conversionFromPrev = prevValue > 0
                    ? Math.round((stage.value / prevValue) * 100)
                    : 0;

                  return (
                    <div key={stage.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{stage.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{stage.value}</span>
                          <Badge variant="secondary" className="text-xs">
                            {percentage}%
                          </Badge>
                          {index > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ({conversionFromPrev}% do anterior)
                            </span>
                          )}
                        </div>
                      </div>
                      <Progress
                        value={percentage}
                        className="h-2"
                        style={{
                          // @ts-ignore
                          "--progress-background": stage.color,
                        } as React.CSSProperties}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ranking de Responsáveis */}
      {metrics.leads_por_responsavel.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Performance por Responsável
            </CardTitle>
            <CardDescription>
              Ranking de leads e conversões por responsável
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <div className="space-y-3">
                {metrics.leads_por_responsavel.slice(0, 5).map((resp, index) => (
                  <div
                    key={resp.responsavel_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`
                        h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold
                        ${index === 0 ? "bg-yellow-100 text-yellow-700" :
                          index === 1 ? "bg-gray-100 text-gray-700" :
                          index === 2 ? "bg-orange-100 text-orange-700" :
                          "bg-muted text-muted-foreground"}
                      `}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{resp.responsavel_nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {resp.convertidos} convertidos
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{resp.total} leads</p>
                      <p className="text-xs text-green-600">{resp.taxa_conversao}% conversão</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              onClick={() => navigate("/leads")}
            >
              <Users className="h-4 w-4 mr-2" />
              <div className="text-left">
                <p className="font-medium">Ver Todos os Leads</p>
                <p className="text-xs text-muted-foreground">{metrics.total} cadastrados</p>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              onClick={() => navigate("/leads?status=novo")}
            >
              <Clock className="h-4 w-4 mr-2" />
              <div className="text-left">
                <p className="font-medium">Leads Novos</p>
                <p className="text-xs text-muted-foreground">{metrics.novos} aguardando contato</p>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              onClick={() => navigate("/funil")}
            >
              <Target className="h-4 w-4 mr-2" />
              <div className="text-left">
                <p className="font-medium">Funil de Vendas</p>
                <p className="text-xs text-muted-foreground">Visualizar kanban</p>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              onClick={() => navigate("/indicacoes")}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              <div className="text-left">
                <p className="font-medium">Indicações</p>
                <p className="text-xs text-muted-foreground">Programa de indicação</p>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { useFunilChartDataAdapter, useFunilMetricsAdapter } from '@/hooks/useFunilMetricsAdapter';

interface FunilMetricsChartProps {
  funilId: string | undefined;
}

// ============================================
// Componente: FunilChart
// Gráfico de funil visual
// ============================================
export function FunilChart({ funilId }: FunilMetricsChartProps) {
  const { funnelData, isLoading } = useFunilChartDataAdapter(funilId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funil de Conversão</CardTitle>
          <CardDescription>Visualização do funil</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funil de Conversão</CardTitle>
        <CardDescription>Leads por etapa ativa</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <FunnelChart>
            <Tooltip
              formatter={(value: number) => [`${value} leads`, 'Quantidade']}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            <Funnel
              data={funnelData}
              dataKey="value"
              nameKey="name"
              isAnimationActive
            >
              {funnelData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
              <LabelList
                position="right"
                fill="#000"
                stroke="none"
                dataKey="name"
                formatter={(value: string) => `${value}`}
              />
              <LabelList
                position="center"
                fill="#fff"
                stroke="none"
                dataKey="value"
                formatter={(value: number) => `${value}`}
              />
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ============================================
// Componente: ValorPorEtapaChart
// Gráfico de barras de valor por etapa
// ============================================
export function ValorPorEtapaChart({ funilId }: FunilMetricsChartProps) {
  const { valorData, isLoading } = useFunilChartDataAdapter(funilId);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `R$${(value / 1000).toFixed(0)}k`;
    }
    return `R$${value}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Valor por Etapa</CardTitle>
          <CardDescription>Pipeline de valor estimado</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Valor por Etapa</CardTitle>
        <CardDescription>Pipeline de valor estimado</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={valorData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis
              type="number"
              tickFormatter={formatCurrency}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={100}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), 'Valor']}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
              {valorData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ============================================
// Componente: TempoPorEtapaChart
// Gráfico de tempo médio por etapa
// ============================================
export function TempoPorEtapaChart({ funilId }: FunilMetricsChartProps) {
  const { tempoData, isLoading } = useFunilChartDataAdapter(funilId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tempo Médio por Etapa</CardTitle>
          <CardDescription>Dias médios em cada etapa</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tempo Médio por Etapa</CardTitle>
        <CardDescription>Dias médios em cada etapa</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={tempoData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${value}d`}
            />
            <Tooltip
              formatter={(value: number) => [`${value} dias`, 'Tempo médio']}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            <Bar dataKey="dias" radius={[4, 4, 0, 0]}>
              {tempoData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ============================================
// Componente: ConversaoChart
// Gráfico de pizza de conversão
// ============================================
export function ConversaoChart({ funilId }: FunilMetricsChartProps) {
  const { overview, isLoading } = useFunilMetricsAdapter(funilId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Taxa de Conversão</CardTitle>
          <CardDescription>Resultados do funil</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!overview) return null;

  const ativos = overview.total_leads - overview.leads_ganhos - overview.leads_perdidos;

  const data = [
    { name: 'Ativos', value: ativos, fill: 'hsl(var(--primary))' },
    { name: 'Ganhos', value: overview.leads_ganhos, fill: '#22c55e' },
    { name: 'Perdidos', value: overview.leads_perdidos, fill: '#ef4444' },
  ].filter((d) => d.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição de Leads</CardTitle>
        <CardDescription>Status atual dos leads</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`${value} leads`, 'Quantidade']}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ============================================
// Componente: ResponsavelChart
// Gráfico de desempenho por responsável
// ============================================
export function ResponsavelChart({ funilId }: FunilMetricsChartProps) {
  const { responsavelMetrics, isLoading } = useFunilMetricsAdapter(funilId);

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `R$${(value / 1000).toFixed(0)}k`;
    }
    return `R$${value}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Desempenho por Responsável</CardTitle>
          <CardDescription>Leads e conversão por usuário</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (responsavelMetrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Desempenho por Responsável</CardTitle>
          <CardDescription>Leads e conversão por usuário</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
          Nenhum responsável atribuído
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desempenho por Responsável</CardTitle>
        <CardDescription>Leads e conversão por usuário</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={responsavelMetrics} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="responsavel_nome"
              width={100}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'valor_total') return [formatCurrency(value), 'Valor'];
                if (name === 'taxa_conversao') return [`${value}%`, 'Conversão'];
                return [value, name];
              }}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            <Legend />
            <Bar dataKey="total_leads" name="Total Leads" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            <Bar dataKey="leads_ganhos" name="Ganhos" fill="#22c55e" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

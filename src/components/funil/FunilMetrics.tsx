import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Trophy,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFunilMetricsAdapter } from '@/hooks/useFunilMetricsAdapter';

interface FunilMetricsProps {
  funilId: string | undefined;
  compact?: boolean;
}

export function FunilMetrics({ funilId, compact = false }: FunilMetricsProps) {
  const { overview, etapasMetrics, isLoading } = useFunilMetricsAdapter(funilId);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}k`;
    }
    return `R$ ${value.toLocaleString('pt-BR')}`;
  };

  const totalEsfriando = etapasMetrics.reduce((acc, e) => acc + e.leads_esfriando, 0);

  if (isLoading) {
    return (
      <div className={cn('grid gap-4', compact ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-4')}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!overview) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-4 flex-wrap">
        <Badge variant="secondary" className="gap-1">
          <Users className="h-3 w-3" />
          {overview.total_leads} leads
        </Badge>
        <Badge variant="outline" className="gap-1 text-green-600 border-green-200">
          <DollarSign className="h-3 w-3" />
          {formatCurrency(overview.total_valor)}
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Trophy className="h-3 w-3 text-green-600" />
          {overview.leads_ganhos} ganhos
        </Badge>
        <Badge variant="outline" className="gap-1">
          <XCircle className="h-3 w-3 text-red-500" />
          {overview.leads_perdidos} perdidos
        </Badge>
        {totalEsfriando > 0 && (
          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200">
            <AlertTriangle className="h-3 w-3" />
            {totalEsfriando} esfriando
          </Badge>
        )}
        <Badge variant="outline" className="gap-1">
          <TrendingUp className="h-3 w-3" />
          {overview.taxa_conversao}% conversão
        </Badge>
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      {/* Total de Leads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overview.total_leads}</div>
          <p className="text-xs text-muted-foreground">
            +{overview.leads_novos_periodo} novos este mês
          </p>
        </CardContent>
      </Card>

      {/* Valor Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valor Pipeline</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(overview.total_valor)}</div>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(overview.valor_ganho_periodo)} ganhos
          </p>
        </CardContent>
      </Card>

      {/* Taxa de Conversão */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overview.taxa_conversao}%</div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-600">
              <Trophy className="h-3 w-3 inline mr-1" />
              {overview.leads_ganhos} ganhos
            </span>
            <span className="text-red-500">
              <XCircle className="h-3 w-3 inline mr-1" />
              {overview.leads_perdidos} perdidos
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Leads Esfriando */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Leads Esfriando</CardTitle>
          <AlertTriangle className={cn(
            'h-4 w-4',
            totalEsfriando > 0 ? 'text-amber-500' : 'text-muted-foreground'
          )} />
        </CardHeader>
        <CardContent>
          <div className={cn(
            'text-2xl font-bold',
            totalEsfriando > 0 && 'text-amber-500'
          )}>
            {totalEsfriando}
          </div>
          <p className="text-xs text-muted-foreground">
            Acima do tempo ideal na etapa
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Componente: EtapaMetricsBar
// Barra de métricas inline para etapa
// ============================================
interface EtapaMetricsBarProps {
  etapaId: string;
  funilId: string;
}

export function EtapaMetricsBar({ etapaId, funilId }: EtapaMetricsBarProps) {
  const { etapasMetrics, isLoading } = useFunilMetrics(funilId);

  const etapaMetrics = etapasMetrics.find((e) => e.etapa_id === etapaId);

  if (isLoading || !etapaMetrics) {
    return null;
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `R$${(value / 1000).toFixed(0)}k`;
    }
    return `R$${value}`;
  };

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{etapaMetrics.total_leads} leads</span>
      {etapaMetrics.valor_total > 0 && (
        <>
          <span>•</span>
          <span className="text-green-600">
            {formatCurrency(etapaMetrics.valor_total)}
          </span>
        </>
      )}
      {etapaMetrics.tempo_medio_dias > 0 && (
        <>
          <span>•</span>
          <span>
            <Clock className="h-3 w-3 inline mr-0.5" />
            {etapaMetrics.tempo_medio_dias}d média
          </span>
        </>
      )}
      {etapaMetrics.leads_esfriando > 0 && (
        <>
          <span>•</span>
          <span className="text-amber-500">
            <AlertTriangle className="h-3 w-3 inline mr-0.5" />
            {etapaMetrics.leads_esfriando} esfriando
          </span>
        </>
      )}
    </div>
  );
}

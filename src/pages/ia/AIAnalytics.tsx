import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Zap,
  Clock,
  DollarSign,
  Activity,
} from 'lucide-react';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function AIAnalytics() {
  const navigate = useNavigate();
  const { tenant, isLoading: isTenantLoading } = useTenantContext();

  const { data: analyses = [], isLoading, refetch } = useQuery({
    queryKey: ['mt-ai-agent-analyses', tenant?.id],
    queryFn: async () => {
      let query = (supabase as any)
        .from('mt_ai_agent_analyses')
        .select('id, score, total_tokens, processing_time_ms, created_at')
        .order('created_at', { ascending: false });

      if (tenant) {
        query = query.eq('tenant_id', tenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !isTenantLoading,
  });

  if (isTenantLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = analyses.reduce(
    (acc: any, item: any) => {
      acc.totalAnalyses += 1;
      acc.totalScore += item.score || 0;
      acc.totalTokens += item.total_tokens || 0;
      acc.totalProcessingTime += item.processing_time_ms || 0;
      return acc;
    },
    { totalAnalyses: 0, totalScore: 0, totalTokens: 0, totalProcessingTime: 0 }
  );

  const avgScore = stats.totalAnalyses > 0
    ? (stats.totalScore / stats.totalAnalyses).toFixed(1)
    : '0';
  const avgProcessingTime = stats.totalAnalyses > 0
    ? Math.round(stats.totalProcessingTime / stats.totalAnalyses)
    : 0;

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
            <span>Analytics</span>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Analytics da IA
          </h1>
          <p className="text-muted-foreground">
            Metricas e estatisticas de uso da inteligencia artificial
            {tenant && ` - ${tenant.nome_fantasia}`}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Analises</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-20 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold">{stats.totalAnalyses.toLocaleString('pt-BR')}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score Medio</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-20 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold">{avgScore}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Utilizados</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-20 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold">{stats.totalTokens.toLocaleString('pt-BR')}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Medio (ms)</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-20 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold">{avgProcessingTime.toLocaleString('pt-BR')}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info */}
      <Card>
        <CardContent className="py-8 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-medium mb-1">Graficos em breve</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Graficos detalhados de uso por periodo, custos e performance
            serao adicionados nas proximas sprints.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

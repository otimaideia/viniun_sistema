import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Cog,
  Loader2,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AILearningJob } from '@/types/ai-sales-assistant';

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
  running: { label: 'Processando', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Concluido', color: 'bg-green-100 text-green-700' },
  failed: { label: 'Falhou', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelado', color: 'bg-gray-100 text-gray-700' },
};

export default function AILearningJobs() {
  const navigate = useNavigate();
  const { tenant, isLoading: isTenantLoading } = useTenantContext();

  const { data: jobs = [], isLoading, refetch } = useQuery({
    queryKey: ['mt-ai-learning-jobs', tenant?.id],
    queryFn: async () => {
      let query = supabase
        .from('mt_ai_learning_jobs' as never)
        .select('*')
        .order('created_at', { ascending: false });

      if (tenant) {
        query = query.eq('tenant_id', tenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AILearningJob[];
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

  const totalProcessed = jobs.reduce((sum, j) => sum + (j.items_processed || 0), 0);
  const totalTokens = jobs.reduce((sum, j) => {
    const meta = (j as Record<string, unknown>).total_tokens as number | undefined;
    return sum + (meta || 0);
  }, 0);

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
            <span>Jobs de Aprendizado</span>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cog className="h-6 w-6" />
            Jobs de Aprendizado
          </h1>
          <p className="text-muted-foreground">
            Acompanhe os jobs de aprendizado da IA
            {tenant && ` - ${tenant.nome_fantasia}`}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Jobs</CardTitle>
            <Cog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Itens Processados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProcessed.toLocaleString('pt-BR')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Usados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTokens.toLocaleString('pt-BR')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fonte</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Itens Processados</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Custo (USD)</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6} className="h-12">
                      <div className="h-4 w-full bg-muted animate-pulse rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Cog className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">Nenhum job de aprendizado registrado</p>
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job) => {
                  const statusBadge = STATUS_BADGES[job.status] || {
                    label: job.status,
                    color: 'bg-gray-100 text-gray-700',
                  };
                  const costUsd = (job as Record<string, unknown>).estimated_cost_usd as number | undefined;

                  return (
                    <TableRow key={job.id}>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {job.source}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusBadge.color}>{statusBadge.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{job.items_processed}</span>
                        <span className="text-muted-foreground"> / {job.items_total}</span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {((job as Record<string, unknown>).total_tokens as number || 0).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {costUsd != null ? `$${Number(costUsd).toFixed(4)}` : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(job.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

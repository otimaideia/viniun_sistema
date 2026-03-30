import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, CheckCircle2, Clock, ClipboardList, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTenantContext } from '@/contexts/TenantContext';
import { TenantSelector } from '@/components/multitenant/TenantSelector';
import { useSOPsMT } from '@/hooks/multitenant/useSOPsMT';
import { useSOPExecutionsMT } from '@/hooks/multitenant/useSOPExecutionsMT';

export default function SOPDashboard() {
  const { accessLevel } = useTenantContext();
  const { data: sops, isLoading: isLoadingSops } = useSOPsMT();
  const { executions, isLoading: isLoadingExec } = useSOPExecutionsMT();

  const metrics = useMemo(() => {
    const totalSops = sops?.length || 0;
    const publicados = sops?.filter((s) => s.status === 'publicado').length || 0;
    const emRevisao = sops?.filter((s) => s.status === 'em_revisao').length || 0;
    const rascunhos = sops?.filter((s) => s.status === 'rascunho').length || 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const execucoesMes = executions?.filter(
      (e) => new Date(e.created_at) >= startOfMonth
    ).length || 0;

    // Top SOPs by execution count
    const sopExecCount = new Map<string, { titulo: string; count: number }>();
    executions?.forEach((exec) => {
      const sopId = exec.sop_id;
      const titulo = exec.sop?.titulo || 'POP';
      const existing = sopExecCount.get(sopId);
      if (existing) {
        existing.count++;
      } else {
        sopExecCount.set(sopId, { titulo, count: 1 });
      }
    });
    const topSops = Array.from(sopExecCount.entries())
      .map(([id, data]) => ({ sop_id: id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { totalSops, publicados, emRevisao, rascunhos, execucoesMes, topSops };
  }, [sops, executions]);

  const isLoading = isLoadingSops || isLoadingExec;

  return (
    <div className="space-y-6">
      {accessLevel === 'platform' && <TenantSelector variant="dropdown" />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6" />
            Dashboard de Processos
          </h1>
          <p className="text-muted-foreground mt-1">
            Visao geral dos procedimentos operacionais
          </p>
        </div>
        <Button asChild>
          <Link to="/processos">
            <ClipboardList className="h-4 w-4 mr-2" />
            Ver POPs
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="h-16 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <ClipboardList className="h-4 w-4" />
                  Total POPs
                </div>
                <p className="text-3xl font-bold">{metrics.totalSops}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="h-16 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Publicados
                </div>
                <p className="text-3xl font-bold text-green-600">{metrics.publicados}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="h-16 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  Em Revisao
                </div>
                <p className="text-3xl font-bold text-yellow-600">{metrics.emRevisao}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="h-16 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  Execucoes do Mes
                </div>
                <p className="text-3xl font-bold text-blue-600">{metrics.execucoesMes}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Grafico de Execucoes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 bg-muted/50 rounded-lg flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Grafico de execucoes por periodo
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Top SOPs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">POPs Mais Executados</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-8 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : metrics.topSops.length === 0 ? (
              <div className="h-48 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Nenhuma execucao registrada.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.topSops.map((item, index) => (
                  <Link
                    key={item.sop_id}
                    to={`/processos/${item.sop_id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium truncate max-w-[200px]">
                        {item.titulo}
                      </span>
                    </div>
                    <Badge variant="secondary">{item.count}x</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

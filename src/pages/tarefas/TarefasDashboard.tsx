import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenantContext } from '@/contexts/TenantContext';
import { useTarefasMT } from '@/hooks/multitenant/useTarefasMT';
import { useMinhasTarefasMT } from '@/hooks/multitenant/useMinhasTarefasMT';
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, TASK_PRIORITY_COLORS, calcTaskTimeMetrics, formatDuration } from '@/types/tarefa';
import type { MTTask, TaskStatus } from '@/types/tarefa';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ListTodo, AlertTriangle, CheckCircle2, Clock, TrendingUp, Users, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ALL_STATUSES: TaskStatus[] = ['pendente', 'em_andamento', 'aguardando', 'concluida', 'finalizada', 'recusada', 'cancelada'];

const PRIORITY_LABELS: Record<string, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
};

export default function TarefasDashboard() {
  const navigate = useNavigate();
  const { tenant } = useTenantContext();
  const { tasks, isLoading, stats } = useTarefasMT({ has_parent: false });
  const { stats: minhasStats } = useMinhasTarefasMT();

  // --- Computed: KPIs ---
  const kpis = useMemo(() => {
    if (!tasks.length) return { ativas: 0, atrasadas: 0, aguardandoConferencia: 0, slaPct: 0 };

    const now = new Date();
    const ativas = tasks.filter(t => !['finalizada', 'cancelada'].includes(t.status)).length;
    const atrasadas = tasks.filter(t =>
      t.due_date &&
      new Date(t.due_date) < now &&
      !['finalizada', 'cancelada'].includes(t.status)
    ).length;
    const aguardandoConferencia = tasks.filter(t => t.status === 'concluida').length;

    // SLA: % of finalized tasks where completed_at <= due_date
    const finalizadas = tasks.filter(t => t.status === 'finalizada');
    const finalizadasComPrazo = finalizadas.filter(t => t.due_date && t.completed_at);
    const slaCumprido = finalizadasComPrazo.filter(t =>
      new Date(t.completed_at!) <= new Date(t.due_date!)
    ).length;
    const slaPct = finalizadasComPrazo.length > 0
      ? Math.round((slaCumprido / finalizadasComPrazo.length) * 100)
      : 0;

    return { ativas, atrasadas, aguardandoConferencia, slaPct };
  }, [tasks]);

  // --- Computed: Status chart data ---
  const statusChartData = useMemo(() => {
    return ALL_STATUSES
      .map(status => ({
        name: TASK_STATUS_LABELS[status],
        value: tasks.filter(t => t.status === status).length,
        color: TASK_STATUS_COLORS[status],
      }))
      .filter(d => d.value > 0);
  }, [tasks]);

  // --- Computed: Priority chart data ---
  const priorityChartData = useMemo(() => {
    const priorities = ['urgente', 'alta', 'normal', 'baixa'] as const;
    return priorities.map(p => ({
      name: PRIORITY_LABELS[p],
      count: tasks.filter(t => t.prioridade === p).length,
      fill: TASK_PRIORITY_COLORS[p],
    }));
  }, [tasks]);

  // --- Computed: Time metrics ---
  const timeMetrics = useMemo(() => {
    const finalizadas = tasks.filter(t => t.status === 'finalizada');
    if (!finalizadas.length) return null;

    const metrics = finalizadas.map(t => calcTaskTimeMetrics(t));

    const avg = (arr: (number | null)[]) => {
      const valid = arr.filter((v): v is number => v !== null);
      return valid.length > 0 ? Math.round(valid.reduce((s, v) => s + v, 0) / valid.length) : null;
    };

    const aprovadas = finalizadas.filter(t => t.finalization_status === 'aprovada').length;
    const taxaAprovacao = finalizadas.length > 0
      ? Math.round((aprovadas / finalizadas.length) * 100)
      : 0;

    return {
      avgExecucao: avg(metrics.map(m => m.tempo_execucao_min)),
      avgConferencia: avg(metrics.map(m => m.tempo_conferencia_min)),
      avgTotal: avg(metrics.map(m => m.tempo_total_min)),
      taxaAprovacao,
      totalFinalizadas: finalizadas.length,
    };
  }, [tasks]);

  // --- Computed: Overdue tasks ---
  const overdueTasks = useMemo(() => {
    const now = new Date();
    return tasks
      .filter(t =>
        t.due_date &&
        new Date(t.due_date) < now &&
        !['finalizada', 'cancelada'].includes(t.status)
      )
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 10);
  }, [tasks]);

  const getDiasAtraso = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    return Math.ceil((now.getTime() - due.getTime()) / 86400000);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard de Tarefas</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!tasks.length) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard de Tarefas</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ListTodo className="h-12 w-12 mb-4" />
            <p className="text-lg">Nenhuma tarefa encontrada</p>
            <p className="text-sm mt-1">Crie tarefas para visualizar as estatísticas.</p>
            <Button className="mt-4" onClick={() => navigate('/tarefas/novo')}>
              Criar Tarefa
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard de Tarefas</h1>
        <Button variant="outline" onClick={() => navigate('/tarefas')}>
          <ListTodo className="h-4 w-4 mr-2" />
          Ver Tarefas
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ativas</p>
                <p className="text-3xl font-bold text-blue-600">{kpis.ativas}</p>
              </div>
              <ListTodo className="h-8 w-8 text-blue-500 opacity-70" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              de {tasks.length} no total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Atrasadas</p>
                <p className="text-3xl font-bold text-red-600">{kpis.atrasadas}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500 opacity-70" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {kpis.ativas > 0
                ? `${Math.round((kpis.atrasadas / kpis.ativas) * 100)}% das ativas`
                : 'sem tarefas ativas'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aguardando Conferência</p>
                <p className="text-3xl font-bold text-amber-600">{kpis.aguardandoConferencia}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500 opacity-70" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              concluídas aguardando aprovação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">% SLA Cumprido</p>
                <p className="text-3xl font-bold text-green-600">{kpis.slaPct}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-70" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              finalizadas dentro do prazo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [value, name]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                Sem dados
              </div>
            )}
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tarefas por Prioridade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={priorityChartData}
                layout="vertical"
                margin={{ left: 10, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={70} />
                <Tooltip formatter={(value: number) => [value, 'Tarefas']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={28}>
                  {priorityChartData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Time Metrics */}
      {timeMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Métricas de Tempo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Tempo Médio de Execução</p>
                <p className="text-xl font-semibold">{formatDuration(timeMetrics.avgExecucao)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Tempo Médio de Conferência</p>
                <p className="text-xl font-semibold">{formatDuration(timeMetrics.avgConferencia)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Tempo Médio Total</p>
                <p className="text-xl font-semibold">{formatDuration(timeMetrics.avgTotal)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Taxa de Aprovação</p>
                <p className="text-xl font-semibold text-green-600">
                  {timeMetrics.taxaAprovacao}%
                </p>
                <p className="text-xs text-muted-foreground">
                  de {timeMetrics.totalFinalizadas} finalizadas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overdue Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Tarefas Atrasadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overdueTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mb-2 text-green-500" />
              <p>Nenhuma tarefa atrasada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Título</th>
                    <th className="pb-2 font-medium">Responsáveis</th>
                    <th className="pb-2 font-medium">Prazo</th>
                    <th className="pb-2 font-medium text-center">Dias de Atraso</th>
                    <th className="pb-2 font-medium text-center">Prioridade</th>
                    <th className="pb-2 font-medium text-center">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueTasks.map(task => (
                    <tr
                      key={task.id}
                      className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/tarefas/${task.id}`)}
                    >
                      <td className="py-3 pr-4 font-medium max-w-[250px] truncate">
                        {task.titulo}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[150px]">
                            {task.assignees?.map(a => a.user?.nome?.split(' ')[0]).join(', ') || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap text-red-600">
                        {task.due_date
                          ? format(new Date(task.due_date), "dd/MM/yyyy", { locale: ptBR })
                          : '-'}
                      </td>
                      <td className="py-3 text-center">
                        <Badge variant="destructive" className="text-xs">
                          {getDiasAtraso(task.due_date!)}d
                        </Badge>
                      </td>
                      <td className="py-3 text-center">
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: TASK_PRIORITY_COLORS[task.prioridade],
                            color: TASK_PRIORITY_COLORS[task.prioridade],
                          }}
                          className="text-xs"
                        >
                          {PRIORITY_LABELS[task.prioridade]}
                        </Badge>
                      </td>
                      <td className="py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/tarefas/${task.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

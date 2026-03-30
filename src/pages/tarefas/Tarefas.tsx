import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenantContext } from '@/contexts/TenantContext';
import { useMinhasTarefasMT } from '@/hooks/multitenant/useMinhasTarefasMT';
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
  calcTaskTimeMetrics,
  formatDuration,
} from '@/types/tarefa';
import type { TaskStatus, TaskPriority, MTTask } from '@/types/tarefa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Search,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  Filter,
  Users,
  Send,
  Inbox,
} from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// === Helpers ===

function filterTasks(
  tasks: MTTask[],
  search: string,
  statusFilter: string,
  priorityFilter: string,
  onlyOverdue: boolean
): MTTask[] {
  let filtered = tasks;

  if (search.trim()) {
    const term = search.toLowerCase().trim();
    filtered = filtered.filter((t) =>
      t.titulo.toLowerCase().includes(term)
    );
  }

  if (statusFilter && statusFilter !== 'all') {
    filtered = filtered.filter((t) => t.status === statusFilter);
  }

  if (priorityFilter && priorityFilter !== 'all') {
    filtered = filtered.filter((t) => t.prioridade === priorityFilter);
  }

  if (onlyOverdue) {
    const now = new Date();
    filtered = filtered.filter(
      (t) =>
        t.due_date &&
        new Date(t.due_date) < now &&
        !['finalizada', 'cancelada', 'concluida'].includes(t.status)
    );
  }

  return filtered;
}

// === Components ===

function TaskCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}

function TaskCard({
  task,
  showDelegator,
  onClick,
}: {
  task: MTTask;
  showDelegator?: boolean;
  onClick: () => void;
}) {
  const metrics = calcTaskTimeMetrics(task);
  const isOverdue =
    task.due_date &&
    isPast(new Date(task.due_date)) &&
    !['finalizada', 'cancelada', 'concluida'].includes(task.status);

  const assigneeNames =
    task.assignees
      ?.map((a) => a.user?.nome || 'Sem nome')
      .join(', ') || 'Nenhum responsavel';

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
      style={{ borderLeftColor: TASK_STATUS_COLORS[task.status] }}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          {/* Row 1: Title + Priority */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-sm leading-snug line-clamp-2 flex-1">
              {task.titulo}
            </h3>
            <Badge
              className="shrink-0 text-xs"
              style={{
                backgroundColor: TASK_PRIORITY_COLORS[task.prioridade],
                color: '#fff',
              }}
            >
              {TASK_PRIORITY_LABELS[task.prioridade]}
            </Badge>
          </div>

          {/* Row 2: Status + Category */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs"
              style={{
                borderColor: TASK_STATUS_COLORS[task.status],
                color: TASK_STATUS_COLORS[task.status],
              }}
            >
              {TASK_STATUS_LABELS[task.status]}
            </Badge>

            {task.category && (
              <Badge
                variant="secondary"
                className="text-xs"
                style={{
                  backgroundColor: task.category.cor + '20',
                  color: task.category.cor,
                }}
              >
                {task.category.nome}
              </Badge>
            )}

            {task.tags?.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {task.tags.length} tag{task.tags.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {/* Row 3: Due date + Overdue */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {task.due_date && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                <Clock className="h-3 w-3" />
                {format(new Date(task.due_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                {isOverdue && metrics.dias_atraso && (
                  <span className="text-red-600 font-semibold ml-1">
                    ({metrics.dias_atraso}d atrasada)
                  </span>
                )}
              </span>
            )}

            {!task.due_date && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Sem prazo
              </span>
            )}
          </div>

          {/* Row 4: Assignees + Delegator + Created */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1" title="Responsaveis">
              <Users className="h-3 w-3" />
              {assigneeNames}
            </span>

            {showDelegator && task.delegator && (
              <span className="flex items-center gap-1" title="Delegado por">
                <Send className="h-3 w-3" />
                {task.delegator.nome}
              </span>
            )}

            <span className="ml-auto" title={format(new Date(task.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}>
              {formatDistanceToNow(new Date(task.created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// === Main Page ===

export default function Tarefas() {
  const navigate = useNavigate();
  const { isLoading: isTenantLoading } = useTenantContext();
  const {
    assigned,
    delegated,
    aguardandoConferencia,
    overdue,
    isLoading,
    stats,
  } = useMinhasTarefasMT();

  const [activeTab, setActiveTab] = useState('assigned');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  const filteredAssigned = useMemo(
    () => filterTasks(assigned, search, statusFilter, priorityFilter, onlyOverdue),
    [assigned, search, statusFilter, priorityFilter, onlyOverdue]
  );

  const filteredDelegated = useMemo(
    () => filterTasks(delegated, search, statusFilter, priorityFilter, onlyOverdue),
    [delegated, search, statusFilter, priorityFilter, onlyOverdue]
  );

  const filteredAguardando = useMemo(
    () => filterTasks(aguardandoConferencia, search, statusFilter, priorityFilter, onlyOverdue),
    [aguardandoConferencia, search, statusFilter, priorityFilter, onlyOverdue]
  );

  const loading = isTenantLoading || isLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight">Tarefas</h1>

          {!loading && stats.overdue_count > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {stats.overdue_count} atrasada{stats.overdue_count > 1 ? 's' : ''}
            </Badge>
          )}

          {!loading && stats.aguardando_conferencia_count > 0 && (
            <Badge className="gap-1 bg-amber-500 hover:bg-amber-600">
              <CheckCircle2 className="h-3 w-3" />
              {stats.aguardando_conferencia_count} aguardando conferencia
            </Badge>
          )}
        </div>

        <Button onClick={() => navigate('/tarefas/novo')} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Tarefa
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {TASK_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {(Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map((p) => (
              <SelectItem key={p} value={p}>
                {TASK_PRIORITY_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={onlyOverdue ? 'destructive' : 'outline'}
          size="default"
          onClick={() => setOnlyOverdue(!onlyOverdue)}
          className="gap-2 whitespace-nowrap"
        >
          <AlertTriangle className="h-4 w-4" />
          Atrasadas
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="assigned" className="gap-1.5">
            <Inbox className="h-4 w-4" />
            <span className="hidden sm:inline">Minhas Tarefas</span>
            <span className="sm:hidden">Minhas</span>
            {!loading && assigned.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {assigned.length}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger value="delegated" className="gap-1.5">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Delegadas por Mim</span>
            <span className="sm:hidden">Delegadas</span>
            {!loading && delegated.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {delegated.length}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger value="conferencia" className="gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            <span className="hidden sm:inline">Aguardando Conferencia</span>
            <span className="sm:hidden">Conferencia</span>
            {!loading && aguardandoConferencia.length > 0 && (
              <Badge className="ml-1 h-5 px-1.5 text-xs bg-amber-500">
                {aguardandoConferencia.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Minhas Tarefas */}
        <TabsContent value="assigned" className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <TaskCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredAssigned.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Nenhuma tarefa atribuida"
              description={
                search || statusFilter !== 'all' || priorityFilter !== 'all' || onlyOverdue
                  ? 'Nenhuma tarefa encontrada com os filtros selecionados.'
                  : 'Voce nao tem tarefas pendentes no momento.'
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredAssigned.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  showDelegator
                  onClick={() => navigate(`/tarefas/${task.id}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Delegadas por Mim */}
        <TabsContent value="delegated" className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <TaskCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredDelegated.length === 0 ? (
            <EmptyState
              icon={Send}
              title="Nenhuma tarefa delegada"
              description={
                search || statusFilter !== 'all' || priorityFilter !== 'all' || onlyOverdue
                  ? 'Nenhuma tarefa encontrada com os filtros selecionados.'
                  : 'Voce nao delegou nenhuma tarefa ativa no momento.'
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredDelegated.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => navigate(`/tarefas/${task.id}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Aguardando Conferencia */}
        <TabsContent value="conferencia" className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <TaskCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredAguardando.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Nenhuma tarefa aguardando conferencia"
              description={
                search || statusFilter !== 'all' || priorityFilter !== 'all' || onlyOverdue
                  ? 'Nenhuma tarefa encontrada com os filtros selecionados.'
                  : 'Nenhuma tarefa concluida esperando sua aprovacao.'
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredAguardando.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => navigate(`/tarefas/${task.id}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * TriggerExecutionLog - Histórico de execuções de Pipeline Triggers
 *
 * Melhorias: filtros por status, tempo relativo, stats resumo, expandir erros
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  CheckCircle,
  XCircle,
  MinusCircle,
  Clock,
  RefreshCw,
  Activity,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';
import { useTriggerExecutions } from '@/hooks/usePipelineTriggers';

interface TriggerExecutionLogProps {
  funilId: string;
}

type StatusFilter = 'todos' | 'sucesso' | 'erro' | 'executando';

export function TriggerExecutionLog({ funilId }: TriggerExecutionLogProps) {
  const { executions, isLoading, refetch } = useTriggerExecutions(funilId, 100);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filtrar execuções por status
  const filteredExecutions = useMemo(() => {
    if (statusFilter === 'todos') return executions;
    return executions.filter((e) => e.status === statusFilter);
  }, [executions, statusFilter]);

  // Stats resumo
  const stats = useMemo(() => {
    const s = { sucesso: 0, erro: 0, executando: 0, outros: 0 };
    for (const e of executions) {
      if (e.status === 'sucesso') s.sucesso++;
      else if (e.status === 'erro') s.erro++;
      else if (e.status === 'executando') s.executando++;
      else s.outros++;
    }
    return s;
  }, [executions]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sucesso':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'erro':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'executando':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'cancelado':
        return <MinusCircle className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sucesso':
        return <Badge variant="default" className="bg-green-600 text-xs">Sucesso</Badge>;
      case 'erro':
        return <Badge variant="destructive" className="text-xs">Erro</Badge>;
      case 'executando':
        return <Badge variant="secondary" className="text-xs">Executando</Badge>;
      case 'cancelado':
        return <Badge variant="outline" className="text-xs">Cancelado</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Pendente</Badge>;
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diffMs = now - date;

    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return 'agora';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}min atrás`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d atrás`;

    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      mover_etapa: 'Mover Etapa',
      mensagem: 'Mensagem',
      webhook: 'Webhook',
      notificacao: 'Notificação',
      adicionar_tag: 'Tag',
      atribuir_usuario: 'Atribuir',
    };
    return labels[actionType] || actionType;
  };

  const filterButtons: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'todos', label: 'Todos', count: executions.length },
    { value: 'sucesso', label: 'Sucesso', count: stats.sucesso },
    { value: 'erro', label: 'Erros', count: stats.erro },
    { value: 'executando', label: 'Executando', count: stats.executando },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Histórico de Execuções
            </CardTitle>
            <CardDescription>
              {executions.length > 0 ? (
                <span className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    {stats.sucesso}
                  </span>
                  <span className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-red-600" />
                    {stats.erro}
                  </span>
                  {stats.executando > 0 && (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />
                      {stats.executando}
                    </span>
                  )}
                </span>
              ) : (
                'Nenhuma execução registrada'
              )}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : executions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma execução registrada</p>
            <p className="text-xs mt-1">As execuções aparecerão aqui quando leads forem movidos</p>
          </div>
        ) : (
          <>
            {/* Filtros por status */}
            <div className="flex items-center gap-1 mb-3">
              <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1" />
              {filterButtons.map((fb) => (
                <Button
                  key={fb.value}
                  variant={statusFilter === fb.value ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => setStatusFilter(fb.value)}
                >
                  {fb.label}
                  {fb.count > 0 && (
                    <span className="ml-1 opacity-70">({fb.count})</span>
                  )}
                </Button>
              ))}
            </div>

            <ScrollArea className="max-h-[500px]">
              <div className="space-y-2">
                {filteredExecutions.map((exec) => (
                  <div key={exec.id}>
                    <div
                      className={`flex items-center justify-between p-3 rounded-lg border bg-muted/20 ${
                        exec.error_message ? 'cursor-pointer hover:bg-muted/40' : ''
                      }`}
                      onClick={() => exec.error_message && setExpandedId(expandedId === exec.id ? null : exec.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {getStatusIcon(exec.status)}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {exec.workflow?.nome || 'Workflow'}
                            </span>
                            {getStatusBadge(exec.status)}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                              {getActionLabel(exec.workflow?.action_type || '')}
                            </Badge>
                            {exec.duration_ms != null && (
                              <>
                                <span>·</span>
                                <span>{exec.duration_ms}ms</span>
                              </>
                            )}
                            {exec.error_message && !expandedId && (
                              <>
                                <span>·</span>
                                <span className="text-red-500 truncate max-w-[200px]">{exec.error_message}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(exec.started_at)}
                        </span>
                        {exec.error_message && (
                          expandedId === exec.id
                            ? <ChevronUp className="h-3 w-3 text-muted-foreground" />
                            : <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {/* Detalhes expandidos do erro */}
                    {expandedId === exec.id && exec.error_message && (
                      <div className="ml-7 mt-1 p-2 rounded border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900">
                        <p className="text-xs text-red-700 dark:text-red-400 font-mono break-all">
                          {exec.error_message}
                        </p>
                        {exec.trigger_data && (
                          <details className="mt-2">
                            <summary className="text-[10px] text-muted-foreground cursor-pointer">
                              Input data
                            </summary>
                            <pre className="text-[10px] mt-1 overflow-auto max-h-[100px]">
                              {JSON.stringify(exec.trigger_data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {filteredExecutions.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Nenhuma execução com status "{statusFilter}"
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
}

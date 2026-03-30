// Página: Listagem de Operações de Adição em Massa a Grupos WhatsApp

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CalendarClock, Clock, History, Play, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGroupOperationsMT, type MTGroupOperation } from '@/hooks/multitenant/useGroupOperationsMT';
import { toast } from 'sonner';

// Retorna a data agendada (past ou future) se existir
function getAnyScheduledTime(op: MTGroupOperation): Date | null {
  const candidates = [op.next_run_after, op.scheduled_at].filter(Boolean) as string[];
  for (const c of candidates) {
    const d = new Date(c);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  processing: 'bg-blue-100 text-blue-800',
  pending: 'bg-gray-100 text-gray-800',
  paused: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  completed: 'Concluída',
  processing: 'Em andamento',
  pending: 'Pendente',
  paused: 'Pausada',
  failed: 'Falhou',
  cancelled: 'Cancelada',
};

export default function WhatsAppGrupoOperacoes() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [runningId, setRunningId] = useState<string | null>(null);

  const { operations, isLoading, refetch, isFetching, startOperation } = useGroupOperationsMT(
    statusFilter !== 'all' ? { status: statusFilter as any } : undefined
  );

  const now = new Date();

  // Agendadas FUTURAS
  const scheduledFutureOps = (operations || []).filter((op: MTGroupOperation) => {
    if (op.status !== 'pending') return false;
    const t = getAnyScheduledTime(op);
    return t !== null && t > now;
  });

  // Agendadas ATRASADAS (horário passou mas ainda pending)
  const scheduledLateOps = (operations || []).filter((op: MTGroupOperation) => {
    if (op.status !== 'pending') return false;
    const t = getAnyScheduledTime(op);
    return t !== null && t <= now;
  });

  // Histórico (todas as outras)
  const otherOps = (operations || []).filter((op: MTGroupOperation) => {
    if (op.status !== 'pending') return true;
    const t = getAnyScheduledTime(op);
    return t === null; // pending sem agendamento → vai pro histórico
  });

  const handleRunNow = async (op: MTGroupOperation) => {
    setRunningId(op.id);
    try {
      await startOperation.mutateAsync(op.id);
      toast.success('Operação iniciada!');
      refetch();
    } catch {
      toast.error('Erro ao iniciar operação');
    } finally {
      setRunningId(null);
    }
  };

  const renderOp = (op: MTGroupOperation, variant: 'future' | 'late' | 'other') => {
    const processed = op.added_count + op.failed_count + op.already_member_count + op.invalid_count;
    const scheduledTime = getAnyScheduledTime(op);
    const groupLink = op.group_id
      ? `/whatsapp/grupos/adicionar?group=${encodeURIComponent(op.group_id)}&session=${encodeURIComponent(op.session_name)}`
      : '/whatsapp/grupos/adicionar';

    const rowClass = variant === 'future'
      ? 'bg-blue-50 border-blue-200 hover:bg-blue-100/70'
      : variant === 'late'
      ? 'bg-amber-50 border-amber-200 hover:bg-amber-100/70'
      : 'bg-card hover:bg-muted/50';

    return (
      <div key={op.id} className={`flex items-start justify-between p-4 rounded-lg border transition-colors gap-4 ${rowClass}`}>
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {variant === 'future' && (
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 gap-1">
                <CalendarClock className="h-3 w-3" />
                Agendado
              </Badge>
            )}
            {variant === 'late' && (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 gap-1">
                <AlertTriangle className="h-3 w-3" />
                Aguardando disparo
              </Badge>
            )}
            {variant === 'other' && (
              <Badge variant="outline" className={STATUS_COLORS[op.status] || 'bg-gray-100'}>
                {STATUS_LABELS[op.status] || op.status}
              </Badge>
            )}
            <span className="text-sm font-semibold">{op.total_numbers} contatos</span>
            {op.group_name && (
              <span className="text-sm text-muted-foreground truncate">• {op.group_name}</span>
            )}
          </div>

          {scheduledTime && variant === 'future' && (
            <div className="flex items-center gap-1 text-xs font-medium text-blue-700">
              <CalendarClock className="h-3 w-3" />
              Início em {scheduledTime.toLocaleString('pt-BR')}
            </div>
          )}

          {scheduledTime && variant === 'late' && (
            <div className="flex items-center gap-1 text-xs font-medium text-amber-700">
              <AlertTriangle className="h-3 w-3" />
              Estava agendado para {scheduledTime.toLocaleString('pt-BR')} — não foi disparado automaticamente
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Criado em {new Date(op.created_at).toLocaleString('pt-BR')}
            </span>
            {op.session_name && <span>• {op.session_name}</span>}
            {op.batch_size && <span>• Lote {op.batch_size}</span>}
          </div>

          {processed > 0 && (
            <div className="flex gap-3 text-xs mt-0.5">
              {op.added_count > 0 && <span className="text-green-700 font-medium">+{op.added_count} adicionado</span>}
              {op.already_member_count > 0 && <span className="text-amber-700">{op.already_member_count} já membro</span>}
              {op.failed_count > 0 && <span className="text-red-700">{op.failed_count} falha</span>}
              {op.invalid_count > 0 && <span className="text-gray-600">{op.invalid_count} inválido</span>}
            </div>
          )}

          {op.status === 'processing' && op.last_processed_index != null && (
            <div className="text-xs text-blue-700 font-medium">
              Processando: {op.last_processed_index + 1}/{op.total_numbers}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          {variant === 'late' && (
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => handleRunNow(op)}
              disabled={runningId === op.id}
            >
              {runningId === op.id
                ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                : <Play className="h-3 w-3 mr-1" />
              }
              Executar agora
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link to={groupLink}>Ver grupo</Link>
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link to="/whatsapp/grupos">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Operações de Grupos</h1>
            <p className="text-muted-foreground text-sm">Histórico e operações agendadas de adição em massa</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button size="sm" asChild>
            <Link to="/whatsapp/grupos/adicionar">
              <Plus className="h-4 w-4 mr-1" />
              Nova Operação
            </Link>
          </Button>
        </div>
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Filtrar por status:</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente / Agendado</SelectItem>
            <SelectItem value="processing">Em andamento</SelectItem>
            <SelectItem value="completed">Concluída</SelectItem>
            <SelectItem value="paused">Pausada</SelectItem>
            <SelectItem value="failed">Falhou</SelectItem>
            <SelectItem value="cancelled">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          Carregando operações...
        </div>
      )}

      {!isLoading && (!operations || operations.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nenhuma operação encontrada.</p>
            <Button className="mt-4" asChild>
              <Link to="/whatsapp/grupos/adicionar">
                <Plus className="h-4 w-4 mr-1" />
                Criar primeira operação
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Atrasadas — horário passou e ainda pending */}
      {!isLoading && scheduledLateOps.length > 0 && (
        <Card className="border-amber-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Aguardando Disparo ({scheduledLateOps.length})
            </CardTitle>
            <CardDescription>
              O horário agendado já passou mas a operação não foi disparada automaticamente. Clique em "Executar agora" para iniciar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scheduledLateOps.map((op) => renderOp(op, 'late'))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agendadas futuras */}
      {!isLoading && scheduledFutureOps.length > 0 && (
        <Card className="border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <CalendarClock className="h-5 w-5" />
              Operações Agendadas ({scheduledFutureOps.length})
            </CardTitle>
            <CardDescription>Serão iniciadas automaticamente no horário programado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scheduledFutureOps.map((op) => renderOp(op, 'future'))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico */}
      {!isLoading && otherOps.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Operações ({otherOps.length})
            </CardTitle>
            <CardDescription>Operações concluídas, em andamento e canceladas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {otherOps.map((op) => renderOp(op, 'other'))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

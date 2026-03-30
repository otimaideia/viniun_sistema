import { useState, useRef, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTenantContext } from '@/contexts/TenantContext';
import { useTarefaMT } from '@/hooks/multitenant/useTarefaMT';
import { useTarefasMT } from '@/hooks/multitenant/useTarefasMT';
import { useTarefaCommentsMT } from '@/hooks/multitenant/useTarefaCommentsMT';
import { useTarefaAttachmentsMT } from '@/hooks/multitenant/useTarefaAttachmentsMT';
import { useTarefaActivitiesMT } from '@/hooks/multitenant/useTarefaActivitiesMT';
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_STATUS_DESCRIPTIONS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
  TASK_ACTIVITY_LABELS,
  calcTaskTimeMetrics,
  formatDuration,
} from '@/types/tarefa';
import type { TaskStatus, MTTaskComment, MTTaskActivity } from '@/types/tarefa';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Edit,
  Clock,
  User,
  Calendar,
  Tag,
  Paperclip,
  MessageSquare,
  Activity,
  CheckCircle2,
  XCircle,
  Play,
  AlertTriangle,
  Upload,
  FileText,
  Image,
  Loader2,
  Trash2,
  Send,
  ListChecks,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================================
// Timeline item: union of comment and activity for merged list
// ============================================================
type TimelineItem =
  | { type: 'comment'; data: MTTaskComment; created_at: string }
  | { type: 'activity'; data: MTTaskActivity; created_at: string };

// ============================================================
// Helper: format file size
// ============================================================
function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ============================================================
// Helper: is image file
// ============================================================
function isImageFile(type: string | null): boolean {
  return !!type && type.startsWith('image/');
}

// ============================================================
// Page Component
// ============================================================
export default function TarefaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useTenantContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Data hooks ---
  const { task, subTasks, isLoading, error, refetch } = useTarefaMT(id);
  const { changeStatus, finalize } = useTarefasMT();
  const { comments, isLoading: isLoadingComments, addComment, deleteComment } = useTarefaCommentsMT(id);
  const { attachments, isLoading: isLoadingAttachments, upload, uploading, remove: removeAttachment } = useTarefaAttachmentsMT(id);
  const { activities, isLoading: isLoadingActivities } = useTarefaActivitiesMT(id);

  // --- Local state ---
  const [newComment, setNewComment] = useState('');
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [finalizeMode, setFinalizeMode] = useState<'approve' | 'reject'>('approve');
  const [finalizeNotes, setFinalizeNotes] = useState('');

  // --- Derived ---
  const currentUserId = user?.id;
  const isDelegator = task?.delegated_by === currentUserId;
  const isAssignee = task?.assignees?.some(a => a.user_id === currentUserId) ?? false;

  const isOverdue = useMemo(() => {
    if (!task?.due_date) return false;
    if (['finalizada', 'cancelada'].includes(task.status)) return false;
    return new Date(task.due_date) < new Date();
  }, [task]);

  const overdueDays = useMemo(() => {
    if (!isOverdue || !task?.due_date) return 0;
    return Math.ceil((Date.now() - new Date(task.due_date).getTime()) / 86400000);
  }, [isOverdue, task]);

  const metrics = useMemo(() => {
    if (!task) return null;
    return calcTaskTimeMetrics(task);
  }, [task]);

  // --- Merged timeline ---
  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];
    comments.forEach(c => items.push({ type: 'comment', data: c, created_at: c.created_at }));
    activities.forEach(a => items.push({ type: 'activity', data: a, created_at: a.created_at }));
    items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return items;
  }, [comments, activities]);

  // --- Sub-tasks progress ---
  const subTasksCompleted = subTasks.filter(s =>
    ['concluida', 'finalizada'].includes(s.status)
  ).length;
  const subTasksProgress = subTasks.length > 0 ? Math.round((subTasksCompleted / subTasks.length) * 100) : 0;

  // --- Handlers ---
  const handleChangeStatus = async (status: TaskStatus) => {
    if (!id) return;
    changeStatus.mutate({ id, status }, { onSuccess: () => refetch() });
  };

  const handleOpenFinalize = (mode: 'approve' | 'reject') => {
    setFinalizeMode(mode);
    setFinalizeNotes('');
    setFinalizeDialogOpen(true);
  };

  const handleFinalize = () => {
    if (!id) return;
    if (finalizeMode === 'reject' && !finalizeNotes.trim()) return;
    finalize.mutate(
      { id, approved: finalizeMode === 'approve', notes: finalizeNotes.trim() || undefined },
      {
        onSuccess: () => {
          setFinalizeDialogOpen(false);
          refetch();
        },
      }
    );
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addComment.mutate(
      { conteudo: newComment.trim() },
      { onSuccess: () => setNewComment('') }
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await upload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Loading / Error states ---
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="space-y-4 p-6">
        <Button variant="ghost" onClick={() => navigate('/tarefas')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para Tarefas
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {error ? `Erro ao carregar tarefa: ${(error as Error).message}` : 'Tarefa não encontrada.'}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* ====== HEADER ====== */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" className="self-start -ml-2" onClick={() => navigate('/tarefas')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para Tarefas
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{task.titulo}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className="text-sm px-3 py-1"
                style={{
                  backgroundColor: TASK_STATUS_COLORS[task.status],
                  color: '#fff',
                }}
              >
                {TASK_STATUS_LABELS[task.status]}
              </Badge>
              <Badge
                variant="outline"
                className="text-sm"
                style={{
                  borderColor: TASK_PRIORITY_COLORS[task.prioridade],
                  color: TASK_PRIORITY_COLORS[task.prioridade],
                }}
              >
                {TASK_PRIORITY_LABELS[task.prioridade]}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive" className="text-sm gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {overdueDays} {overdueDays === 1 ? 'dia atrasada' : 'dias atrasada'}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {TASK_STATUS_DESCRIPTIONS[task.status]}
            </p>
          </div>

          <Button variant="outline" onClick={() => navigate(`/tarefas/${id}/editar`)}>
            <Edit className="h-4 w-4 mr-2" /> Editar
          </Button>
        </div>
      </div>

      <Separator />

      {/* ====== INFO GRID ====== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-4">
          {/* Delegado por */}
          <div className="flex items-start gap-3">
            <User className="h-4 w-4 mt-1 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Delegado por</p>
              <p className="text-sm">
                {task.delegator?.nome || 'Desconhecido'}
                <span className="text-muted-foreground ml-2">
                  {format(new Date(task.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </p>
            </div>
          </div>

          {/* Responsaveis */}
          <div className="flex items-start gap-3">
            <User className="h-4 w-4 mt-1 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Responsaveis</p>
              {task.assignees && task.assignees.length > 0 ? (
                <div className="space-y-1 mt-1">
                  {task.assignees.map(a => (
                    <div key={a.id} className="flex items-center gap-2">
                      <span className="text-sm">{a.user?.nome || 'Sem nome'}</span>
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{
                          borderColor: TASK_STATUS_COLORS[a.status as TaskStatus] || '#94A3B8',
                          color: TASK_STATUS_COLORS[a.status as TaskStatus] || '#94A3B8',
                        }}
                      >
                        {TASK_STATUS_LABELS[a.status as TaskStatus] || a.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum responsavel</p>
              )}
            </div>
          </div>

          {/* Prazo */}
          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Prazo</p>
              <p className={`text-sm ${isOverdue ? 'text-destructive font-medium' : ''}`}>
                {task.due_date
                  ? format(new Date(task.due_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                  : 'Sem prazo definido'}
                {task.due_date && (
                  <span className="text-muted-foreground ml-2">
                    ({formatDistanceToNow(new Date(task.due_date), { locale: ptBR, addSuffix: true })})
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Categoria */}
          {task.category && (
            <div className="flex items-start gap-3">
              <Tag className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Categoria</p>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: task.category.cor }}
                  />
                  <span className="text-sm">{task.category.nome}</span>
                </div>
              </div>
            </div>
          )}

          {/* Tempo estimado */}
          {task.estimated_minutes && (
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tempo estimado</p>
                <p className="text-sm">{formatDuration(task.estimated_minutes)}</p>
              </div>
            </div>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex items-start gap-3">
              <Tag className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tags</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {task.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Parent task */}
          {task.parent_task && (
            <div className="flex items-start gap-3">
              <ListChecks className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tarefa pai</p>
                <Link
                  to={`/tarefas/${task.parent_task.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  {task.parent_task.titulo}
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN - Metricas de Tempo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Metricas de Tempo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics?.tempo_resposta_min !== null && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tempo de resposta</span>
                <span className="font-medium">{formatDuration(metrics!.tempo_resposta_min)}</span>
              </div>
            )}
            {metrics?.tempo_execucao_min !== null && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tempo de execucao</span>
                <span className="font-medium">{formatDuration(metrics!.tempo_execucao_min)}</span>
              </div>
            )}
            {metrics?.tempo_conferencia_min !== null && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tempo de conferencia</span>
                <span className="font-medium">{formatDuration(metrics!.tempo_conferencia_min)}</span>
              </div>
            )}
            {metrics?.tempo_total_min !== null && (
              <>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Tempo total</span>
                  <span className="font-bold">{formatDuration(metrics!.tempo_total_min)}</span>
                </div>
              </>
            )}
            {metrics?.dias_atraso !== null && metrics!.dias_atraso! > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-destructive">Atraso</span>
                <span className="font-medium text-destructive">
                  {metrics!.dias_atraso} {metrics!.dias_atraso === 1 ? 'dia' : 'dias'}
                </span>
              </div>
            )}
            {metrics?.sla_cumprido !== null && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">SLA</span>
                <span className={`font-medium flex items-center gap-1 ${metrics!.sla_cumprido ? 'text-green-600' : 'text-destructive'}`}>
                  {metrics!.sla_cumprido ? (
                    <><CheckCircle2 className="h-3.5 w-3.5" /> Cumprido</>
                  ) : (
                    <><XCircle className="h-3.5 w-3.5" /> Nao cumprido</>
                  )}
                </span>
              </div>
            )}
            {/* If no metrics at all */}
            {metrics?.tempo_resposta_min === null &&
             metrics?.tempo_execucao_min === null &&
             metrics?.tempo_conferencia_min === null &&
             metrics?.tempo_total_min === null &&
             metrics?.sla_cumprido === null && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Metricas serao exibidas conforme a tarefa avanca.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ====== DESCRIPTION ====== */}
      {task.descricao && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Descricao</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{task.descricao}</p>
          </CardContent>
        </Card>
      )}

      {/* ====== SUB-TASKS ====== */}
      {subTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Sub-tarefas ({subTasksCompleted}/{subTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Progress bar */}
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary rounded-full h-2 transition-all"
                style={{ width: `${subTasksProgress}%` }}
              />
            </div>

            <div className="space-y-2">
              {subTasks.map(sub => (
                <div key={sub.id} className="flex items-center justify-between py-1">
                  <Link
                    to={`/tarefas/${sub.id}`}
                    className="text-sm hover:underline flex items-center gap-2"
                  >
                    {['concluida', 'finalizada'].includes(sub.status) ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <span
                        className="inline-block w-3 h-3 rounded-full border-2"
                        style={{ borderColor: TASK_STATUS_COLORS[sub.status] }}
                      />
                    )}
                    <span className={['concluida', 'finalizada'].includes(sub.status) ? 'line-through text-muted-foreground' : ''}>
                      {sub.titulo}
                    </span>
                  </Link>
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{
                      borderColor: TASK_STATUS_COLORS[sub.status],
                      color: TASK_STATUS_COLORS[sub.status],
                    }}
                  >
                    {TASK_STATUS_LABELS[sub.status]}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ====== ACTION BUTTONS ====== */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3">
            {/* Assignee actions */}
            {isAssignee && !isDelegator && (
              <>
                {(task.status === 'pendente' || task.status === 'recusada') && (
                  <Button
                    onClick={() => handleChangeStatus('em_andamento')}
                    disabled={changeStatus.isPending}
                  >
                    {changeStatus.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Iniciar
                  </Button>
                )}
                {task.status === 'em_andamento' && (
                  <Button
                    onClick={() => handleChangeStatus('concluida')}
                    disabled={changeStatus.isPending}
                  >
                    {changeStatus.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Concluir
                  </Button>
                )}
              </>
            )}

            {/* Delegator actions */}
            {isDelegator && (
              <>
                {task.status === 'concluida' && (
                  <>
                    <Button
                      onClick={() => handleOpenFinalize('approve')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Finalizar (Aprovar)
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleOpenFinalize('reject')}
                    >
                      <XCircle className="h-4 w-4 mr-2" /> Recusar
                    </Button>
                  </>
                )}

                {!['finalizada', 'cancelada'].includes(task.status) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
                        <XCircle className="h-4 w-4 mr-2" /> Cancelar Tarefa
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar tarefa?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acao ira cancelar a tarefa "{task.titulo}". Os responsaveis serao notificados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleChangeStatus('cancelada')}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Confirmar Cancelamento
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            )}

            <Button variant="outline" onClick={() => navigate(`/tarefas/${id}/editar`)}>
              <Edit className="h-4 w-4 mr-2" /> Editar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ====== ATTACHMENTS ====== */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Anexos ({attachments.length})
            </CardTitle>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Enviar Arquivo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingAttachments ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum anexo adicionado.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {attachments.map(att => (
                <div
                  key={att.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <div className="shrink-0">
                    {isImageFile(att.file_type) ? (
                      <Image className="h-8 w-8 text-blue-500" />
                    ) : (
                      <FileText className="h-8 w-8 text-orange-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <a
                      href={att.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:underline truncate block"
                    >
                      {att.file_name}
                    </a>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(att.file_size)}
                      {att.uploader && <> &middot; {att.uploader.nome}</>}
                      {' '}&middot; {formatDistanceToNow(new Date(att.created_at), { locale: ptBR, addSuffix: true })}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover anexo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O arquivo "{att.file_name}" sera removido permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => removeAttachment.mutate(att.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ====== TIMELINE (Comments + Activities) ====== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(isLoadingComments || isLoadingActivities) && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoadingComments && !isLoadingActivities && timeline.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma atividade registrada.
            </p>
          )}

          <div className="space-y-3">
            {timeline.map((item, idx) => {
              if (item.type === 'comment') {
                const comment = item.data;
                const isOwn = comment.user_id === currentUserId;
                return (
                  <div key={`c-${comment.id}`} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                    <MessageSquare className="h-4 w-4 mt-1 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          {comment.user?.nome || 'Desconhecido'}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { locale: ptBR, addSuffix: true })}
                          </span>
                          {isOwn && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteComment.mutate(comment.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{comment.conteudo}</p>
                    </div>
                  </div>
                );
              } else {
                const activity = item.data;
                // Skip 'comentou' activities since we show comments inline
                if (activity.acao === 'comentou') return null;
                return (
                  <div key={`a-${activity.id}`} className="flex gap-3 px-3 py-2">
                    <Activity className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/70">
                          {activity.user?.nome || 'Sistema'}
                        </span>
                        {' '}
                        {TASK_ACTIVITY_LABELS[activity.acao] || activity.acao}
                        {activity.descricao && (
                          <span className="italic ml-1">- {activity.descricao}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {formatDistanceToNow(new Date(activity.created_at), { locale: ptBR, addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              }
            })}
          </div>

          <Separator />

          {/* New comment input */}
          <div className="flex gap-3">
            <Textarea
              placeholder="Escreva um comentario..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              className="min-h-[80px]"
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
            />
            <Button
              className="self-end shrink-0"
              onClick={handleAddComment}
              disabled={!newComment.trim() || addComment.isPending}
            >
              {addComment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Ctrl+Enter para enviar
          </p>
        </CardContent>
      </Card>

      {/* ====== FINALIZE DIALOG ====== */}
      <Dialog open={finalizeDialogOpen} onOpenChange={setFinalizeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {finalizeMode === 'approve' ? 'Aprovar entrega?' : 'Recusar entrega?'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {finalizeMode === 'approve'
                ? 'A tarefa sera marcada como finalizada e aprovada.'
                : 'A tarefa sera devolvida ao responsavel para refazer. Informe o motivo da recusa.'}
            </p>
            <Textarea
              placeholder={
                finalizeMode === 'approve'
                  ? 'Observacoes (opcional)...'
                  : 'Motivo da recusa (obrigatorio)...'
              }
              value={finalizeNotes}
              onChange={e => setFinalizeNotes(e.target.value)}
              className="min-h-[100px]"
            />
            {finalizeMode === 'reject' && !finalizeNotes.trim() && (
              <p className="text-xs text-destructive">
                Informe o motivo da recusa para continuar.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizeDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleFinalize}
              disabled={
                finalize.isPending ||
                (finalizeMode === 'reject' && !finalizeNotes.trim())
              }
              className={finalizeMode === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={finalizeMode === 'reject' ? 'destructive' : 'default'}
            >
              {finalize.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : finalizeMode === 'approve' ? (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {finalizeMode === 'approve' ? 'Aprovar' : 'Recusar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

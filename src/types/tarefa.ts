// =====================================================
// Tipos para o Módulo de Tarefas (Delegação)
// =====================================================

// === ENUMS ===
export type TaskStatus = 'pendente' | 'em_andamento' | 'aguardando' | 'concluida' | 'finalizada' | 'recusada' | 'cancelada';
export type TaskPriority = 'baixa' | 'normal' | 'alta' | 'urgente';
export type TaskFinalizationStatus = 'aprovada' | 'recusada';

export type TaskActivityAction =
  | 'criou' | 'editou' | 'atribuiu' | 'desatribuiu'
  | 'status_alterado' | 'prioridade_alterada' | 'prazo_alterado'
  | 'comentou' | 'anexou' | 'removeu_anexo'
  | 'concluiu' | 'finalizou' | 'recusou' | 'reabriu' | 'cancelou'
  | 'sub_tarefa_criada' | 'sub_tarefa_concluida';

// === LABELS ===
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  aguardando: 'Aguardando',
  concluida: 'Concluída',
  finalizada: 'Finalizada',
  recusada: 'Recusada',
  cancelada: 'Cancelada',
};

export const TASK_STATUS_DESCRIPTIONS: Record<TaskStatus, string> = {
  pendente: 'Aguardando início',
  em_andamento: 'Em execução pelo responsável',
  aguardando: 'Bloqueada por dependência',
  concluida: 'Aguardando conferência do delegador',
  finalizada: 'Conferida e aprovada',
  recusada: 'Conferida e devolvida para refazer',
  cancelada: 'Tarefa cancelada',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  pendente: '#94A3B8',
  em_andamento: '#3B82F6',
  aguardando: '#F59E0B',
  concluida: '#8B5CF6',
  finalizada: '#22C55E',
  recusada: '#EF4444',
  cancelada: '#6B7280',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  baixa: '#94A3B8',
  normal: '#3B82F6',
  alta: '#F59E0B',
  urgente: '#EF4444',
};

export const TASK_ACTIVITY_LABELS: Record<TaskActivityAction, string> = {
  criou: 'criou a tarefa',
  editou: 'editou a tarefa',
  atribuiu: 'atribuiu responsável',
  desatribuiu: 'removeu responsável',
  status_alterado: 'alterou o status',
  prioridade_alterada: 'alterou a prioridade',
  prazo_alterado: 'alterou o prazo',
  comentou: 'comentou',
  anexou: 'anexou arquivo',
  removeu_anexo: 'removeu anexo',
  concluiu: 'marcou como concluída',
  finalizou: 'finalizou (aprovou)',
  recusou: 'recusou a entrega',
  reabriu: 'reabriu a tarefa',
  cancelou: 'cancelou a tarefa',
  sub_tarefa_criada: 'criou sub-tarefa',
  sub_tarefa_concluida: 'concluiu sub-tarefa',
};

// === INTERFACES ===
export interface MTTask {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  titulo: string;
  descricao: string | null;
  status: TaskStatus;
  prioridade: TaskPriority;
  delegated_by: string;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  finalized_at: string | null;
  finalized_by: string | null;
  finalization_status: TaskFinalizationStatus | null;
  finalization_notes: string | null;
  category_id: string | null;
  parent_task_id: string | null;
  template_id: string | null;
  ordem: number;
  estimated_minutes: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // JOINs
  delegator?: MTTaskUser;
  assignees?: MTTaskAssignee[];
  category?: MTTaskCategory;
  parent_task?: { id: string; titulo: string };
  sub_tasks?: MTTask[];
  // Contadores
  _comments_count?: number;
  _attachments_count?: number;
  _subtasks_count?: number;
  _subtasks_completed?: number;
}

export interface MTTaskUser {
  id: string;
  nome: string;
  avatar_url?: string | null;
  email?: string;
  telefone?: string;
}

export interface MTTaskAssignee {
  id: string;
  tenant_id: string;
  task_id: string;
  user_id: string;
  status: 'pendente' | 'em_andamento' | 'concluida';
  accepted_at: string | null;
  completed_at: string | null;
  created_at: string;
  // JOINs
  user?: MTTaskUser;
}

export interface MTTaskComment {
  id: string;
  tenant_id: string;
  task_id: string;
  user_id: string;
  conteudo: string;
  mentioned_user_ids: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // JOINs
  user?: MTTaskUser;
  attachments?: MTTaskAttachment[];
}

export interface MTTaskAttachment {
  id: string;
  tenant_id: string;
  task_id: string;
  comment_id: string | null;
  uploaded_by: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  // JOINs
  uploader?: MTTaskUser;
}

export interface MTTaskActivity {
  id: string;
  tenant_id: string;
  task_id: string;
  user_id: string;
  acao: TaskActivityAction;
  descricao: string | null;
  dados_json: Record<string, any> | null;
  created_at: string;
  // JOINs
  user?: MTTaskUser;
}

export interface MTTaskCategory {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  nome: string;
  cor: string;
  icone: string;
  ordem: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MTTaskTemplate {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  nome: string;
  descricao: string | null;
  prioridade: TaskPriority;
  category_id: string | null;
  estimated_minutes: number | null;
  tags: string[];
  subtasks_json: Array<{ titulo: string; descricao?: string; ordem: number }>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MTTaskConfig {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  notif_whatsapp_enabled: boolean;
  notif_email_enabled: boolean;
  notif_inapp_enabled: boolean;
  notif_whatsapp_cc: string[];
  notif_email_cc: string[];
  notif_on_criacao: boolean;
  notif_on_status_change: boolean;
  notif_on_comment: boolean;
  notif_on_overdue: boolean;
  notif_on_completion: boolean;
  overdue_alert_hours: number;
  overdue_repeat_hours: number;
  created_at: string;
  updated_at: string;
}

// === FILTROS ===
export interface TaskFilters {
  search?: string;
  status?: TaskStatus | TaskStatus[];
  prioridade?: TaskPriority;
  delegated_by?: string;
  assigned_to?: string;
  category_id?: string;
  due_date_from?: string;
  due_date_to?: string;
  is_overdue?: boolean;
  has_parent?: boolean;
  franchise_id?: string;
  tags?: string[];
}

// === TIPOS DE CRIAÇÃO/ATUALIZAÇÃO ===
export interface CreateTask {
  titulo: string;
  descricao?: string;
  prioridade?: TaskPriority;
  due_date?: string;
  category_id?: string;
  parent_task_id?: string;
  estimated_minutes?: number;
  tags?: string[];
  assignee_ids: string[];
  franchise_id?: string;
  template_id?: string;
}

export interface UpdateTask {
  id: string;
  titulo?: string;
  descricao?: string;
  status?: TaskStatus;
  prioridade?: TaskPriority;
  due_date?: string | null;
  category_id?: string | null;
  estimated_minutes?: number | null;
  tags?: string[];
}

// === MÉTRICAS DE TEMPO ===
export interface TaskTimeMetrics {
  tempo_resposta_min: number | null;    // started_at - created_at (minutos)
  tempo_execucao_min: number | null;    // completed_at - started_at (minutos)
  tempo_conferencia_min: number | null; // finalized_at - completed_at (minutos)
  tempo_total_min: number | null;       // finalized_at - created_at (minutos)
  atraso_min: number | null;            // completed_at - due_date (minutos, se > 0)
  sla_cumprido: boolean | null;         // completed_at <= due_date
  dias_atraso: number | null;           // dias de atraso (se > 0)
}

/** Calcula métricas de tempo de uma tarefa */
export function calcTaskTimeMetrics(task: MTTask): TaskTimeMetrics {
  const created = new Date(task.created_at).getTime();
  const started = task.started_at ? new Date(task.started_at).getTime() : null;
  const completed = task.completed_at ? new Date(task.completed_at).getTime() : null;
  const finalized = task.finalized_at ? new Date(task.finalized_at).getTime() : null;
  const due = task.due_date ? new Date(task.due_date).getTime() : null;
  const now = Date.now();

  const toMin = (ms: number) => Math.round(ms / 60000);
  const toDays = (ms: number) => Math.ceil(ms / 86400000);

  // Atraso: se tem due_date e não está finalizada/cancelada
  let atraso_min: number | null = null;
  let dias_atraso: number | null = null;
  if (due) {
    const refTime = completed || now;
    if (refTime > due && !['finalizada', 'cancelada'].includes(task.status)) {
      atraso_min = toMin(refTime - due);
      dias_atraso = toDays(refTime - due);
    }
  }

  return {
    tempo_resposta_min: started ? toMin(started - created) : null,
    tempo_execucao_min: started && completed ? toMin(completed - started) : null,
    tempo_conferencia_min: completed && finalized ? toMin(finalized - completed) : null,
    tempo_total_min: finalized ? toMin(finalized - created) : null,
    atraso_min,
    sla_cumprido: due && completed ? completed <= due : null,
    dias_atraso,
  };
}

/** Formata duração em minutos para texto legível */
export function formatDuration(minutes: number | null): string {
  if (minutes === null) return '-';
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (remainingHours > 0) return `${days}d ${remainingHours}h`;
  return `${days}d`;
}

// === STATS ===
export interface TaskStats {
  total: number;
  pendentes: number;
  em_andamento: number;
  aguardando: number;
  concluidas: number;
  finalizadas: number;
  recusadas: number;
  canceladas: number;
  atrasadas: number;
  aguardando_conferencia: number;
}

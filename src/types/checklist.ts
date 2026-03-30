// Tipos para o módulo Checklist Diário

// === ENUMS ===

export type ChecklistAssignmentType = 'role' | 'user' | 'department' | 'team';
export type ChecklistRecurrence = 'diaria' | 'semanal' | 'mensal' | 'pontual';
export type ChecklistDailyStatus = 'pendente' | 'em_andamento' | 'concluido' | 'incompleto' | 'cancelado';
export type ChecklistItemStatus = 'pendente' | 'concluido' | 'nao_feito' | 'pulado';
export type ChecklistItemPrioridade = 'baixa' | 'normal' | 'alta' | 'critica';
export type ChecklistReportTipo = 'diario' | 'semanal' | 'mensal';
export type ChecklistLogAcao = 'concluiu' | 'pulou' | 'adicionou_item' | 'modificou' | 'reabriu' | 'nao_conformidade' | 'cancelou' | 'finalizou' | 'timer_start' | 'timer_pause' | 'timer_stop';
export type TimerStatus = 'stopped' | 'running' | 'paused';

// === LABELS ===

export const ASSIGNMENT_TYPE_LABELS: Record<ChecklistAssignmentType, string> = {
  role: 'Cargo',
  user: 'Pessoa',
  department: 'Departamento',
  team: 'Equipe',
};

export const RECURRENCE_LABELS: Record<ChecklistRecurrence, string> = {
  diaria: 'Diária',
  semanal: 'Semanal',
  mensal: 'Mensal',
  pontual: 'Pontual',
};

export const DAILY_STATUS_LABELS: Record<ChecklistDailyStatus, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  incompleto: 'Incompleto',
  cancelado: 'Cancelado',
};

export const ITEM_STATUS_LABELS: Record<ChecklistItemStatus, string> = {
  pendente: 'Pendente',
  concluido: 'Concluído',
  nao_feito: 'Não Feito',
  pulado: 'Pulado',
};

export const PRIORIDADE_LABELS: Record<ChecklistItemPrioridade, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  critica: 'Crítica',
};

export const PRIORIDADE_COLORS: Record<ChecklistItemPrioridade, string> = {
  baixa: '#94A3B8',
  normal: '#3B82F6',
  alta: '#F59E0B',
  critica: '#EF4444',
};

export const DAILY_STATUS_COLORS: Record<ChecklistDailyStatus, string> = {
  pendente: '#94A3B8',
  em_andamento: '#3B82F6',
  concluido: '#22C55E',
  incompleto: '#F59E0B',
  cancelado: '#EF4444',
};

export const CATEGORIAS_PADRAO = [
  'abertura',
  'atendimento',
  'limpeza',
  'organizacao',
  'fechamento',
  'administrativo',
  'financeiro',
  'estoque',
] as const;

// === INTERFACES ===

export interface MTChecklistTemplate {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  nome: string;
  descricao: string | null;
  icone: string;
  cor: string;
  assignment_type: ChecklistAssignmentType;
  role_id: string | null;
  user_id: string | null;
  department_id: string | null;
  team_id: string | null;
  recurrence: ChecklistRecurrence;
  dias_semana: number[];
  dia_mes: number | null;
  hora_inicio: string;
  hora_fim: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // JOINs
  role?: { id: string; nome: string } | null;
  assigned_user?: { id: string; nome: string } | null;
  department?: { id: string; nome: string } | null;
  team?: { id: string; nome: string } | null;
  creator?: { id: string; nome: string } | null;
  items?: MTChecklistItem[];
  _items_count?: number;
}

export interface MTChecklistItem {
  id: string;
  tenant_id: string;
  template_id: string;
  titulo: string;
  descricao: string | null;
  instrucoes: string | null;
  hora_bloco: string | null;
  duracao_min: number;
  ordem: number;
  prioridade: ChecklistItemPrioridade;
  categoria: string | null;
  requer_foto: boolean;
  requer_observacao: boolean;
  is_obrigatorio: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MTChecklistDaily {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  template_id: string;
  user_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  status: ChecklistDailyStatus;
  total_items: number;
  items_concluidos: number;
  items_nao_concluidos: number;
  percentual_conclusao: number;
  modificado_por: string | null;
  modificado_em: string | null;
  observacoes_gestor: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // JOINs
  template?: MTChecklistTemplate;
  user?: { id: string; nome: string; cargo: string | null };
  items?: MTChecklistDailyItem[];
}

export interface MTChecklistDailyItem {
  id: string;
  tenant_id: string;
  daily_id: string;
  item_id: string | null;
  titulo: string;
  descricao: string | null;
  instrucoes: string | null;
  hora_bloco: string | null;
  duracao_min: number;
  ordem: number;
  prioridade: string;
  categoria: string | null;
  is_obrigatorio: boolean;
  requer_foto: boolean;
  requer_observacao: boolean;
  status: ChecklistItemStatus;
  concluido_em: string | null;
  concluido_por: string | null;
  observacoes: string | null;
  foto_url: string | null;
  evidencia_urls: string[] | null;
  has_nao_conformidade: boolean;
  nao_conformidade_descricao: string | null;
  nao_conformidade_acao: string | null;
  is_ad_hoc: boolean;
  adicionado_por: string | null;
  // Timer / Timesheet
  timer_started_at: string | null;
  timer_elapsed_seconds: number;
  timer_status: TimerStatus;
  created_at: string;
  updated_at: string;
}

export interface MTChecklistLog {
  id: string;
  tenant_id: string;
  daily_id: string;
  daily_item_id: string | null;
  acao: ChecklistLogAcao;
  descricao: string | null;
  user_id: string;
  created_at: string;
  // JOINs
  user?: { id: string; nome: string };
}

export interface MTChecklistReport {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  tipo: ChecklistReportTipo;
  data_inicio: string;
  data_fim: string;
  user_id: string | null;
  template_id: string | null;
  total_checklists: number;
  total_items: number;
  items_concluidos: number;
  items_nao_concluidos: number;
  percentual_medio: number;
  nao_conformidades: number;
  dias_consecutivos_100: number;
  dados_json: Record<string, any> | null;
  generated_at: string;
  created_at: string;
}

export interface MTChecklistStreak {
  id: string;
  tenant_id: string;
  user_id: string;
  template_id: string | null;
  streak_atual: number;
  melhor_streak: number;
  ultimo_dia_completo: string | null;
  xp_ganho_total: number;
  created_at: string;
  updated_at: string;
}

// === FILTROS ===

export interface ChecklistTemplateFilters {
  search?: string;
  assignment_type?: ChecklistAssignmentType;
  recurrence?: ChecklistRecurrence;
  is_active?: boolean;
  franchise_id?: string;
}

export interface ChecklistDailyFilters {
  data?: string;
  user_id?: string;
  status?: ChecklistDailyStatus;
  template_id?: string;
  franchise_id?: string;
}

// === CREATE/UPDATE TYPES ===

export interface CreateChecklistTemplate {
  nome: string;
  descricao?: string;
  icone?: string;
  cor?: string;
  assignment_type: ChecklistAssignmentType;
  role_id?: string;
  user_id?: string;
  department_id?: string;
  team_id?: string;
  recurrence?: ChecklistRecurrence;
  dias_semana?: number[];
  dia_mes?: number;
  hora_inicio?: string;
  hora_fim?: string;
  franchise_id?: string;
}

export interface CreateChecklistItem {
  template_id: string;
  titulo: string;
  descricao?: string;
  instrucoes?: string;
  hora_bloco?: string;
  duracao_min?: number;
  ordem?: number;
  prioridade?: ChecklistItemPrioridade;
  categoria?: string;
  requer_foto?: boolean;
  requer_observacao?: boolean;
  is_obrigatorio?: boolean;
}

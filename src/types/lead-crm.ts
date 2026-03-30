// ============================================================
// TIPOS PARA CRM DE LEADS (atividades, timeline, etc)
// Baseado no PopDents com adaptações para YESlaser
// ============================================================

// Tipos de atividade suportados (expandido de 4 para 8)
export type LeadActivityType =
  | 'nota'           // Anotação livre
  | 'ligacao'        // Registro de ligação
  | 'email'          // Email enviado
  | 'whatsapp'       // Mensagem WhatsApp (link automático)
  | 'reuniao'        // Reunião/Consulta realizada
  | 'agendamento'    // Agendamento criado
  | 'status_change'  // Mudança de status/dados
  | 'tarefa';        // Tarefa/Follow-up

// Resultado de ligação
export type CallResult =
  | 'atendeu'
  | 'nao_atendeu'
  | 'caixa_postal'
  | 'ocupado'
  | 'numero_errado'
  | 'desligou';

// Status de agendamento dentro da atividade
export type ActivityAppointmentStatus =
  | 'pendente'
  | 'confirmado'
  | 'realizado'
  | 'cancelado'
  | 'remarcado'
  | 'nao_compareceu';

// Prioridade de tarefa/follow-up
export type TaskPriority =
  | 'baixa'
  | 'normal'
  | 'alta'
  | 'urgente';

// Interface principal de atividade do lead
export interface LeadActivity {
  id: string;
  lead_id: string;
  franqueado_id?: string | null;
  usuario_id?: string | null;
  created_by?: string | null;
  tipo: LeadActivityType;
  titulo?: string | null;
  descricao?: string | null;
  data_atividade: string;
  data_lembrete?: string | null;
  // Campos de ligação
  duracao_minutos?: number | null;
  resultado_ligacao?: CallResult | null;
  // Campos de agendamento
  data_agendamento?: string | null;
  hora_agendamento?: string | null;
  local_agendamento?: string | null;
  status_agendamento?: ActivityAppointmentStatus | null;
  // Campos de tarefa
  data_prazo?: string | null;
  prioridade?: TaskPriority | null;
  responsavel_id?: string | null;
  is_completed: boolean;
  is_pinned: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Atividade com relações carregadas
export interface LeadActivityWithRelations extends LeadActivity {
  user?: {
    id: string;
    nome: string;
    email: string;
  } | null;
  lead?: {
    id: string;
    nome: string;
    whatsapp: string;
  } | null;
  responsavel?: {
    id: string;
    nome: string;
    email: string;
  } | null;
}

// Dados para criação de nova atividade
export interface LeadActivityInsert {
  lead_id: string;
  franqueado_id?: string;
  tipo: LeadActivityType;
  titulo?: string;
  descricao?: string;
  data_atividade?: string;
  data_lembrete?: string;
  // Campos de ligação
  duracao_minutos?: number;
  resultado_ligacao?: CallResult;
  // Campos de agendamento
  data_agendamento?: string;
  hora_agendamento?: string;
  local_agendamento?: string;
  status_agendamento?: ActivityAppointmentStatus;
  // Campos de tarefa
  data_prazo?: string;
  prioridade?: TaskPriority;
  responsavel_id?: string;
  is_pinned?: boolean;
  metadata?: Record<string, unknown>;
}

// Dados para atualização de atividade
export interface LeadActivityUpdate {
  titulo?: string;
  descricao?: string;
  data_atividade?: string;
  data_lembrete?: string;
  // Campos de ligação
  duracao_minutos?: number;
  resultado_ligacao?: CallResult;
  // Campos de agendamento
  data_agendamento?: string;
  hora_agendamento?: string;
  local_agendamento?: string;
  status_agendamento?: ActivityAppointmentStatus;
  // Campos de tarefa
  data_prazo?: string;
  prioridade?: TaskPriority;
  responsavel_id?: string;
  is_completed?: boolean;
  is_pinned?: boolean;
  metadata?: Record<string, unknown>;
}

// Labels para exibição dos tipos de atividade
export const ACTIVITY_TYPE_LABELS: Record<LeadActivityType, string> = {
  nota: 'Nota',
  ligacao: 'Ligação',
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  reuniao: 'Reunião',
  agendamento: 'Agendamento',
  status_change: 'Alteração',
  tarefa: 'Tarefa',
};

// Labels para resultado de ligação
export const CALL_RESULT_LABELS: Record<CallResult, string> = {
  atendeu: 'Atendeu',
  nao_atendeu: 'Não Atendeu',
  caixa_postal: 'Caixa Postal',
  ocupado: 'Ocupado',
  numero_errado: 'Número Errado',
  desligou: 'Desligou',
};

// Labels para status de agendamento
export const ACTIVITY_APPOINTMENT_STATUS_LABELS: Record<ActivityAppointmentStatus, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  realizado: 'Realizado',
  cancelado: 'Cancelado',
  remarcado: 'Remarcado',
  nao_compareceu: 'Não Compareceu',
};

// Labels para prioridade de tarefa
export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
};

// Configuração completa por tipo de atividade
export const ACTIVITY_TYPE_CONFIG: Record<LeadActivityType, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}> = {
  nota: {
    label: 'Nota',
    icon: 'StickyNote',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  ligacao: {
    label: 'Ligação',
    icon: 'Phone',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  email: {
    label: 'E-mail',
    icon: 'Mail',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: 'MessageCircle',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  reuniao: {
    label: 'Reunião',
    icon: 'Users',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  agendamento: {
    label: 'Agendamento',
    icon: 'Calendar',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
  },
  status_change: {
    label: 'Alteração',
    icon: 'RefreshCw',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  tarefa: {
    label: 'Tarefa',
    icon: 'CheckSquare',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
  },
};

// Cores para prioridade de tarefa
export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  baixa: 'bg-gray-100 text-gray-700 border-gray-200',
  normal: 'bg-blue-100 text-blue-700 border-blue-200',
  alta: 'bg-orange-100 text-orange-700 border-orange-200',
  urgente: 'bg-red-100 text-red-700 border-red-200',
};

// Filtros para lista de atividades
export interface ActivityFilters {
  tipo?: LeadActivityType | LeadActivityType[];
  dateFrom?: string;
  dateTo?: string;
  isPinned?: boolean;
  search?: string;
  isCompleted?: boolean;
  responsavelId?: string;
  prazoFrom?: string;
  prazoTo?: string;
}

// Interface para follow-up pendente
export interface PendingFollowUp {
  id: string;
  lead_id: string;
  lead_nome: string;
  lead_whatsapp: string;
  titulo: string;
  descricao?: string;
  data_prazo: string;
  prioridade: TaskPriority;
  responsavel_id?: string;
  responsavel_nome?: string;
  dias_ate_prazo: number; // Negativo = atrasado
  is_atrasado: boolean;
}

// ============================================================
// TIPOS PARA HISTÓRICO DO FUNIL
// ============================================================

export interface LeadFunnelHistory {
  id: string;
  lead_id: string;
  status_anterior?: string | null;
  status_novo: string;
  motivo?: string | null;
  changed_by?: string | null;
  franqueado_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface LeadFunnelHistoryWithRelations extends LeadFunnelHistory {
  lead?: {
    id: string;
    nome: string;
  } | null;
  user?: {
    id: string;
    nome: string;
  } | null;
}

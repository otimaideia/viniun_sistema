// Tipos canônicos para o sistema de Agendamentos (mt_appointments)
// Unificado: 3 tipos de negócio (Avaliação, Procedimento Fechado, Cortesia)

// === ENUMS ===

// Tipo de agendamento (3 tipos de negócio)
export type AppointmentType = 'avaliacao' | 'procedimento_fechado' | 'cortesia';

// Status do agendamento (unificado)
export type AgendamentoStatus =
  | 'pendente'          // Criado, aguardando confirmação (cortesia: aguardando aprovação)
  | 'agendado'          // Agendamento confirmado no calendário
  | 'confirmado'        // Cliente confirmou presença
  | 'em_atendimento'    // Atendimento em andamento
  | 'concluido'         // Atendimento finalizado
  | 'cancelado'         // Cancelado
  | 'nao_compareceu'    // Cliente não compareceu
  | 'remarcado';        // Foi remarcado para outra data

// Mantém compatibilidade com código existente
export type LeadType = 'geral' | 'promocao';

// === LABELS ===

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  avaliacao: 'Avaliacao',
  procedimento_fechado: 'Procedimento Fechado',
  cortesia: 'Cortesia',
};

export const APPOINTMENT_TYPE_DESCRIPTIONS: Record<AppointmentType, string> = {
  avaliacao: 'Avaliacao inicial do cliente',
  procedimento_fechado: 'Sessao de tratamento vinculada a uma venda',
  cortesia: 'Tratamento cortesia (requer aprovacao do gerente)',
};

export const APPOINTMENT_TYPE_COLORS: Record<AppointmentType, string> = {
  avaliacao: '#10b981',           // Green
  procedimento_fechado: '#3b82f6', // Blue
  cortesia: '#f59e0b',            // Amber
};

export const AGENDAMENTO_STATUS_OPTIONS: AgendamentoStatus[] = [
  'pendente',
  'agendado',
  'confirmado',
  'em_atendimento',
  'concluido',
  'cancelado',
  'nao_compareceu',
  'remarcado',
];

export const AGENDAMENTO_STATUS_CONFIG: Record<AgendamentoStatus, {
  color: string;
  bg: string;
  label: string;
  icon: string;
}> = {
  pendente: {
    color: 'text-yellow-700',
    bg: 'bg-yellow-50 border-yellow-200',
    label: 'Pendente',
    icon: 'Clock',
  },
  agendado: {
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
    label: 'Agendado',
    icon: 'Calendar',
  },
  confirmado: {
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
    label: 'Confirmado',
    icon: 'CheckCircle',
  },
  em_atendimento: {
    color: 'text-indigo-700',
    bg: 'bg-indigo-50 border-indigo-200',
    label: 'Em Atendimento',
    icon: 'Play',
  },
  concluido: {
    color: 'text-purple-700',
    bg: 'bg-purple-50 border-purple-200',
    label: 'Concluido',
    icon: 'Check',
  },
  cancelado: {
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
    label: 'Cancelado',
    icon: 'X',
  },
  nao_compareceu: {
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    label: 'Nao Compareceu',
    icon: 'UserX',
  },
  remarcado: {
    color: 'text-violet-700',
    bg: 'bg-violet-50 border-violet-200',
    label: 'Remarcado',
    icon: 'RefreshCw',
  },
};

// === INTERFACES ===

// Interface principal (mt_appointments)
export interface Agendamento {
  id: string;
  tenant_id: string;
  franchise_id: string | null;

  // Tipo de agendamento
  tipo: AppointmentType;

  // Dados do agendamento
  lead_id: string | null;
  lead_type: LeadType;
  unidade_id: string | null;
  data_agendamento: string;
  hora_inicio: string;
  hora_fim: string | null;
  servico: string | null;
  responsavel_id: string | null;
  status: AgendamentoStatus;
  observacoes: string | null;

  // Vinculo com Venda/Plano de Tratamento (procedimento_fechado)
  venda_id: string | null;
  treatment_session_id: string | null;

  // Cortesia
  cortesia_motivo: string | null;
  cortesia_aprovada_por: string | null;
  cortesia_aprovada_em: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
}

// Interface com dados do lead (para exibicao - carregado via join)
export interface AgendamentoComLead extends Agendamento {
  nome_lead?: string | null;
  telefone_lead?: string | null;
  email_lead?: string | null;
}

// Interface com detalhes expandidos
export interface AgendamentoWithDetails extends Agendamento {
  unidade?: {
    id: string;
    nome_fantasia: string;
  } | null;
  responsavel?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  lead?: {
    id: string;
    nome: string;
    telefone: string | null;
    email: string | null;
  } | null;
  venda?: {
    id: string;
    numero_venda: string;
    status: string;
  } | null;
  treatment_session?: {
    id: string;
    numero_sessao: number;
    treatment_plan_id: string;
  } | null;
  cortesia_aprovador?: {
    id: string;
    full_name: string;
  } | null;
}

// === CREATE / UPDATE ===

export interface AgendamentoCreate {
  tipo?: AppointmentType;
  lead_id?: string | null;
  lead_type?: LeadType;
  unidade_id?: string | null;
  data_agendamento: string;
  hora_inicio: string;
  hora_fim?: string | null;
  servico?: string | null;
  responsavel_id?: string | null;
  status?: AgendamentoStatus;
  observacoes?: string | null;

  // Procedimento fechado
  venda_id?: string | null;
  treatment_session_id?: string | null;

  // Cortesia
  cortesia_motivo?: string | null;
}

export interface AgendamentoUpdate {
  tipo?: AppointmentType;
  lead_id?: string | null;
  lead_type?: LeadType;
  unidade_id?: string | null;
  data_agendamento?: string;
  hora_inicio?: string;
  hora_fim?: string | null;
  servico?: string | null;
  responsavel_id?: string | null;
  status?: AgendamentoStatus;
  observacoes?: string | null;

  // Procedimento fechado
  venda_id?: string | null;
  treatment_session_id?: string | null;

  // Cortesia
  cortesia_motivo?: string | null;
  cortesia_aprovada_por?: string | null;
  cortesia_aprovada_em?: string | null;
}

// === FILTROS ===

export interface AgendamentoFilters {
  status?: AgendamentoStatus;
  tipo?: AppointmentType;
  unidade_id?: string;
  responsavel_id?: string;
  data_inicio?: string;
  data_fim?: string;
  search?: string;
  cortesia_pendente?: boolean; // filtrar cortesias aguardando aprovacao
}

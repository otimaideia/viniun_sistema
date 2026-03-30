// Tipos para o módulo de Planos de Tratamento
// Ponte entre Vendas → Sessões → Agendamentos

// === ENUMS ===

export type TreatmentPlanStatus = 'pendente' | 'ativo' | 'pausado' | 'concluido' | 'cancelado';

export type RecurrenceType = 'mensal' | 'quinzenal' | 'semanal' | 'custom';

export type ScheduleStrategy = 'auto_todas' | 'auto_proxima' | 'manual' | 'configuravel';

export type TreatmentSessionStatus =
  | 'pendente'
  | 'agendado'
  | 'confirmado'
  | 'em_atendimento'
  | 'concluido'
  | 'cancelado'
  | 'nao_compareceu'
  | 'reagendado';

export type SaleItemType = 'servico' | 'produto' | 'pacote';

// === LABELS ===

export const TREATMENT_PLAN_STATUS_LABELS: Record<TreatmentPlanStatus, string> = {
  pendente: 'Pendente',
  ativo: 'Em Andamento',
  pausado: 'Pausado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

export const RECURRENCE_TYPE_LABELS: Record<RecurrenceType, string> = {
  mensal: 'Mensal',
  quinzenal: 'Quinzenal',
  semanal: 'Semanal',
  custom: 'Personalizado',
};

export const SCHEDULE_STRATEGY_LABELS: Record<ScheduleStrategy, string> = {
  auto_todas: 'Gerar todas as sessões',
  auto_proxima: 'Gerar próxima ao concluir',
  manual: 'Agendar manualmente',
  configuravel: 'Configurável',
};

export const TREATMENT_SESSION_STATUS_LABELS: Record<TreatmentSessionStatus, string> = {
  pendente: 'Pendente',
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  em_atendimento: 'Em Atendimento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  nao_compareceu: 'Não Compareceu',
  reagendado: 'Reagendado',
};

export const SALE_ITEM_TYPE_LABELS: Record<SaleItemType, string> = {
  servico: 'Serviço',
  produto: 'Produto',
  pacote: 'Pacote',
};

// === INTERFACES ===

export interface TreatmentPlan {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  sale_id: string;
  sale_item_id: string;
  service_id: string;
  lead_id: string | null;
  cliente_nome: string;
  cliente_telefone: string | null;

  // Sessões
  total_sessoes: number;
  sessoes_concluidas: number;
  sessoes_canceladas: number;
  proxima_sessao_numero: number;

  // Recorrência
  recorrencia_tipo: RecurrenceType;
  recorrencia_intervalo_dias: number;
  dia_preferencial: number | null;
  hora_preferencial: string | null;
  profissional_preferencial_id: string | null;

  // Estratégia
  geracao_agenda: ScheduleStrategy;

  // Controle de pagamento/inadimplência
  data_proximo_pagamento: string | null;
  pagamento_em_dia: boolean;
  bloquear_se_inadimplente: boolean;

  // Status
  status: TreatmentPlanStatus;
  pausado_em: string | null;
  pausado_motivo: string | null;
  concluido_em: string | null;
  cancelado_em: string | null;
  cancelado_motivo: string | null;
  observacoes: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;

  // JOINs
  service?: { id: string; nome: string; duracao_minutos?: number };
  sale?: { id: string; numero_venda: string; status: string };
  sessions?: TreatmentSession[];
  profissional_preferencial?: { id: string; nome: string };
}

export interface TreatmentPlanCreate {
  franchise_id?: string;
  sale_id: string;
  sale_item_id: string;
  service_id: string;
  lead_id?: string;
  cliente_nome: string;
  cliente_telefone?: string;
  total_sessoes: number;
  recorrencia_tipo?: RecurrenceType;
  recorrencia_intervalo_dias?: number;
  dia_preferencial?: number;
  hora_preferencial?: string;
  profissional_preferencial_id?: string;
  geracao_agenda?: ScheduleStrategy;
  data_proximo_pagamento?: string;
  bloquear_se_inadimplente?: boolean;
  observacoes?: string;
}

export interface TreatmentPlanUpdate {
  id: string;
  status?: TreatmentPlanStatus;
  recorrencia_tipo?: RecurrenceType;
  recorrencia_intervalo_dias?: number;
  dia_preferencial?: number;
  hora_preferencial?: string;
  profissional_preferencial_id?: string;
  geracao_agenda?: ScheduleStrategy;
  data_proximo_pagamento?: string;
  pagamento_em_dia?: boolean;
  bloquear_se_inadimplente?: boolean;
  pausado_motivo?: string;
  cancelado_motivo?: string;
  observacoes?: string;
}

export interface TreatmentPlanFilters {
  status?: TreatmentPlanStatus;
  service_id?: string;
  franchise_id?: string;
  search?: string;
  pagamento_em_dia?: boolean;
}

// === SESSIONS ===

export interface TreatmentSession {
  id: string;
  tenant_id: string;
  treatment_plan_id: string;
  appointment_id: string | null;
  numero_sessao: number;
  profissional_id: string | null;
  profissional_nome: string | null;
  data_prevista: string | null;
  data_realizada: string | null;
  hora_inicio: string | null;
  hora_fim: string | null;
  status: TreatmentSessionStatus;
  observacoes_profissional: string | null;
  observacoes_cliente: string | null;
  created_at: string;
  updated_at: string;
}

export interface TreatmentSessionSchedule {
  treatment_session_id: string;
  data_agendamento: string;
  hora_inicio: string;
  hora_fim?: string;
  profissional_id: string;
  profissional_nome: string;
  observacoes?: string;
}

// === DASHBOARD ===

export interface TreatmentDashboardMetrics {
  planos_ativos: number;
  planos_concluidos: number;
  planos_pausados: number;
  sessoes_pendentes_semana: number;
  sessoes_atrasadas: number;
  taxa_conclusao: number;
  inadimplentes: number;
  media_progresso: number;
}

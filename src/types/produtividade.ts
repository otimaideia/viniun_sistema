// Tipos para o módulo Produtividade (MEI)

// === ENUMS ===

export type AttendanceStatus = 'presente' | 'falta' | 'falta_justificada' | 'folga' | 'feriado' | 'domingo';

export type JustificativaTipo = 'atestado' | 'declaracao' | 'licenca' | 'outro';

export type ProductivityStatus = 'aberto' | 'fechado' | 'pago';

// === LABELS ===

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  presente: 'Presente',
  falta: 'Falta',
  falta_justificada: 'Justificada',
  folga: 'Folga',
  feriado: 'Feriado',
  domingo: 'Domingo',
};

export const JUSTIFICATIVA_TIPO_LABELS: Record<JustificativaTipo, string> = {
  atestado: 'Atestado Médico',
  declaracao: 'Declaração',
  licenca: 'Licença',
  outro: 'Outro',
};

export const PRODUCTIVITY_STATUS_LABELS: Record<ProductivityStatus, string> = {
  aberto: 'Aberto',
  fechado: 'Fechado',
  pago: 'Pago',
};

// === INTERFACES ===

export interface ProfessionalSchedule {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  user_id: string;
  dia_semana: number; // 0=Dom, 1=Seg, ..., 6=Sáb
  hora_inicio: string; // HH:MM
  hora_fim: string; // HH:MM
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // JOINs
  user?: { id: string; nome: string; cargo: string };
}

export interface ProfessionalScheduleCreate {
  user_id: string;
  franchise_id?: string;
  dia_semana: number;
  hora_inicio?: string;
  hora_fim?: string;
  is_active?: boolean;
}

export interface ProfessionalAttendance {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  user_id: string;
  data: string; // YYYY-MM-DD
  checkin_em: string | null;
  checkout_em: string | null;
  status: AttendanceStatus;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // JOINs
  user?: { id: string; nome: string; cargo: string };
}

export interface ProductivityDaily {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  user_id: string;
  data: string; // YYYY-MM-DD
  presente: boolean;
  diaria_minima: number;
  total_comissoes: number;
  total_servicos: number;
  valor_pago: number;
  tipo_pagamento: 'diaria' | 'comissao' | 'ausente';
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // JOINs
  user?: { id: string; nome: string; cargo: string };
}

export interface ProductivityMonthly {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  user_id: string;
  competencia: string; // YYYY-MM
  dias_trabalhados: number;
  dias_diaria: number;
  dias_comissao: number;
  total_diarias: number;
  total_comissoes: number;
  total_pago: number;
  diaria_minima_usada: number;
  status: ProductivityStatus;
  fechado_em: string | null;
  fechado_por: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // JOINs
  user?: { id: string; nome: string; cargo: string };
}

// === CLT - CARTÃO DE PONTO ===

export interface AttendanceRecord {
  id: string;
  checkin_em: string | null;
  checkout_em: string | null;
  checkin_selfie_url: string | null;
  checkout_selfie_url: string | null;
  checkin_latitude: number | null;
  checkin_longitude: number | null;
  checkout_latitude: number | null;
  checkout_longitude: number | null;
  registro_origem: string | null;
  observacoes: string | null;
  justificativa_url: string | null;
  justificativa_tipo: JustificativaTipo | null;
  justificativa_observacoes: string | null;
  created_at: string;
}

export interface AttendanceAuditEntry {
  id: string;
  changed_by_name: string;
  action: string;
  motivo: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  created_at: string;
}

export interface TimeCardEntry {
  data: string;
  weekday: number;
  checkin_em: string | null;
  checkout_em: string | null;
  expected_entrada: string;
  expected_saida: string;
  hours_worked_minutes: number;
  expected_hours_minutes: number;
  late_minutes: number;
  early_departure_minutes: number;
  overtime_minutes: number;
  status: AttendanceStatus;
  observacoes: string | null;
  records: AttendanceRecord[];
}

export interface TimeCardSummary {
  total_days_worked: number;
  total_hours_worked_minutes: number;
  total_expected_hours_minutes: number;
  total_late_minutes: number;
  total_early_departure_minutes: number;
  total_overtime_minutes: number;
  balance_minutes: number;
  faltas: number;
  faltas_justificadas: number;
  folgas: number;
  feriados: number;
}

// === CONSTANTES ===

export const DIAS_SEMANA_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
};

export const DIAS_SEMANA_SHORT: Record<number, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
};

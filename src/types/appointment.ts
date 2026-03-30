/**
 * @deprecated Use imports from '@/types/agendamento' instead.
 * This file re-exports types for backward compatibility.
 */

import type { AppointmentType as NewAppointmentType, AgendamentoStatus, Agendamento } from './agendamento';

// Re-export o tipo canônico como AppointmentType (backward compat)
export type AppointmentType = NewAppointmentType;

// Re-export status (mapeado para o nome antigo)
export type AppointmentStatus = AgendamentoStatus;

// Re-export interface principal com nome antigo
export type Appointment = Agendamento;

// Re-export Appointment-related interfaces
export type { AgendamentoComLead as AppointmentWithRelations } from './agendamento';
export type { AgendamentoCreate as AppointmentInsert } from './agendamento';
export type { AgendamentoUpdate as AppointmentUpdate } from './agendamento';
export type { AgendamentoFilters as AppointmentFilters } from './agendamento';

// Re-export labels e configs
export {
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPE_COLORS,
  AGENDAMENTO_STATUS_CONFIG as APPOINTMENT_STATUS_COLORS,
} from './agendamento';

// Labels de status (reconstruído a partir do config canônico)
import { AGENDAMENTO_STATUS_CONFIG } from './agendamento';

export const APPOINTMENT_STATUS_LABELS: Record<AgendamentoStatus, string> = Object.fromEntries(
  Object.entries(AGENDAMENTO_STATUS_CONFIG).map(([k, v]) => [k, v.label])
) as Record<AgendamentoStatus, string>;

// CalendarEvent - mantido para compatibilidade
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  allDay: boolean;
  color: string;
  appointment: Agendamento;
}

export function appointmentToCalendarEvent(appointment: Agendamento): CalendarEvent {
  return {
    id: appointment.id,
    title: appointment.servico || 'Agendamento',
    start: new Date(appointment.data_agendamento + 'T' + appointment.hora_inicio),
    end: appointment.hora_fim
      ? new Date(appointment.data_agendamento + 'T' + appointment.hora_fim)
      : undefined,
    allDay: false,
    color: APPOINTMENT_TYPE_COLORS[appointment.tipo] || '#6b7280',
    appointment,
  };
}

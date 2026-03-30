// Types for Scheduled Messages

export type ScheduledMessageStatus = 'pendente' | 'enviada' | 'falhou' | 'cancelada';
export type ScheduledMessageTipo = 'text' | 'image' | 'video' | 'document' | 'audio';

export interface ScheduledMessage {
  id: string;
  sessao_id: string;
  destinatario: string;
  conteudo: string;
  tipo: ScheduledMessageTipo;
  media_url?: string | null;
  template_id?: string | null;
  campanha_id?: string | null;
  agendado_para: string;
  status: ScheduledMessageStatus;
  tentativas: number;
  enviada_em?: string | null;
  erro?: string | null;
  created_by?: string | null;
  unidade_id?: string | null;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  mt_whatsapp_sessions?: {
    id: string;
    nome: string;
    session_name: string;
  };
  mt_marketing_templates?: {
    id: string;
    nome_template: string;
  };
  mt_campaigns?: {
    id: string;
    nome: string;
  };
}

export interface ScheduledMessageFormData {
  sessao_id: string;
  destinatario: string;
  conteudo: string;
  tipo?: ScheduledMessageTipo;
  media_url?: string | null;
  template_id?: string | null;
  campanha_id?: string | null;
  agendado_para: string;
  unidade_id?: string | null;
}

export const SCHEDULED_MESSAGE_STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'enviada', label: 'Enviada' },
  { value: 'falhou', label: 'Falhou' },
  { value: 'cancelada', label: 'Cancelada' },
] as const;

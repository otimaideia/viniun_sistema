// ============================================================
// TIPOS PARA SESSÕES WHATSAPP (tabelas do banco)
// ============================================================

export type WhatsAppSessaoTipo = 'vendas' | 'suporte' | 'ouvidoria' | 'agendamentos' | 'geral';
export type WhatsAppSessaoStatus = 'stopped' | 'starting' | 'scan_qr' | 'working' | 'failed';
export type WhatsAppConversaStatus = 'aberta' | 'aguardando' | 'resolvida' | 'arquivada';

export interface WhatsAppSessao {
  id: string;
  franqueado_id: string;
  nome: string;
  tipo: WhatsAppSessaoTipo;
  session_name: string;
  phone_number: string | null;
  status: WhatsAppSessaoStatus;
  qr_code: string | null;
  config: Record<string, unknown>;
  ativo: boolean;
  last_sync: string | null;
  ultimo_check: string | null;
  created_at: string;
  updated_at: string;
  // Join com franqueado
  franqueado?: {
    id: string;
    nome_fantasia: string;
  };
}

export interface WhatsAppSessaoInput {
  franqueado_id: string;
  nome: string;
  tipo: WhatsAppSessaoTipo;
  session_name: string;
  phone_number?: string | null;
}

export interface WhatsAppConversa {
  id: string;
  sessao_id: string;
  chat_id: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_avatar_url: string | null;
  status: WhatsAppConversaStatus;
  atendente_id: string | null;
  unread_count: number;
  ultima_mensagem: string | null;
  ultima_mensagem_texto: string | null;
  lead_id?: string | null; // FK para lead vinculado
  created_at: string;
  updated_at: string;
}

export interface WhatsAppConversaWithLead extends WhatsAppConversa {
  lead?: {
    id: string;
    nome: string;
    telefone: string;
    status: string;
  };
  sessao?: {
    id: string;
    session_name: string;
    nome: string;
  };
}

export interface WhatsAppMensagem {
  id: string;
  conversa_id: string;
  sessao_id: string;
  message_id: string | null;
  direction: 'inbound' | 'outbound';
  type: string;
  body: string | null;
  media_url: string | null;
  media_mime_type: string | null;
  is_read: boolean;
  timestamp: string;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
}

export interface WhatsAppUsuarioSessao {
  id: string;
  user_id: string;
  sessao_id: string;
  can_send: boolean;
  can_manage: boolean;
  created_at: string;
  updated_at: string;
}

export const SESSAO_TIPO_LABELS: Record<WhatsAppSessaoTipo, string> = {
  vendas: 'Vendas',
  suporte: 'Suporte',
  ouvidoria: 'Ouvidoria',
  agendamentos: 'Agendamentos',
  geral: 'Geral',
};

export const SESSAO_STATUS_LABELS: Record<WhatsAppSessaoStatus, string> = {
  stopped: 'Parado',
  starting: 'Iniciando',
  scan_qr: 'Aguardando QR',
  working: 'Conectado',
  failed: 'Erro',
};

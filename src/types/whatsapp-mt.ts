// Tipos TypeScript para módulo WhatsApp Multi-Tenant
// Baseado nas tabelas mt_whatsapp_*

import type { MTTenant, MTFranchise, MTUser, Department, Team } from './multitenant';

// ============================================
// SESSÕES (mt_whatsapp_sessions)
// ============================================

export type WhatsAppSessionStatus =
  | 'disconnected'
  | 'connecting'
  | 'scan_qr_code'
  | 'working'
  | 'failed'
  | 'stopped';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'completed';

export interface MTWhatsAppSession {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  nome: string;
  session_name: string;
  telefone: string | null;
  waha_url: string | null;
  waha_api_key: string | null;
  status: WhatsAppSessionStatus | null;
  qr_code: string | null;
  last_qr_at: string | null;
  webhook_url: string | null;
  webhook_secret: string | null;
  total_chats: number | null;
  total_messages: number | null;
  last_message_at: string | null;
  last_sync_at: string | null;
  sync_status: SyncStatus | null;
  is_active: boolean | null;
  is_default: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;

  // Engine WAHA
  engine?: 'NOWEB' | 'GOWS' | 'WEBJS' | null;

  // Dados do WAHA (sincronizados automaticamente)
  profile_picture_url: string | null;
  display_name: string | null;

  // Associações organizacionais
  responsible_user_id: string | null;
  department_id: string | null;
  team_id: string | null;

  // Relacionamentos
  tenant?: MTTenant;
  franchise?: MTFranchise;
  created_by_user?: MTUser;
  responsible_user?: MTUser;
  department?: Department;
  team?: Team;
}

export interface CreateMTSessionInput {
  nome: string;
  session_name: string;
  franchise_id?: string | null;
  telefone?: string | null;
  waha_url?: string | null;
  waha_api_key?: string | null;
  webhook_url?: string | null;
  is_default?: boolean;
  engine?: 'NOWEB' | 'GOWS' | 'WEBJS';
  // Associações organizacionais
  responsible_user_id?: string | null;
  department_id?: string | null;
  team_id?: string | null;
}

export interface UpdateMTSessionInput {
  id: string;
  nome?: string;
  telefone?: string | null;
  waha_url?: string | null;
  waha_api_key?: string | null;
  webhook_url?: string | null;
  webhook_secret?: string | null;
  is_active?: boolean;
  is_default?: boolean;
  // Associações organizacionais
  responsible_user_id?: string | null;
  department_id?: string | null;
  team_id?: string | null;
}

// ============================================
// CONVERSAS (mt_whatsapp_conversations)
// ============================================

export type ConversationStatus = 'open' | 'pending' | 'resolved' | 'archived';

export interface MTWhatsAppConversation {
  id: string;
  session_id: string;
  tenant_id: string;
  franchise_id: string | null;
  chat_id: string;
  is_group: boolean | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_avatar: string | null;

  // NOVOS CAMPOS V3 (Fevereiro 2026)
  identifier_type?: 'phone' | 'lid' | 'unknown' | null;
  has_phone_number?: boolean | null;

  lead_id: string | null;
  status: ConversationStatus | null;
  unread_count: number | null;
  last_message_text: string | null;
  last_message_at: string | null;
  last_message_from: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
  tags: string[] | null;
  created_at: string | null;
  updated_at: string | null;

  // Relacionamentos
  session?: MTWhatsAppSession;
  tenant?: MTTenant;
  franchise?: MTFranchise;
  assigned_user?: MTUser;
  labels?: MTWhatsAppLabel[];
}

export interface ConversationFilters {
  session_id?: string;
  status?: ConversationStatus;
  is_group?: boolean;
  has_unread?: boolean;
  assigned_to?: string;
  search?: string;
}

// ============================================
// MENSAGENS (mt_whatsapp_messages)
// ============================================

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'sticker'
  | 'location'
  | 'contact'
  | 'template';

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MTWhatsAppMessage {
  id: string;
  conversation_id: string;
  session_id: string;
  tenant_id: string;
  message_id: string | null;
  from_me: boolean | null;
  sender_id: string | null;
  sender_name: string | null;
  tipo: MessageType | null;
  body: string | null;
  caption: string | null;
  media_url: string | null;
  media_mimetype: string | null;
  media_filename: string | null;
  media_size: number | null;
  status: MessageStatus | null;
  ack: number | null;
  error_message: string | null;
  quoted_message_id: string | null;
  template_id: string | null;
  template_name: string | null;
  timestamp: string | null;
  created_at: string | null;

  // Relacionamentos
  conversation?: MTWhatsAppConversation;
  session?: MTWhatsAppSession;
  template?: MTWhatsAppTemplate;
  quoted_message?: MTWhatsAppMessage;
}

export interface SendMessageInput {
  conversation_id: string;
  session_id: string;
  tipo?: MessageType;
  body?: string;
  media_url?: string;
  media_mimetype?: string;
  media_filename?: string;
  caption?: string;
  quoted_message_id?: string;
  template_id?: string;
}

export interface MessageFilters {
  conversation_id: string;
  tipo?: MessageType;
  from_me?: boolean;
  before?: string;
  after?: string;
  limit?: number;
}

// ============================================
// LABELS/ETIQUETAS (mt_whatsapp_labels)
// ============================================

export interface MTWhatsAppLabel {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  name: string;
  color: string | null;
  description: string | null;
  display_order: number | null;
  is_active: boolean | null;
  usage_count: number | null;
  waha_label_id: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;

  // Relacionamentos
  tenant?: MTTenant;
  franchise?: MTFranchise;
}

export interface CreateLabelInput {
  name: string;
  color?: string;
  description?: string;
  franchise_id?: string | null;
}

export interface UpdateLabelInput {
  id: string;
  name?: string;
  color?: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}

// ============================================
// TEMPLATES (mt_whatsapp_templates)
// ============================================

export type TemplateCategory =
  | 'saudacao'
  | 'agendamento'
  | 'confirmacao'
  | 'lembrete'
  | 'promocao'
  | 'atendimento'
  | 'cobranca'
  | 'outro';

export interface MTWhatsAppTemplate {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  nome: string;
  categoria: TemplateCategory | null;
  descricao: string | null;
  conteudo: string;
  variaveis: string[] | null;
  tem_midia: boolean | null;
  midia_tipo: string | null;
  midia_url: string | null;
  uso_count: number | null;
  ultimo_uso: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;

  // Relacionamentos
  tenant?: MTTenant;
  franchise?: MTFranchise;
}

export interface CreateTemplateInput {
  nome: string;
  conteudo: string;
  categoria?: TemplateCategory;
  descricao?: string;
  variaveis?: string[];
  franchise_id?: string | null;
  tem_midia?: boolean;
  midia_tipo?: string;
  midia_url?: string;
}

export interface UpdateTemplateInput {
  id: string;
  nome?: string;
  conteudo?: string;
  categoria?: TemplateCategory;
  descricao?: string;
  variaveis?: string[];
  is_active?: boolean;
  tem_midia?: boolean;
  midia_tipo?: string;
  midia_url?: string;
}

// ============================================
// RESPOSTAS RÁPIDAS (mt_whatsapp_quick_replies)
// ============================================

export interface MTWhatsAppQuickReply {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  shortcut: string;
  title: string;
  content: string;
  category: string | null;
  media_url: string | null;
  media_type: string | null;
  variables: Record<string, string> | null;
  usage_count: number | null;
  is_active: boolean | null;
  display_order: number | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;

  // Relacionamentos
  tenant?: MTTenant;
  franchise?: MTFranchise;
}

export interface CreateQuickReplyInput {
  shortcut: string;
  title: string;
  content: string;
  category?: string;
  franchise_id?: string | null;
  media_url?: string;
  media_type?: string;
  variables?: Record<string, string>;
}

export interface UpdateQuickReplyInput {
  id: string;
  shortcut?: string;
  title?: string;
  content?: string;
  category?: string;
  media_url?: string;
  media_type?: string;
  variables?: Record<string, string>;
  is_active?: boolean;
  display_order?: number;
}

// ============================================
// PERMISSÕES DE USUÁRIO (mt_whatsapp_user_sessions)
// ============================================

export interface MTWhatsAppUserSession {
  id: string;
  user_id: string;
  session_id: string;
  tenant_id: string;
  can_view: boolean | null;
  can_send: boolean | null;
  can_manage: boolean | null;
  can_delete_messages: boolean | null;
  can_export: boolean | null;
  can_assign: boolean | null;
  is_default_session: boolean | null;
  notification_enabled: boolean | null;
  granted_by: string | null;
  granted_at: string | null;
  created_at: string | null;
  updated_at: string | null;

  // Relacionamentos
  user?: MTUser;
  session?: MTWhatsAppSession;
  granted_by_user?: MTUser;
}

export interface GrantPermissionInput {
  user_id: string;
  session_id: string;
  can_view?: boolean;
  can_send?: boolean;
  can_manage?: boolean;
  can_delete_messages?: boolean;
  can_export?: boolean;
  can_assign?: boolean;
  notification_enabled?: boolean;
}

// ============================================
// TRANSFERÊNCIAS (mt_whatsapp_transfers)
// ============================================

export type TransferType = 'user-to-user' | 'user-to-queue';

export interface CreateTransferInput {
  conversation_id: string;
  transfer_type: TransferType;
  from_user_id: string;
  to_user_id?: string | null;
  to_queue_id?: string | null;
  reason?: string | null;
}

export interface MTWhatsAppTransfer {
  id: string;
  tenant_id: string;
  conversation_id: string;
  transfer_type: TransferType;
  from_user_id: string;
  to_user_id: string | null;
  to_queue_id: string | null;
  reason: string | null;
  transferred_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  created_at: string | null;

  // Relacionamentos
  conversation?: MTWhatsAppConversation;
  from_user?: MTUser;
  to_user?: MTUser;
}

// ============================================
// CONVERSATION LABELS (mt_whatsapp_conversation_labels)
// ============================================

export interface MTWhatsAppConversationLabel {
  id: string;
  conversation_id: string;
  label_id: string;
  added_by: string | null;
  created_at: string | null;

  // Relacionamentos
  conversation?: MTWhatsAppConversation;
  label?: MTWhatsAppLabel;
}

// ============================================
// ESTATÍSTICAS E MÉTRICAS
// ============================================

export interface WhatsAppSessionStats {
  session_id: string;
  total_conversations: number;
  active_conversations: number;
  total_messages: number;
  messages_sent: number;
  messages_received: number;
  unread_count: number;
  avg_response_time_minutes: number;
}

export interface WhatsAppDashboardMetrics {
  total_sessions: number;
  active_sessions: number;
  total_conversations: number;
  open_conversations: number;
  messages_today: number;
  messages_this_week: number;
  avg_response_time: number;
  top_labels: { label: string; count: number }[];
}

// ============================================
// WAHA API TYPES
// ============================================

export interface WAHASessionInfo {
  name: string;
  status: string;
  me?: {
    id: string;
    pushName: string;
  };
}

export interface WAHAQRCode {
  value: string;
  format?: string;
}

export interface WAHAMessage {
  id: string;
  timestamp: number;
  from: string;
  to: string;
  body: string;
  fromMe: boolean;
  hasMedia: boolean;
  mediaUrl?: string;
  type: string;
  ack?: number;
}

export interface WAHAChat {
  id: string;
  name: string;
  isGroup: boolean;
  unreadCount: number;
  timestamp: number;
  lastMessage?: {
    body: string;
    fromMe: boolean;
    timestamp: number;
  };
}

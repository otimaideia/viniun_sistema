// Tipos para Conversas WhatsApp

export type ConversationStatus = 'open' | 'resolved' | 'archived' | 'spam';

export interface WhatsAppConversation {
  id: string;
  session_id: string;
  franqueado_id: string;
  lead_id: string | null;

  // Contact info
  remote_jid: string;
  phone_number: string;
  real_phone_number: string | null; // Telefone real para contatos @lid (Meta/Instagram/Facebook)
  contact_name: string | null;
  profile_picture_url: string | null;

  // Last message
  last_message_text: string | null;
  last_message_at: string | null;
  last_message_direction: 'inbound' | 'outbound' | null;
  unread_count: number;

  // Management
  status: ConversationStatus;
  assigned_user_id: string | null;
  is_pinned: boolean;

  // Tags
  tags: string[];

  // Metadata
  created_at: string;
  updated_at: string;

  // Relations (quando expandido)
  session?: {
    id: string;
    session_name: string;
    phone_number: string | null;
    display_name: string | null;
  };
  lead?: {
    id: string;
    nome: string;
    whatsapp: string;
    status: string;
  };
  assigned_user?: {
    id: string;
    email: string;
    raw_user_meta_data: {
      full_name?: string;
    };
  };
}

export interface ConversationWithMessages extends WhatsAppConversation {
  messages: WhatsAppMessage[];
}

export interface ConversationFilters {
  status?: ConversationStatus | ConversationStatus[];
  sessionId?: string;
  assignedUserId?: string | null;
  hasUnread?: boolean;
  isPinned?: boolean;
  search?: string;
  tags?: string[];
}

// Import do tipo de mensagem
import { WhatsAppMessage } from './message';

export const CONVERSATION_STATUS_LABELS: Record<ConversationStatus, string> = {
  open: 'Aberta',
  resolved: 'Resolvida',
  archived: 'Arquivada',
  spam: 'Spam',
};

export const CONVERSATION_STATUS_COLORS: Record<ConversationStatus, string> = {
  open: 'green',
  resolved: 'blue',
  archived: 'gray',
  spam: 'red',
};

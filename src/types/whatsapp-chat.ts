// ============================================================
// TIPOS PARA CHAT DO WHATSAPP
// ============================================================

export interface WahaChat {
  id: string;
  name: string;
  timestamp: number;
  lastMessage?: {
    body: string;
    fromMe: boolean;
    timestamp: number;
  };
  unreadCount?: number;
  isGroup?: boolean;
  profilePicture?: string;
}

export interface WahaMessage {
  id: string;
  body: string;
  from: string;
  to: string;
  fromMe: boolean;
  timestamp: number;
  hasMedia?: boolean;
  mediaUrl?: string;
  mediaMimetype?: string;
  mediaFilename?: string;
  type: 'chat' | 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'contact' | 'poll' | 'unknown';
  ack?: number; // 0 = pending, 1 = sent, 2 = delivered, 3 = read
  quotedMessage?: {
    body: string;
    from: string;
  };
  // Campos extras para mídia
  caption?: string;
  // Localização
  latitude?: number;
  longitude?: number;
  locationTitle?: string;
  locationAddress?: string;
  // Contato (vCard)
  vcard?: string;
  contactName?: string;
  contactPhone?: string;
  // Enquete
  pollName?: string;
  pollOptions?: string[];
  pollVotes?: { option: string; count: number }[];
}

export interface ChatContact {
  id: string;
  name: string;
  phone: string;
  profilePicture?: string;
  isGroup?: boolean;
}

// ============================================================
// TIPOS PARA COMPONENTES DE CHAT (formato usado na página WhatsAppChat)
// ============================================================

export interface ConversaLabel {
  id: string;
  name: string;
  color: string | null;
}

export interface WhatsAppConversa {
  id: string;
  sessao_id: string;
  chat_id: string;
  nome_contato: string | null;
  numero_telefone: string | null;
  foto_url: string | null;
  is_group: boolean;
  unread_count: number;
  ultima_mensagem_texto: string | null;
  ultima_mensagem_at: string | null;       // display: last_message_at || updated_at
  last_message_at: string | null;          // sort: last_message_at only (sem fallback)
  status: 'aberta' | 'aguardando' | 'resolvida' | 'arquivada';
  assigned_to: string | null;
  assigned_user_name?: string | null;
  is_bot_active: boolean | null;
  created_at: string;
  updated_at: string;
  labels?: ConversaLabel[];
  is_pinned?: boolean;
  // Campos de janela/híbrido
  last_customer_message_at?: string | null;
  window_type?: string | null;
  window_expires_at?: string | null;
}

export interface WhatsAppMensagem {
  id: string;
  conversa_id: string;
  sessao_id: string;
  message_id: string | null;
  body: string | null;
  from_me: boolean;
  timestamp: string;
  type: string;
  media_type?: string;
  media_url?: string;
  media_mime_type?: string;
  media_filename?: string;
  storage_path?: string; // URL permanente no Supabase Storage
  ack: number;
  is_read: boolean;
  is_deleted?: boolean; // Soft delete flag - message was deleted for client
  created_at: string;
  updated_at?: string;
  // Campos extras para mídia
  caption?: string;
  // Localização
  latitude?: number;
  longitude?: number;
  locationTitle?: string;
  locationAddress?: string;
  // Contato (vCard)
  vcard?: string;
  contactName?: string;
  contactPhone?: string;
  // Enquete
  pollName?: string;
  pollOptions?: string[];
  pollVotes?: { option: string; count: number }[];
  // Atendente que enviou (multi-atendente)
  sender_id?: string | null;
  sender_name?: string | null;
  // Campos avançados (reactions, edit, revoke, quote, pin)
  reactions?: Record<string, string[]>;
  is_edited?: boolean;
  is_revoked?: boolean;
  is_pinned?: boolean;
  quoted_message_id?: string;
  quoted_message_body?: string;
}

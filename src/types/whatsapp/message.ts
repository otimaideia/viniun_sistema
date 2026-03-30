// Tipos para Mensagens WhatsApp

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'location'
  | 'contact'
  | 'sticker'
  | 'reaction'
  | 'poll'
  | 'event'
  | 'unknown';

export type MessageDirection = 'inbound' | 'outbound';

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'deleted';

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  session_id: string;
  franqueado_id: string;

  // WAHA info
  waha_message_id: string;
  direction: MessageDirection;

  // Content
  message_type: MessageType;
  body: string | null;
  caption: string | null;

  // Media
  media_url: string | null;
  media_mimetype: string | null;
  media_filename: string | null;
  media_size_bytes: number | null;
  storage_path: string | null;

  // Location
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;

  // Contact
  contact_vcard: string | null;

  // Reaction
  reaction_emoji: string | null;
  reaction_target_message_id: string | null;

  // Reações recebidas na mensagem (agregado)
  reactions?: Array<{
    emoji: string;
    count: number;
    fromMe?: boolean;
  }>;

  // Event (mensagem de evento/convite)
  event_name: string | null;
  event_description: string | null;
  event_start_time: number | null; // Unix timestamp
  event_end_time: number | null; // Unix timestamp
  event_location: string | null;
  event_extra_guests_allowed: boolean | null;

  // Reply
  quoted_message_id: string | null;

  // Status
  status: MessageStatus;
  error_message: string | null;

  // Metadata
  timestamp_waha: string | null;
  sent_by_user_id: string | null;
  is_from_template: boolean;
  template_id: string | null;
  is_from_quick_reply: boolean;
  quick_reply_id: string | null;

  // Flags
  is_forwarded: boolean;
  is_edited: boolean;
  is_deleted: boolean;

  created_at: string;

  // Relations (quando expandido)
  quoted_message?: WhatsAppMessage | null;
  sent_by_user?: {
    id: string;
    email: string;
    raw_user_meta_data: {
      full_name?: string;
    };
  } | null;
}

export interface SendTextMessageInput {
  conversationId?: string;
  chatId: string;
  text: string;
  quotedMessageId?: string;
}

export interface SendMediaMessageInput {
  conversationId?: string;
  chatId: string;
  mediaUrl?: string;
  mediaFile?: File;
  caption?: string;
  quotedMessageId?: string;
}

export interface SendLocationMessageInput {
  conversationId?: string;
  chatId: string;
  latitude: number;
  longitude: number;
  title?: string;
  address?: string;
  locationName?: string; // deprecated, use title
}

export interface SendPollInput {
  conversationId?: string;
  chatId: string;
  name: string;
  options: string[];
  multipleAnswers?: boolean;
}

export interface SendContactInput {
  conversationId?: string;
  chatId: string;
  fullName: string;
  phoneNumber: string;
  organization?: string;
}

export interface SendReactionInput {
  conversationId?: string;
  chatId: string;
  messageId: string;
  reaction: string; // emoji
}

// Labels e cores para tipos de mensagem
export const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  text: 'Texto',
  image: 'Imagem',
  video: 'Vídeo',
  audio: 'Áudio',
  document: 'Documento',
  location: 'Localização',
  contact: 'Contato',
  sticker: 'Figurinha',
  reaction: 'Reação',
  poll: 'Enquete',
  event: 'Evento',
  unknown: 'Desconhecido',
};

export const MESSAGE_STATUS_ICONS: Record<MessageStatus, string> = {
  pending: '⏳',
  sent: '✓',
  delivered: '✓✓',
  read: '✓✓', // blue checkmarks
  failed: '❌',
  deleted: '🗑️',
};

export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = {
  pending: 'Enviando...',
  sent: 'Enviada',
  delivered: 'Entregue',
  read: 'Lida',
  failed: 'Falha no envio',
  deleted: 'Deletada',
};

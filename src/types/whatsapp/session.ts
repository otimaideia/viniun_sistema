// Tipos para Sessões WhatsApp

export type SessionStatus = 'disconnected' | 'connecting' | 'qr_code' | 'connected' | 'failed';

export interface WhatsAppSession {
  id: string;
  franqueado_id: string;
  user_id: string | null;

  // WAHA info
  session_name: string;
  phone_number: string | null;
  display_name: string | null;
  profile_picture_url: string | null;

  // Status
  status: SessionStatus;
  last_seen_at: string | null;
  qr_code_data: string | null;
  qr_code_expires_at: string | null;

  // Configuration
  is_default: boolean;
  webhook_url: string | null;
  auto_reply_enabled: boolean;
  auto_reply_message: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface CreateSessionInput {
  session_name?: string;
  franqueado_id?: string;
  is_default?: boolean;
  auto_reply_enabled?: boolean;
  auto_reply_message?: string;
}

export interface UpdateSessionInput {
  display_name?: string;
  is_default?: boolean;
  auto_reply_enabled?: boolean;
  auto_reply_message?: string;
}

// Status do WAHA mapeado
export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  disconnected: 'Desconectado',
  connecting: 'Conectando...',
  qr_code: 'Aguardando QR Code',
  connected: 'Conectado',
  failed: 'Falha na conexão',
};

export const SESSION_STATUS_COLORS: Record<SessionStatus, string> = {
  disconnected: 'gray',
  connecting: 'yellow',
  qr_code: 'blue',
  connected: 'green',
  failed: 'red',
};

// ========================================
// TIPOS PARA VÍNCULOS USUÁRIO-SESSÃO
// Sistema hierárquico de acesso
// ========================================

export interface SessionUserLink {
  id: string;
  user_id: string;
  session_id: string;
  granted_by: string | null;
  granted_at: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  // Dados do usuário (join)
  user?: {
    id: string;
    email: string;
    raw_user_meta_data?: {
      full_name?: string;
      name?: string;
    };
  };
}

export interface FranchiseUserForSession {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  is_linked: boolean;
}

// Sessão com informação de usuários vinculados
export interface WhatsAppSessionWithUsers extends WhatsAppSession {
  linked_users_count?: number;
  linked_users?: Array<{
    user_id: string;
    email: string;
    granted_at: string;
  }>;
}

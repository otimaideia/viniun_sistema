// ============================================================
// TIPOS PARA INTEGRAÇÃO WAHA (WhatsApp API)
// ============================================================

// Status possíveis da sessão WAHA
export type WahaSessionStatus = 
  | 'STOPPED' 
  | 'STARTING' 
  | 'SCAN_QR_CODE' 
  | 'WORKING' 
  | 'FAILED';

// Engine do WAHA
export type WahaEngine = 'NOWEB' | 'WEBJS' | 'GOWS';

// ============================================================
// CAPABILITY MATRIX — features disponíveis por engine
// ============================================================

export interface WahaEngineCapabilities {
  /** Envio de texto, imagem, vídeo, documento, áudio */
  sendMessages: boolean;
  /** Enquetes (polls) */
  sendPoll: boolean;
  /** Votar em enquetes */
  sendPollVote: boolean;
  /** Envio de eventos de calendário */
  sendEvent: boolean;
  /** Labels nativas (não precisam de API extra) */
  labelsNative: boolean;
  /** Grupos: leitura */
  groupsRead: boolean;
  /** Grupos: criar e gerenciar */
  groupsWrite: boolean;
  /** Formato de ID: @c.us (padrão) */
  phoneFormatStandard: boolean;
  /** Formato @lid (masking NOWEB) */
  phoneFormatLid: boolean;
  /** Store de mensagens persistente */
  messageStore: boolean;
  /** Full-sync ao reconectar */
  fullSync: boolean;
}

export const WAHA_ENGINE_CAPABILITIES: Record<WahaEngine, WahaEngineCapabilities> = {
  NOWEB: {
    sendMessages: true,
    sendPoll: true,
    sendPollVote: false,     // Requer WAHA Plus
    sendEvent: false,        // WEBJS only
    labelsNative: false,     // Via API (não nativo)
    groupsRead: true,
    groupsWrite: false,      // Não implementado
    phoneFormatStandard: true,
    phoneFormatLid: true,    // @lid masking
    messageStore: true,      // store.enabled
    fullSync: true,          // store.fullSync
  },
  GOWS: {
    sendMessages: true,
    sendPoll: true,
    sendPollVote: true,      // Nativo no GOWS
    sendEvent: false,        // Desconhecido — conservador
    labelsNative: true,      // Labels nativas WhatsApp
    groupsRead: true,
    groupsWrite: false,      // Não implementado
    phoneFormatStandard: true,
    phoneFormatLid: false,   // Sempre @c.us
    messageStore: true,      // gows.storage.*
    fullSync: false,         // GOWS tem storage nativo
  },
  WEBJS: {
    sendMessages: true,
    sendPoll: true,
    sendPollVote: false,
    sendEvent: true,         // WEBJS suporta eventos
    labelsNative: false,
    groupsRead: true,
    groupsWrite: false,
    phoneFormatStandard: true,
    phoneFormatLid: false,
    messageStore: false,
    fullSync: false,
  },
};

// ============================================================
// CONFIGURAÇÃO GLOBAL WAHA (tabela mt_waha_config)
// ============================================================

export interface WahaConfigRow {
  id: string;
  api_url: string;
  api_key: string | null;
  webhook_base_url: string | null;
  webhook_url: string | null;
  enabled: boolean;
  default_engine: WahaEngine;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface WahaConfigInput {
  api_url: string;
  api_key?: string | null;
  webhook_base_url?: string | null;
  webhook_url?: string | null;
  enabled: boolean;
  default_engine: WahaEngine;
}

// ============================================================
// SESSÃO WAHA (resposta da API)
// ============================================================

export interface WahaSession {
  name: string;
  status: WahaSessionStatus;
  engine: {
    engine: WahaEngine;
  };
  config?: {
    webhooks?: Array<{
      url: string;
      events: string[];
    }>;
    metadata?: Record<string, string>;
  };
  me?: {
    id: string;
    pushName?: string;
  } | null;
}

// ============================================================
// QR CODE
// ============================================================

export interface WahaQRResponse {
  mimetype: string;
  data: string; // base64
}

// ============================================================
// CONFIGURAÇÃO PARA CRIAR SESSÃO
// ============================================================

export interface WahaSessionConfig {
  name: string;
  start?: boolean;
  config?: {
    // Configuração específica do NOWEB engine
    noweb?: {
      // markOnline: true é necessário para receber notificações no celular
      markOnline?: boolean;
      store?: {
        // enabled: true ativa persistência de contatos, chats e mensagens
        enabled?: boolean;
        // fullSync: true sincroniza ~1 ano de histórico (até 100K msgs por chat)
        // fullSync: false sincroniza apenas ~3 meses
        fullSync?: boolean;
      };
    };
    // Configuração específica do GOWS engine
    gows?: {
      storage?: {
        messages?: boolean;
        groups?: boolean;
        chats?: boolean;
        labels?: boolean;
      };
    };
    webhooks?: Array<{
      url: string;
      events: string[];
    }>;
    metadata?: Record<string, string>;
  };
}

// ============================================================
// ENVIO DE MENSAGENS
// ============================================================

export interface WahaSendTextRequest {
  chatId: string;
  text: string;
  session: string;
  quotedMessageId?: string;
}

export interface WahaSendImageRequest {
  chatId: string;
  file: {
    mimetype: string;
    filename: string;
    data: string; // base64
  };
  caption?: string;
  session: string;
}

// ============================================================
// RESPOSTA DE CONEXÃO/TESTE
// ============================================================

export interface WahaConnectionTestResult {
  success: boolean;
  message: string;
  sessionsCount?: number;
  sessions?: WahaSession[];
}

// ============================================================
// SESSÃO WHATSAPP DO BANCO (para componentes)
// ============================================================

export type SessionStatus = 'disconnected' | 'connecting' | 'qr_code' | 'connected' | 'failed';

export interface WhatsAppSession {
  id: string;

  // Multi-tenant fields (mt_whatsapp_sessions)
  tenant_id: string;
  franchise_id: string | null;
  user_id: string | null;

  /**
   * @deprecated Usar franchise_id (campo MT). Mantido para compatibilidade com adapters legados.
   */
  franqueado_id?: string;

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

  // Engine WAHA (NOWEB | GOWS | WEBJS)
  engine?: string | null;

  // Round Robin (atribuição automática de atendentes)
  round_robin_enabled?: boolean;
  round_robin_members?: string[] | null;
  round_robin_current_index?: number | null;

  // Atribuição a equipe/departamento/responsável
  team_id?: string | null;
  department_id?: string | null;
  responsible_user_id?: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
}

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

// ============================================================
// MENSAGEM WHATSAPP (para componentes)
// ============================================================

export interface WhatsAppMessage {
  id: string;
  conversa_id: string;
  sessao_id: string;
  waha_message_id: string;
  message_id: string | null;
  chat_id: string;
  direction: 'inbound' | 'outbound';
  message_type: string;
  body: string | null;
  caption: string | null;
  media_url: string | null;
  media_mime_type: string | null;
  media_filename: string | null;
  media_size: number | null;
  is_read: boolean;
  is_deleted: boolean;
  is_starred: boolean;
  is_pinned: boolean;
  reply_to_id: string | null;
  timestamp: string;
  ack_status: 'sent' | 'delivered' | 'read' | 'failed' | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// CONVERSA WHATSAPP (para componentes)
// ============================================================

export interface WhatsAppConversation {
  id: string;
  sessao_id: string;
  chat_id: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_pushname: string | null;
  contact_avatar_url: string | null;
  is_group: boolean;
  is_business: boolean;
  status: 'aberta' | 'aguardando' | 'resolvida' | 'arquivada';
  atendente_id: string | null;
  unread_count: number;
  ultima_mensagem: string | null;
  ultima_mensagem_at: string | null;
  labels: string[] | null;
  is_pinned: boolean;
  is_muted: boolean;
  created_at: string;
  updated_at: string;
}

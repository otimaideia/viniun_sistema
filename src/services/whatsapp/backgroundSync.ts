// Serviço de Sincronização em Background para WhatsApp
// Sincroniza mensagens do WAHA em segundo plano sem bloquear a UI
// Viniun Sistema

import { supabase } from '@/integrations/supabase/client';
import { wahaClient } from '@/services/waha/wahaDirectClient';
import { wahaSyncRateLimiter } from '@/utils/rateLimiter';
import { isPhoneNumberV3, isWhatsAppIdV3 } from '@/hooks/useWhatsAppExtractors';
import type { WhatsAppSession } from '@/types/whatsapp';

const DEBUG = import.meta.env.DEV;

/**
 * Verifica se deve atualizar o contact_name na conversa.
 * Só atualiza se o nome atual for vazio/null ou parecer um número de telefone.
 * Protege nomes editados manualmente pelo usuário de serem sobrescritos pelo pushName do WAHA.
 */
// Nomes de sessão/business que NÃO devem ser usados como nome de contato
const KNOWN_SESSION_NAMES = ['viniun', 'novalaser', 'intimacenter'];

function isSessionName(name: string | null | undefined): boolean {
  if (!name) return false;
  const lower = name.trim().toLowerCase();
  return KNOWN_SESSION_NAMES.some(sn => lower === sn || lower.startsWith(sn));
}

function shouldUpdateContactName(
  currentName: string | null | undefined,
  newName: string | null | undefined
): boolean {
  // Nunca usar nome da sessão como nome de contato
  if (isSessionName(newName)) return false;
  // Se nome atual vazio, aceitar nome válido
  if (!currentName || currentName.trim() === '') {
    if (!newName || newName.trim() === '') return false;
    if (isPhoneNumberV3(newName) || isWhatsAppIdV3(newName)) return false;
    return true;
  }
  // Se nome atual é telefone ou nome da sessão, aceitar nome melhor
  if (isPhoneNumberV3(currentName) || isSessionName(currentName)) {
    if (!newName || newName.trim() === '') return false;
    if (isPhoneNumberV3(newName) || isWhatsAppIdV3(newName)) return false;
    return true;
  }
  // Já tem nome válido - NÃO sobrescrever
  return false;
}

// Interfaces para tipos WAHA (usando chats/overview)
interface WAHAChatOverview {
  id: string;
  name?: string;
  timestamp?: number;
  unreadCount?: number;
  archived?: boolean;
  pinned?: boolean;
  isGroup?: boolean;
  picture?: string;
  // lastMessage vem do endpoint /chats/overview
  lastMessage?: {
    id?: string;
    body?: string;
    text?: string;
    timestamp?: number;
    fromMe?: boolean;
    type?: string;
  };
}

interface WAHAMessageRaw {
  id: {
    _serialized?: string;
    id?: string;
  };
  from?: string;
  to?: string;
  body?: string;
  type?: string;
  timestamp?: number;
  fromMe?: boolean;
  hasMedia?: boolean;
  mediaUrl?: string;
  mimetype?: string;
  filename?: string;
  caption?: string;
  location?: {
    latitude: number;
    longitude: number;
    description?: string;
  };
  vCards?: string[];
  _data?: {
    notifyName?: string;
  };
  ack?: number; // 0=pending, 1=sent, 2=delivered, 3=read
}

type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact' | 'sticker' | 'reaction' | 'poll' | 'unknown';

// Mapear tipo de mensagem do WAHA para nosso tipo
function mapWahaMessageType(wahaType: string): MessageType {
  const typeMap: Record<string, MessageType> = {
    chat: 'text',
    text: 'text',
    image: 'image',
    video: 'video',
    ptt: 'audio',
    audio: 'audio',
    document: 'document',
    location: 'location',
    vcard: 'contact',
    sticker: 'sticker',
    reaction: 'reaction',
    poll: 'poll',
  };
  return typeMap[wahaType?.toLowerCase()] || 'unknown';
}

// Extrair número de telefone do JID
function extractPhoneFromJid(jid: string): string {
  return jid.replace('@c.us', '').replace('@s.whatsapp.net', '').replace('@g.us', '');
}

// Mapear status ACK do WAHA para status do sistema
function mapAckToStatus(ack?: number, fromMe?: boolean): string {
  if (!fromMe) return 'delivered';
  if (ack === undefined) return 'pending';
  if (ack === 0) return 'pending';
  if (ack === 1) return 'sent';
  if (ack === 2) return 'delivered';
  if (ack >= 3) return 'read';
  return 'pending';
}

// Classe de sincronização em background
class BackgroundSyncService {
  private isRunning = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private onProgressCallback: ((status: SyncStatus) => void) | null = null;
  private syncQueue: WhatsAppSession[] = [];
  private currentStatus: SyncStatus = { isRunning: false };

  // Status da sincronização
  get status(): SyncStatus {
    return this.currentStatus;
  }

  // Registrar callback de progresso
  onProgress(callback: (status: SyncStatus) => void): void {
    this.onProgressCallback = callback;
  }

  // Atualizar status e notificar
  private updateStatus(status: Partial<SyncStatus>): void {
    this.currentStatus = { ...this.currentStatus, ...status };
    this.onProgressCallback?.(this.currentStatus);
  }

  // Sincronizar chats de uma sessão (sem bloquear)
  async syncChatsForSession(session: WhatsAppSession): Promise<SyncResult> {
    if (!session.franqueado_id) {
      console.warn('[BackgroundSync] Sessão sem franqueado_id:', session.session_name);
      return { success: false, error: 'Sessão não vinculada a uma unidade' };
    }

    try {
      this.updateStatus({
        isRunning: true,
        currentSession: session.session_name,
        phase: 'chats',
      });

      if (DEBUG) console.warn(`[BackgroundSync] Buscando chats da sessão ${session.session_name}...`);

      // 1. Buscar chats do WAHA
      const chatsResult = await wahaClient.getChats(session.session_name);
      if (!chatsResult.success || !chatsResult.data) {
        console.error(`[BackgroundSync] Erro ao buscar chats:`, chatsResult.error);
        return { success: false, error: chatsResult.error || 'Erro ao buscar chats' };
      }

      if (DEBUG) console.warn(`[BackgroundSync] ${(chatsResult.data as WAHAChatOverview[]).length} chats encontrados`);

      const chats = chatsResult.data as WAHAChatOverview[];
      const syncedConversations: string[] = [];
      const errors: string[] = [];

      this.updateStatus({ totalChats: chats.length, currentChat: 0 });

      // 2. Processar cada chat (exceto grupos)
      for (let i = 0; i < chats.length; i++) {
        const chat = chats[i];

        if (chat.isGroup || chat.id.includes('@g.us')) {
          continue;
        }

        try {
          const phoneNumber = extractPhoneFromJid(chat.id);
          const remoteJid = chat.id;

          this.updateStatus({
            currentChat: i + 1,
            currentChatName: chat.name || phoneNumber,
          });

          // 3. Upsert conversa - buscar por remote_jid OU phone_number (deduplicação @lid vs @c.us)
          let existingConv: { id: string; contact_name: string | null } | null = null;

          // Primeiro: busca exata por remote_jid
          const { data: byJid } = await supabase
            .from('mt_whatsapp_conversations')
            .select('id, contact_name')
            .eq('session_id', session.id)
            .eq('remote_jid', remoteJid)
            .maybeSingle();

          existingConv = byJid;

          // Se não encontrou por JID e temos telefone, buscar por phone_number na mesma sessão
          // Isso consolida conversas @lid e @c.us do mesmo contato
          // Também normaliza telefones com/sem prefixo 55 (ex: 13974079532 vs 5513974079532)
          if (!existingConv && phoneNumber && phoneNumber.length >= 10) {
            const phoneWithout55 = phoneNumber.startsWith('55') && phoneNumber.length >= 12
              ? phoneNumber.substring(2)
              : phoneNumber;
            const phoneWith55 = phoneNumber.startsWith('55')
              ? phoneNumber
              : `55${phoneNumber}`;

            const { data: byPhone } = await supabase
              .from('mt_whatsapp_conversations')
              .select('id, contact_name')
              .eq('session_id', session.id)
              .or(`phone_number.eq.${phoneNumber},phone_number.eq.${phoneWith55},phone_number.eq.${phoneWithout55}`)
              .not('remote_jid', 'eq', remoteJid)
              .order('last_message_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (byPhone) {
              existingConv = byPhone;
              if (DEBUG) console.warn(`[BackgroundSync] Conversa deduplicada por telefone: ${phoneNumber} (JID: ${remoteJid} → conv: ${byPhone.id})`);
            }
          }

          // Extrair timestamp do lastMessage
          const lastMsgTimestamp = chat.lastMessage?.timestamp;
          const chatTimestamp = lastMsgTimestamp
            ? new Date(lastMsgTimestamp * 1000).toISOString()
            : chat.timestamp
              ? new Date(chat.timestamp * 1000).toISOString()
              : null;

          // Extrair texto da última mensagem
          const lastMessageText = chat.lastMessage?.body || chat.lastMessage?.text || null;
          const lastMessageFromMe = chat.lastMessage?.fromMe ?? null;

          if (existingConv) {
            // Atualizar
            const updateData: Record<string, unknown> = {
              profile_picture_url: chat.picture || null,
              unread_count: chat.unreadCount || 0,
              is_pinned: chat.pinned || false,
              updated_at: new Date().toISOString(),
            };

            // Só atualizar nome se atual for vazio ou telefone (protege nomes editados manualmente)
            if (shouldUpdateContactName(existingConv.contact_name, chat.name)) {
              updateData.contact_name = chat.name || null;
            }

            if (chatTimestamp) {
              updateData.last_message_at = chatTimestamp;
            }
            if (lastMessageText) {
              updateData.last_message_text = lastMessageText.substring(0, 255);
            }
            if (lastMessageFromMe !== null) {
              updateData.last_message_direction = lastMessageFromMe ? 'outbound' : 'inbound';
            }

            await supabase
              .from('mt_whatsapp_conversations')
              .update(updateData)
              .eq('id', existingConv.id);

            syncedConversations.push(existingConv.id);
          } else {
            // Criar nova conversa
            const insertData: Record<string, unknown> = {
              session_id: session.id,
              franchise_id: session.franqueado_id,
              remote_jid: remoteJid,
              phone_number: phoneNumber,
              contact_name: isSessionName(chat.name) ? null : (chat.name || null),
              profile_picture_url: chat.picture || null,
              unread_count: chat.unreadCount || 0,
              is_pinned: chat.pinned || false,
              status: chat.archived ? 'archived' : 'open',
            };

            if (chatTimestamp) {
              insertData.last_message_at = chatTimestamp;
            }
            if (lastMessageText) {
              insertData.last_message_text = lastMessageText.substring(0, 255);
            }
            if (lastMessageFromMe !== null) {
              insertData.last_message_direction = lastMessageFromMe ? 'outbound' : 'inbound';
            }

            const { data: newConv, error } = await supabase
              .from('mt_whatsapp_conversations')
              .insert(insertData)
              .select('id')
              .single();

            if (error) {
              console.error(`[BackgroundSync] Erro ao criar conversa ${phoneNumber}:`, error);
              errors.push(`Erro ao criar conversa ${phoneNumber}: ${error.message}`);
            } else {
              if (DEBUG) console.warn(`[BackgroundSync] Conversa criada: ${newConv.id}`);
              syncedConversations.push(newConv.id);
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Erro desconhecido';
          errors.push(`Erro no chat ${chat.id}: ${msg}`);
        }
      }

      return {
        success: true,
        syncedCount: syncedConversations.length,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      return { success: false, error: msg };
    }
  }

  // Sincronizar mensagens de uma conversa
  async syncMessagesForConversation(
    session: WhatsAppSession,
    conversationId: string,
    remoteJid: string,
    limit = 50
  ): Promise<SyncResult> {
    try {
      if (DEBUG) console.warn(`[BackgroundSync] Buscando mensagens de ${remoteJid}...`);

      // Buscar mensagens do WAHA
      const messagesResult = await wahaClient.getChatMessages(
        session.session_name,
        remoteJid,
        limit
      );

      if (!messagesResult.success || !messagesResult.data) {
        console.error(`[BackgroundSync] Erro ao buscar mensagens de ${remoteJid}:`, messagesResult.error);
        return { success: false, error: messagesResult.error || 'Erro ao buscar mensagens' };
      }

      if (DEBUG) console.warn(`[BackgroundSync] ${(messagesResult.data as WAHAMessageRaw[]).length} mensagens encontradas em ${remoteJid}`);

      const messages = messagesResult.data as WAHAMessageRaw[];
      let syncedCount = 0;
      const errors: string[] = [];

      // Processar mensagens
      for (const msg of messages) {
        try {
          const wahaMessageId = msg.id?._serialized || msg.id?.id || `${Date.now()}_${Math.random()}`;
          const direction = msg.fromMe ? 'outbound' : 'inbound';
          const messageType = mapWahaMessageType(msg.type || 'text');
          const status = mapAckToStatus(msg.ack, msg.fromMe);

          // Verificar se já existe
          const { data: existing } = await supabase
            .from('mt_whatsapp_messages')
            .select('id')
            .eq('waha_message_id', wahaMessageId)
            .eq('session_id', session.id)
            .maybeSingle();

          if (existing) {
            // Atualizar apenas status se mudou
            await supabase
              .from('mt_whatsapp_messages')
              .update({ status })
              .eq('id', existing.id);
            continue;
          }

          // Criar nova mensagem
          const { error } = await supabase
            .from('mt_whatsapp_messages')
            .insert({
              conversation_id: conversationId,
              session_id: session.id,
              franchise_id: session.franqueado_id,
              waha_message_id: wahaMessageId,
              direction,
              message_type: messageType,
              body: msg.body || null,
              caption: msg.caption || null,
              media_url: msg.mediaUrl || null,
              media_mimetype: msg.mimetype || null,
              media_filename: msg.filename || null,
              latitude: msg.location?.latitude || null,
              longitude: msg.location?.longitude || null,
              location_name: msg.location?.description || null,
              contact_vcard: msg.vCards?.[0] || null,
              status,
              timestamp_waha: msg.timestamp
                ? new Date(msg.timestamp * 1000).toISOString()
                : new Date().toISOString(),
            });

          if (error) {
            // Ignorar erros de duplicata silenciosamente
            if (error.code !== '23505' && !error.message?.includes('duplicate')) {
              errors.push(`Erro ao salvar mensagem: ${error.message}`);
            }
          } else {
            syncedCount++;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Erro desconhecido';
          if (!msg.includes('Failed to fetch')) {
            errors.push(`Erro na mensagem: ${msg}`);
          }
        }
      }

      // Atualizar última mensagem da conversa
      if (messages.length > 0) {
        const sortedMessages = [...messages].sort((a, b) => {
          const timestampA = a.timestamp || 0;
          const timestampB = b.timestamp || 0;
          return timestampB - timestampA;
        });

        const mostRecentMsg = sortedMessages[0];
        const mostRecentTimestamp = mostRecentMsg.timestamp
          ? new Date(mostRecentMsg.timestamp * 1000).toISOString()
          : new Date().toISOString();

        let lastMessageText = mostRecentMsg.body || mostRecentMsg.caption;
        if (!lastMessageText) {
          const msgType = mapWahaMessageType(mostRecentMsg.type || 'text');
          switch (msgType) {
            case 'image': lastMessageText = '📷 Imagem'; break;
            case 'video': lastMessageText = '🎬 Vídeo'; break;
            case 'audio': lastMessageText = '🎵 Áudio'; break;
            case 'document': lastMessageText = '📄 Documento'; break;
            case 'location': lastMessageText = '📍 Localização'; break;
            case 'contact': lastMessageText = '👤 Contato'; break;
            case 'sticker': lastMessageText = '🎭 Figurinha'; break;
            case 'poll': lastMessageText = '📊 Enquete'; break;
            default: lastMessageText = '[Mídia]';
          }
        }

        await supabase
          .from('mt_whatsapp_conversations')
          .update({
            last_message_text: lastMessageText.substring(0, 255),
            last_message_at: mostRecentTimestamp,
            last_message_direction: mostRecentMsg.fromMe ? 'outbound' : 'inbound',
            updated_at: new Date().toISOString(),
          })
          .eq('id', conversationId);
      }

      return {
        success: true,
        syncedCount,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      return { success: false, error: msg };
    }
  }

  // Sincronização completa em background
  async syncSessionInBackground(session: WhatsAppSession): Promise<void> {
    if (!session.franqueado_id || session.status !== 'connected') {
      if (DEBUG) console.warn(`[BackgroundSync] Sessão ${session.session_name} não está pronta para sync`);
      this.updateStatus({ isRunning: false });
      return;
    }

    if (DEBUG) console.warn(`[BackgroundSync] Iniciando sync para ${session.session_name}`);

    try {
      // 1. Sincronizar chats
      const chatsResult = await this.syncChatsForSession(session);

      if (!chatsResult.success) {
        console.error(`[BackgroundSync] Erro ao sincronizar chats: ${chatsResult.error}`);
        this.updateStatus({ isRunning: false, lastError: chatsResult.error, lastSyncAt: new Date().toISOString() });
        return;
      }

      // 2. Buscar conversas sincronizadas
      const { data: conversationsWithDate } = await supabase
        .from('mt_whatsapp_conversations')
        .select('id, remote_jid, last_message_at')
        .eq('session_id', session.id)
        .not('last_message_at', 'is', null)
        .order('last_message_at', { ascending: false })
        .limit(35);

      const { data: conversationsWithoutDate } = await supabase
        .from('mt_whatsapp_conversations')
        .select('id, remote_jid, last_message_at')
        .eq('session_id', session.id)
        .is('last_message_at', null)
        .order('updated_at', { ascending: false })
        .limit(15);

      const conversations = [
        ...(conversationsWithDate || []),
        ...(conversationsWithoutDate || []),
      ].slice(0, 50);

      if (!conversations || conversations.length === 0) {
        if (DEBUG) console.warn('[BackgroundSync] Nenhuma conversa para sincronizar mensagens');
        this.updateStatus({ isRunning: false, lastSyncAt: new Date().toISOString() });
        return;
      }

      this.updateStatus({ phase: 'messages', totalConversations: conversations.length });

      // 3. Sincronizar mensagens de cada conversa
      for (let i = 0; i < conversations.length; i++) {
        const conv = conversations[i];

        this.updateStatus({ currentConversation: i + 1 });

        await this.syncMessagesForConversation(
          session,
          conv.id,
          conv.remote_jid,
          20
        );

        await wahaSyncRateLimiter.waitForSlot();
      }

      if (DEBUG) console.warn(`[BackgroundSync] Sync completo para ${session.session_name}`);
      this.updateStatus({
        isRunning: false,
        lastSyncAt: new Date().toISOString(),
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error(`[BackgroundSync] Erro durante sync: ${errorMsg}`);
      this.updateStatus({
        isRunning: false,
        lastError: errorMsg,
        lastSyncAt: new Date().toISOString(),
      });
    }
  }

  // Iniciar sincronização periódica
  startPeriodicSync(sessions: WhatsAppSession[], intervalMs = 60000): void {
    if (this.syncInterval) {
      this.stopPeriodicSync();
    }

    this.syncQueue = sessions.filter(
      s => s.status === 'connected' && s.franqueado_id
    );

    if (this.syncQueue.length === 0) {
      if (DEBUG) console.warn('[BackgroundSync] Nenhuma sessão conectada para sync periódico');
      return;
    }

    if (DEBUG) console.warn(`[BackgroundSync] Iniciando sync periódico para ${this.syncQueue.length} sessões`);

    this.runPeriodicSync();

    this.syncInterval = setInterval(() => {
      this.runPeriodicSync();
    }, intervalMs);
  }

  // Executar uma rodada de sync
  private async runPeriodicSync(): Promise<void> {
    if (this.isRunning) {
      if (DEBUG) console.warn('[BackgroundSync] Sync já em andamento, pulando...');
      return;
    }

    this.isRunning = true;

    try {
      for (const session of this.syncQueue) {
        try {
          await this.syncSessionInBackground(session);
        } catch (err) {
          console.error(`[BackgroundSync] Erro no sync de ${session.session_name}:`, err);
        }
      }
    } finally {
      this.isRunning = false;
      this.updateStatus({ isRunning: false });
    }
  }

  // Parar sincronização periódica
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    if (DEBUG) console.warn('[BackgroundSync] Sync periódico parado');
  }

  // Atualizar lista de sessões para sync
  updateSessions(sessions: WhatsAppSession[]): void {
    this.syncQueue = sessions.filter(
      s => s.status === 'connected' && s.franqueado_id
    );
  }
}

// Interfaces
export interface SyncStatus {
  isRunning: boolean;
  currentSession?: string;
  phase?: 'chats' | 'messages';
  totalChats?: number;
  currentChat?: number;
  currentChatName?: string;
  totalConversations?: number;
  currentConversation?: number;
  lastSyncAt?: string;
  lastError?: string;
}

export interface SyncResult {
  success: boolean;
  syncedCount?: number;
  error?: string;
  errors?: string[];
}

// Singleton
export const backgroundSync = new BackgroundSyncService();

// Hook para sincronizar mensagens e conversas do WAHA

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { wahaClient } from '@/services/waha/wahaDirectClient';
import type { WhatsAppSession, WhatsAppConversation, WhatsAppMessage, MessageType } from '@/types/whatsapp';

// Tipo estendido para incluir tenant_id (obrigatório no MT)
type WhatsAppSessionMT = WhatsAppSession & { tenant_id?: string };
import { toast } from 'sonner';

const CONVERSATIONS_KEY = 'whatsapp-conversations';
const MESSAGES_KEY = 'whatsapp-messages';

// Interface para chat do WAHA
interface WAHAChat {
  id: string;
  name?: string;
  timestamp?: number;
  unreadCount?: number;
  archived?: boolean;
  pinned?: boolean;
  isGroup?: boolean;
  picture?: string;
}

// Interface para mensagem do WAHA
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
}

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

/**
 * @deprecated Use useWhatsAppChatAdapter instead. This hook lacks tenant isolation.
 */
export function useSyncMessages() {
  const queryClient = useQueryClient();

  // Sincronizar chats de uma sessão
  const syncChats = useMutation({
    mutationFn: async ({
      session,
      onProgress,
    }: {
      session: WhatsAppSessionMT;
      onProgress?: (progress: { current: number; total: number; chatName?: string }) => void;
    }) => {
      if (!session.franqueado_id) {
        throw new Error('Sessão não está vinculada a uma unidade');
      }

      // Verificar tenant_id (obrigatório para MT)
      const tenantId = (session as WhatsAppSessionMT).tenant_id;
      if (!tenantId) {
        throw new Error('Sessão sem tenant_id - não é possível sincronizar');
      }

      // 1. Buscar chats do WAHA
      const chatsResult = await wahaClient.getChats(session.session_name);
      if (!chatsResult.success || !chatsResult.data) {
        throw new Error(chatsResult.error || 'Erro ao buscar chats');
      }

      const chats = chatsResult.data as WAHAChat[];
      const syncedConversations: WhatsAppConversation[] = [];
      const errors: string[] = [];

      // 2. Processar cada chat
      for (let i = 0; i < chats.length; i++) {
        const chat = chats[i];

        // Ignorar grupos por enquanto
        if (chat.isGroup || chat.id.includes('@g.us')) {
          continue;
        }

        try {
          onProgress?.({
            current: i + 1,
            total: chats.length,
            chatName: chat.name || extractPhoneFromJid(chat.id),
          });

          const phoneNumber = extractPhoneFromJid(chat.id);
          const remoteJid = chat.id;

          // 3. Verificar se conversa já existe
          const { data: existingConversation } = await supabase
            .from('mt_whatsapp_conversations')
            .select('id')
            .eq('session_id', session.id)
            .eq('remote_jid', remoteJid)
            .maybeSingle();

          let conversationId: string;

          if (existingConversation) {
            conversationId = existingConversation.id;
            // Atualizar dados da conversa
            await supabase
              .from('mt_whatsapp_conversations')
              .update({
                contact_name: chat.name || null,
                profile_picture_url: chat.picture || null,
                unread_count: chat.unreadCount || 0,
                is_pinned: chat.pinned || false,
                updated_at: new Date().toISOString(),
              })
              .eq('id', conversationId);
          } else {
            // Criar nova conversa
            const { data: newConversation, error } = await supabase
              .from('mt_whatsapp_conversations')
              .insert({
                tenant_id: tenantId, // OBRIGATÓRIO para MT
                session_id: session.id,
                franqueado_id: session.franqueado_id,
                remote_jid: remoteJid,
                phone_number: phoneNumber,
                contact_name: chat.name || null,
                profile_picture_url: chat.picture || null,
                unread_count: chat.unreadCount || 0,
                is_pinned: chat.pinned || false,
                status: chat.archived ? 'archived' : 'open',
              })
              .select()
              .single();

            if (error) {
              errors.push(`Erro ao criar conversa ${phoneNumber}: ${error.message}`);
              continue;
            }

            conversationId = newConversation.id;
          }

          syncedConversations.push({
            id: conversationId,
            session_id: session.id,
            franqueado_id: session.franqueado_id,
            remote_jid: remoteJid,
            phone_number: phoneNumber,
            contact_name: chat.name || null,
          } as WhatsAppConversation);

        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
          errors.push(`Erro no chat ${chat.id}: ${errorMsg}`);
        }
      }

      return {
        conversations: syncedConversations,
        errors,
        totalChats: chats.length,
        syncedCount: syncedConversations.length,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });
      if (data.errors.length > 0) {
        toast.warning(`Sincronizados ${data.syncedCount} chats com ${data.errors.length} erros`);
      } else {
        toast.success(`${data.syncedCount} chats sincronizados!`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro ao sincronizar chats: ${error.message}`);
    },
  });

  // Sincronizar mensagens de uma conversa
  const syncMessages = useMutation({
    mutationFn: async ({
      session,
      conversation,
      limit = 100,
      onProgress,
    }: {
      session: WhatsAppSessionMT;
      conversation: WhatsAppConversation;
      limit?: number;
      onProgress?: (progress: { current: number; total: number }) => void;
    }) => {
      // Verificar tenant_id (obrigatório para MT)
      const tenantId = (session as WhatsAppSessionMT).tenant_id;
      if (!tenantId) {
        throw new Error('Sessão sem tenant_id - não é possível sincronizar mensagens');
      }
      // 1. Buscar mensagens do WAHA
      const messagesResult = await wahaClient.getChatMessages(
        session.session_name,
        conversation.remote_jid,
        limit
      );

      if (!messagesResult.success || !messagesResult.data) {
        throw new Error(messagesResult.error || 'Erro ao buscar mensagens');
      }

      const messages = messagesResult.data as WAHAMessageRaw[];
      const syncedMessages: WhatsAppMessage[] = [];
      const errors: string[] = [];

      // 2. Processar cada mensagem
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];

        try {
          onProgress?.({
            current: i + 1,
            total: messages.length,
          });

          const wahaMessageId = msg.id?._serialized || msg.id?.id || `${Date.now()}_${i}`;
          const direction = msg.fromMe ? 'outbound' : 'inbound';
          const messageType = mapWahaMessageType(msg.type || 'text');

          // 3. Verificar se mensagem já existe
          const { data: existingMessage } = await supabase
            .from('mt_whatsapp_messages')
            .select('id')
            .eq('waha_message_id', wahaMessageId)
            .eq('session_id', session.id)
            .maybeSingle();

          if (existingMessage) {
            // Mensagem já existe, pular
            continue;
          }

          // 4. Criar nova mensagem
          const { data: newMessage, error } = await supabase
            .from('mt_whatsapp_messages')
            .insert({
              tenant_id: tenantId, // OBRIGATÓRIO para MT
              conversation_id: conversation.id,
              session_id: session.id,
              franqueado_id: session.franqueado_id,
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
              status: msg.fromMe ? 'sent' : 'delivered',
              timestamp_waha: msg.timestamp
                ? new Date(msg.timestamp * 1000).toISOString()
                : new Date().toISOString(),
            })
            .select()
            .single();

          if (error) {
            errors.push(`Erro ao criar mensagem: ${error.message}`);
            continue;
          }

          syncedMessages.push(newMessage as WhatsAppMessage);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
          errors.push(`Erro na mensagem: ${errorMsg}`);
        }
      }

      // 5. Atualizar última mensagem da conversa
      if (syncedMessages.length > 0) {
        const lastMessage = syncedMessages[syncedMessages.length - 1];
        await supabase
          .from('mt_whatsapp_conversations')
          .update({
            last_message_text: lastMessage.body || lastMessage.caption || '[Mídia]',
            last_message_at: lastMessage.timestamp_waha,
            last_message_direction: lastMessage.direction,
            updated_at: new Date().toISOString(),
          })
          .eq('id', conversation.id);
      }

      return {
        messages: syncedMessages,
        errors,
        totalMessages: messages.length,
        syncedCount: syncedMessages.length,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY] });
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });
      if (data.errors.length > 0) {
        toast.warning(`Sincronizadas ${data.syncedCount} mensagens com ${data.errors.length} erros`);
      } else if (data.syncedCount > 0) {
        toast.success(`${data.syncedCount} novas mensagens sincronizadas!`);
      } else {
        toast.info('Mensagens já estão sincronizadas');
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro ao sincronizar mensagens: ${error.message}`);
    },
  });

  // Sincronizar tudo de uma sessão (chats + mensagens)
  const syncAll = useMutation({
    mutationFn: async ({
      session,
      messagesPerChat = 50,
      onProgress,
    }: {
      session: WhatsAppSessionMT;
      messagesPerChat?: number;
      onProgress?: (progress: {
        phase: 'chats' | 'messages';
        current: number;
        total: number;
        chatName?: string;
      }) => void;
    }) => {
      // 1. Sincronizar chats
      onProgress?.({ phase: 'chats', current: 0, total: 0 });

      const chatsResult = await syncChats.mutateAsync({
        session,
        onProgress: (p) => onProgress?.({ phase: 'chats', ...p }),
      });

      // 2. Sincronizar mensagens de cada conversa
      let totalMessages = 0;
      const messageErrors: string[] = [];

      for (let i = 0; i < chatsResult.conversations.length; i++) {
        const conversation = chatsResult.conversations[i];

        onProgress?.({
          phase: 'messages',
          current: i + 1,
          total: chatsResult.conversations.length,
          chatName: conversation.contact_name || conversation.phone_number,
        });

        try {
          const messagesResult = await syncMessages.mutateAsync({
            session,
            conversation,
            limit: messagesPerChat,
          });
          totalMessages += messagesResult.syncedCount;
          messageErrors.push(...messagesResult.errors);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
          messageErrors.push(`Erro no chat ${conversation.phone_number}: ${errorMsg}`);
        }
      }

      return {
        conversations: chatsResult.conversations,
        totalConversations: chatsResult.syncedCount,
        totalMessages,
        errors: [...chatsResult.errors, ...messageErrors],
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY] });
      toast.success(
        `Sincronização completa: ${data.totalConversations} conversas, ${data.totalMessages} mensagens`
      );
    },
    onError: (error: Error) => {
      toast.error(`Erro na sincronização: ${error.message}`);
    },
  });

  return {
    syncChats,
    syncMessages,
    syncAll,
    isLoading: syncChats.isPending || syncMessages.isPending || syncAll.isPending,
  };
}

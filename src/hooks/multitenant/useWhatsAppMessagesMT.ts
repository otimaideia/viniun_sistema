// Hook Multi-Tenant para Mensagens WhatsApp
// Tabela: mt_whatsapp_messages

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { wahaApi } from '@/services/waha-api';
import { logLeadActivity } from '@/utils/leadActivityLogger';
import { toast } from 'sonner';
import { sanitizeObjectForJSON } from '@/utils/unicodeSanitizer';
import type {
  MTWhatsAppMessage,
  SendMessageInput,
  MessageFilters,
  MessageType,
  MessageStatus,
} from '@/types/whatsapp-mt';

const PAGE_SIZE = 50;

export function useWhatsAppMessagesMT(conversationId: string | undefined, filters?: Omit<MessageFilters, 'conversation_id'>) {
  const { tenant, accessLevel, user, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Query: Listar mensagens com paginação infinita
  const query = useInfiniteQuery({
    queryKey: ['mt-whatsapp-messages', conversationId, tenant?.id, filters],
    queryFn: async ({ pageParam }): Promise<{ messages: MTWhatsAppMessage[]; nextCursor: string | null }> => {
      if (!conversationId) {
        return { messages: [], nextCursor: null };
      }

      let q = supabase
        .from('mt_whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('tenant_id', tenant?.id)
        .or('is_revoked.is.null,is_revoked.eq.false')
        .order('timestamp', { ascending: false })
        .limit(PAGE_SIZE);

      // Cursor para paginação
      if (pageParam) {
        q = q.lt('timestamp', pageParam);
      }

      // Filtros adicionais
      if (filters?.tipo) {
        q = q.eq('tipo', filters.tipo);
      }
      if (filters?.from_me !== undefined) {
        q = q.eq('from_me', filters.from_me);
      }
      if (filters?.after) {
        q = q.gt('timestamp', filters.after);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar mensagens MT:', error);
        throw error;
      }

      // Sanitizar dados para prevenir erros de Unicode inválido
      const sanitizedData = sanitizeObjectForJSON(data || []);
      const rawMessages = sanitizedData as MTWhatsAppMessage[];
      const nextCursor = rawMessages.length === PAGE_SIZE ? rawMessages[rawMessages.length - 1].timestamp : null;

      // Deduplicar mensagens: chatbot/frontend e webhook podem inserir a mesma mensagem
      // com message_ids diferentes (bot-xxx vs true_xxx@lid_xxx)
      const seen = new Map<string, MTWhatsAppMessage>();
      for (const msg of rawMessages) {
        // Chave: body + from_me + timestamp arredondado para mesmo segundo
        const tsKey = msg.timestamp ? msg.timestamp.substring(0, 19) : '';
        const dedupeKey = `${msg.from_me}_${tsKey}_${(msg.body || '').substring(0, 50)}`;
        const existing = seen.get(dedupeKey);
        if (!existing) {
          seen.set(dedupeKey, msg);
        } else {
          // Preferir a mensagem com message_id do WAHA (true_xxx) sobre bot-xxx
          if (msg.message_id && !msg.message_id.startsWith('bot-') && existing.message_id?.startsWith('bot-')) {
            seen.set(dedupeKey, msg);
          }
        }
      }
      const messages = Array.from(seen.values());

      // Ordenar do mais antigo para mais recente para exibição
      return {
        messages: messages.reverse(),
        nextCursor,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!conversationId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 30_000, // 30s — real-time subscriptions atualizam automaticamente
  });

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`mt-whatsapp-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mt_whatsapp_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('Nova mensagem:', payload);
          queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-messages', conversationId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mt_whatsapp_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('Mensagem atualizada:', payload);
          queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-messages', conversationId] });
        }
      )
      .subscribe((status, err) => {
        console.log(`[RT] mt-whatsapp-messages-${conversationId} status:`, status);
        if (err) console.error(`[RT] mt-whatsapp-messages-${conversationId} error:`, err);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  // Mutation: Enviar mensagem
  const sendMessage = useMutation({
    mutationFn: async (input: SendMessageInput): Promise<MTWhatsAppMessage> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      // 1. Buscar dados da sessão para enviar via WAHA
      const { data: conversation } = await supabase
        .from('mt_whatsapp_conversations')
        .select(`
          chat_id,
          session:mt_whatsapp_sessions(session_name, waha_url, waha_api_key)
        `)
        .eq('id', input.conversation_id)
        .single();

      if (!conversation?.session) {
        throw new Error('Sessão não encontrada');
      }

      const session = conversation.session as {
        session_name: string;
        waha_url: string;
        waha_api_key: string;
      };

      // 2. Enviar para WAHA API
      let wahaMessageId: string | null = null;
      let status: MessageStatus = 'pending';

      try {
        const wahaUrl = session.waha_url || 'https://waha.yeslaserpraiagrande.com.br';
        const endpoint = input.media_url ? '/api/sendFile' : '/api/sendText';

        const wahaPayload = input.media_url
          ? {
              chatId: conversation.chat_id,
              file: {
                url: input.media_url,
                mimetype: input.media_mimetype,
                filename: input.media_filename,
              },
              caption: input.caption || input.body,
              session: session.session_name,
            }
          : {
              chatId: conversation.chat_id,
              text: input.body,
              session: session.session_name,
            };

        const wahaResponse = await fetch(`${wahaUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': session.waha_api_key || '',
          },
          body: JSON.stringify(wahaPayload),
        });

        if (wahaResponse.ok) {
          const wahaData = await wahaResponse.json();
          wahaMessageId = wahaData.id || wahaData.key?.id;
          status = 'sent';
        } else {
          console.error('Erro WAHA:', await wahaResponse.text());
          status = 'failed';
        }
      } catch (error) {
        console.error('Erro ao enviar para WAHA:', error);
        status = 'failed';
      }

      // 3. Salvar no banco
      const { data: message, error } = await supabase
        .from('mt_whatsapp_messages')
        .insert({
          conversation_id: input.conversation_id,
          session_id: input.session_id,
          tenant_id: tenant?.id,
          message_id: wahaMessageId,
          from_me: true,
          tipo: input.tipo || 'text',
          body: input.body,
          caption: input.caption,
          media_url: input.media_url,
          media_mimetype: input.media_mimetype,
          media_filename: input.media_filename,
          status,
          quoted_message_id: input.quoted_message_id,
          template_id: input.template_id,
          timestamp: new Date().toISOString(),
          sender_id: user?.id || null,
          sender_name: user?.nome || null,
        })
        .select()
        .single();

      if (error) throw error;

      const now = new Date().toISOString();

      // 4. Atualizar última mensagem na conversa
      // IMPORTANTE: Limpar last_customer_message_at quando agente responde
      // para remover o indicador de "aguardando resposta"
      await supabase
        .from('mt_whatsapp_conversations')
        .update({
          last_message_text: input.body || input.caption || '[Mídia]',
          last_message_at: now,
          last_message_from: 'me',
          last_customer_message_at: null,
          updated_at: now,
        })
        .eq('id', input.conversation_id);

      // Auto-atribuir conversa ao atendente (se ainda não atribuída)
      if (user?.id) {
        await supabase
          .from('mt_whatsapp_conversations')
          .update({ assigned_to: user.id, assigned_at: now })
          .eq('id', input.conversation_id)
          .is('assigned_to', null);
      }

      return message as MTWhatsAppMessage;
    },
    onSuccess: async (message, input) => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-conversations'] });

      // Log atividade no lead vinculado à conversa (se houver)
      if (tenant?.id && input.conversation_id) {
        try {
          const { data: conv } = await supabase
            .from('mt_whatsapp_conversations')
            .select('lead_id, contact_name')
            .eq('id', input.conversation_id)
            .single();

          if (conv?.lead_id) {
            const preview = (input.body || input.caption || '[Mídia]').substring(0, 100);
            logLeadActivity({
              tenantId: tenant.id,
              leadId: conv.lead_id,
              tipo: 'whatsapp',
              titulo: 'Mensagem WhatsApp Enviada',
              descricao: `Mensagem enviada para ${conv.contact_name || 'contato'}: "${preview}${preview.length >= 100 ? '...' : ''}"`,
              dados: {
                conversation_id: input.conversation_id,
                message_id: message.id,
                tipo: input.tipo || 'text',
                from_me: true,
              },
              userId: user?.id,
              userNome: user?.nome || user?.email || 'Sistema',
            });
          }
        } catch {
          // silently fail - don't block message send
        }
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar mensagem: ${error.message}`);
    },
  });

  // Mutation: Atualizar status da mensagem
  const updateMessageStatus = useMutation({
    mutationFn: async ({
      messageId,
      status,
      ack,
      errorMessage,
    }: {
      messageId: string;
      status: MessageStatus;
      ack?: number;
      errorMessage?: string;
    }) => {
      const { error } = await supabase
        .from('mt_whatsapp_messages')
        .update({
          status,
          ack,
          error_message: errorMessage,
        })
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-messages', conversationId] });
    },
  });

  // Mutation: Reenviar mensagem falhada
  const retryMessage = useMutation({
    mutationFn: async (messageId: string) => {
      // Buscar mensagem original
      const { data: message } = await supabase
        .from('mt_whatsapp_messages')
        .select('*')
        .eq('id', messageId)
        .single();

      if (!message) throw new Error('Mensagem não encontrada');

      // Reenviar
      return sendMessage.mutateAsync({
        conversation_id: message.conversation_id,
        session_id: message.session_id,
        tipo: message.tipo as MessageType,
        body: message.body,
        media_url: message.media_url,
        media_mimetype: message.media_mimetype,
        media_filename: message.media_filename,
        caption: message.caption,
      });
    },
    onSuccess: () => {
      toast.success('Mensagem reenviada');
    },
  });

  // Mutation: Deletar mensagem (soft delete via is_revoked)
  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('mt_whatsapp_messages')
        .update({ is_revoked: true, updated_at: new Date().toISOString() } as any)
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-messages', conversationId] });
      toast.success('Mensagem removida');
    },
  });

  // Mutation: Fixar mensagem no chat (WAHA + DB)
  const pinMessage = useMutation({
    mutationFn: async ({ messageId, duration }: { messageId: string; duration?: number }) => {
      if (!conversationId) throw new Error('Conversa não definida');

      // Buscar dados da mensagem e sessão
      const { data: msg } = await supabase
        .from('mt_whatsapp_messages')
        .select('message_id, conversation:mt_whatsapp_conversations(chat_id, session:mt_whatsapp_sessions(session_name, waha_url, waha_api_key))')
        .eq('id', messageId)
        .single();

      if (msg?.message_id) {
        // Atualizar no DB
        await supabase
          .from('mt_whatsapp_messages')
          .update({ is_pinned: true })
          .eq('id', messageId);

        // Chamar WAHA (best-effort)
        const conv = msg.conversation as { chat_id: string; session: { session_name: string; waha_url: string; waha_api_key: string } };
        if (conv?.session?.waha_url) {
          wahaApi.setConfig(conv.session.waha_url, conv.session.waha_api_key);
          await wahaApi.pinMessage(
            conv.session.session_name,
            conv.chat_id,
            msg.message_id,
            duration
          ).catch(() => console.warn('[WAHA] Falha ao fixar mensagem (ignorado)'));
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-messages', conversationId] });
      toast.success('Mensagem fixada');
    },
  });

  // Mutation: Desafixar mensagem (WAHA + DB)
  const unpinMessage = useMutation({
    mutationFn: async (messageId: string) => {
      if (!conversationId) throw new Error('Conversa não definida');

      const { data: msg } = await supabase
        .from('mt_whatsapp_messages')
        .select('message_id, conversation:mt_whatsapp_conversations(chat_id, session:mt_whatsapp_sessions(session_name, waha_url, waha_api_key))')
        .eq('id', messageId)
        .single();

      if (msg?.message_id) {
        await supabase
          .from('mt_whatsapp_messages')
          .update({ is_pinned: false })
          .eq('id', messageId);

        const conv = msg.conversation as { chat_id: string; session: { session_name: string; waha_url: string; waha_api_key: string } };
        if (conv?.session?.waha_url) {
          wahaApi.setConfig(conv.session.waha_url, conv.session.waha_api_key);
          await wahaApi.unpinMessage(
            conv.session.session_name,
            conv.chat_id,
            msg.message_id
          ).catch(() => console.warn('[WAHA] Falha ao desafixar mensagem (ignorado)'));
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-messages', conversationId] });
      toast.success('Mensagem desafixada');
    },
  });

  // Mutation: Enviar reação a uma mensagem (WAHA + DB)
  const sendReaction = useMutation({
    mutationFn: async ({ messageId, reaction }: { messageId: string; reaction: string }) => {
      if (!conversationId) throw new Error('Conversa não definida');

      const { data: msg } = await supabase
        .from('mt_whatsapp_messages')
        .select('id, message_id, reactions, conversation:mt_whatsapp_conversations(chat_id, session:mt_whatsapp_sessions(session_name, waha_url, waha_api_key))')
        .eq('id', messageId)
        .single();

      if (msg?.message_id) {
        // Atualizar reactions no DB
        const currentReactions = (msg.reactions as Record<string, string[]>) || {};
        const meId = 'me';
        const newReactions = { ...currentReactions };
        if (reaction) {
          // Remove from other emojis first
          for (const emoji of Object.keys(newReactions)) {
            newReactions[emoji] = newReactions[emoji].filter((id: string) => id !== meId);
            if (newReactions[emoji].length === 0) delete newReactions[emoji];
          }
          if (!newReactions[reaction]) newReactions[reaction] = [];
          newReactions[reaction].push(meId);
        } else {
          // Remove all reactions from me
          for (const emoji of Object.keys(newReactions)) {
            newReactions[emoji] = newReactions[emoji].filter((id: string) => id !== meId);
            if (newReactions[emoji].length === 0) delete newReactions[emoji];
          }
        }

        await supabase
          .from('mt_whatsapp_messages')
          .update({ reactions: newReactions })
          .eq('id', messageId);

        // Chamar WAHA (best-effort)
        const conv = msg.conversation as { chat_id: string; session: { session_name: string; waha_url: string; waha_api_key: string } };
        if (conv?.session?.waha_url) {
          wahaApi.setConfig(conv.session.waha_url, conv.session.waha_api_key);
          await wahaApi.sendReaction(
            conv.session.session_name,
            msg.message_id,
            reaction
          ).catch(() => console.warn('[WAHA] Falha ao enviar reação (ignorado)'));
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-messages', conversationId] });
    },
  });

  // Flatten mensagens de todas as páginas
  const allMessages = query.data?.pages.flatMap((page) => page.messages) || [];

  return {
    // Query
    messages: allMessages,
    isLoading: query.isLoading || isTenantLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    error: query.error,
    refetch: query.refetch,

    // Mutations
    sendMessage,
    updateMessageStatus,
    retryMessage,
    deleteMessage,
    pinMessage,
    unpinMessage,
    sendReaction,

    // Estados
    isSending: sendMessage.isPending,
  };
}

// Hook para envio de mensagens (versão simplificada)
export function useSendMessageMT(sessionId: string | undefined) {
  const { tenant, accessLevel } = useTenantContext();
  const queryClient = useQueryClient();

  const sendText = useMutation({
    mutationFn: async ({
      conversationId,
      text,
      quotedMessageId,
    }: {
      conversationId: string;
      text: string;
      quotedMessageId?: string;
    }) => {
      if (!sessionId) throw new Error('Sessão não definida');
      if (!tenant && accessLevel !== 'platform') throw new Error('Tenant não definido');

      // Buscar dados da sessão e conversa
      const { data: conversation } = await supabase
        .from('mt_whatsapp_conversations')
        .select(`
          chat_id,
          session:mt_whatsapp_sessions(session_name, waha_url, waha_api_key)
        `)
        .eq('id', conversationId)
        .single();

      if (!conversation?.session) {
        throw new Error('Sessão não encontrada');
      }

      const session = conversation.session as {
        session_name: string;
        waha_url: string;
        waha_api_key: string;
      };

      // Enviar via WAHA
      const wahaUrl = session.waha_url || 'https://waha.yeslaserpraiagrande.com.br';
      const response = await fetch(`${wahaUrl}/api/sendText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': session.waha_api_key || '',
        },
        body: JSON.stringify({
          chatId: conversation.chat_id,
          text,
          session: session.session_name,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar mensagem');
      }

      const wahaData = await response.json();

      // Salvar no banco
      const { data: message, error } = await supabase
        .from('mt_whatsapp_messages')
        .insert({
          conversation_id: conversationId,
          session_id: sessionId,
          tenant_id: tenant?.id,
          message_id: wahaData.id || wahaData.key?.id,
          from_me: true,
          tipo: 'text',
          body: text,
          status: 'sent',
          quoted_message_id: quotedMessageId,
          timestamp: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar conversa
      await supabase
        .from('mt_whatsapp_conversations')
        .update({
          last_message_text: text,
          last_message_at: new Date().toISOString(),
          last_message_from: 'me',
        })
        .eq('id', conversationId);

      return message;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-conversations'] });
    },
  });

  const sendMedia = useMutation({
    mutationFn: async ({
      conversationId,
      mediaUrl,
      mediaType,
      filename,
      caption,
    }: {
      conversationId: string;
      mediaUrl: string;
      mediaType: string;
      filename?: string;
      caption?: string;
    }) => {
      if (!sessionId) throw new Error('Sessão não definida');
      if (!tenant && accessLevel !== 'platform') throw new Error('Tenant não definido');

      const { data: conversation } = await supabase
        .from('mt_whatsapp_conversations')
        .select(`
          chat_id,
          session:mt_whatsapp_sessions(session_name, waha_url, waha_api_key)
        `)
        .eq('id', conversationId)
        .single();

      if (!conversation?.session) {
        throw new Error('Sessão não encontrada');
      }

      const session = conversation.session as {
        session_name: string;
        waha_url: string;
        waha_api_key: string;
      };

      const wahaUrl = session.waha_url || 'https://waha.yeslaserpraiagrande.com.br';
      const response = await fetch(`${wahaUrl}/api/sendFile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': session.waha_api_key || '',
        },
        body: JSON.stringify({
          chatId: conversation.chat_id,
          file: {
            url: mediaUrl,
            mimetype: mediaType,
            filename,
          },
          caption,
          session: session.session_name,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar mídia');
      }

      const wahaData = await response.json();

      // Determinar tipo da mensagem
      let tipo: MessageType = 'document';
      if (mediaType.startsWith('image/')) tipo = 'image';
      else if (mediaType.startsWith('video/')) tipo = 'video';
      else if (mediaType.startsWith('audio/')) tipo = 'audio';

      const { data: message, error } = await supabase
        .from('mt_whatsapp_messages')
        .insert({
          conversation_id: conversationId,
          session_id: sessionId,
          tenant_id: tenant?.id,
          message_id: wahaData.id || wahaData.key?.id,
          from_me: true,
          tipo,
          body: caption,
          caption,
          media_url: mediaUrl,
          media_mimetype: mediaType,
          media_filename: filename,
          status: 'sent',
          timestamp: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('mt_whatsapp_conversations')
        .update({
          last_message_text: caption || `[${tipo}]`,
          last_message_at: new Date().toISOString(),
          last_message_from: 'me',
        })
        .eq('id', conversationId);

      return message;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-conversations'] });
    },
  });

  return {
    sendText,
    sendMedia,
    isSending: sendText.isPending || sendMedia.isPending,
  };
}

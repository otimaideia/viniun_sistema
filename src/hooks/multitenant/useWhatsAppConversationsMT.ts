// Hook Multi-Tenant para Conversas WhatsApp
// Tabela: mt_whatsapp_conversations
// ATUALIZADO: Integração V3 para extração avançada de contatos (Fevereiro 2026)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import { sanitizeObjectForJSON } from '@/utils/unicodeSanitizer';
import { extractContactDataV3, shouldUpdateContactNameV3 } from '@/hooks/useWhatsAppExtractors';
import { wahaApi } from '@/services/waha-api';
import type {
  MTWhatsAppConversation,
  ConversationFilters,
  ConversationStatus,
} from '@/types/whatsapp-mt';

export function useWhatsAppConversationsMT(sessionId?: string, filters?: ConversationFilters) {
  const { tenant, franchise, accessLevel, user, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Query: Listar conversas
  const query = useQuery({
    queryKey: ['mt-whatsapp-conversations', tenant?.id, sessionId, filters, user?.id],
    queryFn: async (): Promise<MTWhatsAppConversation[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado');
      }

      let q = supabase
        .from('mt_whatsapp_conversations')
        .select(`
          *,
          session:mt_whatsapp_sessions(id, nome, session_name, status),
          labels:mt_whatsapp_conversation_labels(
            label:mt_whatsapp_labels(id, name, color)
          )
        `)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .is('deleted_at', null)
        .limit(200); // OTIMIZAÇÃO: carregar apenas as 200 conversas mais recentes

      // Filtro por sessão
      if (sessionId) {
        q = q.eq('session_id', sessionId);
      }

      // Filtros por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      } else if (accessLevel === 'user' && tenant) {
        q = q.eq('tenant_id', tenant.id);
        if (franchise) q = q.eq('franchise_id', franchise.id);

        // Filtrar por sessões permitidas OU conversas atribuídas ao usuário
        if (user?.id) {
          const { data: userSessions } = await supabase
            .from('mt_whatsapp_user_sessions')
            .select('whatsapp_session_id')
            .eq('user_id', user.id)
            .eq('is_active', true);

          const permittedSessionIds = (userSessions || []).map(us => us.whatsapp_session_id).filter(Boolean);

          if (permittedSessionIds.length > 0) {
            // Mostrar conversas das sessões permitidas OU atribuídas ao usuário
            q = q.or(`session_id.in.(${permittedSessionIds.join(',')}),assigned_to.eq.${user.id}`);
          } else {
            // Fallback: se nenhuma permissão explícita, mostrar todas do tenant (compatibilidade)
            console.warn('[WhatsApp] Usuário sem permissões explícitas em mt_whatsapp_user_sessions - mostrando todas do tenant');
          }
        }
      }

      // Filtros adicionais
      if (filters?.session_id) {
        q = q.eq('session_id', filters.session_id);
      }
      if (filters?.status) {
        q = q.eq('status', filters.status);
      }
      if (filters?.is_group !== undefined) {
        q = q.eq('is_group', filters.is_group);
      }
      if (filters?.has_unread) {
        q = q.gt('unread_count', 0);
      }
      if (filters?.assigned_to) {
        q = q.eq('assigned_to', filters.assigned_to);
      }
      if (filters?.search) {
        q = q.or(`contact_name.ilike.%${filters.search}%,contact_phone.ilike.%${filters.search}%`);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar conversas MT:', error);
        throw error;
      }

      // Sanitizar dados para prevenir erros de Unicode inválido
      const sanitizedData = sanitizeObjectForJSON(data || []);
      return sanitizedData as MTWhatsAppConversation[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 15_000, // 15s — real-time subscriptions atualizam automaticamente
  });

  // Real-time subscription
  useEffect(() => {
    if (!tenant && accessLevel !== 'platform') return;

    const channel = supabase
      .channel('mt-whatsapp-conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mt_whatsapp_conversations',
          filter: tenant ? `tenant_id=eq.${tenant.id}` : undefined,
        },
        (payload) => {
          console.log('Conversa atualizada:', payload);
          queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-conversations'] });
        }
      )
      .subscribe((status, err) => {
        console.log('[RT] mt-whatsapp-conversations-changes status:', status);
        if (err) console.error('[RT] mt-whatsapp-conversations-changes error:', err);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant, accessLevel, queryClient]);

  // Mutation: Atualizar conversa
  const updateConversation = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      status?: ConversationStatus;
      unread_count?: number;
      assigned_to?: string | null;
      tags?: string[];
    }) => {
      const { data, error } = await supabase
        .from('mt_whatsapp_conversations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-conversations'] });
    },
  });

  // Mutation: Marcar como lida
  const markAsRead = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('mt_whatsapp_conversations')
        .update({
          unread_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-conversations'] });
    },
  });

  // Mutation: Arquivar conversa (DB + WAHA API)
  const archiveConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      // Buscar dados da conversa para chamar WAHA
      const { data: conv } = await supabase
        .from('mt_whatsapp_conversations')
        .select('chat_id, session:mt_whatsapp_sessions(session_name, waha_url, waha_api_key)')
        .eq('id', conversationId)
        .single();

      const { error } = await supabase
        .from('mt_whatsapp_conversations')
        .update({
          status: 'archived',
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (error) throw error;

      // Chamar WAHA API para arquivar o chat (best-effort)
      if (conv?.chat_id && conv?.session) {
        const session = conv.session as { session_name: string; waha_url: string; waha_api_key: string };
        if (session.waha_url && session.waha_api_key) {
          wahaApi.setConfig(session.waha_url, session.waha_api_key);
          await wahaApi.archiveChat(session.session_name, conv.chat_id).catch(() => {
            console.warn('[WAHA] Falha ao arquivar chat no servidor WAHA (ignorado)');
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-conversations'] });
      toast.success('Conversa arquivada');
    },
  });

  // Mutation: Restaurar conversa (DB + WAHA API)
  const restoreConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      // Buscar dados da conversa para chamar WAHA
      const { data: conv } = await supabase
        .from('mt_whatsapp_conversations')
        .select('chat_id, session:mt_whatsapp_sessions(session_name, waha_url, waha_api_key)')
        .eq('id', conversationId)
        .single();

      const { error } = await supabase
        .from('mt_whatsapp_conversations')
        .update({
          status: 'open',
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (error) throw error;

      // Chamar WAHA API para desarquivar o chat (best-effort)
      if (conv?.chat_id && conv?.session) {
        const session = conv.session as { session_name: string; waha_url: string; waha_api_key: string };
        if (session.waha_url && session.waha_api_key) {
          wahaApi.setConfig(session.waha_url, session.waha_api_key);
          await wahaApi.unarchiveChat(session.session_name, conv.chat_id).catch(() => {
            console.warn('[WAHA] Falha ao desarquivar chat no servidor WAHA (ignorado)');
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-conversations'] });
      toast.success('Conversa restaurada');
    },
  });

  // Mutation: Marcar como não lida (DB + WAHA API)
  const markAsUnread = useMutation({
    mutationFn: async (conversationId: string) => {
      // Buscar dados da conversa para chamar WAHA
      const { data: conv } = await supabase
        .from('mt_whatsapp_conversations')
        .select('chat_id, session:mt_whatsapp_sessions(session_name, waha_url, waha_api_key)')
        .eq('id', conversationId)
        .single();

      const { error } = await supabase
        .from('mt_whatsapp_conversations')
        .update({
          unread_count: 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (error) throw error;

      // Chamar WAHA API para marcar como não lido (best-effort)
      if (conv?.chat_id && conv?.session) {
        const session = conv.session as { session_name: string; waha_url: string; waha_api_key: string };
        if (session.waha_url && session.waha_api_key) {
          wahaApi.setConfig(session.waha_url, session.waha_api_key);
          await wahaApi.markChatUnread(session.session_name, conv.chat_id).catch(() => {
            console.warn('[WAHA] Falha ao marcar chat como não lido no WAHA (ignorado)');
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-conversations'] });
    },
  });

  // Mutation: Atribuir conversa a usuário (com proteção contra race condition)
  const assignConversation = useMutation({
    mutationFn: async ({
      conversationId,
      userId,
    }: {
      conversationId: string;
      userId: string | null;
    }) => {
      // Verificar atribuição atual antes de sobrescrever
      const { data: current } = await supabase
        .from('mt_whatsapp_conversations')
        .select('assigned_to, assigned_at')
        .eq('id', conversationId)
        .single();

      // Se já está atribuída a outro usuário e não estamos desatribuindo
      if (current?.assigned_to && userId && current.assigned_to !== userId) {
        // Buscar nome do responsável atual
        const { data: currentUser } = await supabase
          .from('mt_users')
          .select('nome')
          .or(`auth_user_id.eq.${current.assigned_to},id.eq.${current.assigned_to}`)
          .single();

        const currentName = currentUser?.nome || 'outro usuário';
        throw new Error(`Esta conversa já foi atribuída a ${currentName}. Atualize a página para ver a atribuição atual.`);
      }

      const { error } = await supabase
        .from('mt_whatsapp_conversations')
        .update({
          assigned_to: userId,
          assigned_at: userId ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-conversations'] });
      toast.success('Conversa atribuída');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Mutation: Vincular lead
  const linkLead = useMutation({
    mutationFn: async ({
      conversationId,
      leadId,
    }: {
      conversationId: string;
      leadId: string | null;
    }) => {
      const { error } = await supabase
        .from('mt_whatsapp_conversations')
        .update({
          lead_id: leadId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-conversations'] });
      toast.success('Lead vinculado à conversa');
    },
  });

  // Criar ou buscar conversa por chat_id (COM V3)
  const getOrCreateConversation = async (
    sessionId: string,
    chatId: string,
    contactName?: string,
    contactPhone?: string,
    wahaPayload?: any // NOVO: Payload completo do WAHA para extração V3
  ): Promise<MTWhatsAppConversation | null> => {
    // Buscar existente
    const { data: existing } = await supabase
      .from('mt_whatsapp_conversations')
      .select('*')
      .eq('session_id', sessionId)
      .eq('chat_id', chatId)
      .single();

    if (existing) {
      return existing as MTWhatsAppConversation;
    }

    // Criar nova com dados V3
    const { data: session } = await supabase
      .from('mt_whatsapp_sessions')
      .select('tenant_id, franchise_id')
      .eq('id', sessionId)
      .single();

    if (!session) return null;

    // Extrair dados V3 se payload disponível
    let identifier_type: 'phone' | 'lid' | 'unknown' = 'phone';
    let has_phone_number = true;

    if (wahaPayload) {
      const contactData = extractContactDataV3(wahaPayload);
      identifier_type = contactData.identifierType;
      has_phone_number = contactData.hasPhoneNumber;

      // Usar dados extraídos se não fornecidos
      if (!contactName && contactData.contactName) {
        contactName = contactData.contactName;
      }
      if (!contactPhone && contactData.phoneNumber) {
        contactPhone = contactData.phoneNumber;
      }

      console.log('[V3] Conversa criada com extração V3:', {
        chatId,
        identifier_type,
        has_phone_number,
        contactName,
        contactPhone,
      });
    }

    const { data: created, error } = await supabase
      .from('mt_whatsapp_conversations')
      .insert({
        session_id: sessionId,
        tenant_id: session.tenant_id,
        franchise_id: session.franchise_id,
        chat_id: chatId,
        contact_name: contactName,
        contact_phone: contactPhone,
        identifier_type, // NOVO V3
        has_phone_number, // NOVO V3
        status: 'open',
        unread_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar conversa:', error);
      return null;
    }

    queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-conversations'] });
    return created as MTWhatsAppConversation;
  };

  // NOVO V3: Atualizar conversa existente com dados V3
  const updateConversationV3 = async (
    conversationId: string,
    wahaPayload: any
  ): Promise<void> => {
    const contactData = extractContactDataV3(wahaPayload);

    const updates: any = {
      identifier_type: contactData.identifierType,
      has_phone_number: contactData.hasPhoneNumber,
      updated_at: new Date().toISOString(),
    };

    // Atualizar nome se melhor fonte disponível
    if (contactData.contactName && shouldUpdateContactNameV3(null, contactData.contactName)) {
      updates.contact_name = contactData.contactName;
    }

    // Atualizar telefone se não tinha
    if (!contactData.hasPhoneNumber && contactData.phoneNumber) {
      updates.contact_phone = contactData.phoneNumber;
    }

    const { error } = await supabase
      .from('mt_whatsapp_conversations')
      .update(updates)
      .eq('id', conversationId);

    if (error) {
      console.error('Erro ao atualizar conversa V3:', error);
    } else {
      console.log('[V3] Conversa atualizada:', conversationId, updates);
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-conversations'] });
    }
  };

  // Estatísticas rápidas
  const stats = {
    total: query.data?.length || 0,
    open: query.data?.filter((c) => c.status === 'open').length || 0,
    unread: query.data?.filter((c) => (c.unread_count || 0) > 0).length || 0,
    pending: query.data?.filter((c) => c.status === 'pending').length || 0,
  };

  return {
    // Query
    conversations: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,

    // Estatísticas
    stats,

    // Helpers
    getOrCreateConversation,
    updateConversationV3, // NOVO V3

    // Mutations
    updateConversation,
    markAsRead,
    markAsUnread,
    archiveConversation,
    restoreConversation,
    assignConversation,
    linkLead,
  };
}

// Hook para conversa individual
export function useWhatsAppConversationMT(conversationId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: ['mt-whatsapp-conversation', conversationId],
    queryFn: async (): Promise<MTWhatsAppConversation | null> => {
      if (!conversationId) return null;

      const { data, error } = await supabase
        .from('mt_whatsapp_conversations')
        .select(`
          *,
          session:mt_whatsapp_sessions(id, nome, session_name, status, waha_url, waha_api_key),
          labels:mt_whatsapp_conversation_labels(
            label:mt_whatsapp_labels(id, name, color)
          )
        `)
        .eq('id', conversationId)
        .single();

      if (error) {
        console.error('Erro ao buscar conversa:', error);
        return null;
      }

      return data as MTWhatsAppConversation;
    },
    enabled: !!conversationId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  return {
    conversation: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// =============================================================================
// USE YESIA MT - Hook Multi-Tenant para YESia Chat
// =============================================================================
//
// Hook principal para funcionalidade de chat YESia.
// Gerencia conversas, envia mensagens e recebe respostas da IA.
//
// Tabelas: mt_chatbot_conversations, mt_chatbot_messages, mt_ai_agents,
//          mt_ai_config, mt_ai_skill_executions
//
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  YESiaConfig,
  YESiaConversation,
  YESiaMessage,
  YESiaChatResponse,
  AISkillExecution,
} from '@/types/ai-sales-assistant';
import type { AIAgent } from '@/types/ai-agent';

// =============================================================================
// Query Keys
// =============================================================================

const YESIA_CONFIG_KEY = 'mt-yesia-config';
const YESIA_CONVERSATIONS_KEY = 'mt-yesia-conversations';
const YESIA_MESSAGES_KEY = 'mt-yesia-messages';
const YESIA_AGENTS_KEY = 'mt-yesia-agents';
const YESIA_NOTIFICATIONS_KEY = 'mt-yesia-notifications';

// =============================================================================
// Hook: useYESiaMT
// =============================================================================

export function useYESiaMT() {
  const { tenant, franchise, accessLevel, user, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ---------------------------------------------------------------------------
  // Query: YESia Config
  // ---------------------------------------------------------------------------

  const configQuery = useQuery({
    queryKey: [YESIA_CONFIG_KEY, tenant?.id],
    queryFn: async (): Promise<YESiaConfig | null> => {
      if (!tenant && accessLevel !== 'platform') return null;

      let q = (supabase
        .from('mt_ai_config') as any)
        .select('*')
        .limit(1);

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('tenant_id', tenant!.id);
      }

      const { data, error } = await q.maybeSingle();

      if (error) {
        if (error.code === '42P01') {
          console.warn('[YESia] mt_ai_config table not found');
          return null;
        }
        throw error;
      }

      return data as YESiaConfig | null;
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ---------------------------------------------------------------------------
  // Query: Agents (active, not deleted)
  // ---------------------------------------------------------------------------

  const agentsQuery = useQuery({
    queryKey: [YESIA_AGENTS_KEY, tenant?.id],
    queryFn: async (): Promise<AIAgent[]> => {
      if (!tenant && accessLevel !== 'platform') return [];

      let q = (supabase
        .from('mt_ai_agents') as any)
        .select('*')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('ordem', { ascending: true });

      if (tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;

      if (error) {
        if (error.code === '42P01') {
          console.warn('[YESia] mt_ai_agents table not found');
          return [];
        }
        throw error;
      }

      return (data || []) as AIAgent[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ---------------------------------------------------------------------------
  // Query: Conversations (canal = 'in_app', current user)
  // ---------------------------------------------------------------------------

  const conversationsQuery = useQuery({
    queryKey: [YESIA_CONVERSATIONS_KEY, tenant?.id, user?.id],
    queryFn: async (): Promise<YESiaConversation[]> => {
      if (!tenant && accessLevel !== 'platform') return [];
      if (!user?.id) return [];

      const { data, error } = await (supabase
        .from('mt_chatbot_conversations') as any)
        .select('*')
        .eq('canal', 'in_app')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) {
        if (error.code === '42P01') {
          console.warn('[YESia] mt_chatbot_conversations table not found');
          return [];
        }
        throw error;
      }

      return (data || []) as YESiaConversation[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform') && !!user?.id,
  });

  // ---------------------------------------------------------------------------
  // Query: Messages for active conversation
  // ---------------------------------------------------------------------------

  const messagesQuery = useQuery({
    queryKey: [YESIA_MESSAGES_KEY, activeConversationId, tenant?.id],
    queryFn: async (): Promise<YESiaMessage[]> => {
      if (!activeConversationId) return [];

      let q = (supabase
        .from('mt_chatbot_messages') as any)
        .select('*')
        .eq('conversation_id', activeConversationId)
        .order('created_at', { ascending: true });

      if (tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;

      if (error) {
        if (error.code === '42P01') {
          console.warn('[YESia] mt_chatbot_messages table not found');
          return [];
        }
        throw error;
      }

      return (data || []).map((msg: any) => ({
        ...msg,
        actions: msg.actions || msg.metadata?.actions || [],
        agent_used: msg.agent_used || msg.metadata?.agent_used || null,
      })) as YESiaMessage[];
    },
    enabled: !!activeConversationId,
  });

  // ---------------------------------------------------------------------------
  // Query: Proactive notifications (pending skill executions)
  // ---------------------------------------------------------------------------

  const notificationsQuery = useQuery({
    queryKey: [YESIA_NOTIFICATIONS_KEY, tenant?.id, user?.id],
    queryFn: async (): Promise<AISkillExecution[]> => {
      if (!tenant || !user?.id) return [];

      const { data, error } = await (supabase
        .from('mt_ai_skill_executions') as any)
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .eq('was_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.warn('[YESia] mt_ai_skill_executions query error:', error.message);
        return [];
      }

      return (data || []) as AISkillExecution[];
    },
    enabled: !isTenantLoading && !!tenant && !!user?.id,
    staleTime: 60000, // 1 minute
  });

  // ---------------------------------------------------------------------------
  // Real-time: Subscribe to messages for active conversation
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!activeConversationId) return;

    // Clean up previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`yesia-messages-${activeConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mt_chatbot_messages',
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: [YESIA_MESSAGES_KEY, activeConversationId] });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [activeConversationId, queryClient]);

  // ---------------------------------------------------------------------------
  // Mutation: Create conversation
  // ---------------------------------------------------------------------------

  const createConversation = useMutation({
    mutationFn: async (): Promise<YESiaConversation> => {
      if (!tenant?.id) throw new Error('Tenant not loaded');
      if (!user?.id) throw new Error('User not loaded');

      const { data, error } = await (supabase
        .from('mt_chatbot_conversations') as any)
        .insert({
          tenant_id: tenant.id,
          franchise_id: franchise?.id || null,
          config_id: null, // mt_ai_config.id ≠ mt_chatbot_config.id — FK references mt_chatbot_config
          canal: 'in_app',
          status: 'ativa',
          user_id: user.id,
          started_at: new Date().toISOString(),
          metadata: { source: 'yesia_chat' },
        })
        .select()
        .single();

      if (error) throw error;
      return data as YESiaConversation;
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: [YESIA_CONVERSATIONS_KEY] });
      setActiveConversationId(conversation.id);
    },
    onError: (error) => {
      toast.error(`Erro ao criar conversa: ${error.message}`);
    },
  });

  // ---------------------------------------------------------------------------
  // Action: Send message
  // ---------------------------------------------------------------------------

  const sendMessage = useCallback(async (content: string, agentId?: string) => {
    if (!content.trim()) return;
    if (!user?.id) {
      toast.error('Usuário não carregado');
      return;
    }

    let conversationId = activeConversationId;

    // Create conversation if none active
    if (!conversationId) {
      try {
        const conversation = await createConversation.mutateAsync();
        conversationId = conversation.id;
      } catch {
        return;
      }
    }

    setIsSending(true);

    try {
      // 1. Add user message optimistically
      const optimisticUserMsg: YESiaMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        role: 'user',
        content: content.trim(),
        agent_used: null,
        actions: [],
        metadata: null,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<YESiaMessage[]>(
        [YESIA_MESSAGES_KEY, conversationId],
        (old = []) => [...old, optimisticUserMsg]
      );

      // 2. Call edge function
      const { data, error } = await supabase.functions.invoke('ai-sales-assistant', {
        body: {
          message: content.trim(),
          conversationId,
          agentId: agentId || undefined,
          userId: user.id,
          tenantId: tenant?.id,
          franchiseId: franchise?.id || null,
        },
      });

      if (error) throw error;

      const response = data as YESiaChatResponse;

      // 3. Add assistant response optimistically
      const optimisticAssistantMsg: YESiaMessage = {
        id: `temp-resp-${Date.now()}`,
        conversation_id: conversationId,
        role: 'assistant',
        content: response.reply,
        agent_used: response.agent_used?.nome || null,
        actions: response.actions || [],
        metadata: { usage: response.usage, agent: response.agent_used },
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<YESiaMessage[]>(
        [YESIA_MESSAGES_KEY, conversationId],
        (old = []) => [...old, optimisticAssistantMsg]
      );

      // 4. Refresh to get real server data
      queryClient.invalidateQueries({ queryKey: [YESIA_MESSAGES_KEY, conversationId] });
      queryClient.invalidateQueries({ queryKey: [YESIA_CONVERSATIONS_KEY] });

    } catch (error: any) {
      toast.error(`Erro ao enviar: ${error.message || 'Falha na comunicação'}`);

      // Remove optimistic user message on error
      queryClient.invalidateQueries({ queryKey: [YESIA_MESSAGES_KEY, conversationId] });
    } finally {
      setIsSending(false);
    }
  }, [activeConversationId, user, tenant, franchise, queryClient, createConversation]);

  // ---------------------------------------------------------------------------
  // Action: Select conversation
  // ---------------------------------------------------------------------------

  const selectConversation = useCallback((id: string | null) => {
    setActiveConversationId(id);
  }, []);

  // ---------------------------------------------------------------------------
  // Mutation: Submit feedback on a message
  // ---------------------------------------------------------------------------

  const submitFeedback = useMutation({
    mutationFn: async ({ messageId, score, text }: { messageId: string; score: number; text?: string }) => {
      const { error } = await (supabase
        .from('mt_chatbot_messages') as any)
        .update({
          metadata: {
            feedback: { score, text, submitted_at: new Date().toISOString() },
          },
        })
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Feedback enviado');
      if (activeConversationId) {
        queryClient.invalidateQueries({ queryKey: [YESIA_MESSAGES_KEY, activeConversationId] });
      }
    },
    onError: (error) => {
      toast.error(`Erro ao enviar feedback: ${error.message}`);
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Dismiss proactive notification
  // ---------------------------------------------------------------------------

  const dismissNotification = useMutation({
    mutationFn: async (executionId: string) => {
      const { error } = await (supabase
        .from('mt_ai_skill_executions') as any)
        .update({ was_dismissed: true })
        .eq('id', executionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [YESIA_NOTIFICATIONS_KEY] });
    },
  });

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // Config
    config: configQuery.data ?? null,

    // Agents
    agents: agentsQuery.data ?? [],

    // Conversations
    conversations: conversationsQuery.data ?? [],
    activeConversation: conversationsQuery.data?.find(c => c.id === activeConversationId) ?? null,
    activeConversationId,

    // Messages
    messages: messagesQuery.data ?? [],

    // Notifications
    notifications: notificationsQuery.data ?? [],

    // State
    isLoading: isTenantLoading || configQuery.isLoading || conversationsQuery.isLoading,
    isLoadingMessages: messagesQuery.isLoading,
    isSending,

    // Actions
    sendMessage,
    selectConversation,
    createConversation: createConversation.mutateAsync,
    submitFeedback: (messageId: string, score: number, text?: string) =>
      submitFeedback.mutate({ messageId, score, text }),
    dismissNotification: (executionId: string) =>
      dismissNotification.mutate(executionId),

    // Refetch
    refetchMessages: messagesQuery.refetch,
    refetchConversations: conversationsQuery.refetch,
  };
}

export default useYESiaMT;

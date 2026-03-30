// =============================================================================
// USE CHATBOT MT - Hook Multi-Tenant para Chatbot IA
// =============================================================================
//
// Hook para gerenciar configurações e conversas do chatbot IA
// Usa tabelas: mt_chatbot_config, mt_chatbot_conversations, mt_chatbot_messages
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

// =============================================================================
// Types
// =============================================================================

export interface ChatbotConfig {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  nome: string;
  is_active: boolean;
  modelo: string;
  temperatura: number;
  max_tokens: number;
  system_prompt: string;
  welcome_message: string | null;
  fallback_message: string | null;
  horario_funcionamento: Record<string, any> | null;
  canais_ativos: string[];
  created_at: string;
  updated_at: string;
}

export interface ChatbotConversation {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  config_id: string;
  lead_id: string | null;
  canal: string;
  status: 'ativa' | 'encerrada' | 'transferida';
  metadata: Record<string, any> | null;
  started_at: string;
  ended_at: string | null;
  // Relacionamentos
  lead?: {
    id: string;
    nome: string;
    telefone: string | null;
  };
  messages_count?: number;
}

export interface ChatbotMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface ChatbotAnalytics {
  total_conversas: number;
  conversas_ativas: number;
  conversas_encerradas: number;
  conversas_transferidas: number;
  total_mensagens: number;
  media_mensagens_por_conversa: number;
}

// =============================================================================
// Query Keys
// =============================================================================

const CONFIG_KEY = 'mt-chatbot-config';
const CONVERSATIONS_KEY = 'mt-chatbot-conversations';
const MESSAGES_KEY = 'mt-chatbot-messages';
const ANALYTICS_KEY = 'mt-chatbot-analytics';

// =============================================================================
// Hook: Configuração do Chatbot
// =============================================================================

export function useChatbotConfigMT() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Query: Buscar configuração
  const query = useQuery({
    queryKey: [CONFIG_KEY, tenant?.id, franchise?.id],
    queryFn: async (): Promise<ChatbotConfig | null> => {
      if (!tenant && accessLevel !== 'platform') return null;

      let q = supabase
        .from('mt_chatbot_config')
        .select('*')
        .limit(1);

      if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      } else if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q.maybeSingle();

      if (error) {
        if (error.code === '42P01') {
          console.warn('[MT] mt_chatbot_config table not found');
          return null;
        }
        throw error;
      }

      return data as ChatbotConfig | null;
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Mutation: Criar/Atualizar configuração
  const upsertConfig = useMutation({
    mutationFn: async (config: Partial<ChatbotConfig>) => {
      if (!tenant?.id && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      const configData = {
        ...config,
        tenant_id: tenant?.id,
        franchise_id: franchise?.id || null,
        updated_at: new Date().toISOString(),
      };

      if (query.data?.id) {
        // Update
        const { data, error } = await supabase
          .from('mt_chatbot_config')
          .update(configData)
          .eq('id', query.data.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert
        const { data, error } = await supabase
          .from('mt_chatbot_config')
          .insert({
            ...configData,
            nome: config.nome || 'Chatbot IA',
            is_active: config.is_active ?? false,
            modelo: config.modelo || 'gpt-4o-mini',
            temperatura: config.temperatura ?? 0.7,
            max_tokens: config.max_tokens ?? 1000,
            system_prompt: config.system_prompt || 'Você é um assistente virtual prestativo.',
            canais_ativos: config.canais_ativos || ['whatsapp'],
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONFIG_KEY] });
      toast.success('Configuração salva com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  // Mutation: Toggle ativo
  const toggleActive = useMutation({
    mutationFn: async (isActive: boolean) => {
      if (!query.data?.id) throw new Error('Configuração não encontrada');

      const { error } = await supabase
        .from('mt_chatbot_config')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', query.data.id);

      if (error) throw error;
    },
    onSuccess: (_, isActive) => {
      queryClient.invalidateQueries({ queryKey: [CONFIG_KEY] });
      toast.success(isActive ? 'Chatbot ativado' : 'Chatbot desativado');
    },
  });

  return {
    config: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    upsertConfig,
    toggleActive,
    isSaving: upsertConfig.isPending,
    _mode: 'mt' as const,
  };
}

// =============================================================================
// Hook: Conversas do Chatbot
// =============================================================================

export function useChatbotConversationsMT(filters?: {
  status?: ChatbotConversation['status'];
  canal?: string;
  limit?: number;
}) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: [CONVERSATIONS_KEY, tenant?.id, franchise?.id, filters],
    queryFn: async (): Promise<ChatbotConversation[]> => {
      if (!tenant && accessLevel !== 'platform') return [];

      let q = supabase
        .from('mt_chatbot_conversations')
        .select(`
          *,
          lead:mt_leads(id, nome, telefone)
        `)
        .order('started_at', { ascending: false })
        .limit(filters?.limit || 50);

      if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      } else if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      if (filters?.status) {
        q = q.eq('status', filters.status);
      }

      if (filters?.canal) {
        q = q.eq('canal', filters.canal);
      }

      const { data, error } = await q;

      if (error) {
        if (error.code === '42P01') {
          console.warn('[MT] mt_chatbot_conversations table not found');
          return [];
        }
        throw error;
      }

      return (data || []) as ChatbotConversation[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  return {
    conversations: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    _mode: 'mt' as const,
  };
}

// =============================================================================
// Hook: Mensagens de uma conversa
// =============================================================================

export function useChatbotMessagesMT(conversationId: string | undefined) {
  const { isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: [MESSAGES_KEY, conversationId],
    queryFn: async (): Promise<ChatbotMessage[]> => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('mt_chatbot_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        if (error.code === '42P01') {
          console.warn('[MT] mt_chatbot_messages table not found');
          return [];
        }
        throw error;
      }

      return (data || []) as ChatbotMessage[];
    },
    enabled: !!conversationId && !isTenantLoading,
  });

  return {
    messages: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    _mode: 'mt' as const,
  };
}

// =============================================================================
// Hook: Analytics do Chatbot
// =============================================================================

export function useChatbotAnalyticsMT() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: [ANALYTICS_KEY, tenant?.id, franchise?.id],
    queryFn: async (): Promise<ChatbotAnalytics> => {
      if (!tenant && accessLevel !== 'platform') {
        return {
          total_conversas: 0,
          conversas_ativas: 0,
          conversas_encerradas: 0,
          conversas_transferidas: 0,
          total_mensagens: 0,
          media_mensagens_por_conversa: 0,
        };
      }

      // Buscar contagem de conversas
      let conversasQuery = supabase
        .from('mt_chatbot_conversations')
        .select('id, status', { count: 'exact' });

      if (accessLevel === 'franchise' && franchise) {
        conversasQuery = conversasQuery.eq('franchise_id', franchise.id);
      } else if (accessLevel === 'tenant' && tenant) {
        conversasQuery = conversasQuery.eq('tenant_id', tenant.id);
      }

      const { data: conversas, count: totalConversas, error: convError } = await conversasQuery;

      if (convError && convError.code !== '42P01') {
        throw convError;
      }

      const ativas = conversas?.filter(c => c.status === 'ativa').length || 0;
      const encerradas = conversas?.filter(c => c.status === 'encerrada').length || 0;
      const transferidas = conversas?.filter(c => c.status === 'transferida').length || 0;

      // Buscar total de mensagens (simplificado)
      let mensagensCount = 0;
      if (conversas && conversas.length > 0) {
        const conversaIds = conversas.map(c => c.id);
        const { count } = await supabase
          .from('mt_chatbot_messages')
          .select('id', { count: 'exact', head: true })
          .in('conversation_id', conversaIds);
        mensagensCount = count || 0;
      }

      return {
        total_conversas: totalConversas || 0,
        conversas_ativas: ativas,
        conversas_encerradas: encerradas,
        conversas_transferidas: transferidas,
        total_mensagens: mensagensCount,
        media_mensagens_por_conversa: totalConversas && totalConversas > 0
          ? Math.round(mensagensCount / totalConversas)
          : 0,
      };
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 60000, // 1 minuto
  });

  return {
    analytics: query.data ?? {
      total_conversas: 0,
      conversas_ativas: 0,
      conversas_encerradas: 0,
      conversas_transferidas: 0,
      total_mensagens: 0,
      media_mensagens_por_conversa: 0,
    },
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    _mode: 'mt' as const,
  };
}

// =============================================================================
// Export default
// =============================================================================

export default useChatbotConfigMT;

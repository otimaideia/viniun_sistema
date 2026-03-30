import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MessageMetrics {
  total: number;
  sent: number;
  received: number;
  media: number;
  text: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
}

interface ChatMetrics {
  total: number;
  active: number;
  unread: number;
  withMessages: number;
}

interface SessionMetrics {
  status: string;
  uptime: number;
  connectedAt: string | null;
  lastActivity: string | null;
}

interface WhatsAppMetrics {
  messages: MessageMetrics;
  chats: ChatMetrics;
  session: SessionMetrics;
  responseTime: {
    average: number;
    min: number;
    max: number;
  };
}

/**
 * Hook para obter métricas de uso do WhatsApp
 */
export function useWhatsAppMetrics(sessaoId: string | undefined) {
  const {
    data: metrics,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['whatsapp_metrics', sessaoId],
    queryFn: async (): Promise<WhatsAppMetrics> => {
      if (!sessaoId) throw new Error('Sessão não informada');

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Buscar dados das mensagens
      const { data: messagesData, error: messagesError } = await supabase
        .from('mt_whatsapp_messages')
        .select('id, tipo, from_me, created_at, conversa_id')
        .eq('conversa_id', sessaoId);

      if (messagesError) {
        console.error('Erro ao buscar mensagens:', messagesError);
      }

      const messages = messagesData || [];

      // Buscar dados das conversas
      const { data: chatsData, error: chatsError } = await supabase
        .from('mt_whatsapp_conversations')
        .select('id, is_muted, ultimo_contato')
        .eq('session_id', sessaoId);

      if (chatsError) {
        console.error('Erro ao buscar conversas:', chatsError);
      }

      const chats = chatsData || [];

      // Buscar dados da sessão
      const { data: sessaoData } = await supabase
        .from('mt_whatsapp_sessions')
        .select('status, connected_at, last_seen')
        .eq('id', sessaoId)
        .single();

      // Calcular métricas de mensagens
      const messageMetrics: MessageMetrics = {
        total: messages.length,
        sent: messages.filter(m => m.from_me).length,
        received: messages.filter(m => !m.from_me).length,
        media: messages.filter(m => m.tipo && m.tipo !== 'text').length,
        text: messages.filter(m => m.tipo === 'text' || !m.tipo).length,
        today: messages.filter(m => m.created_at >= today).length,
        thisWeek: messages.filter(m => m.created_at >= weekAgo).length,
        thisMonth: messages.filter(m => m.created_at >= monthAgo).length,
      };

      // Calcular métricas de conversas
      const chatMetrics: ChatMetrics = {
        total: chats.length,
        active: chats.filter(c => c.ultimo_contato && new Date(c.ultimo_contato) >= new Date(weekAgo)).length,
        unread: 0, // TODO: implementar contagem de não lidos
        withMessages: new Set(messages.map(m => m.conversa_id)).size,
      };

      // Métricas da sessão
      const sessionMetrics: SessionMetrics = {
        status: sessaoData?.status || 'unknown',
        uptime: sessaoData?.connected_at
          ? Math.floor((now.getTime() - new Date(sessaoData.connected_at).getTime()) / 1000)
          : 0,
        connectedAt: sessaoData?.connected_at || null,
        lastActivity: sessaoData?.last_seen || null,
      };

      // Calcular tempo de resposta médio (placeholder)
      const responseTime = {
        average: 0,
        min: 0,
        max: 0,
      };

      return {
        messages: messageMetrics,
        chats: chatMetrics,
        session: sessionMetrics,
        responseTime,
      };
    },
    enabled: !!sessaoId,
    staleTime: 60000, // 1 minuto
    refetchInterval: 300000, // 5 minutos
  });

  return {
    metrics,
    isLoading,
    error,
    refetch,
  };
}

export default useWhatsAppMetrics;

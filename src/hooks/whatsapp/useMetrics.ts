// Hook para métricas do WhatsApp

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoleAdapter } from '@/hooks/useUserRoleAdapter';

export interface WhatsAppMetrics {
  // Resumo geral
  totalConversations: number;
  activeConversations: number;
  totalMessages: number;
  inboundMessages: number;
  outboundMessages: number;
  totalContacts: number;

  // Sessões
  totalSessions: number;
  connectedSessions: number;

  // Por período
  messagesLast24h: number;
  messagesLast7d: number;
  messagesLast30d: number;
  conversationsLast24h: number;
  conversationsLast7d: number;

  // Performance
  averageResponseTimeMinutes: number;
  unreadConversations: number;

  // Por tipo de mensagem
  messagesByType: Record<string, number>;

  // Tendência diária (últimos 7 dias)
  dailyTrend: Array<{
    date: string;
    inbound: number;
    outbound: number;
    total: number;
  }>;

  // Top contatos
  topContacts: Array<{
    id: string;
    contact_name: string;
    contact_phone: string;
    message_count: number;
  }>;

  // Ranking de sessões por conversas iniciadas
  sessionRanking: Array<{
    id: string;
    session_name: string;
    display_name: string | null;
    phone_number: string | null;
    status: string;
    conversations_today: number;
    conversations_7d: number;
    total_conversations: number;
  }>;
}

interface UseMetricsOptions {
  franqueadoId?: string | null;
  sessionId?: string | null;
  enabled?: boolean;
}

const METRICS_KEY = 'whatsapp-metrics';

/**
 * @deprecated Use useWhatsAppMetricsAdapter instead. This hook lacks tenant isolation.
 */
export function useMetrics({ franqueadoId, sessionId, enabled = true }: UseMetricsOptions = {}) {
  const { user } = useAuth();
  const { isSuperAdmin, loading: roleLoading } = useUserRoleAdapter();
  const effectiveFranqueadoId = franqueadoId || user?.user_metadata?.franqueado_id;

  const metricsQuery = useQuery({
    queryKey: [METRICS_KEY, effectiveFranqueadoId, sessionId, isSuperAdmin],
    queryFn: async (): Promise<WhatsAppMetrics> => {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Build filters para conversas (tem franchise_id + tenant_id)
      const buildConvFilter = (query: any) => {
        if (sessionId) {
          return query.eq('session_id', sessionId);
        }
        // Filtrar por franquia (franchise_id) para usuários não-admin
        if (effectiveFranqueadoId && !isSuperAdmin) {
          return query.eq('franchise_id', effectiveFranqueadoId);
        }
        return query;
      };

      // Build filters para mensagens (tem apenas tenant_id, sem franchise_id)
      const buildMsgFilter = (query: any) => {
        if (sessionId) {
          return query.eq('session_id', sessionId);
        }
        // mt_whatsapp_messages não tem franchise_id — RLS cuida do tenant
        return query;
      };

      // 1. Total de conversas
      let conversationsQuery = supabase
        .from('mt_whatsapp_conversations')
        .select('id, session_id, status, unread_count, last_message_at, contact_phone, contact_name, created_at', { count: 'exact' });
      conversationsQuery = buildConvFilter(conversationsQuery);
      const { data: conversations, count: totalConversations, error: convError } = await conversationsQuery;

      if (convError) {
        console.error('[useMetrics] Erro ao buscar conversas:', convError);
      }

      const activeConversations = conversations?.filter(c => c.status === 'open').length || 0;
      const unreadConversations = conversations?.filter(c => c.unread_count > 0).length || 0;

      // 2. Total de mensagens
      let messagesQuery = supabase
        .from('mt_whatsapp_messages')
        .select('id, conversation_id, from_me, tipo, timestamp', { count: 'exact' });
      messagesQuery = buildMsgFilter(messagesQuery);
      const { data: allMessages, count: totalMessages, error: msgError } = await messagesQuery;

      if (msgError) {
        console.error('[useMetrics] Erro ao buscar mensagens:', msgError);
      }

      // from_me = false significa mensagem recebida (inbound)
      // from_me = true significa mensagem enviada (outbound)
      const inboundMessages = allMessages?.filter(m => m.from_me === false).length || 0;
      const outboundMessages = allMessages?.filter(m => m.from_me === true).length || 0;

      // 3. Mensagens por tipo
      const messagesByType: Record<string, number> = {};
      allMessages?.forEach(m => {
        const msgType = m.tipo || 'unknown';
        messagesByType[msgType] = (messagesByType[msgType] || 0) + 1;
      });

      // 4. Mensagens últimas 24h
      let messages24hQuery = supabase
        .from('mt_whatsapp_messages')
        .select('id', { count: 'exact' })
        .gte('timestamp', last24h);
      messages24hQuery = buildMsgFilter(messages24hQuery);
      const { count: messagesLast24h } = await messages24hQuery;

      // 5. Mensagens últimos 7 dias
      let messages7dQuery = supabase
        .from('mt_whatsapp_messages')
        .select('id', { count: 'exact' })
        .gte('timestamp', last7d);
      messages7dQuery = buildMsgFilter(messages7dQuery);
      const { count: messagesLast7d } = await messages7dQuery;

      // 6. Mensagens últimos 30 dias
      let messages30dQuery = supabase
        .from('mt_whatsapp_messages')
        .select('id', { count: 'exact' })
        .gte('timestamp', last30d);
      messages30dQuery = buildMsgFilter(messages30dQuery);
      const { count: messagesLast30d } = await messages30dQuery;

      // 7. Conversas ativas nas últimas 24h
      let convs24hQuery = supabase
        .from('mt_whatsapp_conversations')
        .select('id', { count: 'exact' })
        .gte('last_message_at', last24h);
      convs24hQuery = buildConvFilter(convs24hQuery);
      const { count: conversationsLast24h } = await convs24hQuery;

      // 8. Conversas ativas nos últimos 7 dias
      let convs7dQuery = supabase
        .from('mt_whatsapp_conversations')
        .select('id', { count: 'exact' })
        .gte('last_message_at', last7d);
      convs7dQuery = buildConvFilter(convs7dQuery);
      const { count: conversationsLast7d } = await convs7dQuery;

      // 9. Sessões
      let sessionsQuery = supabase
        .from('mt_whatsapp_sessions')
        .select('id, session_name, display_name, status', { count: 'exact' });
      // Filtrar por franquia se não for super admin
      if (effectiveFranqueadoId && !isSuperAdmin) {
        sessionsQuery = sessionsQuery.eq('franchise_id', effectiveFranqueadoId);
      }
      const { data: sessions, count: totalSessions } = await sessionsQuery;
      const connectedSessions = sessions?.filter(s => s.status === 'connected').length || 0;

      // 10. Total de contatos únicos
      const uniquePhones = new Set(conversations?.map(c => c.contact_phone).filter(Boolean));
      const totalContacts = uniquePhones.size || totalConversations || 0;

      // 11. Tendência diária (últimos 7 dias)
      const dailyTrend: Array<{ date: string; inbound: number; outbound: number; total: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(now);
        dayStart.setDate(dayStart.getDate() - i);
        dayStart.setHours(0, 0, 0, 0);

        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const dayMessages = allMessages?.filter(m => {
          const msgDate = m.timestamp ? new Date(m.timestamp) : null;
          if (!msgDate) return false;
          return msgDate >= dayStart && msgDate <= dayEnd;
        }) || [];

        const inbound = dayMessages.filter(m => m.from_me === false).length;
        const outbound = dayMessages.filter(m => m.from_me === true).length;

        dailyTrend.push({
          date: dayStart.toISOString().split('T')[0],
          inbound,
          outbound,
          total: inbound + outbound,
        });
      }

      // 12. Top contatos
      const messageCountByConversation: Record<string, number> = {};
      allMessages?.forEach(m => {
        const convId = (m as any).conversation_id;
        if (convId) {
          messageCountByConversation[convId] = (messageCountByConversation[convId] || 0) + 1;
        }
      });

      const topContacts = (conversations || [])
        .map((c: any) => ({
          id: c.id,
          contact_name: c.contact_name || 'Sem nome',
          contact_phone: c.contact_phone || '',
          message_count: messageCountByConversation[c.id] || 0,
        }))
        .sort((a, b) => b.message_count - a.message_count)
        .slice(0, 10);

      // 13. Tempo médio de resposta
      const averageResponseTimeMinutes = 0;

      // 14. Ranking de sessões por conversas
      const sessionStats: Record<string, { conversations_today: number; conversations_7d: number; total_conversations: number }> = {};

      conversations?.forEach(conv => {
        const sessId = (conv as any).session_id;
        if (!sessId) return;

        if (!sessionStats[sessId]) {
          sessionStats[sessId] = { conversations_today: 0, conversations_7d: 0, total_conversations: 0 };
        }

        sessionStats[sessId].total_conversations++;

        const createdAt = (conv as any).created_at ? new Date((conv as any).created_at) : null;
        if (createdAt) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

          if (createdAt >= today) {
            sessionStats[sessId].conversations_today++;
          }
          if (createdAt >= sevenDaysAgo) {
            sessionStats[sessId].conversations_7d++;
          }
        }
      });

      const sessionRanking = (sessions || [])
        .map((s: any) => ({
          id: s.id,
          session_name: s.session_name,
          display_name: s.display_name,
          phone_number: s.display_name || null,
          status: s.status,
          ...(sessionStats[s.id] || { conversations_today: 0, conversations_7d: 0, total_conversations: 0 }),
        }))
        .sort((a, b) => b.conversations_today - a.conversations_today);

      return {
        totalConversations: totalConversations || 0,
        activeConversations,
        totalMessages: totalMessages || 0,
        inboundMessages,
        outboundMessages,
        totalContacts,
        totalSessions: totalSessions || 0,
        connectedSessions,
        messagesLast24h: messagesLast24h || 0,
        messagesLast7d: messagesLast7d || 0,
        messagesLast30d: messagesLast30d || 0,
        conversationsLast24h: conversationsLast24h || 0,
        conversationsLast7d: conversationsLast7d || 0,
        averageResponseTimeMinutes,
        unreadConversations,
        messagesByType,
        dailyTrend,
        topContacts,
        sessionRanking,
      };
    },
    enabled: enabled && !roleLoading,
    staleTime: 60000, // 1 minuto
    refetchInterval: 300000, // 5 minutos
  });

  return {
    metrics: metricsQuery.data,
    isLoading: metricsQuery.isLoading,
    error: metricsQuery.error,
    refetch: metricsQuery.refetch,
  };
}

export default useMetrics;

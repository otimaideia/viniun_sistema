// =============================================================================
// USE BROADCAST MESSAGES MT - Hook Multi-Tenant para Mensagens de Broadcast
// =============================================================================
//
// Este hook fornece consulta paginada e estatisticas agregadas
// para mt_broadcast_messages com real-time subscriptions
//
// =============================================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useEffect } from 'react';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type BroadcastMessageStatus =
  | 'pending'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'cancelled';

export interface MTBroadcastMessage {
  id: string;
  broadcast_campaign_id: string;
  tenant_id: string;
  phone: string;
  nome: string | null;
  recipient_id: string | null;
  status: BroadcastMessageStatus;
  waha_message_id: string | null;
  meta_message_id: string | null;
  error_message: string | null;
  error_code: string | null;
  retry_count: number;
  max_retries: number;
  queued_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
}

export interface BroadcastMessageFilters {
  status?: BroadcastMessageStatus;
  search?: string;
}

export interface BroadcastStats {
  total: number;
  pending: number;
  sending: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  cancelled: number;
  delivery_rate: number;
  read_rate: number;
  failure_rate: number;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const MESSAGES_QUERY_KEY = 'mt-broadcast-messages';
const STATS_QUERY_KEY = 'mt-broadcast-stats';

// -----------------------------------------------------------------------------
// Hook: Mensagens por Campanha (com paginacao)
// -----------------------------------------------------------------------------

export function useBroadcastMessagesMT(
  campaignId: string | undefined,
  filters?: BroadcastMessageFilters & { page?: number; pageSize?: number }
) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const page = filters?.page ?? 0;
  const pageSize = filters?.pageSize ?? 50;

  // ---------------------------------------------------------------------------
  // Real-time subscription para mudancas de status das mensagens
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!campaignId) return;

    const channel = supabase
      .channel(`broadcast-messages-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mt_broadcast_messages',
          filter: `broadcast_campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          console.log('[Broadcast] Message change:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: [MESSAGES_QUERY_KEY, campaignId] });
          queryClient.invalidateQueries({ queryKey: [STATS_QUERY_KEY, campaignId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, queryClient]);

  // ---------------------------------------------------------------------------
  // Query Principal - Listar Mensagens com Paginacao
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [MESSAGES_QUERY_KEY, campaignId, page, pageSize, filters?.status, filters?.search],
    queryFn: async (): Promise<{ messages: MTBroadcastMessage[]; total: number }> => {
      if (!campaignId) return { messages: [], total: 0 };

      // Buscar total
      let countQ = supabase
        .from('mt_broadcast_messages')
        .select('id', { count: 'exact', head: true })
        .eq('broadcast_campaign_id', campaignId);

      if (filters?.status) {
        countQ = countQ.eq('status', filters.status);
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        countQ = countQ.or(`phone.ilike.${searchTerm},nome.ilike.${searchTerm}`);
      }

      const { count, error: countError } = await countQ;

      if (countError) {
        console.error('Erro ao contar mensagens de broadcast:', countError);
        throw countError;
      }

      // Buscar pagina
      const from = page * pageSize;
      const to = from + pageSize - 1;

      let q = supabase
        .from('mt_broadcast_messages')
        .select('*')
        .eq('broadcast_campaign_id', campaignId)
        .order('queued_at', { ascending: true })
        .range(from, to);

      if (filters?.status) {
        q = q.eq('status', filters.status);
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        q = q.or(`phone.ilike.${searchTerm},nome.ilike.${searchTerm}`);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar mensagens de broadcast:', error);
        throw error;
      }

      return {
        messages: (data || []) as MTBroadcastMessage[],
        total: count || 0,
      };
    },
    enabled: !!campaignId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 15, // 15s - mensagens mudam frequentemente durante processamento
  });

  return {
    messages: query.data?.messages ?? [],
    total: query.data?.total ?? 0,
    totalPages: Math.ceil((query.data?.total ?? 0) / pageSize),
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}

// -----------------------------------------------------------------------------
// Hook: Estatisticas Agregadas por Campanha
// -----------------------------------------------------------------------------

export function useBroadcastStatsMT(campaignId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Real-time subscription para atualizar stats
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!campaignId) return;

    const channel = supabase
      .channel(`broadcast-stats-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mt_broadcast_messages',
          filter: `broadcast_campaign_id=eq.${campaignId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: [STATS_QUERY_KEY, campaignId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, queryClient]);

  // ---------------------------------------------------------------------------
  // Query: Estatisticas Agregadas
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [STATS_QUERY_KEY, campaignId],
    queryFn: async (): Promise<BroadcastStats> => {
      if (!campaignId) {
        return {
          total: 0,
          pending: 0,
          sending: 0,
          sent: 0,
          delivered: 0,
          read: 0,
          failed: 0,
          cancelled: 0,
          delivery_rate: 0,
          read_rate: 0,
          failure_rate: 0,
        };
      }

      // Usar count queries eficientes em vez de carregar todos os registros
      const countByStatus = async (status: string): Promise<number> => {
        const { count, error } = await supabase
          .from('mt_broadcast_messages')
          .select('id', { count: 'exact', head: true })
          .eq('broadcast_campaign_id', campaignId)
          .eq('status', status);
        if (error) throw error;
        return count || 0;
      };

      const totalQ = supabase
        .from('mt_broadcast_messages')
        .select('id', { count: 'exact', head: true })
        .eq('broadcast_campaign_id', campaignId);

      const [totalResult, pending, sending, sent, delivered, read, failed, cancelled] =
        await Promise.all([
          totalQ.then(({ count, error }) => {
            if (error) throw error;
            return count || 0;
          }),
          countByStatus('pending'),
          countByStatus('sending'),
          countByStatus('sent'),
          countByStatus('delivered'),
          countByStatus('read'),
          countByStatus('failed'),
          countByStatus('cancelled'),
        ]);

      const total = totalResult;

      // Mensagens que realmente foram processadas (enviadas com sucesso em algum nivel)
      const processedSuccessfully = sent + delivered + read;

      const delivery_rate = total > 0
        ? Math.round(((delivered + read) / total) * 10000) / 100
        : 0;

      const read_rate = processedSuccessfully > 0
        ? Math.round((read / processedSuccessfully) * 10000) / 100
        : 0;

      const failure_rate = total > 0
        ? Math.round((failed / total) * 10000) / 100
        : 0;

      return {
        total,
        pending,
        sending,
        sent,
        delivered,
        read,
        failed,
        cancelled,
        delivery_rate,
        read_rate,
        failure_rate,
      };
    },
    enabled: !!campaignId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 10, // 10s - stats precisam estar atualizadas
  });

  return {
    stats: query.data ?? {
      total: 0,
      pending: 0,
      sending: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      cancelled: 0,
      delivery_rate: 0,
      read_rate: 0,
      failure_rate: 0,
    },
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}

export default useBroadcastMessagesMT;

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import type { WhatsAppWindow, WindowStatus } from '@/types/whatsapp-hybrid';
import { calculateWindowStatus } from '@/types/whatsapp-hybrid';
import { useEffect, useState } from 'react';

const TABLE = 'mt_whatsapp_windows';
const QUERY_KEY = 'mt-wa-windows';

export function useWhatsAppWindowMT(conversationId?: string) {
  const { tenant, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();
  const [windowStatus, setWindowStatus] = useState<WindowStatus | null>(null);

  const query = useQuery({
    queryKey: [QUERY_KEY, conversationId],
    queryFn: async () => {
      const { data, error } = await (supabase.from(TABLE) as any)
        .select('*')
        .eq('conversation_id', conversationId)
        .maybeSingle();

      if (error) throw error;
      return data as WhatsAppWindow | null;
    },
    enabled: !isTenantLoading && !!conversationId,
    refetchInterval: 60_000, // Atualiza a cada 1 min
  });

  // Recalcular status em tempo real (a cada 30s)
  useEffect(() => {
    const update = () => setWindowStatus(calculateWindowStatus(query.data || null));
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [query.data]);

  // Atualizar janela quando cliente envia mensagem
  const refreshWindow = useMutation({
    mutationFn: async (params: {
      conversation_id: string;
      entry_point_type?: 'user_initiated' | 'free_entry_point' | 'referral';
    }) => {
      const windowType = params.entry_point_type === 'free_entry_point' ? '72h' : '24h';
      const hours = windowType === '72h' ? 72 : 24;
      const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

      const { data, error } = await (supabase.from(TABLE) as any)
        .upsert({
          conversation_id: params.conversation_id,
          tenant_id: tenant?.id,
          last_customer_message_at: new Date().toISOString(),
          entry_point_type: params.entry_point_type || 'user_initiated',
          window_type: windowType,
          window_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'conversation_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data as WhatsAppWindow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, conversationId] });
    },
  });

  // Incrementar contador de msgs na janela
  const incrementMessageCount = useMutation({
    mutationFn: async () => {
      if (!query.data?.id) return;

      // Buscar valor atual do banco (evita race condition de ler cache React Query)
      const { data: current, error: fetchError } = await (supabase.from(TABLE) as any)
        .select('messages_sent_in_window')
        .eq('id', query.data.id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await (supabase.from(TABLE) as any)
        .update({
          messages_sent_in_window: (current?.messages_sent_in_window || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', query.data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, conversationId] });
    },
  });

  return {
    window: query.data,
    windowStatus,
    isOpen: windowStatus?.is_open ?? false,
    timeRemaining: windowStatus?.time_remaining_text ?? 'Sem janela',
    isLoading: query.isLoading || isTenantLoading,
    refreshWindow,
    incrementMessageCount,
    refetch: query.refetch,
  };
}

// Hook para listar todas as janelas ativas (admin)
export function useWhatsAppWindowsListMT() {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: [QUERY_KEY, 'list', tenant?.id],
    queryFn: async () => {
      let q = (supabase.from(TABLE) as any)
        .select('*, conversation:mt_whatsapp_conversations(chat_id, contact_name, contact_phone)')
        .gt('window_expires_at', new Date().toISOString())
        .order('window_expires_at', { ascending: true });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as (WhatsAppWindow & { conversation: any })[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    refetchInterval: 60_000,
  });

  return {
    windows: query.data || [],
    activeCount: query.data?.length || 0,
    isLoading: query.isLoading || isTenantLoading,
  };
}

/**
 * Aggregated window statistics for the WhatsApp Hybrid Stats dashboard.
 * Counts open/closed windows, awaiting response, messages in window, etc.
 */
export function useWhatsAppWindowsStatsMT() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: [QUERY_KEY, 'stats', tenant?.id, franchise?.id],
    queryFn: async () => {
      const now = new Date().toISOString();

      let qOpen = (supabase.from(TABLE) as any)
        .select('id, window_type, window_expires_at, messages_sent_in_window', { count: 'exact' })
        .gt('window_expires_at', now);

      let qAll = (supabase.from(TABLE) as any)
        .select('id, window_type, window_expires_at, messages_sent_in_window, last_customer_message_at', { count: 'exact' });

      if (accessLevel === 'tenant' && tenant) {
        qOpen = qOpen.eq('tenant_id', tenant.id);
        qAll = qAll.eq('tenant_id', tenant.id);
      }
      if (franchise?.id) {
        qOpen = qOpen.eq('franchise_id', franchise.id);
        qAll = qAll.eq('franchise_id', franchise.id);
      }

      const [openRes, allRes] = await Promise.all([qOpen, qAll]);

      const openWindows = (openRes.data || []) as Array<{ window_type: string; messages_sent_in_window: number | null }>;
      const allWindows = (allRes.data || []) as Array<{ window_type: string; messages_sent_in_window: number | null }>;
      const closedCount = allWindows.length - openWindows.length;

      const open24h = openWindows.filter((w) => w.window_type === '24h').length;
      const open72h = openWindows.filter((w) => w.window_type === '72h').length;
      const totalMsgsInWindow = allWindows.reduce((sum, w) => sum + (w.messages_sent_in_window || 0), 0);
      const awaitingResponse = openWindows.filter((w) => (w.messages_sent_in_window || 0) === 0).length;

      return { totalWindows: allWindows.length, openCount: openWindows.length, closedCount, open24h, open72h, totalMsgsInWindow, awaitingResponse };
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    refetchInterval: 60_000,
  });

  return {
    stats: query.data,
    isLoading: query.isLoading || isTenantLoading,
    refetch: query.refetch,
  };
}

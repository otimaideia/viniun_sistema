// =============================================================================
// USE NOTIFICATION LOG MT - Hook Multi-Tenant para Log de Notificações
// =============================================================================
//
// CRUD e estatísticas para mt_notification_log
// Rastreia todas as notificações enviadas (WhatsApp, email, push, SMS)
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { MTNotificationLog, MTNotificationCanal, MTNotificationStatus } from '@/types/promocao-mt';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-notification-log';
const STATS_QUERY_KEY = 'mt-notification-log-stats';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface NotificationLogFilters {
  tipo?: string;
  canal?: MTNotificationCanal;
  status?: MTNotificationStatus;
  entity_type?: string;
  entity_id?: string;
  referencia_id?: string;
  referencia_tipo?: string;
  limit?: number;
}

export interface CreateNotificationLogData {
  canal: MTNotificationCanal;
  entity_type: string;
  entity_id: string;
  reference_type?: string | null;
  reference_id?: string | null;
  destinatario: string;
  titulo?: string | null;
  conteudo?: string | null;
  status?: MTNotificationStatus;
  metadata?: Record<string, any>;
}

export interface NotificationLogStats {
  total: number;
  por_status: Record<MTNotificationStatus, number>;
  por_canal: Record<MTNotificationCanal, number>;
}

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useNotificationLogMT(filters?: NotificationLogFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query: Listar Logs
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, filters],
    queryFn: async (): Promise<MTNotificationLog[]> => {
      let q = supabase
        .from('mt_notification_log')
        .select('*')
        .order('created_at', { ascending: false });

      // Filtros por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('tenant_id', tenant!.id).eq('franchise_id', franchise.id);
      }

      // Filtros opcionais
      if (filters?.canal) {
        q = q.eq('canal', filters.canal);
      }
      if (filters?.status) {
        q = q.eq('status', filters.status);
      }
      if (filters?.entity_type) {
        q = q.eq('entity_type', filters.entity_type);
      }
      if (filters?.entity_id) {
        q = q.eq('entity_id', filters.entity_id);
      }
      if (filters?.referencia_id) {
        q = q.eq('reference_id', filters.referencia_id);
      }
      if (filters?.referencia_tipo) {
        q = q.eq('reference_type', filters.referencia_tipo);
      }

      if (filters?.limit) {
        q = q.limit(filters.limit);
      } else {
        q = q.limit(200);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar logs de notificação:', error);
        throw error;
      }

      return (data || []) as MTNotificationLog[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ---------------------------------------------------------------------------
  // Query: Estatísticas
  // ---------------------------------------------------------------------------

  const statsQuery = useQuery({
    queryKey: [STATS_QUERY_KEY, tenant?.id, franchise?.id, filters?.referencia_id, filters?.entity_id],
    queryFn: async (): Promise<NotificationLogStats> => {
      let q = supabase
        .from('mt_notification_log')
        .select('status, canal');

      // Filtros por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('tenant_id', tenant!.id).eq('franchise_id', franchise.id);
      }

      // Filtro por referência (para stats de uma entidade específica)
      if (filters?.referencia_id) {
        q = q.eq('reference_id', filters.referencia_id);
      }
      if (filters?.entity_id) {
        q = q.eq('entity_id', filters.entity_id);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar estatísticas de notificação:', error);
        throw error;
      }

      const rows = data || [];

      const stats: NotificationLogStats = {
        total: rows.length,
        por_status: {
          pendente: 0,
          enviado: 0,
          entregue: 0,
          lido: 0,
          falhou: 0,
        },
        por_canal: {
          whatsapp: 0,
          email: 0,
          push: 0,
          sms: 0,
        },
      };

      for (const row of rows) {
        const s = row.status as MTNotificationStatus;
        const c = row.canal as MTNotificationCanal;
        if (s && s in stats.por_status) stats.por_status[s]++;
        if (c && c in stats.por_canal) stats.por_canal[c]++;
      }

      return stats;
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar Log
  // ---------------------------------------------------------------------------

  const createLog = useMutation({
    mutationFn: async (input: CreateNotificationLogData): Promise<MTNotificationLog> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const { data, error } = await supabase
        .from('mt_notification_log')
        .insert({
          tenant_id: tenant!.id,
          franchise_id: franchise?.id || null,
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          reference_type: input.reference_type || null,
          reference_id: input.reference_id || null,
          canal: input.canal,
          destinatario: input.destinatario,
          titulo: input.titulo || null,
          conteudo: input.conteudo || null,
          status: input.status || 'pendente',
          metadata: input.metadata || {},
        })
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao criar log de notificação:', error);
        throw error;
      }

      return data as MTNotificationLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [STATS_QUERY_KEY] });
    },
    onError: (error: any) => {
      console.error('Erro ao registrar notificação:', error);
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Status
  // ---------------------------------------------------------------------------

  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      erro_mensagem,
    }: {
      id: string;
      status: MTNotificationStatus;
      erro_mensagem?: string;
    }): Promise<MTNotificationLog> => {
      const updates: Record<string, any> = { status };

      if (status === 'enviado') {
        updates.enviado_at = new Date().toISOString();
      } else if (status === 'entregue') {
        updates.entregue_at = new Date().toISOString();
      } else if (status === 'lido') {
        updates.lido_at = new Date().toISOString();
      } else if (status === 'falhou' && erro_mensagem) {
        updates.erro_mensagem = erro_mensagem;
      }

      const { data, error } = await supabase
        .from('mt_notification_log')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao atualizar status da notificação:', error);
        throw error;
      }

      return data as MTNotificationLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [STATS_QUERY_KEY] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar status da notificação.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Marcar como Enviado (atalho)
  // ---------------------------------------------------------------------------

  const markAsSent = useMutation({
    mutationFn: async (id: string): Promise<MTNotificationLog> => {
      const { data, error } = await supabase
        .from('mt_notification_log')
        .update({
          status: 'enviado',
          enviado_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return data as MTNotificationLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [STATS_QUERY_KEY] });
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Marcar como Erro (atalho)
  // ---------------------------------------------------------------------------

  const markAsError = useMutation({
    mutationFn: async ({
      id,
      erro_mensagem,
    }: {
      id: string;
      erro_mensagem: string;
    }): Promise<MTNotificationLog> => {
      const { data, error } = await supabase
        .from('mt_notification_log')
        .update({
          status: 'falhou',
          erro_mensagem,
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return data as MTNotificationLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [STATS_QUERY_KEY] });
    },
  });

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // Data
    logs: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    // Stats
    stats: statsQuery.data ?? null,
    isLoadingStats: statsQuery.isLoading,

    // Mutations
    createLog: {
      mutate: createLog.mutate,
      mutateAsync: createLog.mutateAsync,
      isPending: createLog.isPending,
    },
    updateStatus: {
      mutate: updateStatus.mutate,
      mutateAsync: updateStatus.mutateAsync,
      isPending: updateStatus.isPending,
    },
    markAsSent: {
      mutate: markAsSent.mutate,
      mutateAsync: markAsSent.mutateAsync,
      isPending: markAsSent.isPending,
    },
    markAsError: {
      mutate: markAsError.mutate,
      mutateAsync: markAsError.mutateAsync,
      isPending: markAsError.isPending,
    },
  };
}

export default useNotificationLogMT;

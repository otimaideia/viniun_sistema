// Hook Multi-Tenant para Filas WhatsApp
// Tabela: mt_whatsapp_queues

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  MTWhatsAppQueue,
  QueueStats,
  CreateQueueInput,
  UpdateQueueInput,
  QueueFilters,
} from '@/types/whatsapp-queue';

export function useWhatsAppQueuesMT(filters?: QueueFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Query: Listar filas
  const query = useQuery({
    queryKey: ['mt-whatsapp-queues', tenant?.id, franchise?.id, filters],
    queryFn: async (): Promise<MTWhatsAppQueue[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado');
      }

      let q = supabase
        .from('mt_whatsapp_queues')
        .select(`
          *,
          tenant:mt_tenants(id, slug, nome_fantasia),
          franchise:mt_franchises(id, nome, cidade, estado),
          session:mt_whatsapp_sessions(id, nome, session_name, status),
          created_by_user:mt_users!created_by(id, nome, email, avatar_url)
        `)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      // Filtros por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      // Filtros adicionais
      if (filters?.session_id) q = q.eq('session_id', filters.session_id);
      if (filters?.franchise_id) q = q.eq('franchise_id', filters.franchise_id);
      if (filters?.is_active !== undefined) q = q.eq('is_active', filters.is_active);
      if (filters?.is_default !== undefined) q = q.eq('is_default', filters.is_default);
      if (filters?.distribution_type) q = q.eq('distribution_type', filters.distribution_type);

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar filas MT:', error);
        throw error;
      }

      return (data || []) as MTWhatsAppQueue[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Query: Estatísticas das filas
  const statsQuery = useQuery({
    queryKey: ['mt-whatsapp-queue-stats', tenant?.id, franchise?.id, filters],
    queryFn: async (): Promise<QueueStats[]> => {
      let q = supabase
        .from('v_whatsapp_queue_stats')
        .select('*');

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      if (filters?.session_id) q = q.eq('session_id', filters.session_id);

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar stats:', error);
        return [];
      }

      return (data || []) as QueueStats[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    refetchOnWindowFocus: true, // Atualiza quando usuário retorna à aba
    refetchInterval: 60000, // Reduzido: 1 minuto (de 10s)
    refetchIntervalInBackground: false, // Para quando aba não visível
  });

  // Mutation: Criar fila
  const create = useMutation({
    mutationFn: async (newQueue: CreateQueueInput) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      const { data, error } = await supabase
        .from('mt_whatsapp_queues')
        .insert({
          ...newQueue,
          tenant_id: tenant?.id,
          franchise_id: newQueue.franchise_id || franchise?.id,
        })
        .select(`
          *,
          tenant:mt_tenants(id, slug, nome_fantasia),
          franchise:mt_franchises(id, nome, cidade, estado),
          session:mt_whatsapp_sessions(id, nome, session_name, status)
        `)
        .single();

      if (error) throw error;
      return data as MTWhatsAppQueue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-queues'] });
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-queue-stats'] });
      toast.success('Fila criada com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar fila: ${error.message}`);
    },
  });

  // Mutation: Atualizar fila
  const update = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateQueueInput) => {
      const { data, error } = await supabase
        .from('mt_whatsapp_queues')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          tenant:mt_tenants(id, slug, nome_fantasia),
          franchise:mt_franchises(id, nome, cidade, estado),
          session:mt_whatsapp_sessions(id, nome, session_name, status)
        `)
        .single();

      if (error) throw error;
      return data as MTWhatsAppQueue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-queues'] });
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-queue-stats'] });
      toast.success('Fila atualizada com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar fila: ${error.message}`);
    },
  });

  // Mutation: Deletar fila (soft delete)
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_whatsapp_queues')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-queues'] });
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-queue-stats'] });
      toast.success('Fila desativada com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao desativar fila: ${error.message}`);
    },
  });

  // Mutation: Definir como padrão
  const setAsDefault = useMutation({
    mutationFn: async (id: string) => {
      // Usar função atômica para evitar race condition
      const { data, error } = await supabase.rpc('set_queue_as_default', {
        p_queue_id: id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-queues'] });
      toast.success('Fila definida como padrão');
    },
    onError: (error: any) => {
      toast.error(`Erro ao definir fila como padrão: ${error.message}`);
    },
  });

  return {
    queues: query.data,
    stats: statsQuery.data,
    isLoading: query.isLoading || isTenantLoading,
    isLoadingStats: statsQuery.isLoading,
    error: query.error,
    refetch: query.refetch,
    create,
    update,
    remove,
    setAsDefault,
  };
}

// Hook para buscar uma fila específica
export function useWhatsAppQueueMT(queueId: string | undefined) {
  const query = useQuery({
    queryKey: ['mt-whatsapp-queue', queueId],
    queryFn: async (): Promise<MTWhatsAppQueue | null> => {
      if (!queueId) return null;

      const { data, error } = await supabase
        .from('mt_whatsapp_queues')
        .select(`
          *,
          tenant:mt_tenants(id, slug, nome_fantasia),
          franchise:mt_franchises(id, nome, cidade, estado),
          session:mt_whatsapp_sessions(id, nome, session_name, status, telefone),
          created_by_user:mt_users!created_by(id, nome, email, avatar_url)
        `)
        .eq('id', queueId)
        .single();

      if (error) {
        console.error('Erro ao buscar fila:', error);
        return null;
      }

      return data as MTWhatsAppQueue;
    },
    enabled: !!queueId,
  });

  return {
    queue: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

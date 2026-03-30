// Hook Multi-Tenant para Usuários nas Filas WhatsApp
// Tabela: mt_whatsapp_queue_users

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  MTWhatsAppQueueUser,
  AddUserToQueueInput,
  UpdateQueueUserInput,
  QueueUserFilters,
  AgentStatus,
} from '@/types/whatsapp-queue';

export function useWhatsAppQueueUsersMT(filters?: QueueUserFilters) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Query: Listar usuários nas filas
  const query = useQuery({
    queryKey: ['mt-whatsapp-queue-users', tenant?.id, filters],
    queryFn: async (): Promise<MTWhatsAppQueueUser[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado');
      }

      let q = supabase
        .from('mt_whatsapp_queue_users')
        .select(`
          *,
          queue:mt_whatsapp_queues(id, codigo, nome, cor, session_id),
          user:mt_users(id, nome, email, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      if (filters?.queue_id) q = q.eq('queue_id', filters.queue_id);
      if (filters?.user_id) q = q.eq('user_id', filters.user_id);
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.is_active !== undefined) q = q.eq('is_active', filters.is_active);
      // Filtro has_capacity: comparar current_conversations < max_concurrent
      // Nota: Supabase não permite comparação entre colunas diretamente via query builder
      // Solução: filtrar no cliente após carregar os dados

      const { data, error } = await q;
      if (error) throw error;

      let result = (data || []) as MTWhatsAppQueueUser[];

      // Filtrar no cliente: has_capacity (current_conversations < max_concurrent)
      if (filters?.has_capacity) {
        result = result.filter(qu => qu.current_conversations < qu.max_concurrent);
      }

      return result;
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Mutation: Adicionar usuário à fila
  const addUser = useMutation({
    mutationFn: async (input: AddUserToQueueInput) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      const { data, error } = await supabase
        .from('mt_whatsapp_queue_users')
        .insert({
          ...input,
          tenant_id: tenant?.id,
        })
        .select(`
          *,
          queue:mt_whatsapp_queues(id, codigo, nome, cor),
          user:mt_users(id, nome, email, avatar_url)
        `)
        .single();

      if (error) throw error;
      return data as MTWhatsAppQueueUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-queue-users'] });
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-queue-stats'] });
      toast.success('Usuário adicionado à fila');
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Mutation: Atualizar usuário
  const update = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateQueueUserInput) => {
      const { data, error } = await supabase
        .from('mt_whatsapp_queue_users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-queue-users'] });
      toast.success('Status atualizado');
    },
  });

  // Mutation: Atualizar status
  const updateStatus = useMutation({
    mutationFn: async ({ userId, queueId, status }: { userId: string; queueId: string; status: AgentStatus }) => {
      const { error } = await supabase
        .from('mt_whatsapp_queue_users')
        .update({ status, last_activity_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('queue_id', queueId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-queue-users'] });
    },
  });

  // Mutation: Remover usuário
  const removeUser = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_whatsapp_queue_users')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-queue-users'] });
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-queue-stats'] });
      toast.success('Usuário removido da fila');
    },
  });

  return {
    queueUsers: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    addUser,
    update,
    updateStatus,
    removeUser,
  };
}

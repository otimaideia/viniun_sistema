// Hook para Lógica de Distribuição Automática de Conversas
// Chama functions do PostgreSQL: assign_conversation_from_queue, add_conversation_to_queue

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { AssignConversationResult, AddToQueueResult } from '@/types/whatsapp-queue';

export function useWhatsAppQueueDistribution() {
  const queryClient = useQueryClient();
  const { tenant, accessLevel } = useTenantContext();

  // Mutation: Adicionar conversa na fila
  const addToQueue = useMutation({
    mutationFn: async ({ conversationId, queueId }: { conversationId: string; queueId: string }) => {
      const { data, error } = await supabase.rpc('add_conversation_to_queue', {
        p_conversation_id: conversationId,
        p_queue_id: queueId,
      });

      if (error) throw error;

      // Retornar informações
      let convQuery = supabase
        .from('mt_whatsapp_conversations')
        .select('queue_position, assigned_to')
        .eq('id', conversationId);

      if (accessLevel !== 'platform' && tenant?.id) {
        convQuery = convQuery.eq('tenant_id', tenant.id);
      }

      const { data: conversation } = await convQuery.single();

      return {
        conversation_id: conversationId,
        queue_id: queueId,
        queue_position: data || conversation?.queue_position || 0,
        auto_assigned: !!conversation?.assigned_to,
        assigned_user_id: conversation?.assigned_to || null,
      } as AddToQueueResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-queue-stats'] });

      if (result.auto_assigned) {
        toast.success('Conversa atribuída automaticamente');
      } else {
        toast.success(`Conversa adicionada à fila (posição ${result.queue_position})`);
      }
    },
    onError: (error: any) => {
      toast.error(`Erro ao adicionar na fila: ${error.message}`);
    },
  });

  // Mutation: Atribuir conversa manualmente
  const assignConversation = useMutation({
    mutationFn: async ({ conversationId }: { conversationId: string }) => {
      const { data, error } = await supabase.rpc('assign_conversation_from_queue', {
        p_conversation_id: conversationId,
      });

      if (error) throw error;

      // Buscar detalhes da atribuição
      let assignQuery = supabase
        .from('mt_whatsapp_conversations')
        .select('queue_id, assigned_to, wait_time_seconds')
        .eq('id', conversationId);

      if (accessLevel !== 'platform' && tenant?.id) {
        assignQuery = assignQuery.eq('tenant_id', tenant.id);
      }

      const { data: conversation } = await assignQuery.single();

      return {
        assigned_user_id: data || conversation?.assigned_to || null,
        conversation_id: conversationId,
        queue_id: conversation?.queue_id || '',
        wait_time_seconds: conversation?.wait_time_seconds || null,
      } as AssignConversationResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-queue-users'] });
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-queue-stats'] });

      if (result.assigned_user_id) {
        toast.success('Conversa atribuída com sucesso');
      } else {
        toast.warning('Nenhum atendente disponível no momento');
      }
    },
    onError: (error: any) => {
      toast.error(`Erro ao atribuir conversa: ${error.message}`);
    },
  });

  // Mutation: Processar toda a fila (útil para reprocessamento)
  const processQueue = useMutation({
    mutationFn: async (queueId: string) => {
      // Buscar todas as conversas pendentes na fila
      let queueQuery = supabase
        .from('mt_whatsapp_conversations')
        .select('id')
        .eq('queue_id', queueId)
        .eq('status', 'queued')
        .order('queue_position', { ascending: true });

      if (accessLevel !== 'platform' && tenant?.id) {
        queueQuery = queueQuery.eq('tenant_id', tenant.id);
      }

      const { data: conversations } = await queueQuery;

      if (!conversations || conversations.length === 0) {
        return { processed: 0, assigned: 0 };
      }

      let assigned = 0;
      for (const conv of conversations) {
        try {
          const { data } = await supabase.rpc('assign_conversation_from_queue', {
            p_conversation_id: conv.id,
          });

          if (data) assigned++;
        } catch (error) {
          console.error('Erro ao processar conversa:', error);
        }
      }

      return { processed: conversations.length, assigned };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-queue-stats'] });
      toast.success(`${result.assigned} de ${result.processed} conversas atribuídas`);
    },
  });

  return {
    addToQueue,
    assignConversation,
    processQueue,
  };
}

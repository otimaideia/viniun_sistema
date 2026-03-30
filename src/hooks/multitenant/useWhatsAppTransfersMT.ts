// Hook Multi-Tenant para Transferências WhatsApp

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Transfer {
  id: string;
  conversation_id: string;
  from_user_id: string | null;
  to_user_id: string | null;
  from_queue_id: string | null;
  to_queue_id: string | null;
  transfer_type: string;
  reason: string | null;
  notes: string | null;
  status: string;
  transferred_at: string;
  accepted_at: string | null;
  completed_at: string | null;
}

interface CreateTransferInput {
  conversation_id: string;
  to_user_id?: string;
  to_queue_id?: string;
  reason?: string;
  notes?: string;
}

export function useWhatsAppTransfersMT(conversationId?: string) {
  const { tenant } = useTenantContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mt-whatsapp-transfers', conversationId],
    queryFn: async (): Promise<Transfer[]> => {
      let q = supabase
        .from('mt_whatsapp_transfers')
        .select('*')
        .order('created_at', { ascending: false });

      if (conversationId) {
        q = q.eq('conversation_id', conversationId);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!conversationId,
  });

  const create = useMutation({
    mutationFn: async (input: CreateTransferInput) => {
      // ====== VALIDAÇÕES PRÉ-TRANSFERÊNCIA ======

      // 1. Verificar se conversa existe e está ativa
      const { data: conversation, error: convError } = await supabase
        .from('mt_whatsapp_conversations')
        .select('id, status, assigned_to, assigned_from_queue_at, queue_id')
        .eq('id', input.conversation_id)
        .single();

      if (convError || !conversation) {
        throw new Error('Conversa não encontrada');
      }

      if (conversation.status === 'resolved' || conversation.status === 'closed') {
        throw new Error('Não é possível transferir conversa finalizada');
      }

      // 2. Verificar permissão do usuário (deve ser o assigned_to ou admin)
      if (conversation.assigned_to !== user?.id) {
        // Verificar se é admin via RLS (se query não falhar = tem permissão)
        const { error: permError } = await supabase
          .from('mt_whatsapp_queue_users')
          .select('user_id')
          .eq('user_id', user?.id)
          .limit(1)
          .single();

        // Se não é assigned_to E não é admin = sem permissão
        if (permError) {
          throw new Error('Sem permissão para transferir esta conversa');
        }
      }

      // 3. Validar destino
      if (input.to_user_id) {
        // Transferência usuário → usuário
        const { data: targetUser, error: userError } = await supabase
          .from('mt_whatsapp_queue_users')
          .select('user_id, current_conversations, max_concurrent, status, is_active')
          .eq('user_id', input.to_user_id)
          .eq('queue_id', conversation.queue_id) // Deve estar na mesma fila
          .single();

        if (userError || !targetUser) {
          throw new Error('Usuário destino não encontrado na fila');
        }

        if (!targetUser.is_active) {
          throw new Error('Usuário destino está inativo');
        }

        if (targetUser.status !== 'available' && targetUser.status !== 'busy') {
          throw new Error(`Usuário destino está ${targetUser.status}`);
        }

        if (targetUser.current_conversations >= targetUser.max_concurrent) {
          throw new Error('Usuário destino sem capacidade');
        }

      } else if (input.to_queue_id) {
        // Transferência usuário → fila
        const { data: targetQueue, error: queueError } = await supabase
          .from('mt_whatsapp_queues')
          .select('id, is_active, nome')
          .eq('id', input.to_queue_id)
          .single();

        if (queueError || !targetQueue) {
          throw new Error('Fila destino não encontrada');
        }

        if (!targetQueue.is_active) {
          throw new Error(`Fila "${targetQueue.nome}" está inativa`);
        }

        // Verificar se fila tem agentes disponíveis
        const { data: availableAgents } = await supabase
          .from('mt_whatsapp_queue_users')
          .select('user_id')
          .eq('queue_id', input.to_queue_id)
          .eq('is_active', true)
          .filter('current_conversations', 'lt', 'max_concurrent')
          .limit(1);

        if (!availableAgents || availableAgents.length === 0) {
          throw new Error(`Fila "${targetQueue.nome}" sem agentes disponíveis`);
        }

      } else {
        throw new Error('Destino inválido: especifique to_user_id ou to_queue_id');
      }

      // ====== CRIAR TRANSFERÊNCIA ======
      const transferType = input.to_user_id ? 'user_to_user' : 'user_to_queue';

      const { data, error } = await supabase
        .from('mt_whatsapp_transfers')
        .insert({
          ...input,
          tenant_id: tenant?.id,
          from_user_id: user?.id,
          transfer_type: transferType,
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-aceitar e executar
      await supabase
        .from('mt_whatsapp_transfers')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', data.id);

      await supabase.rpc('execute_transfer', { p_transfer_id: data.id });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-transfers'] });
      toast.success('Conversa transferida com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao transferir: ${error.message}`);
    },
  });

  return {
    transfers: query.data,
    isLoading: query.isLoading,
    create,
  };
}

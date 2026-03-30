// Hook para ações de gerenciamento de chat (arquivar, deletar, etc)
// Usa cliente direto (wahaClient) como fallback quando proxy falha

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { wahaProxy } from '@/services/waha/wahaProxyClient';
import { wahaClient } from '@/services/waha/wahaDirectClient';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseChatActionsOptions {
  sessionName: string;
  onSuccess?: () => void;
}

/**
 * @deprecated Use useWhatsAppChatAdapter instead. This hook lacks tenant isolation.
 */
export function useChatActions({ sessionName, onSuccess }: UseChatActionsOptions) {
  const queryClient = useQueryClient();

  // Arquivar chat
  const archiveChat = useMutation({
    mutationFn: async (chatId: string) => {
      // Tentar proxy primeiro
      let result = await wahaProxy.archiveChat(sessionName, chatId);

      // Se proxy falhar, usar cliente direto como fallback
      if (!result.success) {
        console.log('[useChatActions] archiveChat: Proxy falhou, usando cliente direto');
        result = await wahaClient.archiveChat(sessionName, chatId);
      }

      if (!result.success) {
        throw new Error(result.error || 'Erro ao arquivar conversa');
      }

      // Atualizar status no banco local
      await supabase
        .from('mt_whatsapp_conversations')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('remote_jid', chatId);

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      toast.success('Conversa arquivada!');
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao arquivar: ${error.message}`);
    },
  });

  // Desarquivar chat
  const unarchiveChat = useMutation({
    mutationFn: async (chatId: string) => {
      // Tentar proxy primeiro
      let result = await wahaProxy.unarchiveChat(sessionName, chatId);

      // Se proxy falhar, usar cliente direto como fallback
      if (!result.success) {
        console.log('[useChatActions] unarchiveChat: Proxy falhou, usando cliente direto');
        result = await wahaClient.unarchiveChat(sessionName, chatId);
      }

      if (!result.success) {
        throw new Error(result.error || 'Erro ao desarquivar conversa');
      }

      // Atualizar status no banco local
      await supabase
        .from('mt_whatsapp_conversations')
        .update({ status: 'open', updated_at: new Date().toISOString() })
        .eq('remote_jid', chatId);

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      toast.success('Conversa desarquivada!');
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao desarquivar: ${error.message}`);
    },
  });

  // Deletar chat
  const deleteChat = useMutation({
    mutationFn: async (chatId: string) => {
      // Tentar proxy primeiro
      let result = await wahaProxy.deleteChat(sessionName, chatId);

      // Se proxy falhar, usar cliente direto como fallback
      if (!result.success) {
        console.log('[useChatActions] deleteChat: Proxy falhou, usando cliente direto');
        result = await wahaClient.deleteChat(sessionName, chatId);
      }

      if (!result.success) {
        throw new Error(result.error || 'Erro ao deletar conversa');
      }

      // Deletar do banco local (soft delete ou hard delete)
      // Por segurança, vamos fazer soft delete marcando como deletado
      await supabase
        .from('mt_whatsapp_conversations')
        .update({
          status: 'deleted',
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('remote_jid', chatId);

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      toast.success('Conversa deletada!');
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao deletar: ${error.message}`);
    },
  });

  // Marcar como spam
  const markAsSpam = useMutation({
    mutationFn: async (chatId: string) => {
      // Atualizar status no banco local
      await supabase
        .from('mt_whatsapp_conversations')
        .update({ status: 'spam', updated_at: new Date().toISOString() })
        .eq('remote_jid', chatId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      toast.success('Conversa marcada como spam!');
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao marcar como spam: ${error.message}`);
    },
  });

  // Remover da lista de spam
  const unmarkAsSpam = useMutation({
    mutationFn: async (chatId: string) => {
      // Atualizar status no banco local
      await supabase
        .from('mt_whatsapp_conversations')
        .update({ status: 'open', updated_at: new Date().toISOString() })
        .eq('remote_jid', chatId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      toast.success('Conversa removida do spam!');
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover do spam: ${error.message}`);
    },
  });

  return {
    archiveChat,
    unarchiveChat,
    deleteChat,
    markAsSpam,
    unmarkAsSpam,
    isLoading:
      archiveChat.isPending ||
      unarchiveChat.isPending ||
      deleteChat.isPending ||
      markAsSpam.isPending ||
      unmarkAsSpam.isPending,
  };
}

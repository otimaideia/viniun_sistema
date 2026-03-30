import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Emojis comuns para reações no WhatsApp
export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface MessageReaction {
  id: string;
  message_id: string;
  emoji: string;
  user_id: string;
  created_at: string;
}

interface ReactionSummary {
  emoji: string;
  count: number;
  users: string[];
}

/**
 * Hook para gerenciar reações em mensagens do WhatsApp
 */
export function useMessageReactions(messageId: string | undefined) {
  const queryClient = useQueryClient();

  // Buscar reações da mensagem
  const {
    data: reactions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['message_reactions', messageId],
    queryFn: async (): Promise<MessageReaction[]> => {
      if (!messageId) return [];

      // Por enquanto, retorna array vazio pois a tabela ainda não existe
      // Quando a tabela for criada, descomentar o código abaixo
      /*
      const { data, error } = await supabase
        .from('mt_whatsapp_reactions')
        .select('*')
        .eq('message_id', messageId);

      if (error) throw error;
      return data || [];
      */

      return [];
    },
    enabled: !!messageId,
    staleTime: 30000,
  });

  // Agrupar reações por emoji
  const reactionSummary: ReactionSummary[] = REACTION_EMOJIS.map(emoji => ({
    emoji,
    count: reactions.filter(r => r.emoji === emoji).length,
    users: reactions.filter(r => r.emoji === emoji).map(r => r.user_id),
  })).filter(r => r.count > 0);

  // Adicionar reação
  const addReaction = useMutation({
    mutationFn: async ({ emoji, userId }: { emoji: string; userId: string }) => {
      if (!messageId) throw new Error('Mensagem não informada');

      // Por enquanto, apenas simula sucesso pois a tabela ainda não existe
      // Quando a tabela for criada, implementar a lógica real
      /*
      const { data, error } = await supabase
        .from('mt_whatsapp_reactions')
        .insert({
          message_id: messageId,
          emoji,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
      */

      return { id: 'temp', message_id: messageId, emoji, user_id: userId, created_at: new Date().toISOString() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message_reactions', messageId] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar reação: ${error.message}`);
    },
  });

  // Remover reação
  const removeReaction = useMutation({
    mutationFn: async ({ reactionId }: { reactionId: string }) => {
      // Por enquanto, apenas simula sucesso
      /*
      const { error } = await supabase
        .from('mt_whatsapp_reactions')
        .delete()
        .eq('id', reactionId);

      if (error) throw error;
      */

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message_reactions', messageId] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover reação: ${error.message}`);
    },
  });

  // Toggle reação (adiciona se não existe, remove se existe)
  const toggleReaction = useMutation({
    mutationFn: async ({ emoji, userId }: { emoji: string; userId: string }) => {
      if (!messageId) throw new Error('Mensagem não informada');

      const existingReaction = reactions.find(
        r => r.emoji === emoji && r.user_id === userId
      );

      if (existingReaction) {
        await removeReaction.mutateAsync({ reactionId: existingReaction.id });
        return { action: 'removed' };
      } else {
        await addReaction.mutateAsync({ emoji, userId });
        return { action: 'added' };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['message_reactions', messageId] });
      // toast é opcional aqui
    },
  });

  // Verificar se usuário reagiu com determinado emoji
  const hasUserReacted = (emoji: string, userId: string): boolean => {
    return reactions.some(r => r.emoji === emoji && r.user_id === userId);
  };

  // Obter reação do usuário
  const getUserReaction = (userId: string): string | null => {
    const reaction = reactions.find(r => r.user_id === userId);
    return reaction?.emoji || null;
  };

  return {
    reactions,
    reactionSummary,
    isLoading,
    error,
    refetch,
    addReaction: addReaction.mutate,
    removeReaction: removeReaction.mutate,
    toggleReaction: toggleReaction.mutate,
    hasUserReacted,
    getUserReaction,
    isAdding: addReaction.isPending,
    isRemoving: removeReaction.isPending,
    isToggling: toggleReaction.isPending,
    availableEmojis: REACTION_EMOJIS,
  };
}

export default useMessageReactions;

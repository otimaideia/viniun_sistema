// Hook para gerenciar Respostas Rápidas

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import type {
  QuickReply,
  CreateQuickReplyInput,
  UpdateQuickReplyInput,
  QuickReplyFilters,
} from '@/types/whatsapp';
import { toast } from 'sonner';

const QUICK_REPLIES_KEY = 'whatsapp-quick-replies';

/**
 * @deprecated Use useWhatsAppQuickRepliesAdapter instead. This hook lacks tenant isolation.
 */
export function useQuickReplies(
  franqueadoId?: string,
  filters?: QuickReplyFilters
) {
  const queryClient = useQueryClient();
  const { tenant, franchise } = useTenantContext();

  // Listar quick replies
  const quickRepliesQuery = useQuery({
    queryKey: [QUICK_REPLIES_KEY, franqueadoId, filters],
    queryFn: async () => {
      let query = supabase
        .from('mt_quick_replies')
        .select('*')
        .order('ordem', { ascending: true })
        .order('title', { ascending: true });

      if (franqueadoId) {
        query = query.eq('franqueado_id', franqueadoId);
      }

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      if (filters?.isGlobal !== undefined) {
        if (filters.isGlobal) {
          query = query.is('user_id', null);
        } else {
          query = query.not('user_id', 'is', null);
        }
      }

      if (filters?.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,shortcut.ilike.%${filters.search}%,content.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as QuickReply[];
    },
    enabled: true,
  });

  // Buscar por shortcut
  const findByShortcut = async (shortcut: string, franqueadoId: string) => {
    const { data, error } = await supabase
      .from('mt_quick_replies')
      .select('*')
      .eq('franqueado_id', franqueadoId)
      .eq('shortcut', shortcut)
      .eq('is_active', true)
      .single();

    if (error) return null;
    return data as QuickReply;
  };

  // Criar quick reply
  const createQuickReply = useMutation({
    mutationFn: async ({
      franqueadoId,
      input,
      userId,
    }: {
      franqueadoId: string;
      input: CreateQuickReplyInput;
      userId?: string;
    }) => {
      if (!tenant?.id) {
        throw new Error('Tenant não identificado');
      }

      const { data, error } = await supabase
        .from('mt_quick_replies')
        .insert({
          tenant_id: tenant.id, // OBRIGATÓRIO para MT
          franchise_id: franchise?.id || null,
          franqueado_id: franqueadoId,
          user_id: input.is_global ? null : userId,
          shortcut: input.shortcut,
          title: input.title,
          content: input.content,
          category: input.category,
          media_type: input.media_type,
          media_url: input.media_url,
          media_filename: input.media_filename,
        })
        .select()
        .single();

      if (error) throw error;
      return data as QuickReply;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUICK_REPLIES_KEY] });
      toast.success('Resposta rápida criada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar resposta rápida: ${error.message}`);
    },
  });

  // Atualizar quick reply
  const updateQuickReply = useMutation({
    mutationFn: async ({
      quickReplyId,
      input,
    }: {
      quickReplyId: string;
      input: UpdateQuickReplyInput;
    }) => {
      const { data, error } = await supabase
        .from('mt_quick_replies')
        .update(input)
        .eq('id', quickReplyId)
        .select()
        .single();

      if (error) throw error;
      return data as QuickReply;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUICK_REPLIES_KEY] });
      toast.success('Resposta rápida atualizada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  // Deletar quick reply
  const deleteQuickReply = useMutation({
    mutationFn: async (quickReplyId: string) => {
      const { error } = await supabase
        .from('mt_quick_replies')
        .delete()
        .eq('id', quickReplyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUICK_REPLIES_KEY] });
      toast.success('Resposta rápida deletada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao deletar: ${error.message}`);
    },
  });

  // Incrementar uso
  const incrementUsage = useMutation({
    mutationFn: async (quickReplyId: string) => {
      const { error } = await supabase.rpc('increment_quick_reply_usage', {
        p_quick_reply_id: quickReplyId,
      });

      // Se a função RPC não existir, usar update direto
      if (error?.code === '42883') {
        // Function does not exist
        const { error: updateError } = await supabase
          .from('mt_quick_replies')
          .update({
            use_count: supabase.rpc('increment', { x: 1 }) as unknown as number,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', quickReplyId);

        if (updateError) throw updateError;
      } else if (error) {
        throw error;
      }
    },
  });

  // Reordenar quick replies
  const reorderQuickReplies = useMutation({
    mutationFn: async (
      items: { id: string; ordem: number }[]
    ) => {
      const promises = items.map((item) =>
        supabase
          .from('mt_quick_replies')
          .update({ ordem: item.ordem })
          .eq('id', item.id)
      );

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUICK_REPLIES_KEY] });
    },
  });

  return {
    quickReplies: quickRepliesQuery.data || [],
    isLoading: quickRepliesQuery.isLoading,
    error: quickRepliesQuery.error,
    refetch: quickRepliesQuery.refetch,

    findByShortcut,
    createQuickReply,
    updateQuickReply,
    deleteQuickReply,
    incrementUsage,
    reorderQuickReplies,
  };
}

// Hook Multi-Tenant para Notas Internas WhatsApp

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Note {
  id: string;
  conversation_id: string;
  content: string;
  note_type: string;
  is_pinned: boolean;
  is_private: boolean;
  created_by: string;
  created_by_name: string | null;
  mentioned_users: string[] | null;
  created_at: string;
}

export function useWhatsAppNotesMT(conversationId: string) {
  const { tenant } = useTenantContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mt-whatsapp-notes', conversationId],
    queryFn: async (): Promise<Note[]> => {
      const { data, error } = await supabase
        .from('mt_whatsapp_notes')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!conversationId,
  });

  const create = useMutation({
    mutationFn: async (input: { content: string; note_type?: string; is_pinned?: boolean; is_private?: boolean }) => {
      const { data, error } = await supabase
        .from('mt_whatsapp_notes')
        .insert({
          conversation_id: conversationId,
          tenant_id: tenant?.id,
          created_by: user?.id,
          created_by_name: user?.user_metadata?.nome || user?.email,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-notes', conversationId] });
      toast.success('Nota adicionada');
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_whatsapp_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-notes', conversationId] });
      toast.success('Nota removida');
    },
  });

  return {
    notes: query.data,
    isLoading: query.isLoading,
    create,
    remove,
  };
}

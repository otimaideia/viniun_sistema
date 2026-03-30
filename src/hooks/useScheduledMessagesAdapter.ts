// =============================================================================
// USE SCHEDULED MESSAGES ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter 100% MT para mensagens agendadas
// SISTEMA 100% MT - Usa mt_whatsapp_scheduled_messages diretamente
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

// =============================================================================
// Types
// =============================================================================

export interface ScheduledMessage {
  id: string;
  tenant_id: string;
  franchise_id?: string | null;
  session_id: string;
  phone: string;
  content: string;
  media_url?: string | null;
  media_type?: string | null;
  scheduled_at: string;
  status: 'pendente' | 'enviado' | 'falhou' | 'cancelado';
  sent_at?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at?: string;
  created_by?: string | null;
}

export interface ScheduledMessageCreate {
  session_id: string;
  phone: string;
  content: string;
  media_url?: string;
  media_type?: string;
  scheduled_at: string;
}

// =============================================================================
// Query Key
// =============================================================================

const QUERY_KEY = 'mt-scheduled-messages';

// =============================================================================
// Hook Principal
// =============================================================================

export function useScheduledMessagesAdapter(sessionId?: string) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ==========================================================================
  // Query: Listar Mensagens Agendadas
  // ==========================================================================
  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, sessionId],
    queryFn: async (): Promise<ScheduledMessage[]> => {
      let queryBuilder = supabase
        .from('mt_whatsapp_scheduled_messages')
        .select('*')
        .order('scheduled_at', { ascending: true });

      // Filtrar por tenant
      if (accessLevel === 'tenant' && tenant) {
        queryBuilder = queryBuilder.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        queryBuilder = queryBuilder.eq('franchise_id', franchise.id);
      }

      // Filtrar por sessão se especificado
      if (sessionId) {
        queryBuilder = queryBuilder.eq('session_id', sessionId);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('[MT] Erro ao buscar mensagens agendadas:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ==========================================================================
  // Query: Mensagens Pendentes
  // ==========================================================================
  const pendingQuery = useQuery({
    queryKey: [QUERY_KEY, 'pending', tenant?.id, sessionId],
    queryFn: async (): Promise<ScheduledMessage[]> => {
      let queryBuilder = supabase
        .from('mt_whatsapp_scheduled_messages')
        .select('*')
        .eq('status', 'pendente')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true });

      if (accessLevel === 'tenant' && tenant) {
        queryBuilder = queryBuilder.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        queryBuilder = queryBuilder.eq('franchise_id', franchise.id);
      }

      if (sessionId) {
        queryBuilder = queryBuilder.eq('session_id', sessionId);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('[MT] Erro ao buscar mensagens pendentes:', error);
        return [];
      }

      return data || [];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ==========================================================================
  // Mutation: Criar Mensagem Agendada
  // ==========================================================================
  const createMutation = useMutation({
    mutationFn: async (data: ScheduledMessageCreate) => {
      const { data: userData } = await supabase.auth.getUser();

      const { data: created, error } = await supabase
        .from('mt_whatsapp_scheduled_messages')
        .insert({
          tenant_id: tenant?.id,
          franchise_id: franchise?.id || null,
          session_id: data.session_id,
          phone: data.phone,
          content: data.content,
          media_url: data.media_url || null,
          media_type: data.media_type || null,
          scheduled_at: data.scheduled_at,
          status: 'pendente',
          created_by: userData.user?.id || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[MT] Erro ao criar mensagem agendada:', error);
        throw error;
      }

      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Mensagem agendada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao agendar mensagem: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Cancelar Mensagem
  // ==========================================================================
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_whatsapp_scheduled_messages')
        .update({
          status: 'cancelado',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('[MT] Erro ao cancelar mensagem:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Mensagem cancelada');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao cancelar mensagem: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Deletar Mensagem
  // ==========================================================================
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_whatsapp_scheduled_messages')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[MT] Erro ao deletar mensagem:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Mensagem removida');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover mensagem: ${error.message}`);
    },
  });

  return {
    scheduledMessages: query.data || [],
    pendingMessages: pendingQuery.data || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: () => {
      query.refetch();
      pendingQuery.refetch();
    },

    createScheduledMessage: createMutation.mutateAsync,
    cancelScheduledMessage: cancelMutation.mutateAsync,
    deleteScheduledMessage: deleteMutation.mutateAsync,

    isCreating: createMutation.isPending,
    isCanceling: cancelMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Context info
    tenant,
    franchise,
    accessLevel,

    _mode: 'mt' as const,
  };
}

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getScheduledMessagesMode(): 'mt' {
  return 'mt';
}

export default useScheduledMessagesAdapter;

// Hook para substituir sessão WhatsApp
// Migra TODOS os dados (conversas, mensagens, leads, permissões) de uma sessão para outra
// Usa a function SQL replace_whatsapp_session no banco

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

export interface ReplaceSessionResult {
  success: boolean;
  old_session_id: string;
  new_session_id: string;
  migrated: {
    conversations: number;
    messages: number;
    leads: number;
    permissions: number;
    queues: number;
  };
}

export interface SessionDataCounts {
  conversations: number;
  messages: number;
  leads: number;
}

/**
 * Busca contagem de dados vinculados a uma sessão
 */
export async function getSessionDataCounts(sessionId: string, tenantId?: string): Promise<SessionDataCounts> {
  let convQuery = supabase
    .from('mt_whatsapp_conversations')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId);

  let msgQuery = supabase
    .from('mt_whatsapp_messages')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId);

  let leadQuery = supabase
    .from('mt_leads')
    .select('id', { count: 'exact', head: true })
    .eq('whatsapp_session_id', sessionId);

  if (tenantId) {
    convQuery = convQuery.eq('tenant_id', tenantId);
    msgQuery = msgQuery.eq('tenant_id', tenantId);
    leadQuery = leadQuery.eq('tenant_id', tenantId);
  }

  const [convResult, msgResult, leadResult] = await Promise.all([
    convQuery,
    msgQuery,
    leadQuery,
  ]);

  return {
    conversations: convResult.count ?? 0,
    messages: msgResult.count ?? 0,
    leads: leadResult.count ?? 0,
  };
}

/**
 * Hook para substituir sessão WhatsApp
 * Migra todos os dados da sessão antiga para a nova via SQL function
 */
export function useWhatsAppSessionReplace() {
  const queryClient = useQueryClient();
  const { tenant } = useTenantContext();

  const replaceSession = useMutation({
    mutationFn: async ({
      oldSessionId,
      newSessionId,
    }: {
      oldSessionId: string;
      newSessionId: string;
    }): Promise<ReplaceSessionResult> => {
      const { data, error } = await supabase.rpc('replace_whatsapp_session', {
        p_old_session_id: oldSessionId,
        p_new_session_id: newSessionId,
      });

      if (error) throw error;
      return data as unknown as ReplaceSessionResult;
    },
    onSuccess: (result) => {
      const m = result.migrated;
      toast.success(
        `Sessão substituída! Migrados: ${m.conversations} conversas, ${m.messages} mensagens, ${m.leads} leads`
      );

      // Invalidar todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-messages'] });
      queryClient.invalidateQueries({ queryKey: ['mt-leads'] });
      // Invalidar permissões e sessões do usuário
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-my-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-session-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['session-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-my-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-queues'] });
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-bot-config'] });
    },
    onError: (error: Error) => {
      console.error('Erro ao substituir sessão:', error);
      toast.error(`Erro ao substituir sessão: ${error.message}`);
    },
  });

  return {
    replaceSession,
    isReplacing: replaceSession.isPending,
  };
}

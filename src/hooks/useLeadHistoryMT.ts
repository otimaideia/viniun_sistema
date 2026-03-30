// =============================================================================
// USE LEAD HISTORY MT - Hook Multi-Tenant para Histórico de Leads
// =============================================================================
//
// Este hook gerencia o histórico de ações realizadas em leads.
// Pode usar a tabela mt_lead_activities ou uma tabela dedicada de histórico.
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { sanitizeObjectForJSON } from '@/utils/unicodeSanitizer';
import type { MTLeadActivity, LeadActivityType } from '@/types/lead-mt';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface HistoryEntry {
  id: string;
  lead_id: string;
  tenant_id: string;
  action_type: string;
  action_description: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_by_name: string | null;
  performed_by_name?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface RecordHistoryParams {
  leadId: string;
  actionType: LeadActivityType | string;
  actionDescription: string;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-lead-history';

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useLeadHistoryMT(leadId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  // ---------------------------------------------------------------------------
  // Query: Buscar Histórico
  // ---------------------------------------------------------------------------

  const historyQuery = useQuery({
    queryKey: [QUERY_KEY, leadId, tenant?.id],
    queryFn: async (): Promise<HistoryEntry[]> => {
      if (!leadId) return [];

      // Buscar atividades do lead como histórico
      // Nota: tabela usa user_id/user_nome (denormalizado), não created_by
      const { data, error } = await supabase
        .from('mt_lead_activities')
        .select(`
          id,
          lead_id,
          tenant_id,
          tipo,
          titulo,
          descricao,
          status_anterior,
          status_novo,
          dados,
          user_id,
          user_nome,
          created_at
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Erro ao buscar histórico MT:', error);
        throw error;
      }

      // Mapear para formato de HistoryEntry e sanitizar Unicode
      return (data || []).map((item: any) => sanitizeObjectForJSON({
        id: item.id,
        lead_id: item.lead_id,
        tenant_id: item.tenant_id,
        action_type: item.tipo,
        action_description: item.descricao || item.titulo || '',
        old_value: item.status_anterior,
        new_value: item.status_novo,
        changed_by: item.user_id,
        changed_by_name: item.user_nome || 'Sistema',
        performed_by_name: item.user_nome || 'Sistema',
        metadata: item.dados,
        created_at: item.created_at,
      }));
    },
    enabled: !!leadId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 30_000, // 30 segundos - evita re-fetch constante
    refetchOnWindowFocus: false,
  });

  // ---------------------------------------------------------------------------
  // Mutation: Registrar Histórico
  // ---------------------------------------------------------------------------

  const recordHistoryMutation = useMutation({
    mutationFn: async ({
      leadId,
      actionType,
      actionDescription,
      oldValue,
      newValue,
      metadata,
    }: RecordHistoryParams): Promise<void> => {
      if (!user) throw new Error('Usuário não autenticado');
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      // Inserir na tabela de atividades
      // Nota: tabela usa user_id/user_nome e dados (não created_by/metadata)
      const { error } = await supabase
        .from('mt_lead_activities')
        .insert({
          tenant_id: tenant?.id,
          lead_id: leadId,
          tipo: actionType as LeadActivityType,
          titulo: getActivityTitle(actionType),
          descricao: actionDescription,
          status_anterior: oldValue,
          status_novo: newValue,
          dados: metadata || {},
          user_id: user.id,
          user_nome: user.email || 'Sistema',
        });

      if (error) {
        console.error('Erro ao registrar histórico MT:', error);
        throw error;
      }

      // Atualizar último contato no lead (se aplicável)
      if (['ligacao', 'whatsapp', 'email', 'reuniao'].includes(actionType)) {
        await supabase
          .from('mt_leads')
          .update({
            ultimo_contato: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', leadId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-leads'] });
      if (leadId) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, leadId] });
        queryClient.invalidateQueries({ queryKey: ['mt-lead-activities', leadId] });
      }
    },
    onError: (error: Error) => {
      console.error('Erro ao registrar histórico:', error.message);
    },
  });

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    history: historyQuery.data || [],
    isLoading: historyQuery.isLoading || isTenantLoading,
    error: historyQuery.error as Error | null,
    refetch: historyQuery.refetch,
    recordHistory: recordHistoryMutation.mutateAsync,
    isRecording: recordHistoryMutation.isPending,
  };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function getActivityTitle(actionType: string): string {
  const titles: Record<string, string> = {
    nota: 'Nota adicionada',
    ligacao: 'Ligação realizada',
    email: 'E-mail enviado',
    whatsapp: 'Mensagem WhatsApp',
    reuniao: 'Reunião',
    tarefa: 'Tarefa',
    status_change: 'Mudança de Status',
    atribuicao: 'Atribuição',
    agendamento: 'Agendamento',
    conversao: 'Conversão',
    perda: 'Lead perdido',
    reativacao: 'Lead reativado',
    sistema: 'Ação do sistema',
  };
  return titles[actionType] || 'Ação';
}

// -----------------------------------------------------------------------------
// Hook: Histórico Completo (Timeline)
// -----------------------------------------------------------------------------

export function useLeadTimelineMT(leadId?: string) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: ['mt-lead-timeline', leadId, tenant?.id],
    queryFn: async (): Promise<MTLeadActivity[]> => {
      if (!leadId) return [];

      const { data, error } = await supabase
        .from('mt_lead_activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Erro ao buscar timeline MT:', error);
        throw error;
      }

      return (data || []).map(item => sanitizeObjectForJSON(item)) as MTLeadActivity[];
    },
    enabled: !!leadId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

// -----------------------------------------------------------------------------
// Hook: Histórico de Status
// -----------------------------------------------------------------------------

export function useLeadStatusHistoryMT(leadId?: string) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: ['mt-lead-status-history', leadId, tenant?.id],
    queryFn: async (): Promise<MTLeadActivity[]> => {
      if (!leadId) return [];

      const { data, error } = await supabase
        .from('mt_lead_activities')
        .select('*')
        .eq('lead_id', leadId)
        .eq('tipo', 'status_change')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar histórico de status MT:', error);
        throw error;
      }

      return (data || []).map(item => sanitizeObjectForJSON(item)) as MTLeadActivity[];
    },
    enabled: !!leadId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

// -----------------------------------------------------------------------------
// Hook: Contar Atividades por Tipo
// -----------------------------------------------------------------------------

export function useLeadActivityCountsMT(leadId?: string) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: ['mt-lead-activity-counts', leadId, tenant?.id],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!leadId) return {};

      const { data, error } = await supabase
        .from('mt_lead_activities')
        .select('tipo')
        .eq('lead_id', leadId);

      if (error) {
        console.error('Erro ao contar atividades MT:', error);
        throw error;
      }

      // Contar por tipo
      const counts: Record<string, number> = {};
      (data || []).forEach((item: { tipo: string }) => {
        counts[item.tipo] = (counts[item.tipo] || 0) + 1;
      });

      return counts;
    },
    enabled: !!leadId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

export default useLeadHistoryMT;
